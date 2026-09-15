'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const { read } = require('./helpers');

const html = read('index.html');
const scripts = ['assets/team.js', 'assets/i18n.js', 'assets/logic.js', 'assets/app.js', 'assets/ui.js'].map(read);

// Boot the page in jsdom the way a browser would: HTML first, then the scripts
// in order. `navLang` and `stored` stand in for the visitor's browser locale
// and a previous visit.
// Every window is closed after the suite; the countdown's setInterval would
// otherwise keep the process alive.
const windows = [];
after(() => windows.forEach((w) => w.close()));

function boot({ url = 'http://localhost/', navLang = 'de-CH', stored, ends, team } = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => { throw err; });
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  windows.push(window);
  Object.defineProperty(window.navigator, 'language', { value: navLang, configurable: true });
  if (stored) window.localStorage.setItem('lang', stored);
  if (ends) window.document.querySelector('#countdown').dataset.ends = ends;
  for (const code of scripts) {
    window.eval(code);
    if (team && code === scripts[0]) window.TEAM = team; // override the real team right after team.js
  }
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

test('the slogan itself is translated in h1, brand and document title', () => {
  const window = boot({ url: 'http://localhost/?lang=fr' });
  const doc = window.document;
  assert.equal(doc.querySelector('h1').textContent, 'Un p’tit franc donné, un arbre planté');
  assert.equal(doc.querySelector('.brand-name').textContent, 'Un p’tit franc donné, un arbre planté');
  assert.match(doc.title, /^Un p’tit franc donné, un arbre planté/);
  doc.querySelector('.lang-switch [data-lang=en]').click();
  assert.equal(doc.querySelector('h1').textContent, 'Give a franc, grow a tree');
  assert.equal(doc.querySelector('.brand').getAttribute('aria-label'), 'Give a franc, grow a tree');
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

test('hero eyebrow is split into two spans around a separator that breaks on mobile', () => {
  const window = boot({ url: 'http://localhost/?lang=fr' });
  const eyebrow = window.document.querySelector('.hero .eyebrow');
  const [a, b] = eyebrow.querySelectorAll('[data-i18n]');
  assert.equal(a.textContent, window.I18N.fr['hero.eyebrow.a']);
  assert.equal(b.textContent, window.I18N.fr['hero.eyebrow.b']);
  const sep = eyebrow.querySelector('.eyebrow-sep');
  assert.ok(sep, 'separator element between the halves');
  assert.equal(sep.getAttribute('aria-hidden'), 'true');
  assert.equal(sep.nextElementSibling, b);
  assert.match(read('assets/style.css'), /\.eyebrow-sep[\s\S]*display:\s*block/, 'separator becomes a line break in CSS');
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

const FAR = '2099-01-01T00:00:00+01:00';

test('countdown sits under the donate button and shows days/hours/minutes/seconds plus the end date', () => {
  const window = boot({ ends: FAR });
  const doc = window.document;
  const cd = doc.querySelector('#countdown');
  assert.equal(cd.previousElementSibling.className, 'hero-actions');
  assert.equal(cd.dataset.ended, 'false');
  const units = [...cd.querySelectorAll('.cd-unit')].map((u) => u.textContent);
  assert.deepEqual(units, ['countdown.days', 'countdown.hours', 'countdown.minutes', 'countdown.seconds'].map((k) => window.I18N.de[k]));
  const values = [...cd.querySelectorAll('.cd-value')].map((v) => v.textContent);
  assert.equal(values.length, 4);
  assert.ok(Number(values[0]) > 1000, `days counted: ${values[0]}`);
  assert.match(values[1], /^\d{2}$/);
  assert.equal(cd.querySelector('.cd-label').textContent, window.I18N.de['countdown.label']);
  assert.match(cd.querySelector('.cd-until').textContent, /^Endet am .*2099/);
});

test('countdown uses the real campaign end by default', () => {
  const cd = boot().document.querySelector('#countdown');
  assert.equal(cd.dataset.ends, '2026-09-19T23:59:59+02:00');
});

test('countdown after the end shows the ended message and no digits', () => {
  const window = boot({ ends: '2000-01-01T00:00:00+01:00' });
  const cd = window.document.querySelector('#countdown');
  assert.equal(cd.dataset.ended, 'true');
  assert.equal(cd.querySelector('.cd-value'), null);
  assert.equal(cd.textContent.trim(), window.I18N.de['countdown.ended']);
});

test('countdown re-renders in the new language', () => {
  const window = boot({ ends: FAR });
  const doc = window.document;
  doc.querySelector('.lang-switch [data-lang=fr]').click();
  assert.equal(doc.querySelector('#countdown .cd-label').textContent, window.I18N.fr['countdown.label']);
  assert.match(doc.querySelector('#countdown .cd-until').textContent, /^Se termine le .*2099/);
});

test('countdown ticks every second', async () => {
  const window = boot({ ends: FAR });
  const read = () => window.document.querySelector('#countdown .cd-cell:last-child .cd-value').textContent;
  const first = read();
  await new Promise((r) => setTimeout(r, 1100));
  assert.notEqual(read(), first);
});

const TEAM = [
  { name: 'Kelly Ejiofor', url: 'https://www.linkedin.com/in/kelly' },
  { name: 'Eric Scherrer', url: '' },
  { name: 'Michael Freiherz', url: 'https://www.linkedin.com/in/michael' },
];

test('team line lists every member; only members with a URL become LinkedIn links', () => {
  const window = boot({ team: TEAM });
  const doc = window.document;
  const line = doc.querySelector('#about .team');
  assert.equal(line.querySelector('.team-label').textContent, window.I18N.de['about.team']);
  const members = [...line.querySelectorAll('.team-member')];
  assert.deepEqual(members.map((m) => m.textContent), TEAM.map((m) => m.name));
  assert.equal(members[0].tagName, 'A');
  assert.equal(members[0].getAttribute('href'), TEAM[0].url);
  assert.equal(members[0].getAttribute('target'), '_blank');
  assert.equal(members[0].getAttribute('rel'), 'noopener');
  assert.equal(members[1].tagName, 'SPAN');
  assert.equal(members[2].tagName, 'A');
  assert.equal(line.textContent, 'Team: Kelly Ejiofor, Eric Scherrer und Michael Freiherz');
});

test('team line uses the localised conjunction and no longer lives in about.text', () => {
  const window = boot({ url: 'http://localhost/?lang=en', team: TEAM });
  const doc = window.document;
  assert.equal(doc.querySelector('#about .team').textContent, 'Team: Kelly Ejiofor, Eric Scherrer and Michael Freiherz');
  for (const lang of ['de', 'fr', 'en']) assert.ok(!window.I18N[lang]['about.text'].includes('Freiherz'), `${lang} about.text still names the team`);
  doc.querySelector('.lang-switch [data-lang=fr]').click();
  assert.equal(doc.querySelector('#about .team').textContent, 'Équipe : Kelly Ejiofor, Eric Scherrer et Michael Freiherz');
});

test('the real team is wired in', () => {
  const doc = boot().document;
  const names = [...doc.querySelectorAll('#about .team-member')].map((m) => m.textContent);
  assert.deepEqual(names, ['Kelly Ejiofor', 'Eric Scherrer', 'Michael Freiherz']);
  for (const m of doc.querySelectorAll('#about a.team-member')) assert.match(m.href, /^https:\/\/(www\.)?linkedin\.com\//);
});
