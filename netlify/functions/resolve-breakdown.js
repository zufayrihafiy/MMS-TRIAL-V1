/**
 * NETLIFY SERVER FUNCTION: resolve-breakdown
 *
 * Secure authenticated endpoint to resolve an active breakdown in Google Sheets
 * (Spreadsheet: MMS DATABASE -> Worksheet: BD DATABASE).
 *
 * Security & Integrity Features:
 * 1. Strict Fail-Closed Caller Authentication: Requires valid Firebase Bearer ID token
 *    verified via Firebase Admin SDK with revocation checking: auth.verifyIdToken(idToken, true).
 * 2. Confirms caller account exists and is not disabled.
 * 3. Strictly requires valid Breakdown End Time before marking breakdown as completed.
 * 4. Enforces End Time >= Start Time validation.
 * 5. Validates Assigned Technician server-side via Firebase Admin SDK:
 *      - User exists in Firebase Authentication
 *      - Account is NOT disabled
 *      - Custom claim role === "TECHNICIAN"
 * 6. Resolves technician's stable Staff ID consistently:
 *      - Preferred: customClaims.staffId
 *      - Fallback: email prefix ONLY when email domain matches FIREBASE_STAFF_DOMAIN
 *      - Never falls back to displayName or Firebase UID
 *      - Rejects technician assignment if a valid Staff ID cannot be determined
 * 7. Authenticates to Google Apps Script using server-side MMS_API_KEY.
 * 8. Passes stable composite keys (Machine, Start Time, ID) to avoid row index shifts.
 * 9. Checks the backend 'success' flag strictly (never treats HTTP 200 alone as success).
 * 10. Generic server errors returned to frontend; detailed errors in server logs only.
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
    console.error('[resolve-breakdown] Token verification failed:', err.message);
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

/**
 * Resolve technician Staff ID according to strict MMS rules:
 * 1. customClaims.staffId (preferred)
 * 2. Email prefix ONLY if email belongs to configured FIREBASE_STAFF_DOMAIN
 * Returns null if no valid Staff ID can be determined (no fallback to displayName or UID).
 */
function resolveTechnicianStaffId(userRecord) {
  if (!userRecord) return null;
  const claims = userRecord.customClaims || {};

  // 1. Preferred: customClaims.staffId
  if (claims.staffId && typeof claims.staffId === 'string' && claims.staffId.trim()) {
    return claims.staffId.trim().toUpperCase();
  }

  // 2. Fallback: email prefix strictly if domain matches FIREBASE_STAFF_DOMAIN
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

  // 3. Reject: Never fall back to displayName or Firebase UID
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
        error: 'Unauthorized: Authentication required to resolve breakdowns.'
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

  // 2. Fail-Closed Caller Verification via Firebase Admin SDK
  let adminAuth;
  try {
    adminAuth = getFirebaseAdminAuth();
  } catch (initErr) {
    console.error('[resolve-breakdown] Firebase Admin initialization error:', initErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Authentication service is temporarily unavailable.'
      })
    };
  }

  const callerAuth = await verifyCallerToken(idToken, adminAuth);
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

  const callerUser = callerAuth.caller;
  const callerClaims = callerUser.customClaims || {};
  const callerRole = callerClaims.role;

  // Strict role authorization: Only ADMIN and TECHNICIAN are permitted to resolve breakdowns
  if (!callerRole || (callerRole !== 'ADMIN' && callerRole !== 'TECHNICIAN')) {
    console.warn(`[resolve-breakdown] Authorization rejected for caller ${callerUser.uid}: Role "${callerRole}" is not authorized.`);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        forbidden: true,
        error: 'Forbidden: Resolving breakdowns is restricted to authorized TECHNICIAN or ADMIN accounts.'
      })
    };
  }

  const authenticatedRole = callerRole;
  const authenticatedStaffId = resolveTechnicianStaffId(callerUser) || (callerUser.email ? callerUser.email.split('@')[0].toUpperCase() : callerUser.uid);

  // 3. Parse & Validate Payload
  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Malformed JSON payload.' })
    };
  }

  const { id, endTime, startTime, machine, staffId, afterPhoto, photoFiles, assignedTech, technicianUid } = data;

  if (!id && (!machine || !startTime)) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Breakdown identifier (ID or Machine + Start Time) is required.'
      })
    };
  }

  // Strictly require valid Breakdown End Time
  if (!endTime) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Breakdown End Time is strictly required before marking a breakdown as completed.'
      })
    };
  }

  const endDate = new Date(endTime);
  if (isNaN(endDate.getTime())) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid Breakdown End Time format.' })
    };
  }

  if (startTime) {
    const startDate = new Date(startTime);
    if (!isNaN(startDate.getTime()) && endDate < startDate) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Breakdown End Time cannot be earlier than Breakdown Start Time.'
        })
      };
    }
  }

  // 4. Strictly require and validate Assigned Technician using Firebase Admin SDK
  const selectedUid = String(technicianUid || assignedTech || '').trim();
  if (!selectedUid || selectedUid.toLowerCase() === 'unassigned') {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Assigned Technician is strictly required before marking a breakdown as completed.'
      })
    };
  }

  let verifiedStaffId = '';

  try {
    let technicianRecord = null;
    try {
      technicianRecord = await adminAuth.getUser(selectedUid);
    } catch (notFoundErr) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Assigned technician not found in registered accounts. Please select a valid technician.'
        })
      };
    }

    if (!technicianRecord) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Assigned technician account does not exist.'
        })
      };
    }

    // Verify account is active and not disabled
    if (technicianRecord.disabled) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Assigned technician account is disabled and cannot be assigned.'
        })
      };
    }

    // Verify custom claim role === "TECHNICIAN"
    const claims = technicianRecord.customClaims || {};
    if (claims.role !== 'TECHNICIAN') {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Assigned user does not have the TECHNICIAN role claim. Only verified technicians can be assigned.'
        })
      };
    }

    // Resolve stable Staff ID: customClaims.staffId -> internal domain email prefix -> reject
    verifiedStaffId = resolveTechnicianStaffId(technicianRecord);
    if (!verifiedStaffId) {
      console.error(`[resolve-breakdown] Technician assignment rejected for UID ${selectedUid}: no valid Staff ID in customClaims and email (${technicianRecord.email || 'none'}) does not match internal staff domain.`);
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Assigned technician does not have a valid Staff ID or authorized internal email address.'
        })
      };
    }
  } catch (verifyTechErr) {
    console.error('[resolve-breakdown] Server-side technician verification failed:', verifyTechErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to verify technician account. Please try again or contact system support.'
      })
    };
  }

  // 5. Connect to Google Apps Script
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
    const gasPayload = {
      action: 'resolve',
      apiKey: mmsApiKey,
      id: id,
      machine: machine || '',
      startTime: startTime || '',
      staffId: staffId || '',
      endTime: endTime,
      assignedTech: verifiedStaffId, // Consistent Staff ID stored in Column N
      technicianUid: selectedUid,
      resolvedBy: authenticatedStaffId,
      afterPhoto: afterPhoto || '',
      photoFiles: photoFiles || null
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
      gasResult = { success: false, error: 'Invalid response from Google Apps Script' };
    }

    // STRICT CHECK: Check gasResult.success field explicitly
    if (!gasResponse.ok || !gasResult || gasResult.success !== true) {
      const errStatus = (gasResult && gasResult.error && gasResult.error.toLowerCase().includes('already marked as completed'))
        ? 409
        : (gasResponse.status >= 400 && gasResponse.status < 500 ? gasResponse.status : 502);

      return {
        statusCode: errStatus,
        headers,
        body: JSON.stringify({
          success: false,
          error: (gasResult && (gasResult.error || gasResult.message)) || 'Google Apps Script failed to update breakdown status.'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Breakdown ${id || machine} successfully resolved and updated to Completed in BD DATABASE.`,
        id: gasResult.id || id,
        endTime: endTime,
        assignedTech: verifiedStaffId,
        technicianUid: selectedUid,
        downtime: gasResult.downtime !== undefined ? gasResult.downtime : null,
        status: 'Completed'
      })
    };
  } catch (err) {
    console.error('[resolve-breakdown] Server function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'An unexpected server error occurred while processing the breakdown resolution.'
      })
    };
  }
};
