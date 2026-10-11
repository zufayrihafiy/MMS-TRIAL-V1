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
const DRIVE_FOLDER_NAME = 'MMS Breakdown Photos';

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

  const lastCol = Math.max(12, sheet.getLastColumn());
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
 * Create a new breakdown record in BD DATABASE (Columns A to L)
 */
function handleCreateBreakdown(payload) {
  const cols = payload.columns || payload;

  // Validate required breakdown fields
  const requiredFields = [
    'staffId',
    'machine',
    'startTime',
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

  // Validate breakdown dates
  const startDate = new Date(cols.startTime);
  if (isNaN(startDate.getTime())) {
    return createJsonResponse({
      success: false,
      error: 'Invalid Breakdown Start Time'
    }, 422);
  }

  if (cols.endTime) {
    const endDate = new Date(cols.endTime);
    if (isNaN(endDate.getTime()) || endDate < startDate) {
      return createJsonResponse({
        success: false,
        error: 'Invalid Breakdown End Time'
      }, 422);
    }
  }

  if (cols.status === 'Completed' && !cols.endTime) {
    return createJsonResponse({
      success: false,
      error: 'Breakdown End Time is required for completed repairs.'
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
      'Status'                 // Col L
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#062641').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }

  // 1. Process Automatic Date Generation
  const now = new Date();
  const timeFormatted = cols.time || Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const monthFormatted = cols.month || Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMMM yyyy');

  // 2. Process Downtime Calculation
  let downtimeVal = '';
  if (cols.startTime && cols.endTime) {
    const startMs = new Date(cols.startTime).getTime();
    const endMs = new Date(cols.endTime).getTime();

    if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
      downtimeVal = Math.round((endMs - startMs) / (60 * 1000));
    }
  } else if (cols.downtime !== undefined && cols.downtime !== null && cols.downtime !== '') {
    downtimeVal = cols.downtime;
  }

  // 3. Process Photos into Authorized Storage (Google Drive)
  let beforePhotoUrl = cols.beforePhoto || '';
  let afterPhotoUrl = cols.afterPhoto || '';

  if (payload.photoFiles) {
    if (payload.photoFiles.before && payload.photoFiles.before.data) {
      beforePhotoUrl = savePhotoToDrive(payload.photoFiles.before, cols.machine, 'BEFORE');
    }
    if (payload.photoFiles.after && payload.photoFiles.after.data) {
      afterPhotoUrl = savePhotoToDrive(payload.photoFiles.after, cols.machine, 'AFTER');
    }
  }

  // 4. Assemble Database Row: STRICTLY COLUMNS A TO L
  const rowData = [
    timeFormatted,                           // Column A: Time
    monthFormatted,                          // Column B: Month
    cols.staffId || '',                      // Column C: Staff ID
    cols.machine || '',                      // Column D: Machine
    cols.startTime || '',                    // Column E: Breakdown Start Time
    cols.endTime || '',                      // Column F: Breakdown End Time
    downtimeVal,                             // Column G: Downtime (minutes)
    cols.category || '',                     // Column H: Problem Category
    beforePhotoUrl,                          // Column I: Before Photo
    afterPhotoUrl,                           // Column J: After Photo
    cols.description || '',                  // Column K: Problem Description
    cols.status || 'Repair'                  // Column L: Status
  ];

  // Optional backward-compatible columns M & N if present
  if (cols.priority || cols.assignedTech) {
    rowData.push(cols.priority || '');
    rowData.push(cols.assignedTech || '');
  }

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

    // BATCH UPDATE (COLUMNS F THROUGH L):
    // Read existing Columns F to L (cols 6 to 12) to preserve unrelated Columns H, I, K
    const rangeFL = sheet.getRange(targetRow, 6, 1, 7);
    const existingFL = rangeFL.getValues()[0];

    const finalAfterPhoto = afterPhotoUrl || existingFL[4] || '';

    const updatedFL = [
      endTimeStr,         // Col F (index 0 in slice, col 6): Breakdown End Time
      downtimeMin,        // Col G (index 1 in slice, col 7): Downtime (minutes)
      existingFL[2],      // Col H (index 2 in slice, col 8): Problem Category (Preserved)
      existingFL[3],      // Col I (index 3 in slice, col 9): Before Photo (Preserved)
      finalAfterPhoto,    // Col J (index 4 in slice, col 10): After Photo (Updated if provided, else Preserved)
      existingFL[5],      // Col K (index 5 in slice, col 11): Problem Description (Preserved)
      'Completed'         // Col L (index 6 in slice, col 12): Status
    ];

    // Single batched write to minimize partial-update window
    rangeFL.setValues([updatedFL]);

    return createJsonResponse({
      success: true,
      message: 'Breakdown record successfully resolved and updated to Completed in BD DATABASE.',
      rowNumber: targetRow,
      id: payload.id || ('BD-' + targetRow),
      downtime: downtimeMin
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
