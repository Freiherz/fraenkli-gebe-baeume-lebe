'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers');

const { I18N } = loadBrowserScript('assets/i18n.js');
const { Logic } = loadBrowserScript('assets/logic.js');
const DEADLINE = '2026-09-19T23:59:59+02:00';

test('pickLang: query param wins over everything', () => {
  assert.equal(Logic.pickLang({ query: 'fr', stored: 'en', navigator: 'de-CH', fallback: 'de' }), 'fr');
});

test('pickLang: stored language beats navigator', () => {
  assert.equal(Logic.pickLang({ query: null, stored: 'en', navigator: 'de-CH', fallback: 'de' }), 'en');
});

test('pickLang: navigator prefix is used when nothing is stored', () => {
  assert.equal(Logic.pickLang({ query: null, stored: null, navigator: 'fr-CH', fallback: 'de' }), 'fr');
});

test('pickLang: unsupported values fall through to the fallback', () => {
  assert.equal(Logic.pickLang({ query: 'it', stored: 'xx', navigator: 'rm-CH', fallback: 'de' }), 'de');
  assert.equal(Logic.pickLang({ query: undefined, stored: undefined, navigator: undefined, fallback: 'de' }), 'de');
});

test('translate: returns the string for the language', () => {
  assert.equal(Logic.translate(I18N, 'fr', 'form.yes'), 'Oui');
});

test('translate: falls back to de, then to the key itself', () => {
  const table = { de: { a: 'A' }, fr: {} };
  assert.equal(Logic.translate(table, 'fr', 'a'), 'A');
  assert.equal(Logic.translate(table, 'fr', 'missing'), 'missing');
});

test('isClosed: false before the deadline, true after', () => {
  assert.equal(Logic.isClosed(DEADLINE, new Date('2026-09-19T21:59:58Z')), false);
  assert.equal(Logic.isClosed(DEADLINE, new Date('2026-09-19T21:59:59Z')), false);
  assert.equal(Logic.isClosed(DEADLINE, new Date('2026-09-19T22:00:00Z')), true);
});

test('formatDeadline: renders the Swiss-local date in each language', () => {
  assert.match(Logic.formatDeadline(DEADLINE, 'de'), /Samstag.*19\. September 2026.*23:59/);
  assert.match(Logic.formatDeadline(DEADLINE, 'fr'), /samedi,? 19 septembre 2026.*23:59/);
  assert.match(Logic.formatDeadline(DEADLINE, 'en'), /Saturday.*19 September 2026.*23:59/);
});

test('buildPayload: donor keeps why and amount, trimmed and numeric', () => {
  const p = Logic.buildPayload(
    { email: ' A@B.ch ', phone: ' 079 123 45 67 ', donated: 'yes', why: '  because trees ', amount: '2.5', website: '' },
    'de',
    'UA',
  );
  assert.deepEqual(p, {
    lang: 'de', email: 'A@B.ch', phone: '079 123 45 67', donated: 'yes', why: 'because trees', amount: 2.5, website: '', ua: 'UA',
  });
});

test('buildPayload: non-donor sends empty why and null amount even if fields were filled', () => {
  const p = Logic.buildPayload({ email: 'a@b.ch', phone: '0791234567', donated: 'no', why: 'x', amount: '9', website: '' }, 'en', 'UA');
  assert.equal(p.why, '');
  assert.equal(p.amount, null);
});

test('buildPayload: passes the honeypot through untouched', () => {
  const p = Logic.buildPayload({ email: 'a@b.ch', phone: '0791234567', donated: 'no', website: 'http://spam' }, 'en', 'UA');
  assert.equal(p.website, 'http://spam');
});

test('statusFor: maps backend replies to a status code', () => {
  assert.equal(Logic.statusFor({ ok: true, code: 'ok' }), 'ok');
  assert.equal(Logic.statusFor({ ok: false, code: 'duplicate' }), 'duplicate');
  assert.equal(Logic.statusFor({ ok: false, code: 'closed' }), 'closed');
  assert.equal(Logic.statusFor({ ok: false, code: 'invalid' }), 'invalid');
});

test('statusFor: anything unexpected is an error', () => {
  assert.equal(Logic.statusFor({ ok: false, code: 'weird' }), 'error');
  assert.equal(Logic.statusFor({ ok: false }), 'error');
  assert.equal(Logic.statusFor(null), 'error');
  assert.equal(Logic.statusFor('nope'), 'error');
});

test('isConfigured: rejects the placeholder endpoint', () => {
  assert.equal(Logic.isConfigured('PASTE_APPS_SCRIPT_WEB_APP_URL'), false);
  assert.equal(Logic.isConfigured(''), false);
  assert.equal(Logic.isConfigured('https://script.google.com/macros/s/abc/exec'), true);
});
