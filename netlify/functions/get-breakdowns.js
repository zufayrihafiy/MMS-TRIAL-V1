/**
 * NETLIFY SERVER FUNCTION: get-breakdowns
 *
 * Secure authenticated endpoint to fetch breakdown records from Google Sheets
 * (Spreadsheet: MMS DATABASE -> Worksheet: BD DATABASE, Columns A to L).
 *
 * Security & Integrity Features:
 * 1. Strict Fail-Closed Authentication: Requires valid Firebase Bearer ID token.
 * 2. Token verification via Firebase Admin SDK with revocation checking:
 *    auth.verifyIdToken(idToken, true).
 * 3. Confirms caller account exists and is active (not disabled).
 * 4. Never skips authentication; fails closed if auth configuration is missing.
 * 5. Keeps GOOGLE_APPS_SCRIPT_URL and MMS_API_KEY secure on server.
 * 6. Communicates with Google Apps Script exclusively via authenticated POST requests.
 * 7. Strictly validates the 'success' flag from Google Apps Script response.
 * 8. Never exposes credentials or internal server errors to client browser.
 */

const { initializeApp, applicationDefault, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

/**
 * Initialize or reuse Firebase Admin Auth instance using established pattern.
 */
function getFirebaseAdminAuth() {
  if (getApps().length === 0) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const sa = typeof process.env.FIREBASE_SERVICE_ACCOUNT_KEY === 'string'
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
          : process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        credential = cert(sa);
      } catch (err) {
        console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', err.message);
      }
    }
    if (!credential) {
      try {
        credential = applicationDefault();
      } catch (credErr) {
        console.warn('applicationDefault() fallback used:', credErr.message);
      }
    }
    initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID || 'mms-maintenance'
    });
  }
  return getAuth();
}

/**
 * Verify caller identity token via Firebase Admin SDK with revocation checking.
 * Strictly fails closed if Admin SDK verification fails.
 */
async function verifyCallerToken(idToken, authInstance) {
  try {
    const decoded = await authInstance.verifyIdToken(idToken, true);
    if (!decoded || !decoded.uid) {
      return { ok: false, statusCode: 401, error: 'Unauthorized: Invalid token payload.' };
    }

    const caller = await authInstance.getUser(decoded.uid);
    if (!caller) {
      return { ok: false, statusCode: 401, error: 'Unauthorized: User account not found.' };
    }
    if (caller.disabled) {
      return { ok: false, statusCode: 403, error: 'Forbidden: User account is disabled.' };
    }

    return { ok: true, uid: decoded.uid, caller };
  } catch (err) {
    console.error('[get-breakdowns] Token verification failed:', err.message);
    if (err.code === 'auth/id-token-revoked') {
      return { ok: false, statusCode: 401, error: 'Unauthorized: Authentication token has been revoked. Please log in again.' };
    }
    if (err.code === 'auth/id-token-expired') {
      return { ok: false, statusCode: 401, error: 'Unauthorized: Authentication token has expired. Please log in again.' };
    }
    if (err.code === 'auth/user-disabled') {
      return { ok: false, statusCode: 403, error: 'Forbidden: User account is disabled.' };
    }
    if (err.code === 'auth/user-not-found') {
      return { ok: false, statusCode: 401, error: 'Unauthorized: User account not found.' };
    }
    return { ok: false, statusCode: 401, error: 'Unauthorized: Token verification failed.' };
  }
}

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Only GET is supported.' })
    };
  }

  // 1. Require Bearer Token
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: true,
        error: 'Unauthorized: Authentication required. You must be logged in to access breakdown records.'
      })
    };
  }

  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!idToken) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: true,
        error: 'Unauthorized: Missing authentication token.'
      })
    };
  }

  // 2. Fail-Closed Server Authentication Check via Firebase Admin SDK
  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (adminInitErr) {
    console.error('[get-breakdowns] Firebase Admin initialization error:', adminInitErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Authentication service is temporarily unavailable.'
      })
    };
  }

  const callerAuth = await verifyCallerToken(idToken, auth);
  if (!callerAuth.ok) {
    return {
      statusCode: callerAuth.statusCode || 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: callerAuth.statusCode !== 403,
        error: callerAuth.error
      })
    };
  }

  // 3. Strict Role Authorization: ADMIN or TECHNICIAN only
  const callerClaims = callerAuth.caller.customClaims || {};
  const callerRole = callerClaims.role;
  if (!callerRole || (callerRole !== 'ADMIN' && callerRole !== 'TECHNICIAN')) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        forbidden: true,
        error: 'Forbidden: Viewing breakdown records is restricted to authorized TECHNICIAN or ADMIN accounts.'
      })
    };
  }

  // 4. Verify Google Apps Script & API Key Backend Configuration
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!GAS_URL) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        configured: false,
        error: 'Google Apps Script backend URL is not configured (GOOGLE_APPS_SCRIPT_URL).'
      })
    };
  }

  const mmsApiKey = process.env.MMS_API_KEY;
  if (!mmsApiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        configured: false,
        error: 'Backend API key is not configured (MMS_API_KEY).'
      })
    };
  }

  // 4. Query Google Apps Script via Authenticated POST Request
  try {
    const gasPayload = {
      action: 'getBreakdowns',
      apiKey: mmsApiKey
    };

    const gasResponse = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(gasPayload)
    });

    const gasText = await gasResponse.text();
    let gasResult;
    try {
      gasResult = JSON.parse(gasText);
    } catch (e) {
      gasResult = { success: false, error: 'Invalid response from backend database service.' };
    }

    // STRICT CHECK: Do not treat HTTP 200 alone as success!
    if (!gasResponse.ok || !gasResult || gasResult.success !== true) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: (gasResult && gasResult.error) || 'Failed to fetch breakdown records from Google Apps Script BD DATABASE.'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        source: 'Google Sheets BD DATABASE',
        count: Array.isArray(gasResult.data) ? gasResult.data.length : 0,
        data: gasResult.data || []
      })
    };
  } catch (err) {
    console.error('[get-breakdowns] Backend request failed:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'An unexpected server error occurred while retrieving breakdown records.'
      })
    };
  }
};
