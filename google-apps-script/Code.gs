/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: MMS DATABASE - BD DATABASE HANDLER
 * ============================================================================
 * 
 * Target Google Sheets: MMS DATABASE
 * Target Worksheet: BD DATABASE
 * 
 * Column Structure:
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
 * Deployment:
 * 1. Open Google Sheets "MMS DATABASE"
 * 2. Extensions -> Apps Script
 * 3. Paste this code into Code.gs
 * 4. Deploy -> New Deployment -> Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL and set as GOOGLE_APPS_SCRIPT_URL in Netlify
 */

const SHEET_NAME = 'BD DATABASE';
const DRIVE_FOLDER_NAME = 'MMS Breakdown Photos';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'Empty post data received.' }, 400);
    }

    const payload = JSON.parse(e.postData.contents);
    const cols = payload.columns || payload;

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

    sheet.appendRow(rowData);
    const rowId = sheet.getLastRow();

    return createJsonResponse({
      success: true,
      message: 'Breakdown report successfully added to BD DATABASE',
      rowId: 'BD-' + rowId,
      rowNumber: rowId
    }, 200);

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: 'Google Apps Script Error: ' + err.toString()
    }, 500);
  }
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
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return fileObj.name || 'Upload failed';
  }
}

function createJsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
