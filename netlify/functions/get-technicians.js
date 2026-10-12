/**
 * NETLIFY SERVER FUNCTION: get-technicians
 *
 * Secure authenticated endpoint to fetch real registered technicians
 * from Firebase Authentication using the Firebase Admin SDK.
 *
 * Security & Data Privacy Constraints:
 * 1. Hardened caller verification: Requires valid Firebase ID token (Bearer token)
 *    verified strictly via Firebase Admin SDK with revocation checking:
 *    auth.verifyIdToken(idToken, true).
 * 2. Strict fail-closed design: No alternative REST fallbacks or bypasses.
 * 3. Verifies that the authenticated caller account exists and is not disabled.
 * 4. Only includes accounts with custom claim: role === "TECHNICIAN".
 * 5. Only includes active (non-disabled) technician accounts.
 * 6. Staff ID mapping rules:
 *      - Preferred: customClaims.staffId
 *      - Fallback: email prefix ONLY when email domain matches FIREBASE_STAFF_DOMAIN
 *      - Never falls back to displayName or Firebase UID
 *      - Technicians without a valid Staff ID are excluded from the directory
 * 7. Returns strictly MINIMAL information:
 *      - uid
 *      - staffId
 *      - displayName
 * 8. DOES NOT return:
 *      - email
 *      - password / password hashes
 *      - tokens
 *      - custom claims
 *      - private account metadata
 * 9. Generic server errors returned to frontend; detailed errors in server logs only.
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

/**
 * Verify caller identity token via Firebase Admin SDK with revocation checking.
 * Strictly fails closed if Admin SDK verification fails.
 * Confirms that the caller's Firebase account exists and is not disabled.
 */
async function verifyCallerToken(idToken, authInstance) {
  try {
    // 1. Verify ID token with checkRevoked = true
    const decoded = await authInstance.verifyIdToken(idToken, true);
    if (!decoded || !decoded.uid) {
      return { ok: false, statusCode: 401, error: 'Unauthorized: Invalid token payload.' };
    }

    // 2. Confirm caller account exists and is active
    const caller = await authInstance.getUser(decoded.uid);
    if (!caller) {
      return { ok: false, statusCode: 401, error: 'Unauthorized: User account not found.' };
    }
    if (caller.disabled) {
      return { ok: false, statusCode: 403, error: 'Forbidden: User account is disabled.' };
    }

    return { ok: true, uid: decoded.uid, caller };
  } catch (err) {
    console.error('Firebase Admin token verification failed:', err.message);
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

  // 1. Require Bearer ID token
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: true,
        error: 'Unauthorized: Authentication required to view technician directory.'
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

  try {
    let auth;
    try {
      auth = getFirebaseAdminAuth();
    } catch (adminInitErr) {
      console.error('[get-technicians] Firebase Admin initialization error:', adminInitErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Technician directory service is temporarily unavailable.'
        })
      };
    }

    // 2. Authenticate caller strictly using Firebase Admin SDK with revocation check
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

    // 3. List all users and filter for active TECHNICIAN role with valid Staff ID
    const technicians = [];
    let nextPageToken = undefined;

    do {
      const listResult = await auth.listUsers(1000, nextPageToken);
      const users = listResult.users || [];

      for (const u of users) {
        if (u.disabled) continue;

        const claims = u.customClaims || {};
        if (claims.role === 'TECHNICIAN') {
          // Resolve Staff ID: customClaims.staffId -> internal domain email prefix -> reject
          const staffId = resolveTechnicianStaffId(u);
          if (!staffId) {
            console.warn(`[get-technicians] Skipping technician user ${u.uid}: unable to resolve valid Staff ID via customClaims.staffId or internal domain email (${u.email || 'no email'}).`);
            continue;
          }

          const displayName = (u.displayName && u.displayName.trim())
            ? u.displayName.trim()
            : `Technician ${staffId}`;

          // STRICT DATA SANITIZATION:
          // Return only uid, staffId, displayName
          // Email, passwords, tokens, claims, phone numbers are excluded
          technicians.push({
            uid: u.uid,
            staffId: staffId,
            displayName: displayName
          });
        }
      }

      nextPageToken = listResult.pageToken;
    } while (nextPageToken);

    // Alphabetical sort by Display Name
    technicians.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        technicians: technicians,
        count: technicians.length
      })
    };
  } catch (err) {
    console.error('[get-technicians] Directory retrieval error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'An unexpected server error occurred while retrieving the technician directory.'
      })
    };
  }
};
