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
    // QUERY PARAMETER VALIDATION (Month & Year)
    // =========================================================================
    const query = event.queryStringParameters || {};
    const todayKL = getTodayDateStringKL(); // 'YYYY-MM-DD'
    const [currYearKL, currMonthKL] = todayKL.split('-').map(Number);

    let selectedMonth = parseInt(query.month, 10);
    let selectedYear = parseInt(query.year, 10);

    // Validate Month (0 = January, 11 = December)
    if (isNaN(selectedMonth) || selectedMonth < 0 || selectedMonth > 11) {
      selectedMonth = currMonthKL - 1; // 0-indexed, default to current month
    }
    // Validate Year (2000 to 2100)
    if (isNaN(selectedYear) || selectedYear < 2000 || selectedYear > 2100) {
      selectedYear = currYearKL;
    }

    const pad2 = n => String(n).padStart(2, '0');
    const monthNum = selectedMonth + 1; // 1 to 12
    const monthKey = `${selectedYear}-${pad2(monthNum)}`;

    const lastDayOfMonth = new Date(Date.UTC(selectedYear, monthNum, 0)).getUTCDate();
    const periodStart = `${monthKey}-01`;
    const periodEnd = `${monthKey}-${pad2(lastDayOfMonth)}`;

    const isCurrentMonth = (selectedYear === currYearKL && monthNum === currMonthKL);
    const isFutureMonth = (selectedYear > currYearKL || (selectedYear === currYearKL && monthNum > currMonthKL));

    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const MONTH_NAMES_SHORT = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const reportingMonthName = MONTH_NAMES[selectedMonth];
    const reportingMonthShort = MONTH_NAMES_SHORT[selectedMonth];

    // =========================================================================
    // KPI 1: PM SCHEDULE COMPLIANCE RATE (Reporting Period)
    // =========================================================================
    let scheduledDueCount = 0;
    let scheduledOnTimeCompletedCount = 0;

    for (const record of pmRecords) {
      const type = (record.maintenanceType || '').trim();
      if (type !== 'Scheduled') continue;

      const schedDate = (record.scheduledDate || '').trim().slice(0, 10);
      if (!schedDate || !/^\d{4}-\d{2}-\d{2}$/.test(schedDate)) continue;

      // Filter strictly to scheduled tasks within the reporting period
      if (schedDate < periodStart || schedDate > periodEnd) continue;

      const isCompleted = (record.status || '').trim() === 'Completed';

      // For current month: do not include future dates as completed work
      if (isCurrentMonth) {
        if (schedDate <= todayKL || isCompleted) {
          scheduledDueCount++;
          if (isCompleted && record.completionDateTime) {
            const compDateStr = (record.completionDateTime || '').trim().slice(0, 10);
            if (compDateStr && compDateStr <= schedDate) {
              scheduledOnTimeCompletedCount++;
            }
          }
        }
      } else if (isFutureMonth) {
        if (isCompleted) {
          scheduledDueCount++;
          const compDateStr = (record.completionDateTime || '').trim().slice(0, 10);
          if (compDateStr && compDateStr <= schedDate) {
            scheduledOnTimeCompletedCount++;
          }
        }
      } else {
        // Historical month: all tasks scheduled in that month were due
        scheduledDueCount++;
        if (isCompleted && record.completionDateTime) {
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

    // =========================================================================
    // KPI 2: COMPLETED PMs (Reporting Period)
    // =========================================================================
    let completedInPeriod = 0;
    for (const record of pmRecords) {
      if ((record.status || '').trim() !== 'Completed') continue;
      const compDate = (record.completionDateTime || record.scheduledDate || '').trim().slice(0, 10);
      if (compDate >= periodStart && compDate <= periodEnd) {
        completedInPeriod++;
      }
    }

    // =========================================================================
    // KPI 3: BREAKDOWN VS PM RATIO (Reporting Period)
    // =========================================================================
    let breakdownsInPeriod = 0;
    for (const record of bdRecords) {
      const rawTime = (record.startTime || record.reportedAt || record.time || '').trim().slice(0, 10);
      if (rawTime >= periodStart && rawTime <= periodEnd) {
        breakdownsInPeriod++;
      } else if (!rawTime && record.month && (record.month.trim() === reportingMonthName || record.month.trim() === reportingMonthShort)) {
        breakdownsInPeriod++;
      }
    }

    let bdPmRatioStr = 'N/A';
    if (breakdownsInPeriod === 0 && completedInPeriod === 0) {
      bdPmRatioStr = '0 : 0';
    } else if (breakdownsInPeriod === 0) {
      bdPmRatioStr = `0 : ${completedInPeriod}`;
    } else if (completedInPeriod === 0) {
      bdPmRatioStr = `${breakdownsInPeriod} : 0`;
    } else {
      const normalizedRatio = (completedInPeriod / breakdownsInPeriod).toFixed(1);
      bdPmRatioStr = `1 : ${normalizedRatio}`;
    }

    // =========================================================================
    // KPI 4: OVERDUE TASKS (Reporting Period)
    // =========================================================================
    let overdueCount = 0;
    for (const record of pmRecords) {
      const status = (record.status || '').trim();
      const type = (record.maintenanceType || '').trim();
      if (type !== 'Scheduled') continue;

      const schedDate = (record.scheduledDate || '').trim().slice(0, 10);
      if (!schedDate || !/^\d{4}-\d{2}-\d{2}$/.test(schedDate)) continue;

      if (isCurrentMonth) {
        // Ongoing tasks past due date
        if ((status === 'Pending' || status === 'In Progress') && schedDate < todayKL) {
          overdueCount++;
        }
      } else if (isFutureMonth) {
        // Future month: none overdue
      } else {
        // Historical month: scheduled in period and not completed on time
        if (schedDate >= periodStart && schedDate <= periodEnd) {
          if (status !== 'Completed') {
            overdueCount++;
          } else if (record.completionDateTime) {
            const compDateStr = (record.completionDateTime || '').trim().slice(0, 10);
            if (compDateStr && compDateStr > schedDate) {
              overdueCount++;
            }
          }
        }
      }
    }

    // =========================================================================
    // INFOGRAPHIC 1: MONTHLY PM COMPLETION TREND (12 Months ending in selected month)
    // =========================================================================
    const monthsList = [];
    const monthCounts = {};

    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(selectedYear, selectedMonth - i, 1));
      const yr = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const key = `${yr}-${pad2(m + 1)}`;
      const label = `${MONTH_NAMES_SHORT[m]} ${String(yr).slice(-2)}`;
      monthsList.push({ key, label });
      monthCounts[key] = 0;
    }

    for (const record of pmRecords) {
      if ((record.status || '').trim() !== 'Completed') continue;
      const compStr = (record.completionDateTime || record.scheduledDate || '').trim();
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
    const trendSub = `Historical completed maintenance count (12 Months ending ${reportingMonthShort} ${selectedYear})`;

    // =========================================================================
    // INFOGRAPHIC 2: MAINTENANCE TYPE DISTRIBUTION (Selected Month & Year)
    // =========================================================================
    let scheduledCount = 0;
    let unscheduledCount = 0;

    for (const record of pmRecords) {
      const sDate = (record.scheduledDate || record.completionDateTime || '').trim().slice(0, 10);
      if (sDate < periodStart || sDate > periodEnd) continue;

      const type = (record.maintenanceType || '').trim();
      if (type === 'Scheduled') {
        scheduledCount++;
      } else if (type === 'Unscheduled') {
        unscheduledCount++;
      }
    }

    const typeDistSub = `Scheduled vs. Unscheduled PM workload ratio (${reportingMonthShort} ${selectedYear})`;

    // =========================================================================
    // INFOGRAPHIC 3: PM COMPLETION BY MACHINE (Top 5 Ranked in Selected Month)
    // =========================================================================
    const machineCounts = {};
    for (const record of pmRecords) {
      if ((record.status || '').trim() !== 'Completed') continue;
      const compDate = (record.completionDateTime || record.scheduledDate || '').trim().slice(0, 10);
      if (compDate < periodStart || compDate > periodEnd) continue;

      const machine = (record.machine || 'Unknown').trim();
      machineCounts[machine] = (machineCounts[machine] || 0) + 1;
    }

    const sortedMachines = Object.keys(machineCounts)
      .map(name => ({ name, count: machineCounts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const machineRankSub = `Top machines ranked by completed PM volume (${reportingMonthShort} ${selectedYear})`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timeZone: 'Asia/Kuala_Lumpur (UTC+8)',
        selectedMonth,
        selectedYear,
        reportingPeriod: `${reportingMonthName} ${selectedYear}`,
        reportingPeriodShort: `${reportingMonthShort} ${selectedYear}`,
        kpis: {
          complianceRate: complianceRateStr,
          complianceRateSub: `Scheduled PMs met on deadline (${reportingMonthShort} ${selectedYear})`,
          completedInPeriod,
          completedPast30Days: completedInPeriod, // Backwards compatibility
          completedInPeriodTitle: `Completed PMs (${reportingMonthShort} ${selectedYear})`,
          completedInPeriodSub: `Actual closed tasks in ${reportingMonthShort} ${selectedYear}`,
          breakdownVsPmRatio: bdPmRatioStr,
          rawRatioLabel: `Breakdowns : Completed PMs (${reportingMonthShort} ${selectedYear})`,
          breakdownCount: breakdownsInPeriod,
          completedPmCount: completedInPeriod,
          overdueTasks: overdueCount,
          overdueSub: isCurrentMonth ? 'Scheduled tasks past due date' : `Overdue tasks in ${reportingMonthShort} ${selectedYear}`
        },
        charts: {
          monthlyTrend: {
            labels: monthlyTrendLabels,
            data: monthlyTrendData,
            subtitle: trendSub
          },
          typeDistribution: {
            labels: ['Scheduled', 'Unscheduled'],
            data: [scheduledCount, unscheduledCount],
            subtitle: typeDistSub
          },
          machineRank: {
            labels: sortedMachines.map(m => m.name),
            data: sortedMachines.map(m => m.count),
            subtitle: machineRankSub
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
