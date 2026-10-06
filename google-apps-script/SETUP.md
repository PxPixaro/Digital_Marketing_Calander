# Google Sheets Live Sync Setup — Raj Group

## 1. Create the master Google Sheet
Create one new Google Sheet, for example:

`Raj Group Digital Marketing Live Data`

You do not need to manually create tabs. The Apps Script creates these automatically on first successful connection:

- Marketing Calendar
- Festival Calendar
- Birthday Calendar
- Settings

## 2. Copy the Google Sheet ID
A Google Sheet URL looks like:

`https://docs.google.com/spreadsheets/d/1AbCdEf...XYZ/edit`

Copy only the part between `/d/` and `/edit`.

## 3. Add Apps Script
Open the Google Sheet → Extensions → Apps Script.

Delete the default code and paste the complete contents of `Code.gs` from this folder.

At the top of `Code.gs` change:

`SPREADSHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE'`

and set a private Sync Key:

`API_KEY = 'RAJ-YOUR-PRIVATE-KEY'`

The same Sync Key must be entered in the Digital Marketing Platform Settings page.

## 4. Deploy as Web App
In Apps Script:

1. Click **Deploy → New deployment**
2. Select **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Deploy and approve the Google permissions
6. Copy the URL ending in `/exec`

Important: use the `/exec` URL, not the `/dev` test URL.

## 5. Connect the platform
Open Digital Marketing Platform → **Settings & Backup → Google Sheets Live Sync**.

Paste:

- Apps Script Web App URL
- Sync Key

Then click **Connect & Test**.

If successful, the top-right badge becomes **Live Connected**.

## How saving works
When live sync is connected:

- Manual Marketing Calendar edits save to Google Sheet immediately.
- Suggested monthly plans are synced.
- Excel Marketing Calendar imports are synced.
- Festival Add/Delete/Import is synced.
- Birthday Add/Delete/Import is synced.
- Company settings are synced.
- When another staff member opens the platform, latest Google Sheet data is loaded automatically.

The browser also keeps a local fallback copy. If internet or Apps Script is unavailable, the platform shows **Saved locally / Sync pending**. Use **Push Local Data** after the connection returns.

## Important security note
Anyone who has both the Apps Script Web App URL and Sync Key can access this API. Do not publish the Sync Key publicly. For a larger team or sensitive data, move later to authenticated access or a dedicated backend.

## Reminder limitation
Festival and birthday reminder popups are checked while the website/app is open. A normal static browser app cannot guarantee a notification while every browser/device is completely closed. For guaranteed scheduled reminders, a later version can add server-side Apps Script time triggers and email/Google Chat notifications.
