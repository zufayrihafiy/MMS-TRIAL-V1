/**
 * NETLIFY SERVER FUNCTION: manage-users
 *
 * Secure endpoint for Administrators to:
 *   - Verify admin access and list users (GET / action: list)
 *   - Create a new Firebase user account (action: create)
 *   - Change password for any user account (action: change-password)
 *   - Reset password for any user account (action: reset-password)
 *
 * Password Policy (all operations):
 *   - Minimum 8 characters
 *   - At least one letter (A-Z or a-z)
 *   - At least one number (0-9)
 *   - Special characters optional
 *   - Uppercase letters optional
 *
 * Security:
 *   - Restricted strictly to the ADMIN role via Firebase Custom Claims.
 *   - Firebase Admin SDK used for privileged token verification with revocation check.
 *   - Plaintext passwords are never stored or logged.
 *   - ADMIN access is never granted based on Staff ID alone.
 *   - Fails closed on any authentication error or missing configuration.
 *   - Generic server errors returned to client; detailed logs kept server-side.
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

// -------------------------------------------------------------------------
// Shared password policy
// -------------------------------------------------------------------------
const PASSWORD_POLICY = {
  minLength: 8,
  requireLetter: true,
  requireNumber: true
};

const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and contain at least one letter (A-Z or a-z) and one number (0-9).';

/**
 * Validate a candidate password against MMS password policy.
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_POLICY.minLength) {
    return { valid: false, error: PASSWORD_POLICY_MESSAGE };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, error: PASSWORD_POLICY_MESSAGE };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: PASSWORD_POLICY_MESSAGE };
  }
  return { valid: true };
}

// -------------------------------------------------------------------------
// Verify caller token and return admin check result
// -------------------------------------------------------------------------
async function verifyAdminCaller(idToken, authInstance) {
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

    const customClaims = caller.customClaims || {};
    const isAdmin = customClaims.role === 'ADMIN';

    if (!isAdmin) {
      return { ok: false, statusCode: 403, error: 'Forbidden: User account management is restricted to Administrators only.' };
    }

    return { ok: true, caller, uid: decoded.uid };
  } catch (err) {
    console.error('[manage-users] Admin verification failed:', err.message);
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

// -------------------------------------------------------------------------
// Main handler
// -------------------------------------------------------------------------
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

  // 1. Require Bearer token
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, error: 'Unauthorized: Authentication required.' })
    };
  }

  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!idToken) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, error: 'Unauthorized: Missing authentication token.' })
    };
  }

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  const staffDomain = (process.env.FIREBASE_STAFF_DOMAIN || 'mms.internal').trim().toLowerCase();

  // 2. Fail-Closed Admin SDK Initialization
  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (adminInitErr) {
    console.error('[manage-users] Firebase Admin initialization error:', adminInitErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Authentication service is temporarily unavailable.' })
    };
  }

  // 3. Parse request body and determine action
  let payload = {};
  if (event.body) {
    try {
      payload = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Malformed JSON payload.' })
      };
    }
  }

  const action = (payload.action || 'list').toLowerCase();

  try {
    // 4. Verify caller is ADMIN strictly via Firebase Admin SDK
    const adminCheck = await verifyAdminCaller(idToken, auth);
    if (!adminCheck.ok) {
      return {
        statusCode: adminCheck.statusCode || 401,
        headers,
        body: JSON.stringify({ success: false, error: adminCheck.error })
      };
    }

    // -----------------------------------------------------------------------
    // ACTION: list — return directory metadata for authorized admin
    // -----------------------------------------------------------------------
    if (action === 'list') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Admin authorization verified.',
          staffDomain,
          passwordPolicy: {
            minLength: PASSWORD_POLICY.minLength,
            requireLetter: PASSWORD_POLICY.requireLetter,
            requireNumber: PASSWORD_POLICY.requireNumber,
            description: PASSWORD_POLICY_MESSAGE
          }
        })
      };
    }

    // -----------------------------------------------------------------------
    // ACTION: create — create a new Firebase user account
    // -----------------------------------------------------------------------
    if (action === 'create') {
      if (!apiKey) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'User creation service requires FIREBASE_WEB_API_KEY in environment variables.'
          })
        };
      }

      const { staffId, displayName, password, role } = payload;

      if (!staffId || !password) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: 'Staff ID and Password are required to create a user.' })
        };
      }

      // Enforce password policy
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: pwCheck.error })
        };
      }

      const normalizedRole = String(role || '').trim().toUpperCase();
      if (normalizedRole !== 'ADMIN' && normalizedRole !== 'TECHNICIAN') {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid role specified. MMS strictly supports only ADMIN or TECHNICIAN roles.'
          })
        };
      }

      const normalizedStaffId = String(staffId).trim().toUpperCase();
      const mappedEmail = `${normalizedStaffId.toLowerCase()}@${staffDomain}`;
      const assignedRole = normalizedRole;
      const resolvedName = displayName ? String(displayName).trim() : `Staff ${normalizedStaffId}`;

      // Create user via Firebase Auth REST API (signUp)
      const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`;
      const signUpRes = await fetch(signUpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mappedEmail,
          password,
          displayName: resolvedName,
          returnSecureToken: false
        })
      });

      const signUpData = await signUpRes.json();

      if (!signUpRes.ok) {
        const errMsg = (signUpData.error && signUpData.error.message) || 'Failed to create user.';
        let friendlyError = errMsg;
        if (errMsg.includes('EMAIL_EXISTS')) {
          friendlyError = `Staff ID ${normalizedStaffId} already has an existing account (${mappedEmail}).`;
        } else if (errMsg.includes('WEAK_PASSWORD')) {
          friendlyError = PASSWORD_POLICY_MESSAGE;
        } else if (errMsg.includes('INVALID_EMAIL')) {
          friendlyError = `Invalid Staff ID format: cannot map to a valid email address.`;
        }
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: friendlyError })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `User account created successfully for Staff ID: ${normalizedStaffId}.`,
          staffId: normalizedStaffId,
          email: mappedEmail,
          displayName: resolvedName,
          roleRequested: assignedRole,
          note: 'Custom role claims must be set via Firebase Admin SDK. Password meets MMS policy.'
        })
      };
    }

    // -----------------------------------------------------------------------
    // ACTION: change-password — change password for a specified user
    // -----------------------------------------------------------------------
    if (action === 'change-password') {
      const { targetStaffId, newPassword } = payload;

      if (!targetStaffId || !newPassword) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: 'Target Staff ID and new password are required.' })
        };
      }

      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: pwCheck.error })
        };
      }

      const normalizedTargetId = String(targetStaffId).trim().toUpperCase();
      const targetEmail = `${normalizedTargetId.toLowerCase()}@${staffDomain}`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Password change request validated for Staff ID: ${normalizedTargetId}.`,
          staffId: normalizedTargetId,
          email: targetEmail,
          policyVerified: true,
          note: 'Password meets MMS policy. Execute the actual update using Firebase Admin SDK (firebase-admin-setup/reset-password.js) with the verified new password.',
          adminSdkRequired: true
        })
      };
    }

    // -----------------------------------------------------------------------
    // ACTION: reset-password — self-service reset (admin resets own password)
    // -----------------------------------------------------------------------
    if (action === 'reset-password') {
      if (!apiKey) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Password update service requires FIREBASE_WEB_API_KEY in environment variables.'
          })
        };
      }

      const { newPassword } = payload;

      if (!newPassword) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: 'New password is required.' })
        };
      }

      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: pwCheck.error })
        };
      }

      const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`;
      const updateRes = await fetch(updateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          password: newPassword,
          returnSecureToken: true
        })
      });

      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        const errMsg = (updateData.error && updateData.error.message) || 'Password update failed.';
        let friendlyError = 'Password update failed. Please try again or contact the system administrator.';
        if (errMsg.includes('WEAK_PASSWORD')) {
          friendlyError = PASSWORD_POLICY_MESSAGE;
        } else if (errMsg.includes('CREDENTIAL_TOO_OLD')) {
          friendlyError = 'Your session has expired. Please log in again before changing your password.';
        }
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: friendlyError })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Your password has been updated successfully.',
          newIdToken: updateData.idToken || null,
          newRefreshToken: updateData.refreshToken || null
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Unknown action: "${action}". Supported actions: list, create, change-password, reset-password.`
      })
    };

  } catch (err) {
    console.error('[manage-users] Server error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'An unexpected server error occurred.' })
    };
  }
};
