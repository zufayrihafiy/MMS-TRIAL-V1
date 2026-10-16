/**
 * NETLIFY SERVER FUNCTION: get-spare-parts
 *
 * Secure authenticated endpoint to fetch Spare Parts, Stock Movements, and Stock Requests
 * from Google Sheets (Worksheets: SPARE PARTS DATABASE, STOCK MOVEMENTS DATABASE, STOCK REQUESTS DATABASE).
 *
 * Security & Integrity Features:
 * 1. Strict Fail-Closed Authentication: Requires valid Firebase Bearer ID token.
 * 2. Token verification via Firebase Admin SDK with revocation checking: auth.verifyIdToken(idToken, true).
 * 3. Confirms caller account exists and is active (not disabled).
 * 4. Strict Role-Based Visibility:
 *    - ADMIN: Can view Spare Parts List, Stock Movement History, and all Stock Requests.
 *    - TECHNICIAN: Can view Spare Parts List and own Stock Requests.
 *      Stock Movement History is strictly inaccessible to technicians (returns empty array and blocked).
 * 5. Communicates with Google Apps Script exclusively via authenticated POST requests with server-side MMS_API_KEY.
 * 6. Never exposes API keys or database URLs to frontend clients.
 */

const { initializeApp, applicationDefault, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

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
    console.error('[get-spare-parts] Token verification failed:', err.message);
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

function resolveStaffId(userRecord) {
  if (!userRecord) return null;
  const claims = userRecord.customClaims || {};

  if (claims.staffId && typeof claims.staffId === 'string' && claims.staffId.trim()) {
    return claims.staffId.trim().toUpperCase();
  }

  const staffDomain = (process.env.FIREBASE_STAFF_DOMAIN || 'mms.internal').trim().toLowerCase();
  const email = (userRecord.email || '').trim().toLowerCase();

  if (email && email.includes('@')) {
    const [localPart, domainPart] = email.split('@');
    if (domainPart === staffDomain && localPart) {
      return localPart.toUpperCase();
    }
  }

  return (userRecord.uid || '').toUpperCase();
}

function resolveUserRole(userRecord, staffId) {
  if (!userRecord) return null;
  const claims = userRecord.customClaims || {};

  if (claims.role && typeof claims.role === 'string') {
    const roleUpper = claims.role.trim().toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper === 'TECHNICIAN') {
      return roleUpper;
    }
  }

  const adminIdsEnv = process.env.FIREBASE_ADMIN_STAFF_IDS || 'USR-01,PN001';
  const adminIds = adminIdsEnv.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (staffId && adminIds.includes(staffId)) {
    return 'ADMIN';
  }

  return 'TECHNICIAN';
}

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 1. Strict Fail-Closed Bearer Token Authentication
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, error: 'Unauthorized: Missing or invalid Authorization header.' })
    };
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, error: 'Unauthorized: Bearer token is empty.' })
    };
  }

  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (initErr) {
    console.error('[get-spare-parts] Firebase Admin init error:', initErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Server authentication initialization failed.' })
    };
  }

  const authResult = await verifyCallerToken(idToken, auth);
  if (!authResult.ok) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ success: false, error: authResult.error })
    };
  }

  const callerStaffId = resolveStaffId(authResult.caller);
  const callerRole = resolveUserRole(authResult.caller, callerStaffId);

  if (callerRole !== 'ADMIN' && callerRole !== 'TECHNICIAN') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Forbidden: Caller does not possess an authorized MMS role.' })
    };
  }

  // Check if technician is explicitly requesting movement history directly
  const queryParams = event.queryStringParameters || {};
  if (callerRole === 'TECHNICIAN' && queryParams.target === 'movements') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ success: false, error: 'Forbidden: Stock Movement History is restricted to Administrator accounts.' })
    };
  }

  // 2. Connect to Google Apps Script
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  const mmsApiKey = process.env.MMS_API_KEY;

  if (GAS_URL && mmsApiKey) {
    try {
      const gasPayload = {
        action: 'getSpareParts',
        apiKey: mmsApiKey,
        callerRole: callerRole,
        callerStaffId: callerStaffId
      };

      const gasResponse = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gasPayload)
      });

      const gasData = await gasResponse.json().catch(() => null);

      if (gasResponse.ok && gasData && gasData.success) {
        // Enforce role-based sanitization as second-layer defense
        const sanitizedMovements = callerRole === 'ADMIN' ? (gasData.stockMovements || []) : [];
        const sanitizedRequests = callerRole === 'ADMIN'
          ? (gasData.stockRequests || [])
          : (gasData.stockRequests || [])
              .filter(r => (r.requestedByStaffId || '').toUpperCase() === callerStaffId)
              .map(r => {
                const reqCopy = { ...r };
                delete reqCopy.reason;
                return reqCopy;
              });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            callerRole,
            spareParts: gasData.spareParts || [],
            stockMovements: sanitizedMovements,
            stockRequests: sanitizedRequests
          })
        };
      } else {
        const errMsg = (gasData && gasData.error) || 'Failed to fetch spare parts from backend database.';
        console.error('[get-spare-parts] GAS error:', errMsg);
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ success: false, error: errMsg })
        };
      }
    } catch (netErr) {
      console.error('[get-spare-parts] Network error connecting to GAS:', netErr);
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to communicate with Google Sheets backend service.' })
      };
    }
  }

  // Return empty dataset if GAS is not configured in local environment (never demo records)
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      callerRole,
      spareParts: [],
      stockMovements: [],
      stockRequests: []
    })
  };
};
