/**
 * NETLIFY SERVER FUNCTION: get-breakdowns
 *
 * Secure authenticated endpoint to fetch breakdown records from Google Sheets
 * (Spreadsheet: MMS DATABASE -> Worksheet: BD DATABASE, Columns A to L).
 *
 * Security:
 * 1. Validates Firebase Authentication Bearer token.
 * 2. Authenticates identity and resolves Staff ID & Role.
 * 3. Keeps GOOGLE_APPS_SCRIPT_URL and MMS_API_KEY secure on server.
 * 4. Communicates with Google Apps Script exclusively via authenticated POST requests.
 * 5. Strictly validates the 'success' flag from Google Apps Script response.
 * 6. Never exposes credentials or raw backend errors to client browser.
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

  // 1. Verify Firebase Bearer Token
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: true,
        error: 'Unauthorized: Authentication required. You must be logged in to access breakdown records.'
      })
    };
  }

  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const apiKey = process.env.FIREBASE_WEB_API_KEY;

  if (apiKey) {
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
            error: 'Unauthorized: Invalid or expired authentication token. Please log in again.'
          })
        };
      }
    } catch (verifyErr) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token verification failed: ' + verifyErr.message
        })
      };
    }
  }

  // 2. Verify Google Apps Script & API Key Backend Configuration
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

  // 3. Query Google Apps Script via Authenticated POST Request
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
      gasResult = { success: false, error: 'Invalid response from backend database service.' };
    }

    // STRICT CHECK: Do not treat HTTP 200 alone as success!
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        source: 'Google Sheets BD DATABASE',
        count: Array.isArray(gasResult.data) ? gasResult.data.length : 0,
        data: gasResult.data || []
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal Netlify Server Function Error: ' + err.message
      })
    };
  }
};
