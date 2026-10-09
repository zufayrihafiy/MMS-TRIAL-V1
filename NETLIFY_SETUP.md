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

## 2. Security Architecture

1. **No Credentials in Frontend**: Google Apps Script deployment URLs, service credentials, and API keys are stored solely in **Netlify Environment Variables**.
2. **Server Function Proxy**: The frontend sends POST requests to `/.netlify/functions/submit-breakdown`.
3. **Validation & Protection**:
   - Status `Completed` strictly requires `Breakdown End Time`.
   - End Time must be greater than or equal to Start Time.
   - If the backend is unreachable or not configured, the UI clearly alerts the user and does not simulate fake success.

---

## 3. Setup Steps

### Step A: Google Sheets Setup
1. Create or open the Google Sheets document named **`MMS DATABASE`**.
2. Ensure there is a sheet named **`BD DATABASE`** (or allow the Apps Script to create it automatically).
3. Go to **Extensions** &rarr; **Apps Script**.
4. Paste the contents of `google-apps-script/Code.gs` into the script editor.
5. Click **Deploy** &rarr; **New deployment**.
   - Select type: **Web app**.
   - Description: `MMS Breakdown Backend`.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
6. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/.../exec`).

### Step B: Netlify Environment Variable Configuration
1. In your Netlify dashboard for this site, go to **Site configuration** &rarr; **Environment variables**.
2. Add the variable:
   - **Key**: `GOOGLE_APPS_SCRIPT_URL`
   - **Value**: *(Your Google Apps Script Web App URL from Step A)*
3. (Optional) Add `MMS_API_KEY` if custom API key authentication is enabled.
4. Trigger a new deploy.

---

## 4. Local Testing with Netlify CLI

To run the full stack locally with Netlify server functions:

```bash
# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli

# Start local Netlify dev server
netlify dev
```

The app will be served at `http://localhost:8888` with the server function active at `http://localhost:8888/.netlify/functions/submit-breakdown`.
