'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers');

// Code.gs is plain Apps Script; the Google services are never touched by the
// pure functions it exports through its guarded module.exports.
const { processEntry, parseBody, DEADLINE } = loadBrowserScript('apps-script/Code.gs');

const BEFORE = new Date('2026-09-19T21:00:00Z');
const AFTER = new Date('2026-09-19T22:00:01Z');

function ctx(overrides = {}) {
  const rows = [];
  return {
    rows,
    now: BEFORE,
    deadline: DEADLINE,
    emailExists: () => false,
    appendRow: (row) => rows.push(row),
    ...overrides,
  };
}

const VALID = { email: 'Tobi@Example.ch', phone: '+41 79 123 45 67', donated: 'yes', why: 'trees', amount: 3, lang: 'de', ua: 'UA', website: '' };

test('deadline constant matches the campaign end', () => {
  assert.equal(DEADLINE, '2026-09-19T23:59:59+02:00');
});

test('parseBody: invalid JSON yields null', () => {
  assert.equal(parseBody('{nope'), null);
  assert.equal(parseBody(undefined), null);
  assert.deepEqual(parseBody('{"a":1}'), { a: 1 });
});

test('honeypot hit: fake success, nothing stored', () => {
  const c = ctx();
  assert.deepEqual(processEntry({ ...VALID, website: 'http://spam' }, c), { ok: true, code: 'ok' });
  assert.equal(c.rows.length, 0);
});

test('after the deadline: closed, nothing stored', () => {
  const c = ctx({ now: AFTER });
  assert.deepEqual(processEntry(VALID, c), { ok: false, code: 'closed' });
  assert.equal(c.rows.length, 0);
});

test('invalid email, short phone, or missing donated answer are rejected', () => {
  assert.equal(processEntry({ ...VALID, email: 'not-an-email' }, ctx()).code, 'invalid');
  assert.equal(processEntry({ ...VALID, phone: '12' }, ctx()).code, 'invalid');
  assert.equal(processEntry({ ...VALID, phone: '+41 79 123 45 67 89 01 23 45' }, ctx()).code, 'invalid');
  assert.equal(processEntry({ ...VALID, donated: 'maybe' }, ctx()).code, 'invalid');
  assert.equal(processEntry({}, ctx()).code, 'invalid');
  assert.equal(processEntry(null, ctx()).code, 'invalid');
});

test('duplicate email (case-insensitive) is rejected before writing', () => {
  const seen = [];
  const c = ctx({ emailExists: (e) => { seen.push(e); return true; } });
  assert.deepEqual(processEntry(VALID, c), { ok: false, code: 'duplicate' });
  assert.deepEqual(seen, ['tobi@example.ch']);
  assert.equal(c.rows.length, 0);
});

test('valid donor entry is appended with the expected columns', () => {
  const c = ctx();
  assert.deepEqual(processEntry(VALID, c), { ok: true, code: 'ok' });
  assert.equal(c.rows.length, 1);
  const row = c.rows[0];
  assert.equal(row.length, 8);
  assert.ok(row[0] instanceof Date);
  assert.deepEqual(row.slice(1), ['de', 'tobi@example.ch', '+41 79 123 45 67', 'yes', 'trees', 3, 'UA']);
});

test('non-donor entry stores empty why and amount', () => {
  const c = ctx();
  processEntry({ ...VALID, donated: 'no', why: 'ignored', amount: 99 }, c);
  assert.deepEqual(c.rows[0].slice(4, 7), ['no', '', '']);
});

test('non-numeric amount is stored empty, free text is capped', () => {
  const c = ctx();
  processEntry({ ...VALID, amount: 'lots', why: 'x'.repeat(2000), ua: 'u'.repeat(1000), lang: 'de-CH' }, c);
  const row = c.rows[0];
  assert.equal(row[1], 'de');
  assert.equal(row[5].length, 1000);
  assert.equal(row[6], '');
  assert.equal(row[7].length, 300);
});
