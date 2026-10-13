/**
 * NETLIFY SERVER FUNCTION: create-pm-record
 *
 * Secure ADMIN-ONLY endpoint to create a new Preventive Maintenance record in PM DATABASE.
 *
 * Security & Integrity Features:
 * 1. Strict Fail-Closed Authentication: Requires valid Firebase Bearer ID token.
 * 2. Token verification via Firebase Admin SDK with revocation checking.
 * 3. Strict Role Authorization: ADMIN role ONLY. Technicians rejected with HTTP 403.
 * 4. Verifies assigned technician exists in Firebase as active user with role "TECHNICIAN".
 * 5. Resolves verified technician Staff ID (never arbitrary client input).
 * 6. Validates all inputs (Machine in ALLOWED_MACHINES, Maintenance Type strictly Scheduled/Unscheduled).
 * 7. Automatically records Created By from authenticated Admin identity.
 * 8. Status automatically set to Pending.
 */

const { initializeApp, applicationDefault, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const ALLOWED_MACHINES = [
  'VIM 01', 'VIM 02', 'VIM 03', 'VIM 04', 'VIM 05',
  'VIM 06', 'VIM 07', 'VIM 08', 'VIM 09', 'VIM 10',
  'VIM 11', 'VIM 12', 'VIM 13', 'VIM 14', 'VIM 15',
  'Turn Table + KUKA', 'Robot Arm 1', 'Robot Arm 2',
  'Oven', 'Compressor', 'Cooling Tower', 'Crane'
];

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
    console.error('[create-pm-record] Token verification failed:', err.message);
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

function resolveStaffId(userRecord) {
  if (!userRecord) return null;
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

  return null;
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
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Only POST is supported.' })
    };
  }

  // 1. Require Bearer Token
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        unauthenticated: true,
        error: 'Unauthorized: Authentication required.'
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

  // 2. Fail-Closed Authentication
  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (adminInitErr) {
    console.error('[create-pm-record] Firebase Admin initialization error:', adminInitErr);
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

  // 3. Strict ADMIN Authorization: Only ADMIN accounts may create PM records
  const callerClaims = callerAuth.caller.customClaims || {};
  const callerRole = String(callerClaims.role || '').trim().toUpperCase();
  if (callerRole !== 'ADMIN') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        forbidden: true,
        error: 'Forbidden: Creating preventive maintenance records is restricted to Administrator accounts.'
      })
    };
  }

  const adminStaffId = (resolveStaffId(callerAuth.caller) || callerAuth.caller.uid || 'ADMIN').trim().toUpperCase();

  // 4. Parse & Validate Payload
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid JSON body.' })
    };
  }

  const machine = String(payload.machine || '').trim();
  const maintenanceType = String(payload.maintenanceType || '').trim();
  const taskTitle = String(payload.taskTitle || '').trim();
  const taskDescription = String(payload.taskDescription || '').trim();
  const scheduledDate = String(payload.scheduledDate || '').trim();
  const assignedTechInput = String(payload.assignedTech || '').trim();

  if (!machine || !ALLOWED_MACHINES.includes(machine)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid Machine selection. Must be an approved MMS machine.' })
    };
  }

  if (maintenanceType !== 'Scheduled' && maintenanceType !== 'Unscheduled') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid Maintenance Type. Must be either Scheduled or Unscheduled.' })
    };
  }

  if (!taskTitle || taskTitle.length < 3 || taskTitle.length > 250) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Task Title is required (between 3 and 250 characters).' })
    };
  }

  if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Valid Scheduled Date (YYYY-MM-DD) is required.' })
    };
  }

  if (!assignedTechInput) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Assigned Technician is required.' })
    };
  }

  // 5. Verify Assigned Technician via Firebase Admin SDK
  // The input may be technician Staff ID or Firebase UID
  let verifiedTechStaffId = null;
  try {
    const listUsersResult = await auth.listUsers(1000);
    const techUser = listUsersResult.users.find(u => {
      if (u.disabled) return false;
      const uClaims = u.customClaims || {};
      if (uClaims.role !== 'TECHNICIAN') return false;
      const sId = resolveStaffId(u);
      return (sId && sId.toUpperCase() === assignedTechInput.toUpperCase()) || u.uid === assignedTechInput;
    });

    if (!techUser) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: `Assigned technician "${assignedTechInput}" is not an active registered Technician.` })
      };
    }

    verifiedTechStaffId = resolveStaffId(techUser);
    if (!verifiedTechStaffId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: `Assigned technician lacks a valid Staff ID in Firebase.` })
      };
    }
  } catch (techErr) {
    console.error('[create-pm-record] Technician verification error:', techErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Failed to verify technician account with Firebase.' })
    };
  }

  // 6. Connect to Google Apps Script
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  const mmsApiKey = process.env.MMS_API_KEY;
  if (!GAS_URL || !mmsApiKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ success: false, error: 'Backend database service is not configured.' })
    };
  }

  try {
    const gasPayload = {
      action: 'createPMRecord',
      apiKey: mmsApiKey,
      machine,
      maintenanceType,
      taskTitle,
      taskDescription,
      scheduledDate,
      assignedTech: verifiedTechStaffId,
      createdBy: adminStaffId,
      callerRole: 'ADMIN',
      callerStaffId: adminStaffId
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
      gasResult = { success: false, error: 'Invalid response from database service.' };
    }

    if (!gasResponse.ok || !gasResult || gasResult.success !== true) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: (gasResult && gasResult.error) || 'Failed to save PM record to database.'
        })
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        pmCode: gasResult.pmCode,
        message: gasResult.message || `Preventive Maintenance ${gasResult.pmCode} created successfully.`
      })
    };

  } catch (err) {
    console.error('[create-pm-record] Backend request failed:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'An unexpected server error occurred while creating PM record.' })
    };
  }
};
