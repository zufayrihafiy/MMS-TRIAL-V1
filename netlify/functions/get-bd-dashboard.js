/**
 * NETLIFY SERVER FUNCTION: get-bd-dashboard
 *
 * Secure server-side endpoint for the Breakdown Management Dashboard.
 *
 * ACCESS CONTROL SPECIFICATION:
 * - Only authenticated ADMIN users can access this endpoint.
 * - Verifies ADMIN permissions strictly using Firebase Custom Claims.
 * - TECHNICIAN users receive HTTP 403 Forbidden.
 * - Queries Google Apps Script via authenticated POST containing server-side MMS_API_KEY.
 * - Validates the 'success' flag from Google Apps Script response.
 */

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

  // 1. Verify Authorization Bearer Token
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: true,
        error: 'Unauthorized: Authentication required to access Breakdown Management Dashboard.'
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
        configured: false,
        error: 'Firebase Authentication is not configured on this server.'
      })
    };
  }

  let callerRole = 'TECHNICIAN';
  let callerStaffId = '';

  try {
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
          unauthenticated: true,
          error: 'Unauthorized: Invalid or expired token.'
        })
      };
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

    callerRole = customClaims.role === 'ADMIN' ? 'ADMIN' : 'TECHNICIAN';
    callerStaffId = (customClaims.staffId || caller.email.split('@')[0]).toUpperCase();
  } catch (verifyErr) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Token verification error: ' + verifyErr.message
      })
    };
  }

  // STRICT SERVER-SIDE AUTHORIZATION CHECK
  // TECHNICIAN users MUST receive HTTP 403 Forbidden!
  if (callerRole !== 'ADMIN') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        forbidden: true,
        error: 'Forbidden: Breakdown Management Dashboard is restricted to Administrator access only. Your current role is TECHNICIAN.'
      })
    };
  }

  // 2. Fetch Live Breakdown Records from Google Sheets Backend via Authenticated POST
  const monthParam = event.queryStringParameters?.month;
  const yearParam = event.queryStringParameters?.year;

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

  let records = [];

  try {
    const gasPayload = {
      action: 'getBreakdowns',
      apiKey: mmsApiKey
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
      gasResult = { success: false, error: 'Invalid response from Google Apps Script BD DATABASE.' };
    }

    // STRICT CHECK: Check gasResult.success field explicitly
    if (!gasResponse.ok || !gasResult || gasResult.success !== true) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: (gasResult && gasResult.error) || 'Failed to fetch breakdown records from Google Apps Script BD DATABASE.'
        })
      };
    }

    records = Array.isArray(gasResult.data) ? gasResult.data : [];
  } catch (gasErr) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Error connecting to Google Apps Script backend: ' + gasErr.message
      })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      authorizedAs: 'ADMIN',
      staffId: callerStaffId,
      month: monthParam,
      year: yearParam,
      hasGasConfigured: Boolean(GAS_URL && mmsApiKey),
      records: records
    })
  };
};
