# Raj Group Digital Marketing Platform — Google Sheets Live Edition

This version is designed for a shared staff workflow with Google Sheets + Google Apps Script as the live database.

## Main workflow
- Marketing Calendar is the main monthly work plan.
- Sundays stay visible in red as HOLIDAY.
- Every other working day can carry one planned communication activity.
- Any date can be edited manually when priorities change.
- Excel demo/import/export is available for Marketing, Festival and Birthday calendars.
- Message Studio contains the approved Raj Agencies templates supplied in the Word document.
- Festival Calendar supports one-day-before preparation reminders and same-day reminders around 10:30 AM while the app is open.
- Birthday Calendar stores Customer and Staff birthdays and opens the Birthday template with the person's name.
- No dashboard, customer database, message-cost calculation or audience-counting module is included.

## Shared live database
Use the files in `google-apps-script/`.

1. Create a Google Sheet.
2. Open Extensions → Apps Script.
3. Paste `google-apps-script/Code.gs`.
4. Set `SPREADSHEET_ID` and `API_KEY`.
5. Deploy as a Web App.
6. Paste the `/exec` Web App URL and same Sync Key in Platform → Settings & Backup.
7. Click Connect & Test.

See `google-apps-script/SETUP.md` for complete instructions.

## Data stored in Google Sheets
The script automatically creates:
- Marketing Calendar
- Festival Calendar
- Birthday Calendar
- Settings

When connected, manual changes and imports are written to the Sheet. The app also keeps a local browser fallback copy.

## Hosting
For staff use, host the project on HTTPS. GitHub Pages works for the frontend. Google Sheets/Apps Script provides the shared data layer.

Opening `index.html` directly can work for local testing, but browser permissions and cross-origin behavior are more reliable when served over HTTPS.

## Reminder limitation
In-app reminders run while the app is open. A browser-only frontend cannot guarantee an exact notification while all browsers are completely closed. Server-side scheduled alerts can be added later with Apps Script triggers.
