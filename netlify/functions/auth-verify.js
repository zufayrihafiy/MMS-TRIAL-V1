/**
 * NETLIFY SERVER FUNCTION: auth-verify
 *
 * Verifies active Firebase Authentication session token and returns fresh user profile.
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        valid: false,
        configured: false,
        error: 'Firebase Authentication is not configured in Netlify environment variables.'
      })
    };
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

  try {
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(lookupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const data = await response.json();
    if (!response.ok || !data.users || data.users.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          valid: false,
          error: 'Authentication token is invalid or has expired. Please log in again.'
        })
      };
    }

    const userRecord = data.users[0];
    const email = userRecord.email || '';
    const staffIdFromEmail = email.split('@')[0].toUpperCase();

    let customClaims = {};
    if (userRecord.customAttributes) {
      try {
        customClaims = JSON.parse(userRecord.customAttributes);
      } catch (e) {
        customClaims = {};
      }
    }

    const staffId = customClaims.staffId || staffIdFromEmail;

    // Determine user role strictly from Firebase Custom Claims.
    // Do not grant ADMIN access based on Staff ID.

    const roleCode =
      customClaims.role === 'ADMIN'
        ? 'ADMIN'
        : 'TECHNICIAN';

    const resolvedRole = roleCode === 'ADMIN' ? 'Administrator' : 'Technician';
    const resolvedName = userRecord.displayName || customClaims.name || `Staff ${staffId}`;

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
          email,
          localId: userRecord.localId
        }
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        valid: false,
        error: 'Token verification server error: ' + err.message
      })
    };
  }
};
