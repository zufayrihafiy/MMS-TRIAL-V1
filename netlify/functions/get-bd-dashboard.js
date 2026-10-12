/**
 * NETLIFY SERVER FUNCTION: get-bd-dashboard
 *
 * Secure server-side endpoint for the Breakdown Management Dashboard.
 *
 * ACCESS CONTROL SPECIFICATION:
 * - Strictly restricted to authenticated ADMIN users.
 * - Authenticated via Firebase Admin SDK with revocation checking:
 *   auth.verifyIdToken(idToken, true).
 * - Enforces ADMIN role claim on the server; TECHNICIAN users receive HTTP 403 Forbidden.
 * - Queries Google Apps Script via authenticated POST containing server-side MMS_API_KEY.
 * - Validates the 'success' flag from Google Apps Script response.
 * - Generic server errors returned to frontend; detailed errors in server logs only.
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
    console.error('[get-bd-dashboard] Token verification failed:', err.message);
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

  // 1. Verify Authorization Bearer Token
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: true,
        error: 'Unauthorized: Authentication required to access Breakdown Management Dashboard.'
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

  // 2. Fail-Closed Authentication via Firebase Admin SDK
  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (adminInitErr) {
    console.error('[get-bd-dashboard] Firebase Admin initialization error:', adminInitErr);
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

  // 3. Strict Server-Side Role Authorization: ADMIN ONLY
  const claims = callerAuth.caller.customClaims || {};
  const isAdmin = claims.role === 'ADMIN';

  if (!isAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        forbidden: true,
        error: 'Forbidden: Breakdown Management Dashboard is restricted to Administrator access only. Your current role is TECHNICIAN.'
      })
    };
  }

  // 4. Fetch Live Breakdown Records from Google Sheets Backend via Authenticated POST
  const monthParam = event.queryStringParameters?.month;
  const yearParam = event.queryStringParameters?.year;

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

  try {
    const gasResponse = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        action: 'getBreakdowns',
        apiKey: mmsApiKey
      })
    });

    const gasText = await gasResponse.text();
    let gasResult;
    try {
      gasResult = JSON.parse(gasText);
    } catch (e) {
      gasResult = { success: false, error: 'Invalid response from Google Apps Script' };
    }

    // STRICT CHECK: Do not treat HTTP 200 alone as success!
    if (!gasResponse.ok || !gasResult || gasResult.success !== true) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: (gasResult && gasResult.error) || 'Google Apps Script BD DATABASE returned an error.'
        })
      };
    }

    const allRecords = Array.isArray(gasResult.data) ? gasResult.data : [];

    // Filter by requested month/year if specified
    const filteredRecords = allRecords.filter(item => {
      const dateStr = item.startTime || item.reportedAt || item.time;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      if (yearParam !== undefined && d.getFullYear() !== parseInt(yearParam, 10)) return false;
      if (monthParam !== undefined && d.getMonth() !== parseInt(monthParam, 10)) return false;
      return true;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        source: 'Google Sheets BD DATABASE (Live)',
        totalBreakdowns: filteredRecords.length,
        data: filteredRecords
      })
    };
  } catch (err) {
    console.error('[get-bd-dashboard] Backend request error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'An unexpected server error occurred while retrieving dashboard metrics.'
      })
    };
  }
};
