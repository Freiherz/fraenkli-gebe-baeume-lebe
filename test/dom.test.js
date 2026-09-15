'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const { read } = require('./helpers');

const html = read('index.html');
const scripts = ['assets/i18n.js', 'assets/logic.js', 'assets/app.js'].map(read);
const ENDPOINT = 'https://script.google.com/macros/s/TEST/exec';

// Boot the page in jsdom the way a browser would: HTML first, then the three
// scripts in order. `config` overrides window.APP_CONFIG before app.js runs;
// `navLang` and `stored` stand in for the visitor's browser locale and a
// previous visit. Page console output is swallowed (the app logs fetch errors).
function boot({ url = 'http://localhost/', config = {}, fetch, navLang = 'de-CH', stored } = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => { throw err; });
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  Object.defineProperty(window.navigator, 'language', { value: navLang, configurable: true });
  if (stored) window.localStorage.setItem('lang', stored);
  window.APP_CONFIG = { endpoint: ENDPOINT, ...config };
  window.fetch = fetch || (() => Promise.reject(new Error('fetch not stubbed')));
  for (const code of scripts) window.eval(code);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return window;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function fill(window, values) {
  const doc = window.document;
  doc.querySelector('[name=email]').value = values.email ?? 'a@b.ch';
  doc.querySelector('[name=phone]').value = values.phone ?? '079 123 45 67';
  const donated = doc.querySelector(`[name=donated][value=${values.donated ?? 'no'}]`);
  donated.checked = true;
  donated.dispatchEvent(new window.Event('change', { bubbles: true }));
  if (values.why !== undefined) doc.querySelector('[name=why]').value = values.why;
  if (values.amount !== undefined) doc.querySelector('[name=amount]').value = values.amount;
  doc.querySelector('[name=consent]').checked = values.consent ?? true;
}

function submit(window) {
  const form = window.document.querySelector('form');
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}

test('page renders the German default and the campaign title', () => {
  const window = boot();
  const doc = window.document;
  assert.equal(doc.documentElement.lang, 'de');
  assert.equal(doc.querySelector('h1').textContent, 'Fränkli gebe, Bäume lebe');
  assert.equal(doc.title, window.I18N.de['meta.title']);
  assert.equal(doc.querySelector('[data-i18n="draw.h2"]').textContent, window.I18N.de['draw.h2']);
});

test('?lang=fr selects French and marks the switch', () => {
  const window = boot({ url: 'http://localhost/?lang=fr' });
  const doc = window.document;
  assert.equal(doc.documentElement.lang, 'fr');
  assert.equal(doc.querySelector('[data-i18n="draw.h2"]').textContent, window.I18N.fr['draw.h2']);
  assert.equal(doc.querySelector('.lang-switch [data-lang=fr]').getAttribute('aria-pressed'), 'true');
  assert.equal(doc.querySelector('.lang-switch [data-lang=de]').getAttribute('aria-pressed'), 'false');
});

test('clicking a language button retranslates the page and persists the choice', () => {
  const window = boot();
  const doc = window.document;
  doc.querySelector('.lang-switch [data-lang=en]').click();
  assert.equal(doc.documentElement.lang, 'en');
  assert.equal(doc.querySelector('[data-i18n="form.submit"]').textContent, window.I18N.en['form.submit']);
  assert.equal(doc.querySelector('[name=why]').placeholder, window.I18N.en['form.why.placeholder']);
  assert.equal(doc.querySelectorAll('[data-i18n-list="terms.items"] li').length, window.I18N.en['terms.items'].length);
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

test('deadline is shown in the current language', () => {
  const window = boot({ url: 'http://localhost/?lang=en' });
  assert.match(window.document.querySelector('#deadline').textContent, /Saturday.*19 September 2026/);
});

test('donation follow-up questions are hidden until "yes" and required only then', () => {
  const window = boot();
  const doc = window.document;
  const details = doc.querySelector('#donation-details');
  const why = doc.querySelector('[name=why]');
  const amount = doc.querySelector('[name=amount]');
  assert.equal(details.hidden, true);
  assert.equal(why.required, false);

  fill(window, { donated: 'yes' });
  assert.equal(details.hidden, false);
  assert.equal(why.required, true);
  assert.equal(amount.required, true);

  fill(window, { donated: 'no' });
  assert.equal(details.hidden, true);
  assert.equal(why.required, false);
  assert.equal(amount.required, false);
});

test('successful submit posts a simple-request JSON body and shows the thank-you', async () => {
  const calls = [];
  const window = boot({
    fetch: (url, opts) => { calls.push({ url, opts }); return Promise.resolve({ json: async () => ({ ok: true, code: 'ok' }) }); },
  });
  const doc = window.document;
  fill(window, { donated: 'yes', why: ' trees ', amount: '2' });
  submit(window);
  await tick(); await tick();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ENDPOINT);
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.headers, undefined, 'no headers → no CORS preflight');
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.email, 'a@b.ch');
  assert.equal(body.donated, 'yes');
  assert.equal(body.why, 'trees');
  assert.equal(body.amount, 2);
  assert.equal(body.lang, 'de');
  assert.equal(body.website, '');
  assert.equal(doc.querySelector('.status').textContent, window.I18N.de['status.ok']);
  assert.equal(doc.querySelector('.status').dataset.kind, 'ok');
  assert.equal(doc.querySelector('form').hidden, true);
});

test('duplicate reply keeps the form and shows the duplicate message', async () => {
  const window = boot({ fetch: () => Promise.resolve({ json: async () => ({ ok: false, code: 'duplicate' }) }) });
  const doc = window.document;
  fill(window, {});
  submit(window);
  await tick(); await tick();
  assert.equal(doc.querySelector('.status').textContent, window.I18N.de['status.duplicate']);
  assert.equal(doc.querySelector('form').hidden, false);
  assert.equal(doc.querySelector('button[type=submit]').disabled, false);
});

test('network failure shows the error message and re-enables the button', async () => {
  const window = boot({ fetch: () => Promise.reject(new TypeError('Failed to fetch')) });
  const doc = window.document;
  fill(window, {});
  submit(window);
  await tick(); await tick();
  assert.equal(doc.querySelector('.status').dataset.kind, 'error');
  assert.equal(doc.querySelector('button[type=submit]').disabled, false);
});

test('status message switches language together with the page', async () => {
  const window = boot({ fetch: () => Promise.resolve({ json: async () => ({ ok: false, code: 'duplicate' }) }) });
  const doc = window.document;
  fill(window, {});
  submit(window);
  await tick(); await tick();
  doc.querySelector('.lang-switch [data-lang=fr]').click();
  assert.equal(doc.querySelector('.status').textContent, window.I18N.fr['status.duplicate']);
});

test('invalid form never calls fetch', async () => {
  let called = 0;
  const window = boot({ fetch: () => { called++; return Promise.resolve({ json: async () => ({ ok: true }) }); } });
  fill(window, { email: 'nope', consent: false });
  submit(window);
  await tick();
  assert.equal(called, 0);
});

test('unconfigured endpoint shows an error instead of posting', async () => {
  let called = 0;
  const window = boot({ config: { endpoint: 'PASTE_APPS_SCRIPT_WEB_APP_URL' }, fetch: () => { called++; return Promise.resolve(); } });
  fill(window, {});
  submit(window);
  await tick();
  assert.equal(called, 0);
  assert.equal(window.document.querySelector('.status').dataset.kind, 'error');
});

test('after the deadline the form is locked and says closed', () => {
  const window = boot({ config: { deadline: '2000-01-01T00:00:00+01:00' } });
  const doc = window.document;
  assert.equal(doc.querySelector('button[type=submit]').disabled, true);
  assert.equal(doc.querySelector('.status').dataset.kind, 'closed');
  assert.equal(doc.querySelector('.status').textContent, window.I18N.de['status.closed']);
});

test('honeypot field is present, hidden from users, and not required', () => {
  const doc = boot().document;
  const hp = doc.querySelector('[name=website]');
  assert.ok(hp);
  assert.equal(hp.required, false);
  assert.equal(hp.tabIndex, -1);
  assert.equal(hp.getAttribute('autocomplete'), 'off');
});

test('all asset references are relative (GitHub Pages sub-path)', () => {
  const doc = boot().document;
  for (const el of doc.querySelectorAll('link[href], script[src], img[src]')) {
    const ref = el.getAttribute('href') || el.getAttribute('src');
    assert.ok(!ref.startsWith('/') && !ref.startsWith('http'), `absolute reference: ${ref}`);
  }
});
