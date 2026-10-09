/**
 * NETLIFY SERVER FUNCTION: submit-breakdown
 * 
 * Secure backend handler connecting MMS Breakdown Reporting
 * to Google Apps Script (Google Sheets: MMS DATABASE -> Worksheet: BD DATABASE).
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
  // Only accept POST requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Method Not Allowed. Only POST is supported.'
      })
    };
  }

  // Verify server-side Google Apps Script backend configuration
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!GAS_URL) {
    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        configured: false,
        error: 'Google Apps Script backend URL is not configured in Netlify environment variables (GOOGLE_APPS_SCRIPT_URL). Sheet: MMS DATABASE -> Worksheet: BD DATABASE.'
      })
    };
  }

  // Parse incoming payload
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Malformed JSON payload.'
      })
    };
  }

  // Validate mandatory fields
  const { staffId, machine, startTime, category, description } = data;
  if (!staffId || !machine || !startTime || !category || !description) {
    return {
      statusCode: 422,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Validation failed: staffId, machine, startTime, category, and description are required.'
      })
    };
  }

  // Validate status completion condition
  if (data.status === 'Completed' && !data.endTime) {
    return {
      statusCode: 422,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Cannot mark breakdown as Completed without recording Breakdown End Time.'
      })
    };
  }

  try {
    // Forward strictly mapped Columns A to L to Google Apps Script
    // GAS will write directly to BD DATABASE in MMS DATABASE
    const gasPayload = {
      sheetName: 'BD DATABASE',
      spreadsheetName: 'MMS DATABASE',
      apiKey: process.env.MMS_API_KEY || '',
      columns: {
        time: data.time || new Date().toISOString(),         // Column A: Time
        month: data.month || '',                             // Column B: Month
        staffId: String(data.staffId).trim(),                // Column C: Staff ID
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
      photoFiles: data.photoFiles || null
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: gasResult.error || gasResult.message || 'Google Apps Script failed to append row to BD DATABASE.'
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Breakdown report successfully recorded in Google Sheets MMS DATABASE (BD DATABASE).',
        rowId: gasResult.rowId || gasResult.id || null,
        data: {
          machine: data.machine,
          status: data.status,
          time: data.time
        }
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal Netlify Server Function Error: ' + err.message
      })
    };
  }
};
