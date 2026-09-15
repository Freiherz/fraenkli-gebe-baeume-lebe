'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const { read } = require('./helpers');

const html = read('index.html');
const scripts = ['assets/i18n.js', 'assets/logic.js', 'assets/app.js', 'assets/ui.js'].map(read);

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

test('all asset references are relative (GitHub Pages sub-path); only Google Fonts may be external', () => {
  const doc = boot().document;
  for (const el of doc.querySelectorAll('link[href], script[src], img[src]')) {
    const ref = el.getAttribute('href') || el.getAttribute('src');
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(ref)) continue;
    assert.ok(!ref.startsWith('/') && !ref.startsWith('http'), `absolute reference: ${ref}`);
  }
});

test('hero: single donate CTA scrolls to the donate section, tree animation is inline SVG', () => {
  const doc = boot().document;
  const ctas = doc.querySelectorAll('.hero-actions a');
  assert.equal(ctas.length, 1, 'exactly one CTA — the prize-draw button is gone');
  assert.equal(ctas[0].getAttribute('href'), '#spenden');
  assert.ok(doc.querySelector('#spenden'), 'donate section has the id the CTA targets');
  assert.ok(doc.querySelector('.hero-art svg.tree .coin'), 'coin + tree SVG present');
  assert.equal(doc.querySelector('.hero-art').getAttribute('aria-hidden'), 'true');
});

test('about section replaces the prize draw and is translated', () => {
  const window = boot({ url: 'http://localhost/?lang=en' });
  const doc = window.document;
  const about = doc.querySelector('#about');
  assert.ok(about);
  assert.equal(about.querySelector('h2').textContent, window.I18N.en['about.h2']);
  assert.equal(doc.querySelector('.site-foot .privacy').textContent, window.I18N.en['footer.privacy']);
  assert.equal(doc.querySelector('.qr-card .qr-label').textContent, window.I18N.en['donate.qr.label']);
});

test('ui.js: marks the document as scripted and reveals sections when IntersectionObserver is missing', () => {
  const doc = boot().document;
  assert.ok(doc.documentElement.classList.contains('js'));
  const targets = doc.querySelectorAll('[data-reveal]');
  assert.ok(targets.length >= 2);
  for (const el of targets) assert.ok(el.classList.contains('is-visible'), 'fallback reveal applied');
});

test('ui.js: ?theme=dark forces the dark palette for previews', () => {
  assert.equal(boot({ url: 'http://localhost/?theme=dark' }).document.documentElement.dataset.theme, 'dark');
  assert.equal(boot().document.documentElement.dataset.theme, undefined);
});
