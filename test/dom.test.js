'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const { read } = require('./helpers');

const html = read('index.html');
const scripts = ['assets/i18n.js', 'assets/logic.js', 'assets/app.js'].map(read);

// Boot the page in jsdom the way a browser would: HTML first, then the scripts
// in order. `navLang` and `stored` stand in for the visitor's browser locale
// and a previous visit.
function boot({ url = 'http://localhost/', navLang = 'de-CH', stored } = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => { throw err; });
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  Object.defineProperty(window.navigator, 'language', { value: navLang, configurable: true });
  if (stored) window.localStorage.setItem('lang', stored);
  for (const code of scripts) window.eval(code);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return window;
}

test('page renders the German default and the campaign title', () => {
  const window = boot();
  const doc = window.document;
  assert.equal(doc.documentElement.lang, 'de');
  assert.equal(doc.querySelector('h1').textContent, 'Fränkli gebe, Bäume lebe');
  assert.equal(doc.title, window.I18N.de['meta.title']);
  assert.equal(doc.querySelector('[data-i18n="donate.h2"]').textContent, window.I18N.de['donate.h2']);
});

test('?lang=fr selects French and marks the switch', () => {
  const window = boot({ url: 'http://localhost/?lang=fr' });
  const doc = window.document;
  assert.equal(doc.documentElement.lang, 'fr');
  assert.equal(doc.querySelector('[data-i18n="donate.h2"]').textContent, window.I18N.fr['donate.h2']);
  assert.equal(doc.querySelector('.lang-switch [data-lang=fr]').getAttribute('aria-pressed'), 'true');
  assert.equal(doc.querySelector('.lang-switch [data-lang=de]').getAttribute('aria-pressed'), 'false');
});

test('clicking a language button retranslates the page and persists the choice', () => {
  const window = boot();
  const doc = window.document;
  doc.querySelector('.lang-switch [data-lang=en]').click();
  assert.equal(doc.documentElement.lang, 'en');
  assert.equal(doc.querySelector('[data-i18n="tagline"]').textContent, window.I18N.en['tagline']);
  assert.equal(doc.querySelectorAll('[data-i18n-list="donate.steps"] li').length, window.I18N.en['donate.steps'].length);
  assert.equal(doc.querySelector('#qr').alt, window.I18N.en['donate.qr.alt']);
  assert.equal(window.localStorage.getItem('lang'), 'en');
});

test('stored language from a previous visit beats the browser locale', () => {
  const window = boot({ stored: 'fr', navLang: 'en-US' });
  assert.equal(window.document.documentElement.lang, 'fr');
});

test('browser locale is used when nothing is stored, falling back to German', () => {
  assert.equal(boot({ navLang: 'en-US' }).document.documentElement.lang, 'en');
  assert.equal(boot({ navLang: 'it-CH' }).document.documentElement.lang, 'de');
});

test('every data-i18n key on the page exists in the string table', () => {
  const window = boot();
  const doc = window.document;
  const attrs = ['data-i18n', 'data-i18n-list', 'data-i18n-alt'];
  for (const attr of attrs) {
    for (const el of doc.querySelectorAll(`[${attr}]`)) {
      const key = el.getAttribute(attr);
      assert.ok(key in window.I18N.de, `unknown key ${key}`);
    }
  }
});

test('the prize-draw form is gone', () => {
  const doc = boot().document;
  assert.equal(doc.querySelector('form'), null);
  assert.equal(doc.querySelector('input, textarea, select'), null);
  assert.equal(doc.querySelector('#draw, #donation-details, #terms, .status'), null);
  assert.ok(!html.includes('APP_CONFIG'), 'no endpoint config left in the page');
  assert.ok(!html.includes('script.google.com'), 'no Apps Script URL left in the page');
});

test('the QR code is present and points at the swappable asset', () => {
  const doc = boot().document;
  const qr = doc.querySelector('#qr');
  assert.equal(qr.getAttribute('src'), 'assets/qr-placeholder.svg');
  assert.ok(qr.alt.length > 0);
});

test('all asset references are relative (GitHub Pages sub-path)', () => {
  const doc = boot().document;
  for (const el of doc.querySelectorAll('link[href], script[src], img[src]')) {
    const ref = el.getAttribute('href') || el.getAttribute('src');
    assert.ok(!ref.startsWith('/') && !ref.startsWith('http'), `absolute reference: ${ref}`);
  }
});
