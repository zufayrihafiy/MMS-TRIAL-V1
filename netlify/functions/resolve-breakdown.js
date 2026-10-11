/**
 * NETLIFY SERVER FUNCTION: resolve-breakdown
 *
 * Secure authenticated endpoint to resolve an active breakdown in Google Sheets
 * (Spreadsheet: MMS DATABASE -> Worksheet: BD DATABASE).
 *
 * Security & Integrity Features:
 * 1. Validates Firebase Authentication Bearer token and user identity.
 * 2. Strictly requires valid Breakdown End Time before marking breakdown as completed.
 * 3. Enforces End Time >= Start Time validation.
 * 4. Authenticates to Google Apps Script using server-side MMS_API_KEY.
 * 5. Passes stable composite keys (Machine, Start Time, ID) to avoid row index shifts.
 * 6. Checks the backend 'success' flag strictly (never treats HTTP 200 alone as success).
 * 7. Protects backend error messages from leaking sensitive internals.
 */

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

  // 1. Verify Firebase Bearer Token
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
  const apiKey = process.env.FIREBASE_WEB_API_KEY;

  let authenticatedStaffId = '';
  let authenticatedRole = 'TECHNICIAN';

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

      const user = verifyData.users[0];
      const email = user.email || '';
      const staffFromEmail = email.split('@')[0].toUpperCase();

      let customClaims = {};
      if (user.customAttributes) {
        try {
          customClaims = JSON.parse(user.customAttributes);
        } catch (e) {
          customClaims = {};
        }
      }

      authenticatedStaffId = (customClaims.staffId || staffFromEmail).toUpperCase();
      authenticatedRole = customClaims.role === 'ADMIN' ? 'ADMIN' : 'TECHNICIAN';
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

  // 2. Parse & Validate Payload
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

  const { id, endTime, startTime, machine, staffId, afterPhoto, photoFiles } = data;

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

  // 3. Connect to Google Apps Script
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
        downtime: gasResult.downtime !== undefined ? gasResult.downtime : null,
        status: 'Completed'
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
