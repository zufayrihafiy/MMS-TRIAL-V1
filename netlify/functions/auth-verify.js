/**
 * NETLIFY SERVER FUNCTION: auth-verify
 *
 * Verifies active Firebase Authentication session token and returns fresh user profile.
 *
 * Security Features:
 * 1. Strict Fail-Closed Token Verification: Uses Firebase Admin SDK with revocation checking:
 *    auth.verifyIdToken(idToken, true).
 * 2. Confirms user account exists and is not disabled.
 * 3. Resolves user role strictly from trusted Firebase Custom Claims (never based on Staff ID).
 * 4. Generic server errors returned to frontend; detailed errors in server logs only.
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

function getInitials(name) {
  if (!name) return 'MM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Resolve Staff ID strictly from customClaims.staffId or internal domain email prefix.
 */
function resolveStaffId(userRecord) {
  if (!userRecord) return '';
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

  return '';
}

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        valid: false,
        error: 'Missing or malformed Authorization Bearer token.'
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
        valid: false,
        error: 'Missing authentication token.'
      })
    };
  }

  try {
    let auth;
    try {
      auth = getFirebaseAdminAuth();
    } catch (adminInitErr) {
      console.error('[auth-verify] Firebase Admin initialization error:', adminInitErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          valid: false,
          error: 'Authentication service is temporarily unavailable.'
        })
      };
    }

    // Verify token with revocation check: auth.verifyIdToken(idToken, true)
    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken, true);
    } catch (verifyErr) {
      console.error('[auth-verify] Token verification failed:', verifyErr.message);
      let errorMsg = 'Authentication token is invalid or has expired. Please log in again.';
      if (verifyErr.code === 'auth/id-token-revoked') {
        errorMsg = 'Authentication token has been revoked. Please log in again.';
      }
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          valid: false,
          error: errorMsg
        })
      };
    }

    if (!decoded || !decoded.uid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          valid: false,
          error: 'Invalid token payload.'
        })
      };
    }

    // Confirm caller exists and is active
    let userRecord;
    try {
      userRecord = await auth.getUser(decoded.uid);
    } catch (userErr) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          valid: false,
          error: 'User account not found.'
        })
      };
    }

    if (!userRecord || userRecord.disabled) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          valid: false,
          error: 'User account is disabled or deactivated.'
        })
      };
    }

    const customClaims = userRecord.customClaims || {};
    const rawRole = customClaims.role;
    if (!rawRole || (rawRole !== 'ADMIN' && rawRole !== 'TECHNICIAN')) {
      console.warn(`[auth-verify] Verification rejected for user ${userRecord.uid}: Missing or unauthorized MMS role claim "${rawRole}".`);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          valid: false,
          error: 'Access Denied: Account lacks an authorized MMS role (ADMIN or TECHNICIAN).'
        })
      };
    }

    const staffId = resolveStaffId(userRecord) || (userRecord.email ? userRecord.email.split('@')[0].toUpperCase() : userRecord.uid);
    const roleCode = rawRole;
    const resolvedRole = roleCode === 'ADMIN' ? 'Administrator' : 'Technician';
    const resolvedName = userRecord.displayName || (staffId ? `Staff ${staffId}` : 'User');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        valid: true,
        user: {
          staffId,
          name: resolvedName,
          role: resolvedRole,
          roleCode,
          initials: getInitials(resolvedName),
          email: userRecord.email || '',
          localId: userRecord.uid
        }
      })
    };
  } catch (err) {
    console.error('[auth-verify] Server error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        valid: false,
        error: 'An unexpected server error occurred during session verification.'
      })
    };
  }
};
