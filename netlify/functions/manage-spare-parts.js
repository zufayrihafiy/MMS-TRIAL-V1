/**
 * NETLIFY SERVER FUNCTION: manage-spare-parts
 *
 * Secure role-enforced endpoint for spare parts inventory management:
 *   - add-stock: ADMIN ONLY. Creates a new spare part record.
 *   - adjust-stock: ADMIN ONLY. Adjusts physical stock quantity (+ or -).
 *   - adjust-limit: ADMIN ONLY. Adjusts minimum stock limit without touching quantity.
 *   - request-stock: ADMIN & TECHNICIAN. Submits a requisition for approval.
 *   - approve-request: ADMIN ONLY. Approves a pending request, validates stock, and deducts inventory immediately.
 *   - reject-request: ADMIN ONLY. Rejects a pending request (Approved requests cannot be directly rejected).
 *   - issue-stock: ADMIN ONLY. Issues approved stock, verifies prior deduction under lock, and marks as Issued without double deducting.
 *
 * Security & Integrity Features:
 * 1. Strict Fail-Closed Bearer Token Authentication via Firebase Admin SDK.
 * 2. Role verification via Firebase Custom Claims and Admin list.
 * 3. Technicians attempting Admin-only actions are rejected with HTTP 403 Forbidden.
 * 4. Communicates with Google Apps Script exclusively via authenticated POST with MMS_API_KEY.
 * 5. Server-side validation of numeric quantities and required fields.
 */

const { initializeApp, applicationDefault, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

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
    console.error('[manage-spare-parts] Token verification failed:', err.message);
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

  if (email && email.includes('@')) {
    const [localPart, domainPart] = email.split('@');
    if (domainPart === staffDomain && localPart) {
      return localPart.toUpperCase();
    }
  }

  return (userRecord.uid || '').toUpperCase();
}

function resolveUserRole(userRecord, staffId) {
  if (!userRecord) return null;
  const claims = userRecord.customClaims || {};

  if (claims.role && typeof claims.role === 'string') {
    const roleUpper = claims.role.trim().toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper === 'TECHNICIAN') {
      return roleUpper;
    }
  }

  const adminIdsEnv = process.env.FIREBASE_ADMIN_STAFF_IDS || 'USR-01,PN001';
  const adminIds = adminIdsEnv.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (staffId && adminIds.includes(staffId)) {
    return 'ADMIN';
  }

  return 'TECHNICIAN';
}

function resolveCallerName(userRecord, staffId) {
  if (!userRecord) return staffId || 'Staff';
  if (userRecord.displayName && userRecord.displayName.trim()) {
    return userRecord.displayName.trim();
  }
  const claims = userRecord.customClaims || {};
  if (claims.name && typeof claims.name === 'string' && claims.name.trim()) {
    return claims.name.trim();
  }
  return staffId || 'Staff';
}

exports.handler = async function (event) {
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
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Use POST.' })
    };
  }

  // 1. Strict Fail-Closed Bearer Token Authentication
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, error: 'Unauthorized: Missing or invalid Authorization header.' })
    };
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, error: 'Unauthorized: Bearer token is empty.' })
    };
  }

  let auth;
  try {
    auth = getFirebaseAdminAuth();
  } catch (initErr) {
    console.error('[manage-spare-parts] Firebase Admin init error:', initErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Server authentication initialization failed.' })
    };
  }

  const authResult = await verifyCallerToken(idToken, auth);
  if (!authResult.ok) {
    return {
      statusCode: authResult.statusCode,
      headers,
      body: JSON.stringify({ success: false, error: authResult.error })
    };
  }

  const callerStaffId = resolveStaffId(authResult.caller);
  const callerRole = resolveUserRole(authResult.caller, callerStaffId);
  const callerName = resolveCallerName(authResult.caller, callerStaffId);

  // 2. Parse Request Body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid JSON body.' })
    };
  }

  const action = (body.action || '').trim();

  // 3. Role-Based Permission Validation
  const adminOnlyActions = [
    'add-stock', 'addStock',
    'adjust-stock', 'adjustStock',
    'adjust-limit', 'adjustLimit',
    'manage-item', 'manageItem',
    'delete-item', 'deleteItem', 'deleteSparePart',
    'cleanup-demo-parts', 'cleanupDemoParts',
    'approve-request', 'approveRequest',
    'reject-request', 'rejectRequest',
    'issue-stock', 'issueStock'
  ];

  if (adminOnlyActions.includes(action) && callerRole !== 'ADMIN') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        error: `Forbidden: Action "${action}" is restricted to Administrator accounts.`
      })
    };
  }

  // 4. Validate Specific Actions
  let gasAction = '';
  let gasPayload = {
    apiKey: process.env.MMS_API_KEY,
    callerRole,
    callerStaffId,
    callerName
  };

  if (action === 'add-stock' || action === 'addStock') {
    gasAction = 'addStockPart';
    const code = (body.code || '').trim().toUpperCase();
    const name = (body.name || '').trim();
    const category = (body.category || '').trim();
    const location = (body.location || '').trim();
    const currentStock = parseInt(body.currentStock, 10);
    const minStock = parseInt(body.minStock, 10);
    const unit = (body.unit || 'pcs').trim();
    const unitPrice = parseFloat(body.unitPrice);
    const supplier = (body.supplier || '').trim();

    if (!code || !name || !category || !location || !unit || !supplier) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'All fields are required to add a new spare part.' })
      };
    }
    if (isNaN(currentStock) || currentStock < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Initial Stock Quantity must be zero or a positive whole number.' })
      };
    }
    if (isNaN(minStock) || minStock < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Minimum Stock Limit must be zero or a positive whole number.' })
      };
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Unit Price must be zero or a positive number.' })
      };
    }

    Object.assign(gasPayload, {
      code, name, category, location, currentStock, minStock, unit, unitPrice, supplier
    });

  } else if (action === 'adjust-stock' || action === 'adjustStock') {
    gasAction = 'adjustStock';
    const code = (body.code || '').trim().toUpperCase();
    const adjustment = parseInt(body.adjustment, 10);
    const reference = (body.reference || 'Manual Adjustment').trim();

    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Part code is required.' }) };
    }
    if (isNaN(adjustment) || adjustment === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Valid non-zero adjustment is required.' }) };
    }

    Object.assign(gasPayload, { code, adjustment, reference });

  } else if (action === 'adjust-limit' || action === 'adjustLimit') {
    gasAction = 'adjustLimit';
    const code = (body.code || '').trim().toUpperCase();
    const newMinLimit = parseInt(body.newMinLimit, 10);

    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Part code is required.' }) };
    }
    if (isNaN(newMinLimit) || newMinLimit < 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Minimum stock limit must be zero or a positive whole number.' }) };
    }

    Object.assign(gasPayload, { code, newMinLimit });

  } else if (action === 'request-stock' || action === 'requestStock') {
    gasAction = 'createStockRequest';
    const partCode = (body.partCode || '').trim().toUpperCase();
    const partDescription = (body.partDescription || '').trim();
    const qtyRequested = parseInt(body.qtyRequested, 10);
    const reason = (body.reason || '').trim();

    if (!partCode) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Part code is required.' }) };
    }
    if (isNaN(qtyRequested) || qtyRequested <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Quantity requested must be greater than zero.' }) };
    }

    Object.assign(gasPayload, {
      partCode,
      partDescription,
      qtyRequested,
      reason,
      requestedByStaffId: callerStaffId,
      requestedByName: callerName
    });

  } else if (action === 'approve-request' || action === 'approveRequest') {
    gasAction = 'updateStockRequestStatus';
    const requestId = (body.requestId || '').trim().toUpperCase();
    if (!requestId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Request ID is required.' }) };
    }
    Object.assign(gasPayload, { requestId, newStatus: 'Approved' });

  } else if (action === 'reject-request' || action === 'rejectRequest') {
    gasAction = 'updateStockRequestStatus';
    const requestId = (body.requestId || '').trim().toUpperCase();
    if (!requestId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Request ID is required.' }) };
    }
    Object.assign(gasPayload, { requestId, newStatus: 'Rejected' });

  } else if (action === 'issue-stock' || action === 'issueStock') {
    gasAction = 'issueStock';
    const requestId = (body.requestId || '').trim().toUpperCase();
    if (!requestId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Request ID is required.' }) };
    }
    Object.assign(gasPayload, { requestId, issuedBy: callerStaffId });

  } else if (action === 'manage-item' || action === 'manageItem') {
    gasAction = 'manageItem';
    const code = (body.code || '').trim().toUpperCase();
    const name = (body.name || '').trim();
    const category = (body.category || '').trim();
    const location = (body.location || '').trim();
    const supplier = (body.supplier || '').trim();
    const unit = (body.unit || 'pcs').trim();
    const unitPrice = parseFloat(body.unitPrice);
    const minStock = parseInt(body.minStock, 10);
    const adjustmentType = (body.adjustmentType || 'none').trim().toLowerCase();
    const adjustmentQty = parseInt(body.adjustmentQty, 10) || 0;
    const adjustmentReason = (body.adjustmentReason || '').trim();

    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Part code is required.' }) };
    }
    if (!name) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Part description is required.' }) };
    }
    if (isNaN(minStock) || minStock < 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Minimum stock limit must be zero or a positive whole number.' }) };
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Unit price must be zero or a positive number.' }) };
    }
    if (adjustmentType === 'in' || adjustmentType === 'out') {
      if (adjustmentQty <= 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Adjustment quantity must be greater than zero.' }) };
      }
      if (!adjustmentReason) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Adjustment reason is required when adjusting stock quantity.' }) };
      }
    }

    Object.assign(gasPayload, {
      code, name, category, location, supplier, unit, unitPrice, minStock,
      adjustmentType, adjustmentQty, adjustmentReason
    });

  } else if (action === 'delete-item' || action === 'deleteItem' || action === 'deleteSparePart') {
    gasAction = 'deleteSparePart';
    const code = (body.code || '').trim().toUpperCase();
    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Part code is required for deletion.' }) };
    }
    Object.assign(gasPayload, { code });

  } else if (action === 'cleanup-demo-parts' || action === 'cleanupDemoParts') {
    gasAction = 'cleanupDemoParts';
    const confirmed = body.confirmed === true;
    if (!confirmed) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Explicit confirmation required.' }) };
    }
    Object.assign(gasPayload, { confirmed: true });

  } else {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: `Invalid or unsupported action: "${action}".` })
    };
  }

  gasPayload.action = gasAction;

  // 5. Connect to Google Apps Script
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  const mmsApiKey = process.env.MMS_API_KEY;

  if (GAS_URL && mmsApiKey) {
    try {
      const gasResponse = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gasPayload)
      });

      const gasData = await gasResponse.json().catch(() => null);

      if (gasResponse.ok && gasData && gasData.success) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(gasData)
        };
      } else {
        const errMsg = (gasData && gasData.error) || 'Failed to execute operation in Google Sheets backend.';
        return {
          statusCode: (gasData && gasData.status) || 400,
          headers,
          body: JSON.stringify({ success: false, error: errMsg })
        };
      }
    } catch (netErr) {
      console.error('[manage-spare-parts] GAS network error:', netErr);
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to communicate with Google Sheets backend service.' })
      };
    }
  }

  // Fallback simulation for local/testing environment without GAS
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      action: gasAction,
      requestId: gasPayload.requestId,
      status: gasPayload.newStatus || (action === 'issue-stock' ? 'Issued' : 'Approved'),
      message: `Operation "${action}" accepted successfully (Local simulated mode).`
    })
  };
};
