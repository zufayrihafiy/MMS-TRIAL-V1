/**
 * NETLIFY SERVER FUNCTION: resolve-pm-record
 *
 * Secure endpoint to resolve an active Preventive Maintenance record in PM DATABASE.
 *
 * Security & Authorization Features:
 * 1. Strict Fail-Closed Authentication: Requires valid Firebase Bearer ID token.
 * 2. Token verification via Firebase Admin SDK with revocation checking: auth.verifyIdToken(idToken, true).
 * 3. Confirms caller account exists and is not disabled.
 * 4. Strict Role Authorization:
 *      - ADMIN may resolve any ongoing maintenance record.
 *      - TECHNICIAN may resolve ONLY tasks assigned to their verified Staff ID.
 * 5. Validates mandatory completion fields:
 *      - Completion Date & Time
 *      - Maintenance Work Details
 * 6. Supports optional Remarks and After Maintenance Photo upload via Drive.
 * 7. Automatically records Completed By from authenticated caller's verified identity.
 * 8. Status transitioned to Completed.
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
    console.error('[resolve-pm-record] Token verification failed:', err.message);
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

  if (email) {
    const atIndex = email.lastIndexOf('@');
    if (atIndex > 0) {
      const domain = email.slice(atIndex + 1);
      const prefix = email.slice(0, atIndex);
      if (domain === staffDomain && prefix) {
        return prefix.toUpperCase();
      }
    }
  }

  return null;
}

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Only POST is supported.' })
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
        error: 'Unauthorized: Authentication required.'
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

  // 2. Fail-Closed Authentication
  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (adminInitErr) {
    console.error('[resolve-pm-record] Firebase Admin initialization error:', adminInitErr);
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

  // 3. Fail-Closed Role Authorization: ADMIN or TECHNICIAN only
  const callerClaims = callerAuth.caller.customClaims || {};
  const callerRole = String(callerClaims.role || '').trim().toUpperCase();
  if (callerRole !== 'ADMIN' && callerRole !== 'TECHNICIAN') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        forbidden: true,
        error: 'Forbidden: Resolving PM records is restricted to authorized TECHNICIAN or ADMIN accounts.'
      })
    };
  }

  // 4. Strict Verified Identity Enforcement (Fail-Closed)
  const verifiedStaffId = resolveStaffId(callerAuth.caller);
  if (callerRole === 'TECHNICIAN') {
    // Technician MUST have a verified Staff ID in custom claims or profile
    if (!verifiedStaffId || typeof verifiedStaffId !== 'string' || !verifiedStaffId.trim()) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          forbidden: true,
          error: 'Forbidden: Technician account is missing a verified Staff ID in custom claims or profile.'
        })
      };
    }
  }

  const callerStaffId = (verifiedStaffId || callerAuth.caller.uid || '').trim().toUpperCase();
  if (!callerStaffId) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        forbidden: true,
        error: 'Forbidden: Caller identity could not be verified.'
      })
    };
  }

  // 4. Parse & Validate Payload
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid JSON body.' })
    };
  }

  const pmCode = String(payload.pmCode || '').trim();
  const completionDateTime = String(payload.completionDateTime || '').trim();
  const workDetails = String(payload.workDetails || '').trim();
  const remarks = String(payload.remarks || '').trim();
  const afterPhoto = String(payload.afterPhoto || '').trim();
  const photoFiles = payload.photoFiles || null;

  if (!pmCode) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'PM Code is required.' })
    };
  }

  if (!completionDateTime) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Completion Date & Time is required.' })
    };
  }

  // Validate completion date format / value
  const parsedDate = new Date(completionDateTime);
  if (isNaN(parsedDate.getTime())) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Valid Completion Date & Time is required.' })
    };
  }

  if (!workDetails || workDetails.length < 5) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Maintenance Work Details are required (minimum 5 characters).' })
    };
  }

  // 5. Connect to Google Apps Script
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  const mmsApiKey = process.env.MMS_API_KEY;
  if (!GAS_URL || !mmsApiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ success: false, error: 'Backend database service is not configured.' })
    };
  }

  try {
    const gasPayload = {
      action: 'resolvePMRecord',
      apiKey: mmsApiKey,
      pmCode,
      completionDateTime,
      workDetails,
      remarks,
      afterPhoto,
      photoFiles,
      completedBy: callerStaffId,
      callerRole,
      callerStaffId
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
      gasResult = { success: false, error: 'Invalid response from database service.' };
    }

    if (!gasResponse.ok || !gasResult || gasResult.success !== true) {
      const statusCode = gasResponse.status === 403 ? 403 : (gasResponse.status === 404 ? 404 : 502);
      return {
        statusCode: statusCode,
        headers,
        body: JSON.stringify({
          success: false,
          error: (gasResult && gasResult.error) || 'Failed to resolve PM record in database.'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pmCode: gasResult.pmCode || pmCode,
        message: gasResult.message || `Preventive Maintenance ${pmCode} resolved successfully.`
      })
    };

  } catch (err) {
    console.error('[resolve-pm-record] Backend request failed:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'An unexpected server error occurred while resolving PM record.' })
    };
  }
};
