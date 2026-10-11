/**
 * NETLIFY SERVER FUNCTION: manage-users
 *
 * Secure endpoint for Administrators to view and manage user accounts.
 * Restricted strictly to the ADMIN role.
 */

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
        error: 'Unauthorized: Authentication required.'
      })
    };
  }

  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const apiKey = process.env.FIREBASE_WEB_API_KEY;

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

  try {
    // 1. Verify caller identity
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`;
    const verifyRes = await fetch(lookupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.users || verifyData.users.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid or expired token.'
        })
      };
    }

    const caller = verifyData.users[0];
    const callerEmail = caller.email || '';
    const callerStaffId = callerEmail.split('@')[0].toUpperCase();

    let customClaims = {};
    if (caller.customAttributes) {
      try {
        customClaims = JSON.parse(caller.customAttributes);
      } catch (e) {
        customClaims = {};
      }
    }

    // Verify Administrator role using Firebase Custom Claims only
    const isAdmin = customClaims.role === 'ADMIN';

    // 2. Enforce ADMIN permission
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Forbidden: User account management is restricted to Administrators only.'
        })
      };
    }

    // 3. Return authorized directory metadata
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Admin authorization verified.',
        staffDomain: process.env.FIREBASE_STAFF_DOMAIN || 'mms.internal'
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Server error: ' + err.message
      })
    };
  }
};
