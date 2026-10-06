/**
 * RAJ GROUP - Digital Marketing Platform
 * Google Sheets Live Database API
 *
 * Google Sheet:
 * https://docs.google.com/spreadsheets/d/1TPV0pMicv6YJyYxux0cZLwzyzwgOvhRzjGtcSn4IhU4/
 *
 * SETUP:
 * 1) Google Sheet → Extensions → Apps Script
 * 2) पुराना Code.gs delete करके यह पूरा code paste करें
 * 3) API_KEY अपनी private key रखें
 * 4) Save करें
 * 5) Deploy → New deployment → Web app
 * 6) Execute as: Me
 * 7) Who has access: Anyone
 * 8) Deploy करें
 * 9) मिलने वाला /exec URL Digital Marketing Platform में paste करें
 */

const SPREADSHEET_ID = '1TPV0pMicv6YJyYxux0cZLwzyzwgOvhRzjGtcSn4IhU4';

// इसे आप बदल सकते हैं.
// यही exact key Digital Marketing Platform में भी डालनी होगी.
const API_KEY = 'RAJ-DMP-2026-LIVE';
const APP_VERSION = 'V4-2026-10-06';

const TAB = {
  MARKETING: 'Marketing Calendar',
  FESTIVALS: 'Festival Calendar',
  BIRTHDAYS: 'Birthday Calendar',
  SETTINGS: 'Settings'
};

const HEADERS = {
  [TAB.MARKETING]: [
    'Date',
    'Work_or_Template',
    'Template_ID',
    'Notes',
    'Status',
    'Updated_At'
  ],

  [TAB.FESTIVALS]: [
    'ID',
    'Festival_Name',
    'Date',
    'Audience',
    'Reminder',
    'Updated_At'
  ],

  [TAB.BIRTHDAYS]: [
    'ID',
    'Name',
    'Birthday',
    'Type',
    'Notes',
    'Updated_At'
  ],

  [TAB.SETTINGS]: [
    'Key',
    'Value',
    'Updated_At'
  ]
};


/* =========================================================
   GET REQUEST
========================================================= */

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};

    checkAuth_(params.key);
    setupSheets_();

    const action = params.action || 'ping';

    if (action === 'ping') {
      return json_({
        ok: true,
        message: 'Raj Group Digital Marketing Platform connected successfully',
        version: APP_VERSION,
        spreadsheetId: SPREADSHEET_ID,
        timestamp: stamp_()
      });
    }

    if (action === 'all') {
      return json_({
        ok: true,
        data: readAll_()
      });
    }

    if (action === 'marketing') {
      return json_({
        ok: true,
        data: readRows_(TAB.MARKETING)
      });
    }

    if (action === 'festivals') {
      return json_({
        ok: true,
        data: readRows_(TAB.FESTIVALS)
      });
    }

    if (action === 'birthdays') {
      return json_({
        ok: true,
        data: readRows_(TAB.BIRTHDAYS)
      });
    }

    return json_({
      ok: false,
      error: 'Unknown GET action'
    });

  } catch (err) {
    return json_({
      ok: false,
      error: String(err.message || err)
    });
  }
}


/* =========================================================
   POST REQUEST
========================================================= */

function doPost(e) {
  try {

    const body =
      e &&
      e.postData &&
      e.postData.contents
        ? e.postData.contents
        : '{}';

    const req = JSON.parse(body);

    checkAuth_(req.key);
    setupSheets_();

    const action = req.action;
    const data = req.data || {};

    /* -----------------------------
       MARKETING CALENDAR
    ----------------------------- */

    if (action === 'savePlan') {

      upsert_(
        TAB.MARKETING,
        'Date',
        cleanPlan_(data)
      );

    }

    else if (action === 'bulkSavePlans') {

      const rows = Array.isArray(data) ? data : [];

      rows.forEach(function(row) {
        upsert_(
          TAB.MARKETING,
          'Date',
          cleanPlan_(row)
        );
      });

    }

    else if (action === 'replaceMarketing') {

      const rows = Array.isArray(data) ? data : [];

      replaceRows_(
        TAB.MARKETING,
        rows.map(cleanPlan_)
      );

    }

    /* -----------------------------
       FESTIVAL CALENDAR
    ----------------------------- */

    else if (action === 'saveFestival') {

      upsert_(
        TAB.FESTIVALS,
        'ID',
        cleanFestival_(data)
      );

    }

    else if (action === 'deleteFestival') {

      deleteByKey_(
        TAB.FESTIVALS,
        'ID',
        data.ID
      );

    }

    else if (action === 'replaceFestivals') {

      const rows = Array.isArray(data) ? data : [];

      replaceRows_(
        TAB.FESTIVALS,
        rows.map(cleanFestival_)
      );

    }

    /* -----------------------------
       BIRTHDAY CALENDAR
    ----------------------------- */

    else if (action === 'saveBirthday') {

      upsert_(
        TAB.BIRTHDAYS,
        'ID',
        cleanBirthday_(data)
      );

    }

    else if (action === 'deleteBirthday') {

      deleteByKey_(
        TAB.BIRTHDAYS,
        'ID',
        data.ID
      );

    }

    else if (action === 'replaceBirthdays') {

      const rows = Array.isArray(data) ? data : [];

      replaceRows_(
        TAB.BIRTHDAYS,
        rows.map(cleanBirthday_)
      );

    }

    /* -----------------------------
       SETTINGS
    ----------------------------- */

    else if (action === 'saveSettings') {

      saveSettings_(data);

    }

    /* -----------------------------
       COMPLETE BACKUP / RESTORE
    ----------------------------- */

    else if (action === 'replaceAll') {

      replaceAll_(data);

    }

    else {

      return json_({
        ok: false,
        error: 'Unknown POST action'
      });

    }

    return json_({
      ok: true,
      message: 'Data saved successfully'
    });

  } catch (err) {

    return json_({
      ok: false,
      error: String(err.message || err)
    });

  }
}


/* =========================================================
   CREATE / PREPARE GOOGLE SHEET TABS
========================================================= */

function setupSheets_() {

  const ss = getBook_();

  Object.keys(HEADERS).forEach(function(sheetName) {

    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    const headers = HEADERS[sheetName];

    if (sheet.getLastRow() === 0) {

      sheet
        .getRange(1, 1, 1, headers.length)
        .setValues([headers]);

      sheet.setFrozenRows(1);

      sheet
        .getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#eaf4ff');

      sheet.autoResizeColumns(
        1,
        headers.length
      );

    } else {

      const current =
        sheet
          .getRange(1, 1, 1, headers.length)
          .getDisplayValues()[0];

      if (
        current.join('|') !==
        headers.join('|')
      ) {

        sheet
          .getRange(1, 1, 1, headers.length)
          .setValues([headers]);

      }

    }

    if (
      sheetName === TAB.MARKETING ||
      sheetName === TAB.FESTIVALS ||
      sheetName === TAB.BIRTHDAYS
    ) {

      sheet
        .getDataRange()
        .setNumberFormat('@');

    }

  });

}


/* =========================================================
   OPEN GOOGLE SHEET
========================================================= */

function getBook_() {

  if (!SPREADSHEET_ID) {
    throw new Error(
      'Google Spreadsheet ID is missing'
    );
  }

  return SpreadsheetApp.openById(
    SPREADSHEET_ID
  );

}


/* =========================================================
   AUTHENTICATION
========================================================= */

function checkAuth_(key) {

  const receivedKey = String(key || '').trim();
  const expectedKey = String(API_KEY || '').trim();

  if (!expectedKey) {
    throw new Error('API_KEY is missing');
  }

  if (receivedKey !== expectedKey) {
    throw new Error('Invalid Sync Key');
  }

}


/* =========================================================
   OPTIONAL DIAGNOSTIC TEST
   Run this manually inside Apps Script if needed.
========================================================= */

function testConfiguration() {

  setupSheets_();

  Logger.log({
    version: APP_VERSION,
    spreadsheetId: SPREADSHEET_ID,
    apiKeyLength: String(API_KEY || '').trim().length,
    status: 'Configuration loaded successfully'
  });

}


/* =========================================================
   READ ALL DATA
========================================================= */

function readAll_() {

  return {

    marketing:
      readRows_(TAB.MARKETING),

    festivals:
      readRows_(TAB.FESTIVALS),

    birthdays:
      readRows_(TAB.BIRTHDAYS),

    settings:
      readSettings_()

  };

}


/* =========================================================
   READ SHEET ROWS
========================================================= */

function readRows_(sheetName) {

  const sheet =
    getBook_().getSheetByName(
      sheetName
    );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return [];
  }

  const values =
    sheet
      .getDataRange()
      .getDisplayValues();

  const headers =
    values.shift();

  return values

    .filter(function(row) {

      return row.some(function(value) {
        return value !== '';
      });

    })

    .map(function(row) {

      const obj = {};

      headers.forEach(
        function(header, index) {

          obj[header] =
            row[index] || '';

        }
      );

      return obj;

    });

}


/* =========================================================
   INSERT OR UPDATE ROW
========================================================= */

function upsert_(
  sheetName,
  keyName,
  obj
) {

  const sheet =
    getBook_().getSheetByName(
      sheetName
    );

  const headers =
    HEADERS[sheetName];

  const keyColumn =
    headers.indexOf(keyName) + 1;

  const key =
    String(obj[keyName] || '');

  if (!key) {

    throw new Error(
      keyName + ' is required'
    );

  }

  let targetRow = 0;

  if (
    sheet.getLastRow() >= 2
  ) {

    const existingKeys =
      sheet
        .getRange(
          2,
          keyColumn,
          sheet.getLastRow() - 1,
          1
        )
        .getDisplayValues()
        .flat();

    const index =
      existingKeys.findIndex(
        function(value) {

          return (
            String(value) === key
          );

        }
      );

    if (index >= 0) {
      targetRow = index + 2;
    }

  }

  obj.Updated_At = stamp_();

  const row =
    headers.map(
      function(header) {

        return (
          obj[header] == null
            ? ''
            : String(obj[header])
        );

      }
    );

  if (targetRow) {

    sheet
      .getRange(
        targetRow,
        1,
        1,
        headers.length
      )
      .setValues([row]);

  } else {

    sheet.appendRow(row);

  }

}


/* =========================================================
   DELETE ROW
========================================================= */

function deleteByKey_(
  sheetName,
  keyName,
  key
) {

  if (!key) {
    return;
  }

  const sheet =
    getBook_().getSheetByName(
      sheetName
    );

  const headers =
    HEADERS[sheetName];

  const keyColumn =
    headers.indexOf(keyName) + 1;

  if (
    sheet.getLastRow() < 2
  ) {
    return;
  }

  const keys =
    sheet
      .getRange(
        2,
        keyColumn,
        sheet.getLastRow() - 1,
        1
      )
      .getDisplayValues()
      .flat();

  const index =
    keys.findIndex(
      function(value) {

        return (
          String(value) ===
          String(key)
        );

      }
    );

  if (index >= 0) {

    sheet.deleteRow(
      index + 2
    );

  }

}


/* =========================================================
   REPLACE COMPLETE TAB DATA
========================================================= */

function replaceRows_(
  sheetName,
  rows
) {

  const sheet =
    getBook_().getSheetByName(
      sheetName
    );

  const headers =
    HEADERS[sheetName];

  if (
    sheet.getLastRow() > 1
  ) {

    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        headers.length
      )
      .clearContent();

  }

  if (!rows.length) {
    return;
  }

  const now = stamp_();

  const values =
    rows.map(
      function(obj) {

        obj.Updated_At = now;

        return headers.map(
          function(header) {

            return (
              obj[header] == null
                ? ''
                : String(obj[header])
            );

          }
        );

      }
    );

  sheet
    .getRange(
      2,
      1,
      values.length,
      headers.length
    )
    .setValues(values);

}


/* =========================================================
   SETTINGS
========================================================= */

function saveSettings_(data) {

  Object.keys(
    data || {}
  ).forEach(
    function(key) {

      upsert_(
        TAB.SETTINGS,
        'Key',
        {
          Key: key,
          Value: data[key]
        }
      );

    }
  );

}


function readSettings_() {

  const rows =
    readRows_(
      TAB.SETTINGS
    );

  const output = {};

  rows.forEach(
    function(row) {

      if (row.Key) {
        output[row.Key] =
          row.Value;
      }

    }
  );

  return output;

}


/* =========================================================
   RESTORE COMPLETE DATABASE
========================================================= */

function replaceAll_(data) {

  replaceRows_(
    TAB.MARKETING,
    (data.marketing || [])
      .map(cleanPlan_)
  );

  replaceRows_(
    TAB.FESTIVALS,
    (data.festivals || [])
      .map(cleanFestival_)
  );

  replaceRows_(
    TAB.BIRTHDAYS,
    (data.birthdays || [])
      .map(cleanBirthday_)
  );

  const sheet =
    getBook_()
      .getSheetByName(
        TAB.SETTINGS
      );

  if (
    sheet.getLastRow() > 1
  ) {

    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        HEADERS[TAB.SETTINGS].length
      )
      .clearContent();

  }

  saveSettings_(
    data.settings || {}
  );

}


/* =========================================================
   DATA CLEANING
========================================================= */

function cleanPlan_(row) {

  return {

    Date:
      string_(row.Date),

    Work_or_Template:
      string_(
        row.Work_or_Template
      ),

    Template_ID:
      string_(
        row.Template_ID
      ),

    Notes:
      string_(row.Notes),

    Status:
      string_(
        row.Status ||
        'Planned'
      )

  };

}


function cleanFestival_(row) {

  return {

    ID:
      string_(row.ID),

    Festival_Name:
      string_(
        row.Festival_Name
      ),

    Date:
      string_(row.Date),

    Audience:
      string_(
        row.Audience ||
        'Customers + Staff'
      ),

    Reminder:
      string_(
        row.Reminder ||
        'Yes'
      )

  };

}


function cleanBirthday_(row) {

  return {

    ID:
      string_(row.ID),

    Name:
      string_(row.Name),

    Birthday:
      string_(
        row.Birthday
      ),

    Type:
      string_(
        row.Type ||
        'Customer'
      ),

    Notes:
      string_(row.Notes)

  };

}


/* =========================================================
   HELPERS
========================================================= */

function string_(value) {

  return (
    value == null
      ? ''
      : String(value)
  );

}


function stamp_() {

  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() ||
      'Asia/Kolkata',
    'yyyy-MM-dd HH:mm:ss'
  );

}


function json_(object) {

  return ContentService
    .createTextOutput(
      JSON.stringify(object)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/* =========================================================
   OPTIONAL MANUAL SETUP TEST
========================================================= */

function initializeDatabase() {

  setupSheets_();

  Logger.log(
    'Raj Group Digital Marketing Database initialized successfully.'
  );

}