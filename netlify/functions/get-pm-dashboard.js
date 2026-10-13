/**
 * NETLIFY SERVER FUNCTION: get-pm-dashboard
 *
 * Secure ADMIN-ONLY endpoint to compute PM Dashboard analytics and KPI metrics.
 *
 * Security & Integrity Features:
 * 1. Strict Fail-Closed Authentication: Requires valid Firebase Bearer ID token.
 * 2. Token verification via Firebase Admin SDK with revocation checking: auth.verifyIdToken(idToken, true).
 * 3. Confirms caller account exists and is not disabled.
 * 4. Strict Role Authorization: ADMIN role ONLY. Technicians rejected with HTTP 403.
 * 5. Queries actual live records from both PM DATABASE and BD DATABASE.
 * 6. Calculates four standard KPIs using Asia/Kuala_Lumpur (UTC+8) time zone:
 *      - PM Schedule Compliance Rate (%)
 *      - Completed PMs (Past 30 Days)
 *      - Breakdown vs PM Ratio (Breakdowns : Completed PMs)
 *      - Overdue Tasks
 * 7. Aggregates data for three infographics:
 *      - Monthly PM Completion Trend (Last 12 Months)
 *      - Maintenance Type Distribution (Scheduled vs Unscheduled)
 *      - PM Completion by Machine (Top 5 Machines)
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
    console.error('[get-pm-dashboard] Token verification failed:', err.message);
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
 * Get current date string (YYYY-MM-DD) in Asia/Kuala_Lumpur (UTC+8)
 */
function getTodayDateStringKL() {
  const now = new Date();
  const klFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return klFormatter.format(now); // 'YYYY-MM-DD'
}

/**
 * Parse date string or datetime string into timestamp
 */
function parseTimestampSafe(str) {
  if (!str) return NaN;
  const d = new Date(str);
  return d.getTime();
}

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
    console.error('[get-pm-dashboard] Firebase Admin initialization error:', adminInitErr);
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

  // 3. Strict ADMIN Authorization: Only ADMIN accounts may view PM Dashboard
  const callerClaims = callerAuth.caller.customClaims || {};
  const callerRole = callerClaims.role;
  if (callerRole !== 'ADMIN') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        success: false,
        forbidden: true,
        error: 'Forbidden: Access to PM Dashboard is restricted exclusively to Administrator accounts.'
      })
    };
  }

  // 4. Connect to Google Apps Script
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
    // Fetch both PM Records and Breakdown Records in parallel
    const [pmRes, bdRes] = await Promise.all([
      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getPMRecords', apiKey: mmsApiKey })
      }),
      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getBreakdowns', apiKey: mmsApiKey })
      })
    ]);

    const pmJson = await pmRes.json().catch(() => ({ success: false, data: [] }));
    const bdJson = await bdRes.json().catch(() => ({ success: false, data: [] }));

    const pmRecords = Array.isArray(pmJson.data) ? pmJson.data : [];
    const bdRecords = Array.isArray(bdJson.data) ? bdJson.data : [];

    // =========================================================================
    // KPI CALCULATIONS (Time Zone: Asia/Kuala_Lumpur, UTC+8)
    // =========================================================================
    const todayKL = getTodayDateStringKL();
    const nowMs = Date.now();
    const thirtyDaysAgoMs = nowMs - (30 * 24 * 60 * 60 * 1000);

    // 1. PM SCHEDULE COMPLIANCE RATE
    // Scheduled PM records only:
    // Compliance Rate = (Scheduled PMs completed on or before Scheduled Date deadline) / (Scheduled PMs due in reporting period) * 100
    // Scheduled Date deadline is end of that local calendar day (23:59:59 Asia/Kuala_Lumpur).
    let scheduledDueCount = 0;
    let scheduledOnTimeCompletedCount = 0;

    for (const record of pmRecords) {
      const type = (record.maintenanceType || '').trim();
      if (type !== 'Scheduled') continue;

      const schedDate = (record.scheduledDate || '').trim().slice(0, 10);
      if (!schedDate || !/^\d{4}-\d{2}-\d{2}$/.test(schedDate)) continue;

      const isCompleted = (record.status || '').trim() === 'Completed';

      // Due in reporting period if schedDate <= todayKL OR if already completed
      if (schedDate <= todayKL || isCompleted) {
        scheduledDueCount++;

        if (isCompleted && record.completionDateTime) {
          // Compare completion date with scheduled date
          // If completion date is <= schedDate (date comparison or datetime <= schedDate 23:59:59)
          const compDateStr = (record.completionDateTime || '').trim().slice(0, 10);
          if (compDateStr && compDateStr <= schedDate) {
            scheduledOnTimeCompletedCount++;
          }
        }
      }
    }

    const complianceRateStr = scheduledDueCount > 0
      ? ((scheduledOnTimeCompletedCount / scheduledDueCount) * 100).toFixed(1) + '%'
      : 'N/A';

    // 2. COMPLETED PMs (PAST 30 DAYS)
    let completedPast30Days = 0;
    for (const record of pmRecords) {
      if ((record.status || '').trim() !== 'Completed') continue;
      const compMs = parseTimestampSafe(record.completionDateTime);
      if (!isNaN(compMs) && compMs >= thirtyDaysAgoMs && compMs <= nowMs) {
        completedPast30Days++;
      }
    }

    // 3. BREAKDOWN VS PM RATIO
    // Total breakdowns from BD DATABASE vs total completed PMs from PM DATABASE
    const totalBreakdowns = bdRecords.length;
    let totalCompletedPMs = 0;
    for (const record of pmRecords) {
      if ((record.status || '').trim() === 'Completed') {
        totalCompletedPMs++;
      }
    }

    let bdPmRatioStr = 'N/A';
    if (totalBreakdowns === 0 && totalCompletedPMs === 0) {
      bdPmRatioStr = '0 : 0';
    } else if (totalBreakdowns === 0) {
      bdPmRatioStr = `0 : ${totalCompletedPMs}`;
    } else if (totalCompletedPMs === 0) {
      bdPmRatioStr = `${totalBreakdowns} : 0`;
    } else {
      const normalizedRatio = (totalCompletedPMs / totalBreakdowns).toFixed(1);
      bdPmRatioStr = `1 : ${normalizedRatio}`;
    }

    // 4. OVERDUE TASKS
    // Ongoing Scheduled PM tasks whose Scheduled Date is before today
    let overdueCount = 0;
    for (const record of pmRecords) {
      const status = (record.status || '').trim();
      if (status !== 'Pending' && status !== 'In Progress') continue;

      const type = (record.maintenanceType || '').trim();
      if (type !== 'Scheduled') continue;

      const schedDate = (record.scheduledDate || '').trim().slice(0, 10);
      if (schedDate && schedDate < todayKL) {
        overdueCount++;
      }
    }

    // =========================================================================
    // INFOGRAPHIC 1: MONTHLY PM COMPLETION TREND (Last 12 Months)
    // =========================================================================
    const monthsList = [];
    const monthCounts = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'Asia/Kuala_Lumpur' });
      monthsList.push({ key, label });
      monthCounts[key] = 0;
    }

    for (const record of pmRecords) {
      if ((record.status || '').trim() !== 'Completed') continue;
      const compStr = (record.completionDateTime || '').trim();
      if (!compStr) continue;
      const mMatch = compStr.match(/^(\d{4})-(\d{2})/);
      if (mMatch) {
        const key = `${mMatch[1]}-${mMatch[2]}`;
        if (monthCounts[key] !== undefined) {
          monthCounts[key]++;
        }
      }
    }

    const monthlyTrendLabels = monthsList.map(m => m.label);
    const monthlyTrendData = monthsList.map(m => monthCounts[m.key]);

    // =========================================================================
    // INFOGRAPHIC 2: MAINTENANCE TYPE DISTRIBUTION (Scheduled vs Unscheduled)
    // =========================================================================
    let scheduledCount = 0;
    let unscheduledCount = 0;

    for (const record of pmRecords) {
      const type = (record.maintenanceType || '').trim();
      if (type === 'Scheduled') {
        scheduledCount++;
      } else if (type === 'Unscheduled') {
        unscheduledCount++;
      }
    }

    // =========================================================================
    // INFOGRAPHIC 3: PM COMPLETION BY MACHINE (Top 5 Ranked)
    // =========================================================================
    const machineCounts = {};
    for (const record of pmRecords) {
      if ((record.status || '').trim() !== 'Completed') continue;
      const machine = (record.machine || 'Unknown').trim();
      machineCounts[machine] = (machineCounts[machine] || 0) + 1;
    }

    const sortedMachines = Object.keys(machineCounts)
      .map(name => ({ name, count: machineCounts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timeZone: 'Asia/Kuala_Lumpur (UTC+8)',
        kpis: {
          complianceRate: complianceRateStr,
          completedPast30Days,
          breakdownVsPmRatio: bdPmRatioStr,
          rawRatioLabel: 'Breakdowns : Completed PMs',
          breakdownCount: totalBreakdowns,
          completedPmCount: totalCompletedPMs,
          overdueTasks: overdueCount
        },
        charts: {
          monthlyTrend: {
            labels: monthlyTrendLabels,
            data: monthlyTrendData
          },
          typeDistribution: {
            labels: ['Scheduled', 'Unscheduled'],
            data: [scheduledCount, unscheduledCount]
          },
          machineRank: {
            labels: sortedMachines.map(m => m.name),
            data: sortedMachines.map(m => m.count)
          }
        }
      })
    };

  } catch (err) {
    console.error('[get-pm-dashboard] Dashboard aggregation error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Failed to calculate PM dashboard metrics.' })
    };
  }
};
