// Google Apps Script backend for the prize-draw form.
// Paste into Extensions → Apps Script of the Google Sheet, then deploy as a
// web app (Execute as: Me, Who has access: Anyone) and copy the URL into
// APP_CONFIG.endpoint in index.html. Redeploy a new version after every edit.
//
// doGet/doPost talk to Google services; processEntry is pure and unit-tested.

var SHEET_NAME = 'Entries';
var DEADLINE = '2026-09-19T23:59:59+02:00';
var HEADERS = ['Timestamp', 'Language', 'Email', 'Phone', 'Donated', 'Why', 'Amount CHF', 'User agent'];
var EMAIL_COLUMN = 3;

function doGet() {
  return json_({ ok: true, code: 'alive' });
}

function doPost(e) {
  var body = parseBody(e && e.postData && e.postData.contents);
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return json_({ ok: false, code: 'error' });
  }
  try {
    var sheet = getSheet_();
    var result = processEntry(body, {
      now: new Date(),
      deadline: DEADLINE,
      emailExists: function (email) { return emailExists_(sheet, email); },
      appendRow: function (row) { sheet.appendRow(row); },
    });
    return json_(result);
  } finally {
    lock.releaseLock();
  }
}

function parseBody(raw) {
  try {
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    return null;
  }
}

// ctx: { now: Date, deadline: string, emailExists(email) → bool, appendRow(row) }
function processEntry(body, ctx) {
  if (!body || typeof body !== 'object') return { ok: false, code: 'invalid' };

  // Honeypot filled → a bot. Pretend success so it does not retry.
  if (body.website) return { ok: true, code: 'ok' };

  if (ctx.now.getTime() > new Date(ctx.deadline).getTime()) return { ok: false, code: 'closed' };

  var email = String(body.email || '').trim().toLowerCase();
  var phone = String(body.phone || '').trim();
  var donated = body.donated === 'yes' ? 'yes' : body.donated === 'no' ? 'no' : '';
  var validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  var validPhone = phone.replace(/\D/g, '').length >= 7 && phone.length <= 20;
  if (!validEmail || !validPhone || !donated) return { ok: false, code: 'invalid' };

  if (ctx.emailExists(email)) return { ok: false, code: 'duplicate' };

  var amount = Number(body.amount);
  ctx.appendRow([
    ctx.now,
    String(body.lang || '').slice(0, 2),
    email,
    phone,
    donated,
    donated === 'yes' ? String(body.why || '').trim().slice(0, 1000) : '',
    donated === 'yes' && typeof body.amount === 'number' && isFinite(amount) ? amount : '',
    String(body.ua || '').slice(0, 300),
  ]);
  return { ok: true, code: 'ok' };
}

function emailExists_(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var values = sheet.getRange(2, EMAIL_COLUMN, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === email) return true;
  }
  return false;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange('D:D').setNumberFormat('@'); // keep phone numbers as text
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Node test hook; `module` does not exist inside Apps Script.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { processEntry: processEntry, parseBody: parseBody, DEADLINE: DEADLINE };
}
