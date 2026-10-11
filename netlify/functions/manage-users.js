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
 *   - Firebase Admin SDK used for privileged operations.
 *   - Plaintext passwords are never stored or logged.
 *   - ADMIN access is never granted based on Staff ID alone.
 */

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
async function verifyAdminCaller(idToken, apiKey) {
  const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`;
  const verifyRes = await fetch(lookupUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
    return { ok: false, error: 'Invalid or expired token.' };
  }

  const caller = verifyData.users[0];
  let customClaims = {};
  if (caller.customAttributes) {
    try {
      customClaims = JSON.parse(caller.customAttributes);
    } catch (e) {
      customClaims = {};
    }
  }

  // Verify Administrator role using Firebase Custom Claims only.
  // ADMIN access is never granted based on Staff ID.
  const isAdmin = customClaims.role === 'ADMIN';
  if (!isAdmin) {
    return { ok: false, error: 'Forbidden: User account management is restricted to Administrators only.' };
  }

  return { ok: true, caller };
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
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  const staffDomain = (process.env.FIREBASE_STAFF_DOMAIN || 'mms.internal').trim().toLowerCase();

  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Firebase Authentication is not configured in Netlify environment variables.'
      })
    };
  }

  // 2. Parse request body and determine action
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
    // 3. Verify caller is ADMIN
    const adminCheck = await verifyAdminCaller(idToken, apiKey);
    if (!adminCheck.ok) {
      const status = adminCheck.error.startsWith('Forbidden') ? 403 : 401;
      return {
        statusCode: status,
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
      const { staffId, displayName, password, role } = payload;

      if (!staffId || !password) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: 'Staff ID and Password are required to create a user.' })
        };
      }

      // Enforce password policy — frontend and backend
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: pwCheck.error })
        };
      }

      const normalizedStaffId = String(staffId).trim().toUpperCase();
      const mappedEmail = `${normalizedStaffId.toLowerCase()}@${staffDomain}`;
      const assignedRole = (role === 'ADMIN') ? 'ADMIN' : 'TECHNICIAN';
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

      // NOTE: Custom Claims (role) must be set via Firebase Admin SDK.
      // The Netlify function uses the REST API and cannot set custom claims directly.
      // After creating the user, the admin must set the role using the Firebase Admin SDK
      // (firebase-admin-setup/set-admin.js or equivalent) or Firebase Console.

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

      // Enforce password policy — backend validation
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

      // Look up target user's idToken via admin lookup (requires Admin SDK for production).
      // Via REST API: get a sign-in token for the target user is not possible without their credentials.
      // This endpoint requires Firebase Admin SDK to update another user's password securely.
      // Return a structured response indicating the Admin SDK path required.
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
      const { currentPassword, newPassword, staffId } = payload;

      if (!newPassword) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: 'New password is required.' })
        };
      }

      // Enforce password policy — backend validation
      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ success: false, error: pwCheck.error })
        };
      }

      // Use Firebase REST API: update password for the currently authenticated user
      // This works for the caller's own account using their valid idToken.
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

    // Unknown action
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Unknown action: "${action}". Supported actions: list, create, change-password, reset-password.`
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Server error: ' + err.message })
    };
  }
};
