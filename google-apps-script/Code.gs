/**
 * RAJ GROUP - Digital Marketing Platform
 * Google Sheets live database API
 *
 * SETUP:
 * 1) Create a Google Sheet.
 * 2) Copy the spreadsheet ID from its URL and paste below.
 * 3) Change API_KEY to a private key of your choice.
 * 4) Deploy this Apps Script as Web App: Execute as Me, access = Anyone.
 * 5) Paste the Web App /exec URL and same Sync Key into the platform Settings page.
 */
const SPREADSHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
const API_KEY = 'RAJ-CHANGE-THIS-KEY';

const TAB = {
  MARKETING: 'Marketing Calendar',
  FESTIVALS: 'Festival Calendar',
  BIRTHDAYS: 'Birthday Calendar',
  SETTINGS: 'Settings'
};

const HEADERS = {
  [TAB.MARKETING]: ['Date','Work_or_Template','Template_ID','Notes','Status','Updated_At'],
  [TAB.FESTIVALS]: ['ID','Festival_Name','Date','Audience','Reminder','Updated_At'],
  [TAB.BIRTHDAYS]: ['ID','Name','Birthday','Type','Notes','Updated_At'],
  [TAB.SETTINGS]: ['Key','Value','Updated_At']
};

function doGet(e) {
  try {
    checkAuth_(e && e.parameter && e.parameter.key);
    setupSheets_();
    const action = (e && e.parameter && e.parameter.action) || 'ping';
    if (action === 'ping') return json_({ok:true, message:'Raj Group Google Sheets API is connected'});
    if (action === 'all') return json_({ok:true, data:readAll_()});
    return json_({ok:false, error:'Unknown GET action'});
  } catch (err) {
    return json_({ok:false, error:String(err.message || err)});
  }
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    checkAuth_(req.key);
    setupSheets_();
    const action = req.action;
    const data = req.data || {};

    if (action === 'savePlan') upsert_(TAB.MARKETING, 'Date', cleanPlan_(data));
    else if (action === 'bulkSavePlans') (Array.isArray(data) ? data : []).forEach(r => upsert_(TAB.MARKETING, 'Date', cleanPlan_(r)));
    else if (action === 'saveFestival') upsert_(TAB.FESTIVALS, 'ID', cleanFestival_(data));
    else if (action === 'deleteFestival') deleteByKey_(TAB.FESTIVALS, 'ID', data.ID);
    else if (action === 'saveBirthday') upsert_(TAB.BIRTHDAYS, 'ID', cleanBirthday_(data));
    else if (action === 'deleteBirthday') deleteByKey_(TAB.BIRTHDAYS, 'ID', data.ID);
    else if (action === 'replaceFestivals') replaceRows_(TAB.FESTIVALS, (Array.isArray(data) ? data : []).map(cleanFestival_));
    else if (action === 'replaceBirthdays') replaceRows_(TAB.BIRTHDAYS, (Array.isArray(data) ? data : []).map(cleanBirthday_));
    else if (action === 'saveSettings') saveSettings_(data);
    else if (action === 'replaceAll') replaceAll_(data);
    else return json_({ok:false, error:'Unknown POST action'});

    return json_({ok:true});
  } catch (err) {
    return json_({ok:false, error:String(err.message || err)});
  }
}

function setupSheets_() {
  const ss = getBook_();
  Object.keys(HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = HEADERS[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#eaf4ff');
      sh.autoResizeColumns(1, headers.length);
    } else {
      const current = sh.getRange(1,1,1,headers.length).getDisplayValues()[0];
      if (current.join('|') !== headers.join('|')) sh.getRange(1,1,1,headers.length).setValues([headers]);
    }
    if (name === TAB.MARKETING || name === TAB.FESTIVALS || name === TAB.BIRTHDAYS) sh.getDataRange().setNumberFormat('@');
  });
}

function getBook_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PASTE_') === 0) throw new Error('Paste your Google Sheet ID into SPREADSHEET_ID in Code.gs');
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function checkAuth_(key) {
  if (!API_KEY || API_KEY === 'RAJ-CHANGE-THIS-KEY') throw new Error('Change API_KEY in Code.gs before deployment');
  if (String(key || '') !== String(API_KEY)) throw new Error('Invalid Sync Key');
}

function readAll_() {
  return {
    marketing: readRows_(TAB.MARKETING),
    festivals: readRows_(TAB.FESTIVALS),
    birthdays: readRows_(TAB.BIRTHDAYS),
    settings: readSettings_()
  };
}

function readRows_(sheetName) {
  const sh = getBook_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getDisplayValues();
  const h = vals.shift();
  return vals.filter(r => r.some(v => v !== '')).map(r => Object.fromEntries(h.map((k,i)=>[k,r[i] || ''])));
}

function upsert_(sheetName, keyName, obj) {
  const sh = getBook_().getSheetByName(sheetName), headers = HEADERS[sheetName];
  const keyCol = headers.indexOf(keyName) + 1, key = String(obj[keyName] || '');
  if (!key) throw new Error(keyName + ' is required');
  let target = 0;
  if (sh.getLastRow() >= 2) {
    const keys = sh.getRange(2,keyCol,sh.getLastRow()-1,1).getDisplayValues().flat();
    const idx = keys.findIndex(v => String(v) === key);
    if (idx >= 0) target = idx + 2;
  }
  obj.Updated_At = stamp_();
  const row = headers.map(h => obj[h] == null ? '' : String(obj[h]));
  if (target) sh.getRange(target,1,1,headers.length).setValues([row]);
  else sh.appendRow(row);
}

function deleteByKey_(sheetName, keyName, key) {
  if (!key) return;
  const sh = getBook_().getSheetByName(sheetName), headers = HEADERS[sheetName], keyCol = headers.indexOf(keyName)+1;
  if (sh.getLastRow() < 2) return;
  const keys = sh.getRange(2,keyCol,sh.getLastRow()-1,1).getDisplayValues().flat();
  const idx = keys.findIndex(v => String(v) === String(key));
  if (idx >= 0) sh.deleteRow(idx+2);
}

function replaceRows_(sheetName, rows) {
  const sh = getBook_().getSheetByName(sheetName), headers = HEADERS[sheetName];
  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,headers.length).clearContent();
  if (!rows.length) return;
  const now=stamp_();
  const values = rows.map(o => {o.Updated_At=now;return headers.map(h=>o[h]==null?'':String(o[h]));});
  sh.getRange(2,1,values.length,headers.length).setValues(values);
}

function saveSettings_(data) {
  Object.keys(data || {}).forEach(k => upsert_(TAB.SETTINGS, 'Key', {Key:k, Value:data[k]}));
}

function readSettings_() {
  const rows = readRows_(TAB.SETTINGS), out={};
  rows.forEach(r => { if (r.Key) out[r.Key]=r.Value; });
  return out;
}

function replaceAll_(data) {
  replaceRows_(TAB.MARKETING, (data.marketing || []).map(cleanPlan_));
  replaceRows_(TAB.FESTIVALS, (data.festivals || []).map(cleanFestival_));
  replaceRows_(TAB.BIRTHDAYS, (data.birthdays || []).map(cleanBirthday_));
  const sh=getBook_().getSheetByName(TAB.SETTINGS);
  if(sh.getLastRow()>1) sh.getRange(2,1,sh.getLastRow()-1,HEADERS[TAB.SETTINGS].length).clearContent();
  saveSettings_(data.settings || {});
}

function cleanPlan_(r) { return {Date:s_(r.Date),Work_or_Template:s_(r.Work_or_Template),Template_ID:s_(r.Template_ID),Notes:s_(r.Notes),Status:s_(r.Status||'Planned')}; }
function cleanFestival_(r) { return {ID:s_(r.ID),Festival_Name:s_(r.Festival_Name),Date:s_(r.Date),Audience:s_(r.Audience||'Customers + Staff'),Reminder:s_(r.Reminder||'Yes')}; }
function cleanBirthday_(r) { return {ID:s_(r.ID),Name:s_(r.Name),Birthday:s_(r.Birthday),Type:s_(r.Type||'Customer'),Notes:s_(r.Notes)}; }
function s_(v){ return v==null?'':String(v); }
function stamp_(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'); }
function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
