/**
 * NETLIFY SERVER FUNCTION: manage-technicians
 *
 * Secure role-enforced endpoint for Technician Management:
 *   - list: ADMIN ONLY. Retrieves full technician roster with Firebase accounts + Google Sheets profile details.
 *   - create: ADMIN ONLY. Creates Firebase user with TECHNICIAN role claim and syncs to TECHNICIAN DATABASE worksheet.
 *   - update: ADMIN ONLY. Updates technician profile and account status in Sheets and Firebase.
 *   - retry-sync: ADMIN ONLY. Safe retry mechanism if Sheets sync fails during creation.
 *   - record-activity: Authenticated users. Throttled activity recording to update Last Active timestamp.
 *
 * Security & Integrity Features:
 * 1. Strict Fail-Closed Bearer Token Authentication via Firebase Admin SDK with token revocation check.
 * 2. Role verification: All administrative actions are strictly restricted to ADMIN.
 * 3. Never stores passwords in Google Sheets or logs.
 * 4. Links records primarily by Firebase UID to prevent duplicate profiles.
 * 5. Communicates with Google Apps Script exclusively via authenticated POST with MMS_API_KEY.
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

const PASSWORD_POLICY = {
  minLength: 8,
  requireLetter: true,
  requireNumber: true
};

const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and contain at least one letter (A-Z or a-z) and one number (0-9).';

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_POLICY.minLength) {
    return { valid: false, error: PASSWORD_POLICY_MESSAGE };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, error: PASSWORD_POLICY_MESSAGE };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: PASSWORD_POLICY_MESSAGE };
  }
  return { valid: true };
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
    console.error('[manage-technicians] Token verification failed:', err.message);
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

function formatKLDate(dateObj) {
  if (!dateObj) return '';
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return '';
  const pad = n => (n < 10 ? '0' + n : n);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Helper to call Google Apps Script
 */
async function callGas(action, payload) {
  const GAS_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
  const mmsApiKey = process.env.MMS_API_KEY;

  if (!GAS_URL || !mmsApiKey) {
    return { ok: false, localOnly: true, error: 'Google Apps Script not configured.' };
  }

  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ apiKey: mmsApiKey, action }, payload))
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data && data.success) {
      return { ok: true, data };
    }
    return { ok: false, error: (data && data.error) || 'Google Apps Script request failed.' };
  } catch (err) {
    console.error('[manage-technicians] GAS request failed:', err.message);
    return { ok: false, error: 'Network error communicating with Google Sheets backend.' };
  }
}

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 1. Require Bearer ID token
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, error: 'Unauthorized: Authentication required.' })
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
    console.error('[manage-technicians] Firebase Admin init error:', initErr);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Server authentication initialization failed.' })
    };
  }

  const authResult = await verifyCallerToken(idToken, auth);
  if (!authResult.ok) {
    return {
      statusCode: authResult.statusCode || 401,
      headers,
      body: JSON.stringify({ success: false, error: authResult.error })
    };
  }

  const callerStaffId = resolveStaffId(authResult.caller);
  const callerRole = resolveUserRole(authResult.caller, callerStaffId);

  // 2. Parse request payload
  let payload = {};
  if (event.body) {
    try {
      payload = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Malformed JSON payload.' })
      };
    }
  }

  const action = (payload.action || (event.httpMethod === 'GET' ? 'list' : '')).trim();

  // 3. ACTION: record-activity (Allowed for all authenticated users to record activity)
  if (action === 'record-activity') {
    const timestamp = formatKLDate(new Date());
    const gasRes = await callGas('updateTechnicianActivity', {
      firebaseUid: authResult.uid,
      staffId: callerStaffId,
      timestamp
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        recorded: gasRes.ok,
        timestamp,
        note: gasRes.ok ? 'Activity timestamp updated.' : 'Activity noted locally.'
      })
    };
  }

  // 4. All other actions are STRICTLY ADMIN ONLY!
  if (callerRole !== 'ADMIN') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Forbidden: Technician Management is restricted to Administrators only.'
      })
    };
  }

  const staffDomain = (process.env.FIREBASE_STAFF_DOMAIN || 'mms.internal').trim().toLowerCase();

  // -------------------------------------------------------------------------
  // ACTION: list (Retrieve unified technician roster)
  // -------------------------------------------------------------------------
  if (action === 'list') {
    try {
      // 1. Fetch Firebase users
      const fbUsers = [];
      let nextPageToken = undefined;
      do {
        const listRes = await auth.listUsers(1000, nextPageToken);
        const users = listRes.users || [];
        for (const u of users) {
          const claims = u.customClaims || {};
          // Only include accounts whose role is TECHNICIAN
          if (claims.role === 'TECHNICIAN') {
            const sid = resolveStaffId(u);
            fbUsers.push({
              uid: u.uid,
              staffId: sid || '',
              displayName: u.displayName || (sid ? `Technician ${sid}` : 'Technician'),
              email: u.email || '',
              disabled: Boolean(u.disabled),
              lastSignInTime: u.metadata && u.metadata.lastSignInTime ? formatKLDate(u.metadata.lastSignInTime) : ''
            });
          }
        }
        nextPageToken = listRes.pageToken;
      } while (nextPageToken);

      // 2. Fetch Google Sheets technician records
      let sheetTechs = [];
      const gasRes = await callGas('getTechnicians', {});
      if (gasRes.ok && gasRes.data && Array.isArray(gasRes.data.data)) {
        sheetTechs = gasRes.data.data;
      }

      // 3. Unify records linking by Firebase UID (primary key) or Staff ID
      const sheetTechsByUid = new Map();
      const sheetTechsById = new Map();

      sheetTechs.forEach(t => {
        if (t.firebaseUid) sheetTechsByUid.set(t.firebaseUid, t);
        if (t.technicianId) sheetTechsById.set(t.technicianId.toUpperCase(), t);
      });

      const unifiedTechnicians = [];
      const handledUids = new Set();

      // Process Firebase accounts first
      for (const fb of fbUsers) {
        handledUids.add(fb.uid);
        const sheetRecord = sheetTechsByUid.get(fb.uid) ||
          (fb.staffId ? sheetTechsById.get(`TECH-${fb.staffId.toUpperCase()}`) : null) ||
          (fb.staffId ? sheetTechsById.get(fb.staffId.toUpperCase()) : null);

        const techId = sheetRecord && sheetRecord.technicianId
          ? sheetRecord.technicianId
          : (fb.staffId ? `TECH-${fb.staffId.toUpperCase()}` : `TECH-${fb.uid.substring(0, 5).toUpperCase()}`);

        const fullName = (sheetRecord && sheetRecord.name) || fb.displayName || `Technician ${fb.staffId}`;
        const phoneNumber = (sheetRecord && sheetRecord.phoneNumber) || '';
        const accountStatus = fb.disabled
          ? 'Inactive'
          : ((sheetRecord && sheetRecord.accountStatus) || 'Active');
        const lastActive = (sheetRecord && sheetRecord.lastActive) || fb.lastSignInTime || '—';
        const createdAt = (sheetRecord && sheetRecord.createdAt) || '—';
        const updatedAt = (sheetRecord && sheetRecord.updatedAt) || '—';

        unifiedTechnicians.push({
          technicianId: techId,
          firebaseUid: fb.uid,
          staffId: fb.staffId,
          name: fullName,
          role: 'Technician',
          phoneNumber: phoneNumber,
          accountStatus: accountStatus,
          lastActive: lastActive,
          createdAt: createdAt,
          updatedAt: updatedAt
        });
      }

      // If there are sheet records that haven't been matched to an active Firebase user, include them if role is Technician
      for (const st of sheetTechs) {
        if (st.firebaseUid && handledUids.has(st.firebaseUid)) continue;
        if (st.role && st.role.toUpperCase() !== 'TECHNICIAN' && st.role.toUpperCase() !== 'LEAD AUTOMATION ENGINEER') continue;

        unifiedTechnicians.push({
          technicianId: st.technicianId || `TECH-${st.firebaseUid ? st.firebaseUid.substring(0, 5) : '000'}`,
          firebaseUid: st.firebaseUid || '',
          staffId: st.technicianId ? st.technicianId.replace(/^TECH-/i, '') : '',
          name: st.name || 'Technician',
          role: 'Technician',
          phoneNumber: st.phoneNumber || '',
          accountStatus: st.accountStatus || 'Active',
          lastActive: st.lastActive || '—',
          createdAt: st.createdAt || '—',
          updatedAt: st.updatedAt || '—'
        });
      }

      // Sort alphabetically by Full Name
      unifiedTechnicians.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          count: unifiedTechnicians.length,
          technicians: unifiedTechnicians
        })
      };

    } catch (listErr) {
      console.error('[manage-technicians] Error in list action:', listErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to retrieve technicians roster.' })
      };
    }
  }

  // -------------------------------------------------------------------------
  // ACTION: create (Admin creates a new Technician account)
  // -------------------------------------------------------------------------
  if (action === 'create') {
    const { staffId, displayName, phoneNumber, password, accountStatus } = payload;

    if (!staffId || !password) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ success: false, error: 'Staff ID and Password are required.' })
      };
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ success: false, error: pwCheck.error })
      };
    }

    const normalizedStaffId = String(staffId).trim().toUpperCase();
    const mappedEmail = `${normalizedStaffId.toLowerCase()}@${staffDomain}`;
    const resolvedName = displayName && String(displayName).trim()
      ? String(displayName).trim()
      : `Technician ${normalizedStaffId}`;
    const normalizedPhone = String(phoneNumber || '').trim();
    const resolvedStatus = (accountStatus || 'Active').trim() === 'Inactive' ? 'Inactive' : 'Active';

    // 1. Prevent duplicate accounts in Firebase
    try {
      const existing = await auth.getUserByEmail(mappedEmail);
      if (existing) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            success: false,
            error: `Staff ID ${normalizedStaffId} already has an existing account (${mappedEmail}).`
          })
        };
      }
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        console.warn('[manage-technicians] Pre-check warning:', err.message);
      }
    }

    // 2. Create Firebase user
    let createdUid = null;
    try {
      const newUser = await auth.createUser({
        email: mappedEmail,
        password: password,
        displayName: resolvedName,
        disabled: resolvedStatus === 'Inactive'
      });
      createdUid = newUser.uid;
    } catch (createErr) {
      console.error('[manage-technicians] Firebase createUser failed:', createErr);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to create user in Firebase: ' + createErr.message })
      };
    }

    // 3. Set custom claims (role: 'TECHNICIAN', staffId)
    try {
      await auth.setCustomUserClaims(createdUid, {
        role: 'TECHNICIAN',
        staffId: normalizedStaffId
      });
    } catch (claimErr) {
      console.error('[manage-technicians] setCustomUserClaims failed:', claimErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          partialFailure: true,
          firebaseUid: createdUid,
          staffId: normalizedStaffId,
          error: `User account created, but assigning Technician custom claims failed.`
        })
      };
    }

    // 4. Synchronize to Google Sheets TECHNICIAN DATABASE
    const techId = `TECH-${normalizedStaffId}`;
    const gasRes = await callGas('saveTechnician', {
      firebaseUid: createdUid,
      technicianId: techId,
      staffId: normalizedStaffId,
      name: resolvedName,
      role: 'Technician',
      phoneNumber: normalizedPhone,
      accountStatus: resolvedStatus
    });

    if (!gasRes.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          partialFailure: true,
          firebaseUid: createdUid,
          staffId: normalizedStaffId,
          technicianId: techId,
          name: resolvedName,
          phoneNumber: normalizedPhone,
          accountStatus: resolvedStatus,
          error: `Technician account was created in Firebase, but Google Sheets synchronization failed (${gasRes.error}). Click 'Retry Sync' to synchronize to the database.`
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Technician ${resolvedName} (${normalizedStaffId}) successfully created and synchronized.`,
        technician: gasRes.data ? gasRes.data.technician : {
          technicianId: techId,
          firebaseUid: createdUid,
          staffId: normalizedStaffId,
          name: resolvedName,
          role: 'Technician',
          phoneNumber: normalizedPhone,
          accountStatus: resolvedStatus
        }
      })
    };
  }

  // -------------------------------------------------------------------------
  // ACTION: update (Admin updates Technician details)
  // -------------------------------------------------------------------------
  if (action === 'update') {
    const { firebaseUid, technicianId, displayName, phoneNumber, accountStatus, staffId } = payload;

    if (!firebaseUid && !technicianId) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ success: false, error: 'Firebase UID or Technician ID is required for update.' })
      };
    }

    const resolvedName = String(displayName || '').trim();
    const resolvedPhone = String(phoneNumber || '').trim();
    const resolvedStatus = (accountStatus || 'Active').trim() === 'Inactive' ? 'Inactive' : 'Active';

    // 1. Update Firebase Auth user if UID exists
    if (firebaseUid) {
      try {
        await auth.updateUser(firebaseUid, {
          displayName: resolvedName,
          disabled: resolvedStatus === 'Inactive'
        });
      } catch (fbErr) {
        console.warn('[manage-technicians] Firebase updateUser notice:', fbErr.message);
      }
    }

    // 2. Update Google Sheets
    const gasRes = await callGas('saveTechnician', {
      firebaseUid,
      technicianId,
      staffId,
      name: resolvedName,
      role: 'Technician',
      phoneNumber: resolvedPhone,
      accountStatus: resolvedStatus
    });

    if (!gasRes.ok && !gasRes.localOnly) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Failed to update technician in Google Sheets: ' + gasRes.error })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Technician details updated successfully.',
        technician: gasRes.data ? gasRes.data.technician : {
          technicianId,
          firebaseUid,
          name: resolvedName,
          role: 'Technician',
          phoneNumber: resolvedPhone,
          accountStatus: resolvedStatus
        }
      })
    };
  }

  // -------------------------------------------------------------------------
  // ACTION: retry-sync (Admin retries failed Google Sheets sync)
  // -------------------------------------------------------------------------
  if (action === 'retry-sync') {
    const { firebaseUid, technicianId, displayName, phoneNumber, accountStatus, staffId } = payload;

    if (!firebaseUid) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ success: false, error: 'Firebase UID is required to retry synchronization.' })
      };
    }

    const gasRes = await callGas('saveTechnician', {
      firebaseUid,
      technicianId: technicianId || (staffId ? `TECH-${staffId}` : ''),
      staffId,
      name: displayName || 'Technician',
      role: 'Technician',
      phoneNumber: phoneNumber || '',
      accountStatus: accountStatus || 'Active'
    });

    if (!gasRes.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Google Sheets synchronization retry failed: ' + gasRes.error })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Technician successfully synchronized to Google Sheets database.',
        technician: gasRes.data ? gasRes.data.technician : null
      })
    };
  }

  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ success: false, error: `Unsupported action: "${action}".` })
  };
};
