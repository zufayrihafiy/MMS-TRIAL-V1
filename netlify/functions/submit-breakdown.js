/**
 * NETLIFY SERVER FUNCTION: submit-breakdown
 *
 * Secure authenticated backend handler connecting MMS Breakdown Reporting
 * to Google Apps Script (Google Sheets: MMS DATABASE -> Worksheet: BD DATABASE).
 *
 * Security & Identity Enforcement:
 * 1. Requires valid Firebase Authentication Bearer ID token verified via Firebase Admin SDK
 *    with revocation checking: auth.verifyIdToken(idToken, true).
 * 2. Strict fail-closed design: Never skips authentication.
 * 3. Confirms caller account exists and is not disabled.
 * 4. Resolves authenticated Staff ID strictly from customClaims.staffId or internal domain email.
 * 5. Enforces that reports cannot be submitted under an impersonated Staff ID.
 * 6. Keeps MMS_API_KEY secure on server; communicates via authenticated POST to Google Apps Script.
 * 7. Generic server errors returned to frontend; detailed errors in server logs only.
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

/**
 * Verify caller identity token via Firebase Admin SDK with revocation checking.
 */
async function verifyCallerToken(idToken, authInstance) {
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

    return { ok: true, uid: decoded.uid, caller };
  } catch (err) {
    console.error('[submit-breakdown] Token verification failed:', err.message);
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

/**
 * Resolve Staff ID strictly from customClaims.staffId or internal domain email prefix.
 */
function resolveStaffId(userRecord) {
  if (!userRecord) return '';
  const claims = userRecord.customClaims || {};

  if (claims.staffId && typeof claims.staffId === 'string' && claims.staffId.trim()) {
    return claims.staffId.trim().toUpperCase();
  }

  const staffDomain = (process.env.FIREBASE_STAFF_DOMAIN || 'mms.internal').trim().toLowerCase();
  const email = (userRecord.email || '').trim().toLowerCase();

  if (email) {
    const atIndex = email.lastIndexOf('@');
    if (atIndex > 0) {
      const domain = email.slice(atIndex + 1);
      const prefix = email.slice(0, atIndex);
      if (domain === staffDomain && prefix) {
        return prefix.toUpperCase();
      }
    }
  }

  return '';
}

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
  if (!idToken) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: true,
        error: 'Unauthorized: Missing authentication token.'
      })
    };
  }

  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (adminInitErr) {
    console.error('[submit-breakdown] Firebase Admin initialization error:', adminInitErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Authentication service is temporarily unavailable.'
      })
    };
  }

  const callerAuth = await verifyCallerToken(idToken, auth);
  if (!callerAuth.ok) {
    return {
      statusCode: callerAuth.statusCode || 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: callerAuth.statusCode !== 403,
        error: callerAuth.error
      })
    };
  }

  const user = callerAuth.caller;
  const customClaims = user.customClaims || {};
  const callerRole = customClaims.role;

  // Strict role authorization: Only ADMIN and TECHNICIAN are permitted to report breakdowns
  if (!callerRole || (callerRole !== 'ADMIN' && callerRole !== 'TECHNICIAN')) {
    console.warn(`[submit-breakdown] Authorization rejected for caller ${user.uid}: Role "${callerRole}" is not authorized.`);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        forbidden: true,
        error: 'Forbidden: Reporting breakdowns is restricted to authorized TECHNICIAN or ADMIN accounts.'
      })
    };
  }

  const authenticatedRole = callerRole;
  const authenticatedStaffId = resolveStaffId(user);
  const authenticatedName = user.displayName || authenticatedStaffId;

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

  // =========================================================================
  // 3. PARSE AND VALIDATE PAYLOAD
  // =========================================================================
  let data;
  try {
    data = JSON.parse(event.body || '{}');
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

  // Allowed validation constants
  const ALLOWED_MACHINES = [
    'VIM 01', 'VIM 02', 'VIM 03', 'VIM 04', 'VIM 05',
    'VIM 06', 'VIM 07', 'VIM 08', 'VIM 09', 'VIM 10',
    'VIM 11', 'VIM 12', 'VIM 13', 'VIM 14', 'VIM 15',
    'Turn Table + KUKA', 'Robot Arm 1', 'Robot Arm 2',
    'Oven', 'Compressor', 'Cooling Tower', 'Crane'
  ];
  const ALLOWED_PRIORITIES = ['Critical', 'Medium', 'Low'];
  const ALLOWED_CATEGORIES = ['Mechanical', 'Electrical', 'Hydraulic', 'Pneumatic', 'Parametic'];

  // Mandatory fields
  const { staffId, machine, startTime, priority, category, description } = data;
  if (!machine || !startTime || !priority || !category || !description) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Validation failed: machine, startTime, priority, category, and description are required.'
      })
    };
  }

  const validatedMachine = String(machine).trim();
  if (!ALLOWED_MACHINES.includes(validatedMachine)) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Validation failed: Machine "${validatedMachine}" is not a recognized machine.`
      })
    };
  }

  const validatedPriority = String(priority).trim();
  if (!ALLOWED_PRIORITIES.includes(validatedPriority)) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Validation failed: Priority "${validatedPriority}" is invalid. Must be Critical, Medium, or Low.`
      })
    };
  }

  const validatedCategory = String(category).trim();
  if (!ALLOWED_CATEGORIES.includes(validatedCategory)) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Validation failed: Problem Category "${validatedCategory}" is invalid. Must be Mechanical, Electrical, Hydraulic, Pneumatic, or Parametic.`
      })
    };
  }

  // ANTI-IMPERSONATION SECURITY CHECK:
  // A technician can NEVER submit a report under another Staff ID.
  // The verified Staff ID must come directly from the authenticated Firebase identity.
  if (!authenticatedStaffId) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Forbidden: Could not resolve a verified Staff ID from your authenticated user account.'
      })
    };
  }

  const submittedStaffId = staffId ? String(staffId).trim().toUpperCase() : authenticatedStaffId;
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

  const finalStaffId = authenticatedRole === 'ADMIN' ? submittedStaffId : authenticatedStaffId;

  // ENFORCE SERVER-SIDE DEFAULT VALUES FOR NEW BREAKDOWN:
  const ENFORCED_STATUS = 'Repair';
  const ENFORCED_END_TIME = '';
  const ENFORCED_DOWNTIME = '';
  const ENFORCED_AFTER_PHOTO = '';
  const ENFORCED_ASSIGNED_TECH = '';

  // =========================================================================
  // 4. FORWARD SECURELY TO GOOGLE SHEETS (COLUMNS A TO N)
  // =========================================================================
  try {
    const gasPayload = {
      action: 'create',
      sheetName: 'BD DATABASE',
      spreadsheetName: 'MMS DATABASE',
      apiKey: mmsApiKey,
      columns: {
        time: data.time || new Date().toISOString(),         // Column A: Time
        month: data.month || '',                             // Column B: Month
        staffId: finalStaffId,                               // Column C: Verified Staff ID
        machine: validatedMachine,                           // Column D: Machine
        startTime: data.startTime,                           // Column E: Breakdown Start Time
        endTime: ENFORCED_END_TIME,                          // Column F: Breakdown End Time (Enforced empty)
        downtime: ENFORCED_DOWNTIME,                         // Column G: Downtime (Enforced empty)
        category: validatedCategory,                         // Column H: Problem Category
        beforePhoto: data.beforePhoto || '',                 // Column I: Before Photo Ref / URL
        afterPhoto: ENFORCED_AFTER_PHOTO,                    // Column J: After Photo (Enforced empty)
        description: String(data.description).trim(),        // Column K: Problem Description
        status: ENFORCED_STATUS,                             // Column L: Status (Enforced 'Repair')
        priority: validatedPriority,                         // Column M: Priority (Enforced Critical, Medium, Low)
        assignedTech: ENFORCED_ASSIGNED_TECH                 // Column N: Assigned Technician (Enforced empty on creation)
      },
      photoFiles: {
        before: data.photoFiles?.before || null,
        after: null                                          // Strictly null on creation
      },
      submittedBy: {
        staffId: authenticatedStaffId,
        name: authenticatedName,
        role: authenticatedRole
      }
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

    if (!gasResponse.ok || !gasResult || gasResult.success !== true) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: (gasResult && (gasResult.error || gasResult.message)) || 'Google Apps Script failed to append row to BD DATABASE.'
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
          staffId: finalStaffId,
          machine: validatedMachine,
          priority: validatedPriority,
          status: ENFORCED_STATUS,
          time: data.time
        }
      })
    };
  } catch (err) {
    console.error('[submit-breakdown] Backend request error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'An unexpected server error occurred while submitting breakdown report.'
      })
    };
  }
};
