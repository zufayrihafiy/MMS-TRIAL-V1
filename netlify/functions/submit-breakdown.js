/**
 * NETLIFY SERVER FUNCTION: submit-breakdown
 *
 * Secure authenticated backend handler connecting MMS Breakdown Reporting
 * to Google Apps Script (Google Sheets: MMS DATABASE -> Worksheet: BD DATABASE).
 *
 * Security & Identity Enforcement:
 * 1. Requires valid Firebase Authentication Bearer token.
 * 2. Authenticates identity and resolves Staff ID & Role.
 * 3. Enforces that reports cannot be submitted under an impersonated Staff ID.
 * 4. Checks Google Apps Script backend configuration.
 *
 * Columns Mapping:
 * Column A: Time
 * Column B: Month
 * Column C: Staff ID
 * Column D: Machine
 * Column E: Breakdown Start Time
 * Column F: Breakdown End Time
 * Column G: Downtime (minutes)
 * Column H: Problem Category
 * Column I: Before Photo (Storage Reference / URL)
 * Column J: After Photo (Storage Reference / URL)
 * Column K: Problem Description
 * Column L: Status
 */

exports.handler = async function (event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Preflight CORS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST requests
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

  // =========================================================================
  // 1. SECURE SERVER-SIDE AUTHENTICATION & IDENTITY VERIFICATION
  // =========================================================================
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: true,
        error: 'Unauthorized: Authentication required. You must be logged in with a valid Staff ID to submit breakdown reports.'
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
        error: 'Authentication backend is not configured in Netlify environment variables (FIREBASE_WEB_API_KEY).'
      })
    };
  }

  let authenticatedStaffId = '';
  let authenticatedRole = 'TECHNICIAN';
  let authenticatedName = '';

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

    // Determine role strictly from Firebase Custom Claims.
    // Never assign ADMIN access based on Staff ID.

    authenticatedRole =
      customClaims.role === 'ADMIN'
        ? 'ADMIN'
        : 'TECHNICIAN';

    authenticatedName = user.displayName || customClaims.name || authenticatedStaffId;

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

  // =========================================================================
  // 2. VERIFY GOOGLE APPS SCRIPT BACKEND CONFIGURATION
  // =========================================================================
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!GAS_URL) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        configured: false,
        error: 'Google Apps Script backend URL is not configured in Netlify environment variables (GOOGLE_APPS_SCRIPT_URL). Sheet: MMS DATABASE -> Worksheet: BD DATABASE.'
      })
    };
  }

  // =========================================================================
  // 3. PARSE AND VALIDATE PAYLOAD
  // =========================================================================
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Malformed JSON payload.'
      })
    };
  }

  // Mandatory fields
  const { staffId, machine, startTime, category, description } = data;
  if (!staffId || !machine || !startTime || !category || !description) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Validation failed: staffId, machine, startTime, category, and description are required.'
      })
    };
  }

  // ANTI-IMPERSONATION SECURITY CHECK:
  // A technician can NEVER submit a report under another Staff ID.
  // The submitted staffId must match the authenticated user's Staff ID.
  const submittedStaffId = String(staffId).trim().toUpperCase();
  if (authenticatedRole !== 'ADMIN' && submittedStaffId !== authenticatedStaffId) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Security Violation: Cannot submit breakdown report under another Staff ID (${submittedStaffId}). Your authenticated identity is ${authenticatedStaffId}. Impersonation is prohibited.`
      })
    };
  }

  // Validate status completion condition
  if (data.status === 'Completed' && !data.endTime) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Cannot mark breakdown as Completed without recording Breakdown End Time.'
      })
    };
  }

  // =========================================================================
  // 4. FORWARD SECURELY TO GOOGLE SHEETS (COLUMNS A TO L)
  // =========================================================================
  try {
    const gasPayload = {
      sheetName: 'BD DATABASE',
      spreadsheetName: 'MMS DATABASE',
      apiKey: process.env.MMS_API_KEY || '',
      columns: {
        time: data.time || new Date().toISOString(),         // Column A: Time
        month: data.month || '',                             // Column B: Month
        staffId: submittedStaffId,                           // Column C: Verified Staff ID
        machine: String(data.machine).trim(),                // Column D: Machine
        startTime: data.startTime,                           // Column E: Breakdown Start Time
        endTime: data.endTime || '',                         // Column F: Breakdown End Time
        downtime: data.downtime !== undefined && data.downtime !== null ? String(data.downtime) : '', // Column G: Downtime
        category: String(data.category).trim(),              // Column H: Problem Category
        beforePhoto: data.beforePhoto || '',                 // Column I: Before Photo Ref / URL
        afterPhoto: data.afterPhoto || '',                   // Column J: After Photo Ref / URL
        description: String(data.description).trim(),        // Column K: Problem Description
        status: data.status || 'Repair'                      // Column L: Status
      },
      photoFiles: data.photoFiles || null,
      submittedBy: {
        staffId: authenticatedStaffId,
        name: authenticatedName,
        role: authenticatedRole
      }
    };

    const gasResponse = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gasPayload)
    });

    const gasText = await gasResponse.text();
    let gasResult;
    try {
      gasResult = JSON.parse(gasText);
    } catch (e) {
      gasResult = { success: gasResponse.ok, message: gasText };
    }

    if (!gasResponse.ok || (gasResult && gasResult.success === false)) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: gasResult.error || gasResult.message || 'Google Apps Script failed to append row to BD DATABASE.'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Breakdown report successfully recorded in Google Sheets MMS DATABASE (BD DATABASE).',
        rowId: gasResult.rowId || gasResult.id || null,
        data: {
          staffId: submittedStaffId,
          machine: data.machine,
          status: data.status,
          time: data.time
        }
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
