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
  assert.deepEqual(Object.keys(Logic).sort(), ['LANGS', 'pickLang', 'translate']);
});
