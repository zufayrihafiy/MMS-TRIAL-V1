# Maintenance Management System (MMS) - Breakdown Form Backend Integration

This document outlines the architecture and deployment steps for connecting the **Report Machine Breakdown** modal to **Google Sheets (`MMS DATABASE` &rarr; Worksheet: `BD DATABASE`)** via an authenticated **Netlify server function**.

---

## 1. Database Schema (`MMS DATABASE` &rarr; `BD DATABASE`)

The spreadsheet columns are mapped as follows:

| Column | Field Name | Data Type | Source / Calculation |
| :---: | :--- | :--- | :--- |
| **A** | `time` | Timestamp | Automatically recorded submission date & time |
| **B** | `month` | Text | Automatically calculated (e.g. `October 2026`) |
| **C** | `staffId` | Text | Populated from active profile / user input |
| **D** | `machine` | Text | Selected machine unit (e.g. `VIM 01`, `VIM 02`, `VIM 03`) |
| **E** | `startTime` | Date & Time | Breakdown start date and time |
| **F** | `endTime` | Date & Time | Breakdown end date and time (empty for new reports) |
| **G** | `downtime` | Number (min) | Calculated: `End Time - Start Time` (minutes) |
| **H** | `category` | Dropdown | Mechanical, Electrical, Hydraulic, Pneumatic, Sensor, Software, Others |
| **I** | `beforePhoto` | URL / Ref | Stored in authorized Google Drive folder |
| **J** | `afterPhoto` | URL / Ref | Stored in authorized Google Drive folder |
| **K** | `description` | Text | Machine problem description & observed symptoms |
| **L** | `status` | Dropdown | `Repair` (default), `Awaiting Part`, or `Completed` |

---

## 2. Security Architecture & Server Endpoints

1. **No Credentials in Frontend**: Google Apps Script deployment URLs, service credentials, and API keys are stored solely in **Netlify Environment Variables** (`FIREBASE_WEB_API_KEY`, `GOOGLE_APPS_SCRIPT_URL`, `MMS_API_KEY`).
2. **Server Function Endpoints**:
   - `/.netlify/functions/submit-breakdown`: Authenticated breakdown report submission with photo attachment handling.
   - `/.netlify/functions/get-breakdowns`: Secure read endpoint fetching all rows from `BD DATABASE` with token verification.
   - `/.netlify/functions/resolve-breakdown`: Resolves an active breakdown. Strictly requires `Breakdown End Time` before updating status to `Completed` and recalculating downtime.
   - `/.netlify/functions/get-bd-dashboard`: Breakdown Management Dashboard endpoint. Enforces `ADMIN` role claim on the server (returns `HTTP 403 Forbidden` for `TECHNICIAN` role).
3. **Database Extension (Backward-Compatible)**:
   - Columns A to L remain strictly preserved according to the original Google Sheets schema.
   - Optional Columns M (`Priority`) and N (`Assigned Technician`) can be added without altering columns A-L. If omitted or empty, Priority defaults to `Not Assigned` and Technician defaults to `Unassigned`.
   - **MTBF Data Note**: Machine operating hours are not tracked in BD DATABASE (which only logs breakdown incidents). MTBF correctly displays `N/A - Operating hours required` until an operating schedule / meter-hours log is integrated.
4. **Validation & Protection**:
   - Status `Completed` strictly requires `Breakdown End Time`.
   - End Time must be greater than or equal to Start Time.
   - If the backend is unreachable or not configured, the UI clearly alerts the user and does not simulate fake success.

---

## 3. Setup Steps

### Step A: Google Sheets & Apps Script Setup
1. Create or open the Google Sheets document named **`MMS DATABASE`**.
2. Ensure there is a sheet named **`BD DATABASE`** (or allow the Apps Script to create it automatically).
3. Go to **Extensions** &rarr; **Apps Script**.
4. Paste the contents of `google-apps-script/Code.gs` into the script editor.
5. In the Apps Script left sidebar, click **Project Settings** (gear icon) &rarr; scroll down to **Script Properties** &rarr; click **Add script property**:
   - **Property**: `MMS_API_KEY`
   - **Value**: *(Choose a strong secret API key, e.g. a random 32-64 character string)*
   - Click **Save script properties**.
6. Click **Deploy** &rarr; **New deployment**.
   - Select type: **Web app**.
   - Description: `MMS Breakdown Backend`.
   - Execute as: **Me**.
   - Who has access: **Anyone** *(Protected by MMS_API_KEY payload verification and disabled public GET)*.
7. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/.../exec`).

### Step B: Netlify Environment Variable Configuration
1. In your Netlify dashboard for this site, go to **Site configuration** &rarr; **Environment variables**.
2. Add the variables:
   - **Key**: `GOOGLE_APPS_SCRIPT_URL`
     - **Value**: *(Your Google Apps Script Web App URL from Step A)*
   - **Key**: `FIREBASE_WEB_API_KEY`
     - **Value**: *(Your Firebase Web API Key)*
   - **Key**: `MMS_API_KEY`
     - **Value**: *(The exact secret key string configured in Apps Script Script Properties in Step A)*
3. Trigger a new deploy (or restart your local Netlify dev server).

---

## 4. Local Testing with Netlify CLI

To run the full stack locally with Netlify server functions:

```bash
# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli

# Start local Netlify dev server
netlify dev
```

The app will be served at `http://localhost:8888` with all server functions active at `http://localhost:8888/.netlify/functions/*`.
