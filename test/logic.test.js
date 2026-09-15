'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers');

const { I18N } = loadBrowserScript('assets/i18n.js');
const { Logic } = loadBrowserScript('assets/logic.js');

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
  assert.equal(Logic.translate(I18N, 'fr', 'donate.h2'), '1 franc = 1 arbre');
});

test('translate: falls back to de, then to the key itself', () => {
  const table = { de: { a: 'A' }, fr: {} };
  assert.equal(Logic.translate(table, 'fr', 'a'), 'A');
  assert.equal(Logic.translate(table, 'fr', 'missing'), 'missing');
});

test('logic exposes only language helpers — no form leftovers', () => {
  assert.deepEqual(Object.keys(Logic).sort(), ['LANGS', 'countdown', 'formatDeadline', 'pickLang', 'translate']);
});

const END = '2026-09-19T23:59:59+02:00';

test('countdown: splits the remaining time into days/hours/minutes/seconds', () => {
  const now = new Date('2026-09-16T10:29:14+02:00'); // 3d 13h 30m 45s before END
  assert.deepEqual(Logic.countdown(END, now), { ended: false, days: 3, hours: 13, minutes: 30, seconds: 45 });
});

test('countdown: at and after the end it reports ended with zeros', () => {
  assert.deepEqual(Logic.countdown(END, new Date('2026-09-19T23:59:59+02:00')), { ended: false, days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.deepEqual(Logic.countdown(END, new Date('2026-09-20T00:00:00+02:00')), { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('formatDeadline: renders the Swiss-local end in each language', () => {
  assert.match(Logic.formatDeadline(END, 'de'), /Samstag.*19\. September 2026.*23:59/);
  assert.match(Logic.formatDeadline(END, 'fr'), /samedi,? 19 septembre 2026.*23:59/);
  assert.match(Logic.formatDeadline(END, 'en'), /Saturday.*19 September 2026.*23:59/);
});
