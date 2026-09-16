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
      if (key === 'hero.eyebrow.b') continue; // may be empty: then the eyebrow has no mobile break
      for (const v of values) assert.ok(v.trim().length > 0, `${lang}.${key} is empty`);
    }
  }
});

test('Swiss German never uses ß', () => {
  assert.ok(!JSON.stringify(I18N.de).includes('ß'), 'found ß in de strings');
});

test('no prize-draw or form strings remain', () => {
  for (const key of Object.keys(I18N.de)) {
    assert.ok(!/^(draw|form|status|terms)\./.test(key), `leftover key ${key}`);
  }
  const all = JSON.stringify(I18N).toLowerCase();
  for (const word of ['gewinnspiel', 'concours', 'prize draw', '50 franken', '50 francs']) {
    assert.ok(!all.includes(word), `leftover copy: ${word}`);
  }
});

test('hero and QR card strings exist in every language', () => {
  for (const lang of LANGS) {
    for (const key of ['hero.eyebrow.a', 'hero.cta', 'donate.qr.label', 'donate.qr.hint', 'countdown.label', 'countdown.until', 'countdown.ended', 'countdown.days', 'countdown.hours', 'countdown.minutes', 'countdown.seconds', 'about.team', 'about.and', 'donate.modal.title', 'donate.modal.close', 'partners.h2', 'partners.visit', 'footer.legal']) {
      assert.ok(I18N[lang][key], `${lang}.${key}`);
    }
  }
});

test('privacy line names GitHub Pages hosting in every language', () => {
  for (const lang of LANGS) assert.match(I18N[lang]['footer.privacy'], /GitHub Pages/);
});
