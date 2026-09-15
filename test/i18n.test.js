'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers');

const { I18N } = loadBrowserScript('assets/i18n.js');
const LANGS = ['de', 'fr', 'en'];

test('all three languages exist', () => {
  assert.deepEqual(Object.keys(I18N).sort(), [...LANGS].sort());
});

test('every language has exactly the same keys as de', () => {
  const deKeys = Object.keys(I18N.de).sort();
  for (const lang of LANGS) {
    assert.deepEqual(Object.keys(I18N[lang]).sort(), deKeys, `${lang} keys differ from de`);
  }
});

test('list keys are non-empty arrays of equal length across languages', () => {
  for (const key of Object.keys(I18N.de)) {
    if (!Array.isArray(I18N.de[key])) continue;
    for (const lang of LANGS) {
      assert.ok(Array.isArray(I18N[lang][key]), `${lang}.${key} should be an array`);
      assert.equal(I18N[lang][key].length, I18N.de[key].length, `${lang}.${key} length`);
      assert.ok(I18N[lang][key].length > 0);
    }
  }
});

test('no empty strings anywhere', () => {
  for (const lang of LANGS) {
    for (const [key, value] of Object.entries(I18N[lang])) {
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) assert.ok(v.trim().length > 0, `${lang}.${key} is empty`);
    }
  }
});

test('Swiss German never uses ß', () => {
  const text = JSON.stringify(I18N.de);
  assert.ok(!text.includes('ß'), 'found ß in de strings');
});

test('every status code the backend can return has a message', () => {
  for (const code of ['ok', 'duplicate', 'closed', 'invalid', 'error', 'pending']) {
    for (const lang of LANGS) assert.ok(I18N[lang][`status.${code}`], `${lang} status.${code}`);
  }
});

test('terms mention the deadline date in every language', () => {
  assert.ok(I18N.de['terms.items'].some((s) => s.includes('19. September 2026')));
  assert.ok(I18N.fr['terms.items'].some((s) => s.includes('19 septembre 2026')));
  assert.ok(I18N.en['terms.items'].some((s) => s.includes('19 September 2026')));
});
