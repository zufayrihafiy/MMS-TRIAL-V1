/**
 * NETLIFY SERVER FUNCTION: auth-login
 *
 * Secure server-side Staff ID + Password authentication mapped to Firebase Authentication.
 *
 * Security Features:
 * 1. Passwords are never stored in LocalStorage, Google Sheets, or GitHub.
 * 2. Staff ID is securely mapped to a trusted domain identifier on the server side.
 * 3. User roles (ADMIN / TECHNICIAN) are resolved and signed in Firebase ID tokens / custom claims.
 * 4. Fake authentication and demo bypasses are strictly forbidden.
 */

function getInitials(name) {
  if (!name) return 'MM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
      body: JSON.stringify({
        success: false,
        error: 'Method Not Allowed. Only POST is supported.'
      })
    };
  }

  // 1. Verify Firebase configuration
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        configured: false,
        code: 'FIREBASE_CONFIG_MISSING',
        error: 'Firebase Authentication is not configured. Setup required: Please set FIREBASE_WEB_API_KEY in Netlify environment variables.'
      })
    };
  }

  // 2. Parse request payload
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Malformed JSON payload.'
      })
    };
  }

  const { staffId, password } = payload;
  if (!staffId || !password) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Staff ID and Password are both required.'
      })
    };
  }

  const rawStaffId = String(staffId).trim();
  const normalizedStaffId = rawStaffId.toUpperCase();
  const staffDomain = (process.env.FIREBASE_STAFF_DOMAIN || 'mms.internal').trim().toLowerCase();

  // Secure mapping: Staff ID -> Firebase Auth Email identifier
  const mappedEmail = `${normalizedStaffId.toLowerCase()}@${staffDomain}`;

  try {
    // 3. Authenticate with Firebase Auth REST API (signInWithPassword)
    const firebaseSignInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
    const signInResponse = await fetch(firebaseSignInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: mappedEmail,
        password: String(password),
        returnSecureToken: true
      })
    });

    const signInData = await signInResponse.json();

    if (!signInResponse.ok || !signInData.idToken) {
      const errorMsg = (signInData.error && signInData.error.message) || 'AUTHENTICATION_FAILED';

      let userFriendlyError = 'Invalid Staff ID or Password. Please verify and try again.';
      if (errorMsg.includes('TOO_MANY_ATTEMPTS')) {
        userFriendlyError = 'Too many failed login attempts. Account temporarily locked for security. Please try again later or contact administrator.';
      } else if (errorMsg.includes('USER_DISABLED')) {
        userFriendlyError = 'This Staff account has been deactivated. Please contact the System Administrator.';
      }

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: userFriendlyError,
          code: errorMsg
        })
      };
    }

    // 4. Retrieve user account attributes & custom claims via lookup
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`;
    const lookupResponse = await fetch(lookupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: signInData.idToken })
    });

    let userRecord = null;
    if (lookupResponse.ok) {
      const lookupData = await lookupResponse.json();
      if (lookupData.users && lookupData.users.length > 0) {
        userRecord = lookupData.users[0];
      }
    }

    // 5. Parse Custom Claims and determine role (ADMIN vs TECHNICIAN)
    let customClaims = {};
    if (userRecord && userRecord.customAttributes) {
      try {
        customClaims = JSON.parse(userRecord.customAttributes);
      } catch (e) {
        customClaims = {};
      }
    }

    // Determine user role strictly from trusted Firebase custom claims.
    // Allowed roles: ADMIN, TECHNICIAN.
    // Reject users with missing, empty, or unauthorized roles (STAFF, GUEST, OPERATOR, etc.).
    const rawRole = customClaims.role;
    if (!rawRole || (rawRole !== 'ADMIN' && rawRole !== 'TECHNICIAN')) {
      console.warn(`[auth-login] Login rejected for Staff ID ${normalizedStaffId}: Missing or unauthorized MMS role claim "${rawRole}".`);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Access Denied: Your account does not have an authorized MMS role (ADMIN or TECHNICIAN). Please contact an administrator.',
          code: 'ROLE_UNAUTHORIZED'
        })
      };
    }

    const roleCode = rawRole;
    const resolvedRole = roleCode === 'ADMIN' ? 'Administrator' : 'Technician';
    const resolvedName = (userRecord && userRecord.displayName) || customClaims.name || signInData.displayName || `Staff ${normalizedStaffId}`;
    const initials = getInitials(resolvedName);

    const userProfile = {
      staffId: normalizedStaffId,
      name: resolvedName,
      role: resolvedRole,
      roleCode: roleCode,
      initials: initials,
      email: mappedEmail,
      localId: signInData.localId
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token: signInData.idToken,
        refreshToken: signInData.refreshToken,
        expiresIn: signInData.expiresIn,
        user: userProfile
      })
    };

  } catch (err) {
    console.error('[auth-login] Server error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'An unexpected server error occurred during authentication.'
      })
    };
  }
};
