/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: MMS DATABASE - BD DATABASE HANDLER
 * ============================================================================
 * 
 * Target Google Sheets: MMS DATABASE
 * Target Worksheet: BD DATABASE
 * 
 * Security Features:
 * 1. MMS_API_KEY verification read strictly from Script Properties.
 * 2. Unauthenticated public GET access disabled (doGet returns 405).
 * 3. All operations (read, create, resolve) must be authenticated via POST with MMS_API_KEY.
 * 4. Stable composite record matching (Machine + Start Time) for resolving breakdowns,
 *    surviving sheet sorting, insertions, and deletions.
 * 5. Strict state validation: prevents re-completing already Completed breakdowns.
 * 6. Mandatory End Time validation (End Time >= Start Time) and downtime calculation
 *    verification before marking any record as Completed.
 * 7. Preservation of existing Columns A to L and historical data.
 *
 * Column Structure (STRICTLY PRESERVED):
 * Column A: Time
 * Column B: Month
 * Column C: Staff ID
 * Column D: Machine
 * Column E: Breakdown Start Time
 * Column F: Breakdown End Time
 * Column G: Downtime (minutes)
 * Column H: Problem Category
 * Column I: Before Photo
 * Column J: After Photo
 * Column K: Problem Description
 * Column L: Status
 * 
 * Optional backward-compatible extension columns:
 * Column M: Priority (defaults to 'Not Assigned' if empty)
 * Column N: Assigned Technician (defaults to 'Unassigned' if empty)
 *
 * Deployment:
 * 1. Open Google Sheets "MMS DATABASE"
 * 2. Extensions -> Apps Script
 * 3. Project Settings (Gear icon) -> Script Properties -> Add property:
 *    - Property: MMS_API_KEY
 *    - Value: [Your Secret API Key matching Netlify MMS_API_KEY]
 * 4. Paste this code into Code.gs
 * 5. Deploy -> New Deployment -> Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL and set as GOOGLE_APPS_SCRIPT_URL in Netlify
 */

const SHEET_NAME = 'BD DATABASE';
const PM_SHEET_NAME = 'PM DATABASE';
const SP_SHEET_NAME = 'SPARE PARTS DATABASE';
const SM_SHEET_NAME = 'STOCK MOVEMENTS DATABASE';
const SR_SHEET_NAME = 'STOCK REQUESTS DATABASE';
const TECH_SHEET_NAME = 'TECHNICIAN DATABASE';
const DRIVE_FOLDER_NAME = 'MMS Breakdown Photos';

const TECH_HEADERS = [
  'Technician ID',
  'Firebase UID',
  'Full Name',
  'Role',
  'Phone Number',
  'Account Status',
  'Last Active',
  'Created At',
  'Updated At'
];

const PM_HEADERS = [
  'PM Code',
  'Machine / Section',
  'Maintenance Type',
  'Task Title',
  'Task Description',
  'Scheduled Date',
  'Assigned Technician Staff ID',
  'Status',
  'Created By Staff ID',
  'Created At',
  'Completion Date & Time',
  'Maintenance Work Details',
  'Remarks',
  'After Maintenance Photo URL',
  'Completed By Staff ID'
];

const SP_HEADERS = [
  'Part Code',
  'Part Description',
  'Category',
  'Storage Location',
  'Current Stock',
  'Minimum Stock Limit',
  'Unit',
  'Unit Price (RM)',
  'Authorized Supplier',
  'Created At',
  'Updated At',
  'Archive Status'
];

const SM_HEADERS = [
  'Movement ID',
  'Date & Time',
  'Part Code',
  'Part Description',
  'Movement Type',
  'Quantity',
  'Previous Stock',
  'Updated Stock',
  'Authorized Supplier',
  'Updated By',
  'Reference'
];

const SR_HEADERS = [
  'Request ID',
  'Request Date',
  'Requested By Staff ID',
  'Requested By Name',
  'Part Code',
  'Part Description',
  'Quantity Requested',
  'Reason',
  'Status',
  'Approved By',
  'Approved Date',
  'Issued By',
  'Issued Date',
  'Notes'
];

/**
 * Read MMS_API_KEY securely from Script Properties.
 * Never hardcoded in source code!
 */
function getExpectedApiKey() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('MMS_API_KEY');
}

/**
 * Validate incoming API key against Script Properties.
 */
function verifyApiKey(receivedKey) {
  const expectedKey = getExpectedApiKey();
  if (!expectedKey) {
    console.error('MMS_API_KEY is not configured in Google Apps Script Script Properties.');
    return false;
  }
  if (!receivedKey) {
    return false;
  }
  return String(receivedKey).trim() === String(expectedKey).trim();
}

/**
 * Handle GET requests: STRICTLY DISABLED FOR SECURITY
 * Breakdown data cannot be accessed publicly through an unauthenticated GET request.
 */
function doGet(e) {
  return createJsonResponse({
    success: false,
    error: 'Method Not Allowed. Public GET access is disabled. Use authenticated POST requests.'
  }, 405);
}

/**
 * Handle POST requests (Create report, Resolve breakdown, or Read breakdown records)
 * Authenticated via MMS_API_KEY in the JSON payload.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'Empty post data received.' }, 400);
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({ success: false, error: 'Malformed JSON payload.' }, 400);
    }

    // =========================================================================
    // STRICT AUTHENTICATION: VERIFY MMS_API_KEY FOR EVERY BACKEND OPERATION
    // =========================================================================
    const receivedKey = payload.apiKey || (payload.columns && payload.columns.apiKey);
    if (!verifyApiKey(receivedKey)) {
      return createJsonResponse({
        success: false,
        error: 'Unauthorized: Invalid or missing MMS_API_KEY.'
      }, 401);
    }

    // =========================================================================
    // ACTION 1: SECURE DATA READING (getBreakdowns / read)
    // =========================================================================
    if (payload.action === 'getBreakdowns' || payload.action === 'read') {
      return handleGetBreakdowns();
    }

    // =========================================================================
    // ACTION 2: RESOLVE AN EXISTING BREAKDOWN RECORD
    // =========================================================================
    if (payload.action === 'resolve') {
      return handleResolveAction(payload);
    }

    // =========================================================================
    // ACTION 4: GET PM RECORDS (getPMRecords / get-pm)
    // =========================================================================
    if (payload.action === 'getPMRecords' || payload.action === 'get-pm') {
      return handleGetPMRecords();
    }

    // =========================================================================
    // ACTION 5: CREATE PM RECORD (createPMRecord / create-pm)
    // =========================================================================
    if (payload.action === 'createPMRecord' || payload.action === 'create-pm') {
      return handleCreatePMRecord(payload);
    }

    // =========================================================================
    // ACTION 6: RESOLVE PM RECORD (resolvePMRecord / resolve-pm)
    // =========================================================================
    if (payload.action === 'resolvePMRecord' || payload.action === 'resolve-pm') {
      return handleResolvePMRecord(payload);
    }

    // =========================================================================
    // ACTION 7: SPARE PARTS INVENTORY MODULE
    // =========================================================================
    if (payload.action === 'getSpareParts' || payload.action === 'get-spare-parts') {
      return handleGetSpareParts(payload);
    }
    if (payload.action === 'addStockPart' || payload.action === 'add-stock-part') {
      return handleAddStockPart(payload);
    }
    if (payload.action === 'adjustStock' || payload.action === 'adjust-stock') {
      return handleAdjustStock(payload);
    }
    if (payload.action === 'adjustLimit' || payload.action === 'adjust-limit') {
      return handleAdjustLimit(payload);
    }
    if (payload.action === 'manageItem' || payload.action === 'manage-item') {
      return handleManageSparePart(payload);
    }
    if (payload.action === 'deleteSparePart' || payload.action === 'delete-spare-part' || payload.action === 'delete-item') {
      return handleDeleteSparePart(payload);
    }
    if (payload.action === 'cleanupDemoParts' || payload.action === 'cleanup-demo-parts') {
      return handleCleanupDemoParts(payload);
    }
    if (payload.action === 'createStockRequest' || payload.action === 'create-stock-request') {
      return handleCreateStockRequest(payload);
    }
    if (payload.action === 'updateStockRequestStatus' || payload.action === 'update-stock-request-status') {
      return handleUpdateStockRequestStatus(payload);
    }
    if (payload.action === 'issueStock' || payload.action === 'issue-stock') {
      return handleIssueStock(payload);
    }

    // =========================================================================
    // ACTION 8: TECHNICIAN MANAGEMENT MODULE
    // =========================================================================
    if (payload.action === 'getTechnicians' || payload.action === 'get-technicians') {
      return handleGetTechniciansGas(payload);
    }
    if (payload.action === 'saveTechnician' || payload.action === 'save-technician') {
      return handleSaveTechnicianGas(payload);
    }
    if (payload.action === 'updateTechnicianActivity' || payload.action === 'update-technician-activity') {
      return handleRecordTechnicianActivityGas(payload);
    }

    // =========================================================================
    // ACTION 9: SAFE WORKSHEET INITIALIZATION (initializeMMSNewSheets)
    // =========================================================================
    if (payload.action === 'initializeMMSNewSheets' || payload.action === 'initNewSheets') {
      const initReport = initializeMMSNewSheets();
      return createJsonResponse({
        success: true,
        message: 'MMS worksheets verified and initialized (empty data rows).',
        report: initReport
      }, 200);
    }

    // =========================================================================
    // ACTION 3: APPEND NEW BREAKDOWN REPORT (COLUMNS A TO L)
    // =========================================================================
    return handleCreateBreakdown(payload);

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: 'Google Apps Script Error: ' + err.toString()
    }, 500);
  }
}

/**
 * Authenticated retrieval of breakdown records from BD DATABASE
 */
function handleGetBreakdowns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return createJsonResponse({
      success: true,
      count: 0,
      data: []
    }, 200);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({
      success: true,
      count: 0,
      data: []
    }, 200);
  }

  const maxCols = sheet.getMaxColumns();
  if (maxCols < 14) {
    sheet.insertColumnsAfter(maxCols, 14 - maxCols);
  }
  const lastCol = Math.max(14, sheet.getLastColumn());
  const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const values = range.getValues();

  const records = values.map((row, index) => {
    const rowNum = index + 2;
    return {
      id: 'BD-' + rowNum,
      rowNumber: rowNum,
      time: formatCellDate(row[0]),                 // Col A: Time
      month: String(row[1] || ''),                  // Col B: Month
      staffId: String(row[2] || ''),                // Col C: Staff ID
      machine: String(row[3] || ''),                // Col D: Machine
      startTime: formatCellDate(row[4]),            // Col E: Breakdown Start Time
      endTime: formatCellDate(row[5]),              // Col F: Breakdown End Time
      downtime: row[6] !== '' && row[6] !== null && !isNaN(row[6]) ? Number(row[6]) : '', // Col G: Downtime
      category: String(row[7] || ''),               // Col H: Problem Category
      beforePhoto: String(row[8] || ''),            // Col I: Before Photo URL
      afterPhoto: String(row[9] || ''),             // Col J: After Photo URL
      description: String(row[10] || ''),           // Col K: Problem Description
      status: String(row[11] || 'Repair'),          // Col L: Status
      priority: String(row[12] || ''),              // Col M: Priority (Optional)
      assignedTech: String(row[13] || '')           // Col N: Assigned Technician (Optional)
    };
  });

  return createJsonResponse({
    success: true,
    count: records.length,
    data: records
  }, 200);
}

/**
 * Create a new breakdown record in BD DATABASE (Columns A to N)
 */
function handleCreateBreakdown(payload) {
  const cols = payload.columns || payload;

  // Validate required breakdown fields
  const requiredFields = [
    'staffId',
    'machine',
    'startTime',
    'priority',
    'category',
    'description'
  ];

  for (const field of requiredFields) {
    if (
      cols[field] === undefined ||
      cols[field] === null ||
      String(cols[field]).trim() === ''
    ) {
      return createJsonResponse({
        success: false,
        error: `Missing required field: ${field}`
      }, 422);
    }
  }

  // Validate priority strictly (Critical, Medium, Low)
  const validPriorities = ['Critical', 'Medium', 'Low'];
  const priorityVal = String(cols.priority || '').trim();
  if (!validPriorities.includes(priorityVal)) {
    return createJsonResponse({
      success: false,
      error: 'Invalid or missing Priority. Must be Critical, Medium, or Low.'
    }, 422);
  }

  // Validate breakdown start date
  const startDate = new Date(cols.startTime);
  if (isNaN(startDate.getTime())) {
    return createJsonResponse({
      success: false,
      error: 'Invalid Breakdown Start Time'
    }, 422);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Initialize worksheet with official headers if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      'Time',                  // Col A
      'Month',                 // Col B
      'Staff ID',              // Col C
      'Machine',               // Col D
      'Breakdown Start Time',  // Col E
      'Breakdown End Time',    // Col F
      'Downtime (minutes)',    // Col G
      'Problem Category',      // Col H
      'Before Photo',          // Col I
      'After Photo',           // Col J
      'Problem Description',   // Col K
      'Status',                // Col L
      'Priority',              // Col M
      'Assigned Technician'    // Col N
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#062641').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }

  // Ensure worksheet has at least 14 columns for Columns M (Priority) and N (Assigned Technician)
  const maxCols = sheet.getMaxColumns();
  if (maxCols < 14) {
    sheet.insertColumnsAfter(maxCols, 14 - maxCols);
  }

  // Ensure header labels for Columns M & N exist
  const headerRange = sheet.getRange(1, 13, 1, 2);
  const headerVals = headerRange.getValues()[0];
  if (!headerVals[0]) headerRange.getCell(1, 1).setValue('Priority');
  if (!headerVals[1]) headerRange.getCell(1, 2).setValue('Assigned Technician');

  // 1. Process Automatic Date Generation
  const now = new Date();
  const timeFormatted = cols.time || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const monthFormatted = cols.month || Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMMM yyyy');

  // 2. Process Before Photo into Authorized Storage (Google Drive)
  // After Photo is strictly empty on creation; photo upload for completion is handled by resolve.
  let beforePhotoUrl = cols.beforePhoto || '';

  if (payload.photoFiles && payload.photoFiles.before && payload.photoFiles.before.data) {
    beforePhotoUrl = savePhotoToDrive(payload.photoFiles.before, cols.machine, 'BEFORE');
  }

  // 3. Assemble Database Row: STRICTLY COLUMNS A TO N (14 COLUMNS)
  // Enforce server-side defaults for new breakdown:
  // - Col F (Breakdown End Time): empty
  // - Col G (Downtime): empty
  // - Col J (After Photo): empty
  // - Col L (Status): 'Repair'
  // - Col M (Priority): Selected Priority (Critical / Medium / Low)
  // - Col N (Assigned Technician): strictly empty on creation
  const rowData = [
    timeFormatted,                           // Column A: Time
    monthFormatted,                          // Column B: Month
    cols.staffId || '',                      // Column C: Staff ID
    cols.machine || '',                      // Column D: Machine
    cols.startTime || '',                    // Column E: Breakdown Start Time
    '',                                      // Column F: Breakdown End Time (Enforced empty)
    '',                                      // Column G: Downtime (minutes) (Enforced empty)
    cols.category || '',                     // Column H: Problem Category
    beforePhotoUrl,                          // Column I: Before Photo
    '',                                      // Column J: After Photo (Enforced empty)
    cols.description || '',                  // Column K: Problem Description
    'Repair',                                // Column L: Status (Enforced 'Repair')
    priorityVal,                             // Column M: Priority
    ''                                       // Column N: Assigned Technician (Enforced empty)
  ];

  sheet.appendRow(rowData);
  const rowId = sheet.getLastRow();

  return createJsonResponse({
    success: true,
    message: 'Breakdown report successfully added to BD DATABASE',
    rowId: 'BD-' + rowId,
    rowNumber: rowId
  }, 200);
}

/**
 * Update an existing breakdown record to Completed.
 *
 * Concurrency & Data Consistency Architecture:
 * 1. Uses Google Apps Script LockService to synchronize simultaneous resolve requests.
 * 2. Pre-validates Breakdown End Time format before lock acquisition.
 * 3. Re-reads and verifies target record status under lock to prevent race conditions.
 * 4. Strictly validates End Time >= Start Time and server-calculated downtime.
 * 5. Validates and uploads After Photo BEFORE any spreadsheet cell is updated;
 *    if photo upload fails, the operation is rejected and the record status is NOT modified.
 * 6. Google Sheets does not provide transactional ACID rollback across network endpoints;
 *    to minimize partial-update vulnerability, Columns F through L are updated via a
 *    single batched setValues call under lock, explicitly preserving unrelated Columns H, I, K.
 */
function handleResolveAction(payload) {
  // Pre-validation: Require valid Breakdown End Time format before acquiring lock
  const endTimeStr = payload.endTime;
  if (!endTimeStr || String(endTimeStr).trim() === '') {
    return createJsonResponse({
      success: false,
      error: 'Breakdown End Time is strictly required before marking a record as completed.'
    }, 422);
  }

  const endMs = parseDateMs(endTimeStr);
  if (isNaN(endMs)) {
    return createJsonResponse({
      success: false,
      error: 'Invalid Breakdown End Time format.'
    }, 422);
  }

  // Pre-validation: Require valid Assigned Technician
  const assignedTechStr = payload.assignedTech ? String(payload.assignedTech).trim() : '';
  if (!assignedTechStr || assignedTechStr.toLowerCase() === 'unassigned') {
    return createJsonResponse({
      success: false,
      error: 'Assigned Technician is strictly required before marking a record as completed.'
    }, 422);
  }

  // Acquire LockService to prevent concurrent writes on the same record
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(20000); // Wait up to 20 seconds for lock
  if (!hasLock) {
    return createJsonResponse({
      success: false,
      error: 'Server is busy processing another resolve update. Please try again.'
    }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return createJsonResponse({ success: false, error: 'BD DATABASE worksheet not found.' }, 404);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return createJsonResponse({ success: false, error: 'No breakdown records found in database.' }, 404);
    }

    const lastCol = Math.max(12, sheet.getLastColumn());
    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    let targetRow = null;
    let targetRowData = null;

    const reqMachine = String(payload.machine || '').trim().toUpperCase();
    const reqStartTime = payload.startTime;
    const reqId = String(payload.id || '').trim();
    const reqStaffId = String(payload.staffId || '').trim().toUpperCase();

    // 1. Primary Matching Strategy: Stable composite match (Machine + Breakdown Start Time)
    if (reqMachine && reqStartTime) {
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const rowMachine = String(row[3] || '').trim().toUpperCase(); // Col D
        const rowStart = row[4];                                       // Col E
        if (rowMachine === reqMachine && areDatesEqual(rowStart, reqStartTime, 120000)) {
          targetRow = i + 2;
          targetRowData = row;
          break;
        }
      }
    }

    // 2. Secondary Matching Strategy: Machine + Time Reported (Col A) + Staff ID (Col C)
    if (!targetRow && reqMachine && (reqStartTime || payload.time)) {
      const timeToMatch = payload.time || reqStartTime;
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const rowMachine = String(row[3] || '').trim().toUpperCase();
        const rowTime = row[0]; // Col A
        const rowStaff = String(row[2] || '').trim().toUpperCase();
        if (rowMachine === reqMachine && areDatesEqual(rowTime, timeToMatch, 120000)) {
          if (!reqStaffId || rowStaff === reqStaffId) {
            targetRow = i + 2;
            targetRowData = row;
            break;
          }
        }
      }
    }

    // 3. Tertiary Matching Strategy: Verify rowNumber against machine / start time
    if (!targetRow && payload.rowNumber && payload.rowNumber >= 2 && payload.rowNumber <= lastRow) {
      const idx = payload.rowNumber - 2;
      const row = values[idx];
      const rowMachine = String(row[3] || '').trim().toUpperCase();
      if (!reqMachine || rowMachine === reqMachine) {
        targetRow = payload.rowNumber;
        targetRowData = row;
      }
    }

    // 4. Quaternary Matching Strategy: Parse 'BD-X' ID and verify machine before accepting
    if (!targetRow && reqId) {
      const idMatch = reqId.match(/BD-(\d+)/i);
      if (idMatch) {
        const parsedRow = parseInt(idMatch[1], 10);
        if (parsedRow >= 2 && parsedRow <= lastRow) {
          const row = values[parsedRow - 2];
          const rowMachine = String(row[3] || '').trim().toUpperCase();
          if (!reqMachine || rowMachine === reqMachine) {
            targetRow = parsedRow;
            targetRowData = row;
          }
        }
      }
    }

    if (!targetRow || !targetRowData) {
      return createJsonResponse({
        success: false,
        error: 'Breakdown record not found in BD DATABASE matching the requested record parameters.'
      }, 404);
    }

    // CRITICAL CHECK 1: Recheck record status under lock to prevent race condition
    const freshStatus = String(sheet.getRange(targetRow, 12).getValue() || targetRowData[11] || '').trim(); // Col L
    if (freshStatus.toLowerCase() === 'completed') {
      return createJsonResponse({
        success: false,
        error: 'Conflict: This breakdown record is already marked as Completed.'
      }, 409);
    }

    // CRITICAL CHECK 2: Verify End Time >= Start Time
    const startTimeCell = targetRowData[4]; // Col E
    const startMs = parseDateMs(startTimeCell) || parseDateMs(payload.startTime);
    if (isNaN(startMs)) {
      return createJsonResponse({
        success: false,
        error: 'Cannot calculate downtime: Breakdown Start Time is missing or invalid in database.'
      }, 422);
    }

    if (endMs < startMs) {
      return createJsonResponse({
        success: false,
        error: 'Breakdown End Time cannot be earlier than Breakdown Start Time.'
      }, 422);
    }

    // CRITICAL CHECK 3: Calculate downtime accurately; abort if calculation fails
    const downtimeMin = Math.round((endMs - startMs) / (60 * 1000));
    if (isNaN(downtimeMin) || downtimeMin < 0) {
      return createJsonResponse({
        success: false,
        error: 'Downtime calculation failed. Record will NOT be marked as Completed.'
      }, 422);
    }

    // PHOTO HANDLING: Validate and upload photo BEFORE updating any sheet cells
    let afterPhotoUrl = '';
    if (payload.photoFiles && payload.photoFiles.after && payload.photoFiles.after.data) {
      try {
        const machine = targetRowData[3] || payload.machine || 'MACHINE';
        afterPhotoUrl = savePhotoToDrive(payload.photoFiles.after, machine, 'AFTER');
      } catch (photoErr) {
        // Photo upload failed: Abort immediately without touching the spreadsheet
        return createJsonResponse({
          success: false,
          error: 'Photo upload failed: ' + photoErr.message + '. Record status was NOT modified.'
        }, 502);
      }
    } else if (payload.afterPhoto) {
      afterPhotoUrl = String(payload.afterPhoto).trim();
    }

    // Ensure worksheet has at least 14 columns for Columns M (Priority) and N (Assigned Technician)
    const maxCols = sheet.getMaxColumns();
    if (maxCols < 14) {
      sheet.insertColumnsAfter(maxCols, 14 - maxCols);
    }

    // Ensure header labels for Columns M & N exist
    const headerRange = sheet.getRange(1, 13, 1, 2);
    const headerVals = headerRange.getValues()[0];
    if (!headerVals[0]) headerRange.getCell(1, 1).setValue('Priority');
    if (!headerVals[1]) headerRange.getCell(1, 2).setValue('Assigned Technician');

    // BATCH UPDATE (COLUMNS F THROUGH N - 9 COLUMNS):
    // Read existing Columns F to N (cols 6 to 14) to preserve unrelated Columns H, I, K, and M
    const rangeFN = sheet.getRange(targetRow, 6, 1, 9);
    const existingFN = rangeFN.getValues()[0];

    const finalAfterPhoto = afterPhotoUrl || existingFN[4] || '';

    const updatedFN = [
      endTimeStr,                 // Col F (col 6): Breakdown End Time
      downtimeMin,                // Col G (col 7): Downtime (minutes)
      existingFN[2],              // Col H (col 8): Problem Category (Preserved)
      existingFN[3],              // Col I (col 9): Before Photo (Preserved)
      finalAfterPhoto,            // Col J (col 10): After Photo (Updated if provided, else Preserved)
      existingFN[5],              // Col K (col 11): Problem Description (Preserved)
      'Completed',                // Col L (col 12): Status (Updated)
      existingFN[7] || '',        // Col M (col 13): Priority (Preserved)
      assignedTechStr             // Col N (col 14): Assigned Technician (Updated to Column N)
    ];

    // Single batched write under LockService to minimize partial-update window
    rangeFN.setValues([updatedFN]);

    return createJsonResponse({
      success: true,
      message: 'Breakdown record successfully resolved and updated to Completed in BD DATABASE.',
      rowNumber: targetRow,
      id: payload.id || ('BD-' + targetRow),
      downtime: downtimeMin,
      assignedTech: assignedTechStr
    }, 200);

  } finally {
    // Always release lock
    lock.releaseLock();
  }
}

/**
 * Safely parse a cell date or date string into milliseconds
 */
function parseDateMs(val) {
  if (!val) return NaN;
  if (val instanceof Date) {
    return val.getTime();
  }
  const parsed = new Date(val);
  return parsed.getTime();
}

/**
 * Compare two dates with tolerance (default: 120 seconds)
 */
function areDatesEqual(d1, d2, toleranceMs) {
  const t1 = parseDateMs(d1);
  const t2 = parseDateMs(d2);
  if (isNaN(t1) || isNaN(t2)) {
    const s1 = String(d1 || '').trim().replace(/[TZ]/g, ' ');
    const s2 = String(d2 || '').trim().replace(/[TZ]/g, ' ');
    return s1 === s2;
  }
  const tol = toleranceMs !== undefined ? toleranceMs : 120000;
  return Math.abs(t1 - t2) <= tol;
}

function savePhotoToDrive(fileObj, machineName, type) {
  try {
    let folder;
    const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
    }

    const base64Data = fileObj.data.split(',')[1] || fileObj.data;
    const decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), fileObj.type, `${machineName}_${type}_${Date.now()}_${fileObj.name}`);
    const file = folder.createFile(decodedBlob);
    return file.getUrl();
  } catch (e) {
    throw new Error('Photo upload failed: ' + e.message);
  }
}

function formatCellDate(cell) {
  if (!cell) return '';
  if (cell instanceof Date) {
    return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return String(cell);
}

function createJsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Format a cell specifically as a Date-only string (yyyy-MM-dd)
 */
function formatCellDateOnly(cell) {
  if (!cell) return '';
  if (cell instanceof Date) {
    return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(cell).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return s;
}

/**
 * Get or initialize the PM DATABASE worksheet with proper headers and formatting.
 * Preserves the existing BD DATABASE worksheet completely untouched.
 */
function getOrInitPMSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PM_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PM_SHEET_NAME);
    sheet.appendRow(PM_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, PM_HEADERS.length);
    headerRange.setBackground('#062641');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Authenticated retrieval of PM records from PM DATABASE
 */
function handleGetPMRecords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrInitPMSheet(ss);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return createJsonResponse({
      success: true,
      count: 0,
      data: []
    }, 200);
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 15).getValues();
  const records = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const pmCode = String(row[0] || '').trim();
    if (!pmCode) continue;

    records.push({
      pmCode: pmCode,
      machine: String(row[1] || '').trim(),
      maintenanceType: String(row[2] || '').trim(),
      taskTitle: String(row[3] || '').trim(),
      taskDescription: String(row[4] || '').trim(),
      scheduledDate: formatCellDateOnly(row[5]),
      assignedTech: String(row[6] || '').trim(),
      status: String(row[7] || 'Pending').trim(),
      createdBy: String(row[8] || '').trim(),
      createdAt: formatCellDate(row[9]),
      completionDateTime: formatCellDate(row[10]),
      workDetails: String(row[11] || '').trim(),
      remarks: String(row[12] || '').trim(),
      afterPhoto: String(row[13] || '').trim(),
      completedBy: String(row[14] || '').trim()
    });
  }

  return createJsonResponse({
    success: true,
    count: records.length,
    data: records
  }, 200);
}

/**
 * Append new Preventive Maintenance Record to PM DATABASE
 * Uses ScriptLock to prevent concurrent duplicate codes.
 */
function handleCreatePMRecord(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({
      success: false,
      error: 'Database is currently busy processing another write operation. Please try again.'
    }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrInitPMSheet(ss);

    const machine = String(payload.machine || '').trim();
    const maintenanceType = String(payload.maintenanceType || '').trim();
    const taskTitle = String(payload.taskTitle || '').trim();
    const taskDescription = String(payload.taskDescription || '').trim();
    const scheduledDate = String(payload.scheduledDate || '').trim();
    const assignedTech = String(payload.assignedTech || '').trim().toUpperCase();
    const callerRole = String(payload.callerRole || '').trim().toUpperCase();
    const callerStaffId = String(payload.callerStaffId || '').trim().toUpperCase();
    const createdBy = String(payload.createdBy || '').trim().toUpperCase();

    // FAIL-CLOSED AUTHORIZATION: Only verified ADMIN accounts may create PM records
    if (callerRole !== 'ADMIN') {
      return createJsonResponse({
        success: false,
        error: 'Forbidden: Creating preventive maintenance records is restricted to Administrator accounts.'
      }, 403);
    }

    const finalCreatedBy = callerStaffId || createdBy || 'ADMIN';

    if (!machine) {
      return createJsonResponse({ success: false, error: 'Validation Error: Machine / Section is required.' }, 400);
    }
    if (maintenanceType !== 'Scheduled' && maintenanceType !== 'Unscheduled') {
      return createJsonResponse({ success: false, error: 'Validation Error: Maintenance Type must be Scheduled or Unscheduled.' }, 400);
    }
    if (!taskTitle) {
      return createJsonResponse({ success: false, error: 'Validation Error: Task Title is required.' }, 400);
    }
    if (!scheduledDate) {
      return createJsonResponse({ success: false, error: 'Validation Error: Scheduled Date is required.' }, 400);
    }
    if (!assignedTech) {
      return createJsonResponse({ success: false, error: 'Validation Error: Assigned Technician is required.' }, 400);
    }

    // Determine next unique PM Code (e.g. PM-0001)
    const lastRow = sheet.getLastRow();
    let maxNum = 0;
    if (lastRow > 1) {
      const codeValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < codeValues.length; i++) {
        const val = String(codeValues[i][0] || '').trim();
        const match = val.match(/^PM-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    const pmCode = 'PM-' + String(nextNum).padStart(4, '0');
    const createdAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const status = 'Pending';

    sheet.appendRow([
      pmCode,
      machine,
      maintenanceType,
      taskTitle,
      taskDescription,
      scheduledDate,
      assignedTech,
      status,
      finalCreatedBy,
      createdAt,
      '', // completionDateTime
      '', // workDetails
      '', // remarks
      '', // afterPhoto
      ''  // completedBy
    ]);

    return createJsonResponse({
      success: true,
      pmCode: pmCode,
      message: 'Preventive maintenance record ' + pmCode + ' created successfully.'
    }, 201);

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: 'Failed to create PM record: ' + err.toString()
    }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Resolve an active PM Record in PM DATABASE
 * Updates Status to 'Completed', records completion date, work details, remarks, photo, completedBy
 */
function handleResolvePMRecord(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({
      success: false,
      error: 'Database is currently busy processing another write operation. Please try again.'
    }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrInitPMSheet(ss);
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return createJsonResponse({ success: false, error: 'PM record not found (empty database).' }, 404);
    }

    const pmCode = String(payload.pmCode || '').trim();
    if (!pmCode) {
      return createJsonResponse({ success: false, error: 'PM Code is required for resolution.' }, 400);
    }

    const completionDateTime = String(payload.completionDateTime || '').trim();
    const workDetails = String(payload.workDetails || '').trim();
    const remarks = String(payload.remarks || '').trim();
    const callerRole = String(payload.callerRole || '').trim().toUpperCase();
    const callerStaffId = String(payload.callerStaffId || '').trim().toUpperCase();
    const completedBy = String(payload.completedBy || '').trim().toUpperCase();

    // 1. FAIL-CLOSED ROLE CHECK: Strictly allow only ADMIN or TECHNICIAN
    if (callerRole !== 'ADMIN' && callerRole !== 'TECHNICIAN') {
      return createJsonResponse({
        success: false,
        error: 'Forbidden: Invalid or unauthorized caller role. Resolution is restricted to ADMIN or TECHNICIAN.'
      }, 403);
    }

    // 2. Verified callerStaffId is mandatory for both roles
    if (!callerStaffId) {
      return createJsonResponse({
        success: false,
        error: 'Forbidden: Missing verified caller Staff ID.'
      }, 403);
    }

    if (!completionDateTime) {
      return createJsonResponse({ success: false, error: 'Completion Date & Time is required.' }, 400);
    }
    if (!workDetails) {
      return createJsonResponse({ success: false, error: 'Maintenance Work Details are required.' }, 400);
    }

    // Locate record by PM Code in Column A
    const codeValues = sheet.getRange(2, 1, lastRow - 1, 15).getValues();
    let targetRowIndex = -1;
    let targetRowData = null;

    for (let i = 0; i < codeValues.length; i++) {
      if (String(codeValues[i][0] || '').trim().toUpperCase() === pmCode.toUpperCase()) {
        targetRowIndex = i + 2; // 1-indexed including header
        targetRowData = codeValues[i];
        break;
      }
    }

    if (targetRowIndex === -1 || !targetRowData) {
      return createJsonResponse({ success: false, error: 'PM record ' + pmCode + ' not found.' }, 404);
    }

    const currentStatus = String(targetRowData[7] || '').trim();
    if (currentStatus === 'Completed') {
      return createJsonResponse({ success: false, error: 'PM record ' + pmCode + ' is already marked as Completed.' }, 400);
    }

    const assignedTech = String(targetRowData[6] || '').trim().toUpperCase();

    // 3. FAIL-CLOSED AUTHORIZATION VALIDATION:
    let finalCompletedBy = '';
    if (callerRole === 'TECHNICIAN') {
      // For TECHNICIAN:
      // - Require non-empty verified callerStaffId (already validated above)
      // - Require non-empty assignedTech on the record
      // - Require assignedTech === callerStaffId exactly
      if (!assignedTech) {
        return createJsonResponse({
          success: false,
          error: 'Forbidden: This maintenance task has no assigned technician and cannot be resolved by a technician.'
        }, 403);
      }
      if (assignedTech !== callerStaffId) {
        return createJsonResponse({
          success: false,
          error: 'Forbidden: Technicians are only authorized to resolve maintenance tasks assigned to them.'
        }, 403);
      }
      // Completed By must be the verified technician's staff ID (never spoofable)
      finalCompletedBy = callerStaffId;
    } else if (callerRole === 'ADMIN') {
      // For ADMIN:
      // Verified ADMIN role can resolve any record
      finalCompletedBy = callerStaffId || completedBy || 'ADMIN';
    }

    // Optional Photo upload
    let afterPhotoUrl = String(payload.afterPhoto || '').trim();
    if (payload.photoFiles && payload.photoFiles.after && payload.photoFiles.after.data) {
      try {
        const machine = String(targetRowData[1] || 'PM').trim();
        afterPhotoUrl = savePhotoToDrive(payload.photoFiles.after, machine, 'PM_AFTER');
      } catch (photoErr) {
        console.warn('Photo upload warning: ' + photoErr.message);
      }
    }

    // Update Columns H, K, L, M, N, O
    sheet.getRange(targetRowIndex, 8).setValue('Completed');             // Column H: Status
    sheet.getRange(targetRowIndex, 11).setValue(completionDateTime);      // Column K: Completion Date & Time
    sheet.getRange(targetRowIndex, 12).setValue(workDetails);             // Column L: Maintenance Work Details
    sheet.getRange(targetRowIndex, 13).setValue(remarks);                 // Column M: Remarks
    sheet.getRange(targetRowIndex, 14).setValue(afterPhotoUrl);           // Column N: After Maintenance Photo URL
    sheet.getRange(targetRowIndex, 15).setValue(finalCompletedBy);        // Column O: Completed By Staff ID

    return createJsonResponse({
      success: true,
      pmCode: pmCode,
      message: 'Preventive maintenance ' + pmCode + ' successfully resolved as Completed.'
    }, 200);

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: 'Failed to resolve PM record: ' + err.toString()
    }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * ============================================================================
 * MODULE: SPARE PARTS INVENTORY, MOVEMENTS & STOCK REQUESTS
 * ============================================================================
 */

/**
 * Helper to format timestamp
 */
function formatCurrentTimestamp() {
  const now = new Date();
  const pad = function(n) { return n < 10 ? '0' + n : n; };
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' +
    pad(now.getHours()) + ':' + pad(now.getMinutes());
}

/**
 * Safe standalone initialization function for MMS worksheets:
 * - SPARE PARTS DATABASE
 * - STOCK MOVEMENTS DATABASE
 * - STOCK REQUESTS DATABASE
 * - TECHNICIAN DATABASE
 *
 * Guarantees:
 * 1. Uses the existing MMS DATABASE spreadsheet via SpreadsheetApp.getActiveSpreadsheet().
 * 2. Calls the four existing worksheet initializers:
 *    - getOrInitSparePartsSheet
 *    - getOrInitStockMovementsSheet
 *    - getOrInitStockRequestsSheet
 *    - getOrInitTechnicianSheet
 * 3. Creates only missing worksheets.
 * 4. Inserts standardized headers, applies header style, and freezes row 1.
 * 5. Leaves all data rows completely EMPTY (zero demo/sample records).
 * 6. Never modifies, overwrites, or deletes BD DATABASE or PM DATABASE records.
 * 7. If a worksheet already exists, it is untouched (idempotent, safe to run multiple times).
 *
 * @param {Spreadsheet} [customSpreadsheet] Optional spreadsheet reference for testing/automation.
 * @returns {Object} Report detailing the status of each worksheet.
 */
function initializeMMSNewSheets(customSpreadsheet) {
  const ss = customSpreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('MMS Spreadsheet not found. Ensure this script is bound to the MMS spreadsheet or pass an active spreadsheet instance.');
  }

  const existingSheetNames = ss.getSheets().map(function(s) { return s.getName(); });
  const report = {
    timestamp: new Date().toISOString(),
    spreadsheetName: ss.getName(),
    sheets: {}
  };

  const initializers = [
    { name: SP_SHEET_NAME, fn: getOrInitSparePartsSheet },
    { name: SM_SHEET_NAME, fn: getOrInitStockMovementsSheet },
    { name: SR_SHEET_NAME, fn: getOrInitStockRequestsSheet },
    { name: TECH_SHEET_NAME, fn: getOrInitTechnicianSheet }
  ];

  for (let i = 0; i < initializers.length; i++) {
    const item = initializers[i];
    const existed = existingSheetNames.indexOf(item.name) !== -1;
    const sheet = item.fn(ss);
    report.sheets[item.name] = {
      status: existed ? 'EXISTING_UNTOUCHED' : 'CREATED_EMPTY',
      headersConfigured: true,
      lastRow: sheet.getLastRow(),
      lastColumn: sheet.getLastColumn()
    };
  }

  Logger.log('initializeMMSNewSheets summary: ' + JSON.stringify(report, null, 2));
  return report;
}

/**
 * Get or initialize SPARE PARTS DATABASE worksheet.
 * Creates the worksheet with standardized headers if missing, leaving all data rows empty.
 * Does not overwrite or clear existing worksheets.
 */
function getOrInitSparePartsSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SP_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SP_SHEET_NAME);
    sheet.appendRow(SP_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, SP_HEADERS.length);
    headerRange.setBackground('#062641');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Get or initialize STOCK MOVEMENTS DATABASE worksheet.
 * Creates the worksheet with standardized headers if missing, leaving all data rows empty.
 * Does not overwrite or clear existing worksheets.
 */
function getOrInitStockMovementsSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SM_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SM_SHEET_NAME);
    sheet.appendRow(SM_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, SM_HEADERS.length);
    headerRange.setBackground('#062641');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Get or initialize STOCK REQUESTS DATABASE worksheet.
 * Creates the worksheet with standardized headers if missing, leaving all data rows empty.
 * Does not overwrite or clear existing worksheets.
 */
function getOrInitStockRequestsSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SR_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SR_SHEET_NAME);
    sheet.appendRow(SR_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, SR_HEADERS.length);
    headerRange.setBackground('#062641');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Authenticated retrieval of Spare Parts, Stock Movements, and Stock Requests
 */
function handleGetSpareParts(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();
  const callerStaffId = String(payload.callerStaffId || '').trim().toUpperCase();

  // 1. Fetch Spare Parts
  const spSheet = getOrInitSparePartsSheet(ss);
  const spLastRow = spSheet.getLastRow();
  const spareParts = [];
  const supplierMap = {};

  if (spLastRow > 1) {
    const numCols = Math.max(12, spSheet.getLastColumn());
    const spValues = spSheet.getRange(2, 1, spLastRow - 1, numCols).getValues();
    for (let i = 0; i < spValues.length; i++) {
      const row = spValues[i];
      const code = String(row[0] || '').trim();
      if (!code) continue;
      const supplier = String(row[8] || '').trim();
      supplierMap[code] = supplier;

      // Backward-compatible check for archived status in Column L (12th column)
      const isArchived = row.length >= 12 && String(row[11] || '').trim().toLowerCase() === 'archived';
      if (isArchived) continue;

      spareParts.push({
        code: code,
        name: String(row[1] || '').trim(),
        category: String(row[2] || '').trim(),
        location: String(row[3] || '').trim(),
        currentStock: Number(row[4]) || 0,
        minStock: Number(row[5]) || 0,
        unit: String(row[6] || 'pcs').trim(),
        unitPrice: Number(row[7]) || 0,
        supplier: supplier,
        createdAt: formatCellDate(row[9]),
        updatedAt: formatCellDate(row[10])
      });
    }
  }

  // 2. Fetch Stock Movements (ADMIN ONLY)
  // Technician cannot access Stock Movement History
  let stockMovements = [];
  if (callerRole === 'ADMIN') {
    const smSheet = getOrInitStockMovementsSheet(ss);
    const smLastRow = smSheet.getLastRow();
    if (smLastRow > 1) {
      const smValues = smSheet.getRange(2, 1, smLastRow - 1, 11).getValues();
      for (let i = 0; i < smValues.length; i++) {
        const row = smValues[i];
        const mId = String(row[0] || '').trim();
        if (!mId) continue;
        const pCode = String(row[2] || '').trim();
        const mType = String(row[4] || '').trim();

        const resolvedSupplier = supplierMap[pCode] || String(row[8] || '').trim() || 'N/A';

        stockMovements.push({
          id: mId,
          date: formatCellDate(row[1]),
          partCode: pCode,
          partName: String(row[3] || '').trim(),
          type: mType,
          qty: Number(row[5]) || 0,
          previousStock: Number(row[6]) || 0,
          updatedStock: Number(row[7]) || 0,
          supplier: resolvedSupplier,
          updatedBy: String(row[9] || '').trim(),
          reference: String(row[10] || '').trim()
        });
      }
    }
  }

  // 3. Fetch Stock Requests (ADMIN views all, TECHNICIAN views own requests only)
  const srSheet = getOrInitStockRequestsSheet(ss);
  const srLastRow = srSheet.getLastRow();
  const stockRequests = [];

  if (srLastRow > 1) {
    const srValues = srSheet.getRange(2, 1, srLastRow - 1, 14).getValues();
    for (let i = 0; i < srValues.length; i++) {
      const row = srValues[i];
      const rId = String(row[0] || '').trim();
      if (!rId) continue;

      const reqStaffId = String(row[2] || '').trim().toUpperCase();

      // Enforce role-based visibility:
      // Technician accounts can only view their own requests!
      if (callerRole === 'TECHNICIAN' && reqStaffId !== callerStaffId) {
        continue;
      }

      const reqItem = {
        requestId: rId,
        requestDate: formatCellDate(row[1]),
        requestedByStaffId: reqStaffId,
        requestedByName: String(row[3] || '').trim(),
        partCode: String(row[4] || '').trim(),
        partName: String(row[5] || '').trim(),
        qtyRequested: Number(row[6]) || 0,
        status: String(row[8] || 'Pending').trim(),
        approvedBy: String(row[9] || '').trim(),
        approvedDate: formatCellDate(row[10]),
        issuedBy: String(row[11] || '').trim(),
        issuedDate: formatCellDate(row[12]),
        notes: String(row[13] || '').trim()
      };

      // Strict backend authorization: Reason column only accessible to ADMIN accounts
      if (callerRole === 'ADMIN') {
        reqItem.reason = String(row[7] || '').trim();
      }

      stockRequests.push(reqItem);
    }
  }

  return createJsonResponse({
    success: true,
    callerRole: callerRole,
    spareParts: spareParts,
    stockMovements: stockMovements,
    stockRequests: stockRequests
  }, 200);
}

/**
 * Add a new spare part to SPARE PARTS DATABASE (ADMIN ONLY)
 */
function handleAddStockPart(payload) {
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();
  const callerStaffId = String(payload.callerStaffId || '').trim().toUpperCase();

  if (callerRole !== 'ADMIN') {
    return createJsonResponse({
      success: false,
      error: 'Forbidden: Adding new spare parts is restricted to Administrator accounts.'
    }, 403);
  }

  const code = String(payload.code || '').trim().toUpperCase();
  const name = String(payload.name || '').trim();
  const category = String(payload.category || '').trim();
  const location = String(payload.location || '').trim();
  const currentStock = Math.max(0, parseInt(payload.currentStock, 10) || 0);
  const minStock = Math.max(0, parseInt(payload.minStock, 10) || 0);
  const unit = String(payload.unit || 'pcs').trim();
  const unitPrice = Math.max(0, parseFloat(payload.unitPrice) || 0);
  const supplier = String(payload.supplier || '').trim();

  if (!code || !name || !category || !location || !unit || !supplier) {
    return createJsonResponse({
      success: false,
      error: 'Validation Error: All spare part fields are required.'
    }, 400);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({
      success: false,
      error: 'Database is currently busy. Please try again.'
    }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrInitSparePartsSheet(ss);
    const lastRow = sheet.getLastRow();

    // Check for duplicate part code
    if (lastRow > 1) {
      const existingCodes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < existingCodes.length; i++) {
        if (String(existingCodes[i][0] || '').trim().toUpperCase() === code) {
          return createJsonResponse({
            success: false,
            error: 'Duplicate Part Code: A spare part with code "' + code + '" already exists.'
          }, 400);
        }
      }
    }

    const timestamp = formatCurrentTimestamp();
    sheet.appendRow([
      code,
      name,
      category,
      location,
      currentStock,
      minStock,
      unit,
      unitPrice,
      supplier,
      timestamp,
      timestamp
    ]);

    // If initial stock is greater than 0, record initial Stock In movement
    if (currentStock > 0) {
      const smSheet = getOrInitStockMovementsSheet(ss);
      const mId = 'MV-' + Math.floor(1000 + Math.random() * 9000);
      smSheet.appendRow([
        mId,
        timestamp,
        code,
        name,
        'Stock In',
        currentStock,
        0,
        currentStock,
        supplier,
        callerStaffId || 'ADMIN',
        'Initial Stock Setup'
      ]);
    }

    return createJsonResponse({
      success: true,
      message: 'Spare part ' + code + ' successfully added to database.',
      part: {
        code: code,
        name: name,
        category: category,
        location: location,
        currentStock: currentStock,
        minStock: minStock,
        unit: unit,
        unitPrice: unitPrice,
        supplier: supplier
      }
    }, 200);

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: 'Failed to add spare part: ' + err.toString()
    }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Adjust stock quantity (ADMIN ONLY)
 */
function handleAdjustStock(payload) {
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();
  const callerStaffId = String(payload.callerStaffId || '').trim().toUpperCase();

  if (callerRole !== 'ADMIN') {
    return createJsonResponse({
      success: false,
      error: 'Forbidden: Stock quantity adjustments are restricted to Administrator accounts.'
    }, 403);
  }

  const code = String(payload.code || '').trim().toUpperCase();
  const adjustment = parseInt(payload.adjustment, 10);
  const reference = String(payload.reference || 'Manual Adjustment').trim();

  if (!code) {
    return createJsonResponse({ success: false, error: 'Part code is required.' }, 400);
  }
  if (isNaN(adjustment) || adjustment === 0) {
    return createJsonResponse({ success: false, error: 'Valid non-zero adjustment quantity is required.' }, 400);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database is busy. Please try again.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrInitSparePartsSheet(ss);
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return createJsonResponse({ success: false, error: 'No spare parts in database.' }, 404);
    }

    const values = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    let rowIndex = -1;
    let partData = null;

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0] || '').trim().toUpperCase() === code) {
        rowIndex = i + 2;
        partData = values[i];
        break;
      }
    }

    if (rowIndex === -1 || !partData) {
      return createJsonResponse({ success: false, error: 'Spare part ' + code + ' not found.' }, 404);
    }

    const prevStock = Number(partData[4]) || 0;
    const newStock = Math.max(0, prevStock + adjustment);
    const partName = String(partData[1] || '').trim();
    const supplier = String(partData[8] || '').trim();
    const timestamp = formatCurrentTimestamp();

    // Update Current Stock (Column E) & Updated At (Column K)
    sheet.getRange(rowIndex, 5).setValue(newStock);
    sheet.getRange(rowIndex, 11).setValue(timestamp);

    // Record Stock Movement
    const smSheet = getOrInitStockMovementsSheet(ss);
    const mId = 'MV-' + Math.floor(1000 + Math.random() * 9000);
    const movementType = adjustment > 0 ? 'Stock In' : 'Stock Adjustment';

    smSheet.appendRow([
      mId,
      timestamp,
      code,
      partName,
      movementType,
      adjustment,
      prevStock,
      newStock,
      supplier,
      callerStaffId || 'ADMIN',
      reference
    ]);

    return createJsonResponse({
      success: true,
      code: code,
      previousStock: prevStock,
      newStock: newStock,
      message: 'Stock updated for ' + code + ' (New balance: ' + newStock + ')'
    }, 200);

  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to adjust stock: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Adjust minimum stock limit (ADMIN ONLY)
 * IMPORTANT: MUST NOT create a stock movement transaction!
 */
function handleAdjustLimit(payload) {
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();

  if (callerRole !== 'ADMIN') {
    return createJsonResponse({
      success: false,
      error: 'Forbidden: Adjusting minimum stock limit is restricted to Administrator accounts.'
    }, 403);
  }

  const code = String(payload.code || '').trim().toUpperCase();
  const newMinLimit = parseInt(payload.newMinLimit, 10);

  if (!code) {
    return createJsonResponse({ success: false, error: 'Part code is required.' }, 400);
  }
  if (isNaN(newMinLimit) || newMinLimit < 0) {
    return createJsonResponse({ success: false, error: 'Minimum limit must be zero or a positive whole number.' }, 400);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database is busy. Please try again.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrInitSparePartsSheet(ss);
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return createJsonResponse({ success: false, error: 'No spare parts in database.' }, 404);
    }

    const values = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    let rowIndex = -1;
    let partData = null;

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0] || '').trim().toUpperCase() === code) {
        rowIndex = i + 2;
        partData = values[i];
        break;
      }
    }

    if (rowIndex === -1 || !partData) {
      return createJsonResponse({ success: false, error: 'Spare part ' + code + ' not found.' }, 404);
    }

    const timestamp = formatCurrentTimestamp();
    // Update Minimum Stock Limit (Column F) & Updated At (Column K)
    // DO NOT modify current stock or create any stock movement!
    sheet.getRange(rowIndex, 6).setValue(newMinLimit);
    sheet.getRange(rowIndex, 11).setValue(timestamp);

    return createJsonResponse({
      success: true,
      code: code,
      newMinLimit: newMinLimit,
      message: 'Minimum stock limit for ' + code + ' updated to ' + newMinLimit
    }, 200);

  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to update minimum stock limit: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Manage Spare Part (ADMIN ONLY - Combines item metadata edit and optional stock adjustment)
 * Single validated backend operation under LockService.
 * If stock is adjusted, logs to STOCK MOVEMENTS DATABASE.
 * If only metadata/min limit is changed, does NOT create artificial stock movements.
 */
function handleManageSparePart(payload) {
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();
  if (callerRole !== 'ADMIN') {
    return createJsonResponse({
      success: false,
      error: 'Forbidden: Spare part management is restricted to Administrator accounts.'
    }, 403);
  }

  const code = String(payload.code || '').trim().toUpperCase();
  if (!code) {
    return createJsonResponse({ success: false, error: 'Part code is required.' }, 400);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database is busy. Please try again.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spSheet = getOrInitSparePartsSheet(ss);
    const lastRow = spSheet.getLastRow();

    if (lastRow <= 1) {
      return createJsonResponse({ success: false, error: 'No spare parts in database.' }, 404);
    }

    const numCols = Math.max(12, spSheet.getLastColumn());
    const values = spSheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    let rowIndex = -1;
    let currentRow = null;

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0] || '').trim().toUpperCase() === code) {
        rowIndex = i + 2;
        currentRow = values[i];
        break;
      }
    }

    if (rowIndex === -1 || !currentRow) {
      return createJsonResponse({ success: false, error: 'Spare part ' + code + ' not found.' }, 404);
    }

    const prevStock = Number(currentRow[4]) || 0;
    const name = payload.name !== undefined ? String(payload.name).trim() : String(currentRow[1]).trim();
    const category = payload.category !== undefined ? String(payload.category).trim() : String(currentRow[2]).trim();
    const location = payload.location !== undefined ? String(payload.location).trim() : String(currentRow[3]).trim();
    const minStock = payload.minStock !== undefined ? Math.max(0, parseInt(payload.minStock, 10)) : Number(currentRow[5]) || 0;
    const unit = payload.unit !== undefined ? String(payload.unit).trim() : String(currentRow[6]).trim();
    const unitPrice = payload.unitPrice !== undefined ? Math.max(0, parseFloat(payload.unitPrice)) : Number(currentRow[7]) || 0;
    const supplier = payload.supplier !== undefined ? String(payload.supplier).trim() : String(currentRow[8]).trim();
    const timestamp = formatCurrentTimestamp();

    if (!name) {
      return createJsonResponse({ success: false, error: 'Part Description is required.' }, 400);
    }

    // Check optional stock adjustment
    const adjType = String(payload.adjustmentType || 'none').toLowerCase();
    const adjQty = parseInt(payload.adjustmentQty, 10) || 0;
    const adjReason = String(payload.adjustmentReason || '').trim();

    let newStock = prevStock;
    let movementCreated = false;

    if (adjType === 'in' || adjType === 'stock-in' || adjType === 'stock in') {
      if (adjQty <= 0) {
        return createJsonResponse({ success: false, error: 'Adjustment quantity must be greater than zero.' }, 400);
      }
      if (!adjReason) {
        return createJsonResponse({ success: false, error: 'Adjustment reason is required when adjusting stock quantity.' }, 400);
      }
      newStock = prevStock + adjQty;
    } else if (adjType === 'out' || adjType === 'stock-out' || adjType === 'stock out') {
      if (adjQty <= 0) {
        return createJsonResponse({ success: false, error: 'Adjustment quantity must be greater than zero.' }, 400);
      }
      if (!adjReason) {
        return createJsonResponse({ success: false, error: 'Adjustment reason is required when adjusting stock quantity.' }, 400);
      }
      if (prevStock - adjQty < 0) {
        return createJsonResponse({
          success: false,
          error: 'Insufficient stock. Current stock: ' + prevStock + ' ' + unit + '. Cannot deduct ' + adjQty + ' ' + unit + '.'
        }, 400);
      }
      newStock = prevStock - adjQty;
    }

    if (newStock < 0) {
      return createJsonResponse({
        success: false,
        error: 'Updated stock balance cannot be negative.'
      }, 400);
    }

    // Save metadata and updated stock to SPARE PARTS DATABASE
    spSheet.getRange(rowIndex, 2).setValue(name);
    spSheet.getRange(rowIndex, 3).setValue(category);
    spSheet.getRange(rowIndex, 4).setValue(location);
    spSheet.getRange(rowIndex, 5).setValue(newStock);
    spSheet.getRange(rowIndex, 6).setValue(minStock);
    spSheet.getRange(rowIndex, 7).setValue(unit);
    spSheet.getRange(rowIndex, 8).setValue(unitPrice);
    spSheet.getRange(rowIndex, 9).setValue(supplier);
    spSheet.getRange(rowIndex, 11).setValue(timestamp);

    // If stock changed, record official movement in STOCK MOVEMENTS DATABASE
    if (adjType === 'in' || adjType === 'out' || adjType === 'stock in' || adjType === 'stock out') {
      const smSheet = getOrInitStockMovementsSheet(ss);
      const mId = 'MV-' + Math.floor(1000 + Math.random() * 9000);
      const movementTypeDisplay = adjType.includes('in') ? 'Stock In' : 'Stock Adjustment';
      const signedAdjustment = adjType.includes('in') ? adjQty : -adjQty;

      smSheet.appendRow([
        mId,
        timestamp,
        code,
        name,
        movementTypeDisplay,
        signedAdjustment,
        prevStock,
        newStock,
        supplier,
        payload.callerName || payload.callerStaffId || 'ADMIN',
        adjReason
      ]);
      movementCreated = true;
    }

    return createJsonResponse({
      success: true,
      message: 'Spare part ' + code + ' updated successfully.',
      part: {
        code: code,
        name: name,
        category: category,
        location: location,
        currentStock: newStock,
        minStock: minStock,
        unit: unit,
        unitPrice: unitPrice,
        supplier: supplier,
        updatedAt: timestamp
      },
      movementCreated: movementCreated
    }, 200);

  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to manage spare part: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Delete or safely archive a spare part (ADMIN ONLY).
 * If item has dependent records in STOCK REQUESTS or STOCK MOVEMENTS, safely archive.
 * Otherwise, permanently delete row.
 */
function handleDeleteSparePart(payload) {
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();
  if (callerRole !== 'ADMIN') {
    return createJsonResponse({
      success: false,
      error: 'Forbidden: Deleting spare parts is restricted to Administrator accounts.'
    }, 403);
  }

  const code = String(payload.code || '').trim().toUpperCase();
  if (!code) {
    return createJsonResponse({ success: false, error: 'Part code is required for deletion.' }, 400);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database is busy. Please try again.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spSheet = getOrInitSparePartsSheet(ss);
    const lastRow = spSheet.getLastRow();

    if (lastRow <= 1) {
      return createJsonResponse({ success: false, error: 'No spare parts in database.' }, 404);
    }

    const values = spSheet.getRange(2, 1, lastRow - 1, 11).getValues();
    let rowIndex = -1;

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0] || '').trim().toUpperCase() === code) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) {
      return createJsonResponse({ success: false, error: 'Spare part ' + code + ' not found.' }, 404);
    }

    // Check for references in STOCK REQUESTS DATABASE
    let hasRequestRef = false;
    const srSheet = ss.getSheetByName(SR_SHEET_NAME);
    if (srSheet && srSheet.getLastRow() > 1) {
      const srValues = srSheet.getRange(2, 5, srSheet.getLastRow() - 1, 1).getValues();
      for (let j = 0; j < srValues.length; j++) {
        if (String(srValues[j][0] || '').trim().toUpperCase() === code) {
          hasRequestRef = true;
          break;
        }
      }
    }

    // Check for references in STOCK MOVEMENTS DATABASE
    let hasMovementRef = false;
    const smSheet = ss.getSheetByName(SM_SHEET_NAME);
    if (smSheet && smSheet.getLastRow() > 1) {
      const smValues = smSheet.getRange(2, 3, smSheet.getLastRow() - 1, 1).getValues();
      for (let k = 0; k < smValues.length; k++) {
        if (String(smValues[k][0] || '').trim().toUpperCase() === code) {
          hasMovementRef = true;
          break;
        }
      }
    }

    const isReferenced = hasRequestRef || hasMovementRef;

    if (isReferenced) {
      // SAFE ARCHIVING: Mark Column L (12th column) as 'Archived'
      spSheet.getRange(rowIndex, 12).setValue('Archived');
      spSheet.getRange(rowIndex, 11).setValue(formatCurrentTimestamp());

      return createJsonResponse({
        success: true,
        action: 'archived',
        code: code,
        message: 'Spare part ' + code + ' has historical audit records and was safely archived.'
      }, 200);
    } else {
      // PERMANENT DELETION: Safe to remove entire row
      spSheet.deleteRow(rowIndex);

      return createJsonResponse({
        success: true,
        action: 'deleted',
        code: code,
        message: 'Spare part ' + code + ' was permanently deleted.'
      }, 200);
    }

  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to delete spare part: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Selective cleanup procedure for confirmed demo spare parts (SP-301 to SP-309).
 * Requires explicit confirmation: payload.confirmed === true.
 */
function handleCleanupDemoParts(payload) {
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();
  if (callerRole !== 'ADMIN') {
    return createJsonResponse({
      success: false,
      error: 'Forbidden: Cleanup is restricted to Administrator accounts.'
    }, 403);
  }

  if (payload.confirmed !== true) {
    return createJsonResponse({
      success: false,
      error: 'Explicit confirmation (confirmed: true) is required to execute demo parts cleanup.'
    }, 400);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database is busy. Please try again.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spSheet = getOrInitSparePartsSheet(ss);
    const lastRow = spSheet.getLastRow();

    if (lastRow <= 1) {
      return createJsonResponse({ success: true, count: 0, removedCodes: [] }, 200);
    }

    const demoCodes = ['SP-301', 'SP-302', 'SP-303', 'SP-304', 'SP-305', 'SP-306', 'SP-307', 'SP-308', 'SP-309'];
    const values = spSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const removedCodes = [];

    // Scan backwards to delete rows cleanly
    for (let i = values.length - 1; i >= 0; i--) {
      const code = String(values[i][0] || '').trim().toUpperCase();
      if (demoCodes.indexOf(code) !== -1) {
        spSheet.deleteRow(i + 2);
        removedCodes.push(code);
      }
    }

    return createJsonResponse({
      success: true,
      message: 'Demo spare parts cleanup completed. Removed: ' + removedCodes.join(', '),
      count: removedCodes.length,
      removedCodes: removedCodes
    }, 200);

  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to cleanup demo parts: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Submit a stock request (ADMIN or TECHNICIAN)
 */
function handleCreateStockRequest(payload) {
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();
  const callerStaffId = String(payload.callerStaffId || '').trim().toUpperCase();
  const callerName = String(payload.callerName || '').trim();

  if (callerRole !== 'ADMIN' && callerRole !== 'TECHNICIAN') {
    return createJsonResponse({ success: false, error: 'Unauthorized: Access restricted.' }, 403);
  }

  const partCode = String(payload.partCode || '').trim().toUpperCase();
  const partDescription = String(payload.partDescription || '').trim();
  const qtyRequested = parseInt(payload.qtyRequested, 10);
  const reason = String(payload.reason || '').trim();

  if (!partCode) {
    return createJsonResponse({ success: false, error: 'Part code is required.' }, 400);
  }
  if (isNaN(qtyRequested) || qtyRequested <= 0) {
    return createJsonResponse({ success: false, error: 'Quantity requested must be a positive whole number.' }, 400);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database is busy. Please try again.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const srSheet = getOrInitStockRequestsSheet(ss);
    const lastRow = srSheet.getLastRow();

    // Determine next unique Request ID (REQ-1001+)
    let maxIdNum = 1000;
    if (lastRow > 1) {
      const idValues = srSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < idValues.length; i++) {
        const val = String(idValues[i][0] || '').trim();
        const match = val.match(/^REQ-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxIdNum) maxIdNum = num;
        }
      }
    }
    const newRequestId = 'REQ-' + (maxIdNum + 1);
    const timestamp = formatCurrentTimestamp();

    srSheet.appendRow([
      newRequestId,
      timestamp,
      callerStaffId,
      callerName || callerStaffId,
      partCode,
      partDescription,
      qtyRequested,
      reason,
      'Pending',
      '',
      '',
      '',
      '',
      ''
    ]);

    return createJsonResponse({
      success: true,
      requestId: newRequestId,
      message: 'Stock request ' + newRequestId + ' submitted successfully.'
    }, 200);

  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to create stock request: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Approve or Reject a stock request (ADMIN ONLY)
 */
function handleUpdateStockRequestStatus(payload) {
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();
  const callerStaffId = String(payload.callerStaffId || '').trim().toUpperCase();

  if (callerRole !== 'ADMIN') {
    return createJsonResponse({
      success: false,
      error: 'Forbidden: Request approvals and rejections are restricted to Administrator accounts.'
    }, 403);
  }

  const requestId = String(payload.requestId || '').trim().toUpperCase();
  const newStatus = String(payload.newStatus || '').trim();

  if (!requestId) {
    return createJsonResponse({ success: false, error: 'Request ID is required.' }, 400);
  }
  if (newStatus !== 'Approved' && newStatus !== 'Rejected') {
    return createJsonResponse({ success: false, error: 'Status must be Approved or Rejected.' }, 400);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database is busy. Please try again.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const srSheet = getOrInitStockRequestsSheet(ss);
    const lastRow = srSheet.getLastRow();

    if (lastRow <= 1) {
      return createJsonResponse({ success: false, error: 'No stock requests found.' }, 404);
    }

    const values = srSheet.getRange(2, 1, lastRow - 1, 14).getValues();
    let rowIndex = -1;
    let reqData = null;

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0] || '').trim().toUpperCase() === requestId) {
        rowIndex = i + 2;
        reqData = values[i];
        break;
      }
    }

    if (rowIndex === -1 || !reqData) {
      return createJsonResponse({ success: false, error: 'Stock request ' + requestId + ' not found.' }, 404);
    }

    const currentStatus = String(reqData[8] || '').trim();
    if (currentStatus === 'Issued') {
      return createJsonResponse({ success: false, error: 'Cannot modify a request that has already been Issued.' }, 400);
    }

    const timestamp = formatCurrentTimestamp();
    // Update Status (Column I), Approved By (Column J), Approved Date (Column K)
    srSheet.getRange(rowIndex, 9).setValue(newStatus);
    srSheet.getRange(rowIndex, 10).setValue(callerStaffId || 'ADMIN');
    srSheet.getRange(rowIndex, 11).setValue(timestamp);

    return createJsonResponse({
      success: true,
      requestId: requestId,
      status: newStatus,
      message: 'Request ' + requestId + ' marked as ' + newStatus + '.'
    }, 200);

  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to update request: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Issue Stock for an Approved request (ADMIN ONLY)
 * Strictly verifies available stock, prevents double deduction, deducts stock under lock.
 */
function handleIssueStock(payload) {
  const callerRole = String(payload.callerRole || '').trim().toUpperCase();
  const callerStaffId = String(payload.callerStaffId || '').trim().toUpperCase();

  if (callerRole !== 'ADMIN') {
    return createJsonResponse({
      success: false,
      error: 'Forbidden: Issuing stock is restricted to Administrator accounts.'
    }, 403);
  }

  const requestId = String(payload.requestId || '').trim().toUpperCase();
  if (!requestId) {
    return createJsonResponse({ success: false, error: 'Request ID is required.' }, 400);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database is busy. Please try again.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const srSheet = getOrInitStockRequestsSheet(ss);
    const spSheet = getOrInitSparePartsSheet(ss);
    const smSheet = getOrInitStockMovementsSheet(ss);

    const srLastRow = srSheet.getLastRow();
    if (srLastRow <= 1) {
      return createJsonResponse({ success: false, error: 'No stock requests found.' }, 404);
    }

    // 1. Locate Request Record
    const srCols = Math.max(14, srSheet.getLastColumn());
    const srValues = srSheet.getRange(2, 1, srLastRow - 1, srCols).getValues();
    let reqRowIndex = -1;
    let reqData = null;

    for (let i = 0; i < srValues.length; i++) {
      if (String(srValues[i][0] || '').trim().toUpperCase() === requestId) {
        reqRowIndex = i + 2;
        reqData = srValues[i];
        break;
      }
    }

    if (reqRowIndex === -1 || !reqData) {
      return createJsonResponse({ success: false, error: 'Stock request ' + requestId + ' not found.' }, 404);
    }

    const currentStatus = String(reqData[8] || '').trim();
    if (currentStatus === 'Issued') {
      return createJsonResponse({
        success: false,
        error: 'Duplicate Issue Prevented: Stock for request ' + requestId + ' has already been issued.'
      }, 400);
    }
    if (currentStatus !== 'Approved') {
      return createJsonResponse({
        success: false,
        error: 'Cannot issue stock for request ' + requestId + ' with status "' + currentStatus + '". Request must be Approved first.'
      }, 400);
    }

    const partCode = String(reqData[4] || '').trim().toUpperCase();
    const partName = String(reqData[5] || '').trim();
    const qtyRequested = parseInt(reqData[6], 10) || 0;

    if (qtyRequested <= 0) {
      return createJsonResponse({ success: false, error: 'Invalid requested quantity: ' + qtyRequested }, 400);
    }

    // 2. Locate Spare Part in SPARE PARTS DATABASE
    const spLastRow = spSheet.getLastRow();
    if (spLastRow <= 1) {
      return createJsonResponse({ success: false, error: 'Spare parts database is empty.' }, 404);
    }

    const spCols = Math.max(12, spSheet.getLastColumn());
    const spValues = spSheet.getRange(2, 1, spLastRow - 1, spCols).getValues();
    let partRowIndex = -1;
    let partData = null;

    for (let i = 0; i < spValues.length; i++) {
      const row = spValues[i];
      const isArchived = row.length >= 12 && String(row[11] || '').trim().toLowerCase() === 'archived';
      if (isArchived) continue;

      if (String(row[0] || '').trim().toUpperCase() === partCode) {
        partRowIndex = i + 2;
        partData = row;
        break;
      }
    }

    if (partRowIndex === -1 || !partData) {
      return createJsonResponse({ success: false, error: 'Spare part ' + partCode + ' not found in inventory.' }, 404);
    }

    const currentStock = Number(partData[4]) || 0;
    const unit = String(partData[6] || 'pcs').trim();
    const supplier = String(partData[8] || '').trim();

    // Verify sufficient stock (prevent negative stock!)
    if (currentStock < qtyRequested) {
      return createJsonResponse({
        success: false,
        error: 'Insufficient stock for ' + partCode + '. Available: ' + currentStock + ' ' + unit + ', Requested: ' + qtyRequested + ' ' + unit + '.'
      }, 400);
    }

    const newStock = currentStock - qtyRequested;
    const timestamp = formatCurrentTimestamp();

    // 3. Deduct stock from SPARE PARTS DATABASE (Column E & Column K)
    spSheet.getRange(partRowIndex, 5).setValue(newStock);
    spSheet.getRange(partRowIndex, 11).setValue(timestamp);

    // 4. Update request status to 'Issued' (Columns I, L, M)
    srSheet.getRange(reqRowIndex, 9).setValue('Issued');
    srSheet.getRange(reqRowIndex, 12).setValue(callerStaffId || 'ADMIN');
    srSheet.getRange(reqRowIndex, 13).setValue(timestamp);

    // 5. Append audit log entry in STOCK MOVEMENTS DATABASE
    const mId = 'MV-' + Math.floor(1000 + Math.random() * 9000);
    smSheet.appendRow([
      mId,
      timestamp,
      partCode,
      partName,
      'Issued',
      -qtyRequested,
      currentStock,
      newStock,
      supplier,
      callerStaffId || 'ADMIN',
      requestId
    ]);

    return createJsonResponse({
      success: true,
      requestId: requestId,
      partCode: partCode,
      issuedQty: qtyRequested,
      previousStock: currentStock,
      newStock: newStock,
      movementId: mId,
      message: 'Successfully issued ' + qtyRequested + ' ' + unit + ' of ' + partCode + '. New balance: ' + newStock + ' ' + unit + '.'
    }, 200);

  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to issue stock: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * ============================================================================
 * TECHNICIAN DATABASE MODULE (COLUMNS A TO I)
 * ============================================================================
 * Column A: Technician ID
 * Column B: Firebase UID
 * Column C: Full Name
 * Column D: Role
 * Column E: Phone Number
 * Column F: Account Status
 * Column G: Last Active
 * Column H: Created At
 * Column I: Updated At
 */

/**
 * Get or initialize TECHNICIAN DATABASE worksheet.
 */
function getOrInitTechnicianSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TECH_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TECH_SHEET_NAME);
    sheet.appendRow(TECH_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, TECH_HEADERS.length);
    headerRange.setBackground('#062641');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Retrieve all technician records from TECHNICIAN DATABASE
 */
function handleGetTechniciansGas(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TECH_SHEET_NAME);
  if (!sheet) {
    return createJsonResponse({
      success: true,
      count: 0,
      data: []
    }, 200);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({
      success: true,
      count: 0,
      data: []
    }, 200);
  }

  const values = sheet.getRange(2, 1, lastRow - 1, TECH_HEADERS.length).getValues();
  const records = values.map(function(row) {
    return {
      technicianId: String(row[0] || '').trim(),
      firebaseUid: String(row[1] || '').trim(),
      name: String(row[2] || '').trim(),
      role: String(row[3] || 'Technician').trim(),
      phoneNumber: String(row[4] || '').trim(),
      accountStatus: String(row[5] || 'Active').trim(),
      lastActive: formatCellDate(row[6]),
      createdAt: formatCellDate(row[7]),
      updatedAt: formatCellDate(row[8])
    };
  }).filter(function(r) { return r.technicianId || r.firebaseUid; });

  return createJsonResponse({
    success: true,
    count: records.length,
    data: records
  }, 200);
}

/**
 * Create or update a technician record in TECHNICIAN DATABASE.
 * Linked by Firebase UID as the primary reference.
 */
function handleSaveTechnicianGas(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database busy, lock acquisition timed out.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrInitTechnicianSheet(ss);

    const firebaseUid = String(payload.firebaseUid || '').trim();
    const name = String(payload.name || payload.displayName || '').trim();
    const role = String(payload.role || 'Technician').trim();
    const phoneNumber = String(payload.phoneNumber || payload.phone || '').trim();
    const accountStatus = String(payload.accountStatus || payload.status || 'Active').trim();
    const timestamp = formatCurrentTimestamp();

    if (!name) {
      return createJsonResponse({ success: false, error: 'Technician Full Name is required.' }, 400);
    }

    const lastRow = sheet.getLastRow();
    let existingRowIndex = -1;
    let existingTechId = '';
    let existingCreatedAt = '';
    let existingLastActive = '';

    if (lastRow > 1) {
      const values = sheet.getRange(2, 1, lastRow - 1, TECH_HEADERS.length).getValues();
      for (let i = 0; i < values.length; i++) {
        const rowTechId = String(values[i][0] || '').trim();
        const rowUid = String(values[i][1] || '').trim();

        // Match by Firebase UID (primary key) or existing technician ID
        if ((firebaseUid && rowUid === firebaseUid) ||
            (payload.technicianId && rowTechId === String(payload.technicianId).trim())) {
          existingRowIndex = i + 2;
          existingTechId = rowTechId;
          existingCreatedAt = formatCellDate(values[i][7]);
          existingLastActive = formatCellDate(values[i][6]);
          break;
        }
      }
    }

    let finalTechId = existingTechId;

    if (existingRowIndex > 0) {
      // UPDATE existing technician record (preserve Created At and Last Active)
      if (firebaseUid) sheet.getRange(existingRowIndex, 2).setValue(firebaseUid);
      sheet.getRange(existingRowIndex, 3).setValue(name);
      sheet.getRange(existingRowIndex, 4).setValue(role);
      sheet.getRange(existingRowIndex, 5).setValue(phoneNumber);
      sheet.getRange(existingRowIndex, 6).setValue(accountStatus);
      sheet.getRange(existingRowIndex, 9).setValue(timestamp);

      return createJsonResponse({
        success: true,
        action: 'updated',
        technician: {
          technicianId: finalTechId,
          firebaseUid: firebaseUid,
          name: name,
          role: role,
          phoneNumber: phoneNumber,
          accountStatus: accountStatus,
          lastActive: existingLastActive,
          createdAt: existingCreatedAt,
          updatedAt: timestamp
        }
      }, 200);
    } else {
      // CREATE new technician record
      if (!finalTechId) {
        if (payload.technicianId) {
          finalTechId = String(payload.technicianId).trim();
        } else if (payload.staffId) {
          finalTechId = 'TECH-' + String(payload.staffId).trim().toUpperCase();
        } else {
          finalTechId = 'TECH-' + String(Math.max(1, lastRow)).padStart(3, '0');
        }
      }

      sheet.appendRow([
        finalTechId,
        firebaseUid,
        name,
        role,
        phoneNumber,
        accountStatus,
        '',
        timestamp,
        timestamp
      ]);

      return createJsonResponse({
        success: true,
        action: 'created',
        technician: {
          technicianId: finalTechId,
          firebaseUid: firebaseUid,
          name: name,
          role: role,
          phoneNumber: phoneNumber,
          accountStatus: accountStatus,
          lastActive: '',
          createdAt: timestamp,
          updatedAt: timestamp
        }
      }, 200);
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to save technician: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Record technician application activity timestamp (throttled).
 */
function handleRecordTechnicianActivityGas(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (lockErr) {
    return createJsonResponse({ success: false, error: 'Database busy, lock acquisition timed out.' }, 503);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(TECH_SHEET_NAME);
    if (!sheet) {
      return createJsonResponse({ success: false, notFound: true, message: 'Technician database not initialized.' }, 404);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return createJsonResponse({ success: false, notFound: true, message: 'No technician records.' }, 404);
    }

    const firebaseUid = String(payload.firebaseUid || '').trim();
    const technicianId = String(payload.technicianId || '').trim();
    const staffId = String(payload.staffId || '').trim().toUpperCase();
    const timestamp = payload.timestamp || formatCurrentTimestamp();

    const values = sheet.getRange(2, 1, lastRow - 1, TECH_HEADERS.length).getValues();
    let foundRowIndex = -1;

    for (let i = 0; i < values.length; i++) {
      const rowTechId = String(values[i][0] || '').trim();
      const rowUid = String(values[i][1] || '').trim();

      if ((firebaseUid && rowUid === firebaseUid) ||
          (technicianId && rowTechId === technicianId) ||
          (staffId && (rowTechId === staffId || rowTechId === 'TECH-' + staffId))) {
        foundRowIndex = i + 2;
        break;
      }
    }

    if (foundRowIndex === -1) {
      return createJsonResponse({ success: false, notFound: true, message: 'Technician not found for activity update.' }, 404);
    }

    sheet.getRange(foundRowIndex, 7).setValue(timestamp); // Col G: Last Active
    sheet.getRange(foundRowIndex, 9).setValue(timestamp); // Col I: Updated At

    return createJsonResponse({
      success: true,
      lastActive: timestamp
    }, 200);

  } catch (err) {
    return createJsonResponse({ success: false, error: 'Failed to record technician activity: ' + err.toString() }, 500);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
