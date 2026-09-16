'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const { read } = require('./helpers');

const html = read('index.html');
const scripts = ['assets/config.js', 'assets/i18n.js', 'assets/logic.js', 'assets/app.js', 'assets/ui.js'].map(read);

// Boot the page in jsdom the way a browser would: HTML first, then the scripts
// in order. `navLang` and `stored` stand in for the visitor's browser locale
// and a previous visit.
// Every window is closed after the suite; the countdown's setInterval would
// otherwise keep the process alive.
const windows = [];
after(() => windows.forEach((w) => w.close()));

function boot({ url = 'http://localhost/', navLang = 'de-CH', stored, ends, team, partners } = {}) {
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
    if (code === scripts[0]) { // override config.js values right after it ran
      if (team) window.TEAM = team;
      if (partners) window.PARTNERS = partners;
    }
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
  assert.equal(qr.getAttribute('src'), 'assets/qr.png');
  assert.ok(require('node:fs').existsSync(require('node:path').join(__dirname, '..', 'assets/qr.png')));
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

test('hero: single donate CTA opens the payment modal, tree animation is inline SVG', () => {
  const window = boot();
  const doc = window.document;
  const ctas = doc.querySelectorAll('.hero-actions a');
  assert.equal(ctas.length, 1, 'exactly one CTA — the prize-draw button is gone');
  assert.equal(ctas[0].getAttribute('href'), '#spenden', 'no-JS fallback scrolls to the QR');
  assert.equal(ctas[0].getAttribute('aria-haspopup'), 'dialog');
  assert.equal(window.QR_URL, undefined, 'no separate TWINT link; both entry points use the modal');
  const dialog = doc.querySelector('#pay-dialog');
  ctas[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(dialog.open, true, 'hero button opens the payment modal');
  assert.equal(doc.querySelector('#pay-frame').getAttribute('src'), 'https://bridged.payrexx.com/de/pay?cid=fb16eb5d');
  assert.ok(doc.querySelector('.hero-art svg.tree .coin'), 'coin + tree SVG present');
  assert.equal(doc.querySelector('.hero-art').getAttribute('aria-hidden'), 'true');
});

test('hero eyebrow is split into two spans around a separator that breaks on mobile', () => {
  const window = boot({ url: 'http://localhost/?lang=de' });
  const eyebrow = window.document.querySelector('.hero .eyebrow');
  const [a, b] = eyebrow.querySelectorAll('[data-i18n]');
  const sep = eyebrow.querySelector('.eyebrow-sep');
  assert.equal(a.textContent, window.I18N.de['hero.eyebrow.a']);
  assert.equal(b.textContent, window.I18N.de['hero.eyebrow.b']);
  assert.equal(sep.hidden, false);
  assert.ok(sep, 'separator element between the halves');
  assert.equal(sep.getAttribute('aria-hidden'), 'true');
  assert.equal(sep.nextElementSibling, b);
  assert.match(read('assets/style.css'), /\.eyebrow-sep[\s\S]*display:\s*block/, 'separator becomes a line break in CSS');
});

test('a language with an empty eyebrow.b renders one line and hides the separator', () => {
  const window = boot({ url: 'http://localhost/?lang=en' });
  const eyebrow = window.document.querySelector('.hero .eyebrow');
  assert.equal(eyebrow.querySelector('.eyebrow-sep').hidden, true);
  assert.equal(eyebrow.textContent.trim(), window.I18N.en['hero.eyebrow.a']);
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




const PARTNERS = [
  { id: 'a', name: 'Alpha AG', tagline: { de: 'Alpha Slogan DE', fr: 'Alpha Slogan FR', en: 'Alpha Slogan EN' }, logo: 'assets/partners/alpha.svg', url: 'https://alpha.example', description: { de: 'Alpha DE', fr: 'Alpha FR', en: 'Alpha EN' } },
  { id: 'b', name: 'Beta', logo: 'assets/partners/beta.svg', url: '', description: { de: 'Beta DE', fr: 'Beta FR', en: 'Beta EN' } },
  { id: 'c', name: 'Gamma', logo: 'assets/partners/gamma.svg', url: '', description: { de: 'Gamma DE', fr: 'Gamma FR', en: 'Gamma EN' } },
  { id: 'd', name: 'Delta', logo: 'assets/partners/delta.svg', url: '', description: { de: 'Delta DE', fr: 'Delta FR', en: 'Delta EN' } },
];

function bootPartners(opts = {}) {
  return boot({ ...opts, partners: PARTNERS });
}

test('partners section sits between the donate and about sections with a translated title', () => {
  const window = bootPartners({ url: 'http://localhost/?lang=fr' });
  const doc = window.document;
  const section = doc.querySelector('#partners');
  assert.ok(section);
  assert.equal(section.previousElementSibling.id, 'spenden');
  assert.equal(section.nextElementSibling.id, 'about');
  assert.equal(section.querySelector('h2').textContent, window.I18N.fr['partners.h2']);
  assert.equal(window.I18N.en['partners.h2'], 'Supported by');
});

test('each partner is a logo button; the logo alt is the organisation name', () => {
  const doc = bootPartners().document;
  const buttons = [...doc.querySelectorAll('#partners .partner')];
  assert.equal(buttons.length, 4);
  buttons.forEach((b, i) => {
    assert.equal(b.tagName, 'BUTTON');
    assert.equal(b.getAttribute('type'), 'button');
    assert.equal(b.getAttribute('aria-expanded'), 'false');
    const img = b.querySelector('img');
    assert.equal(img.getAttribute('src'), PARTNERS[i].logo);
    assert.equal(img.alt, PARTNERS[i].name);
  });
  assert.equal(doc.querySelector('#partners .partner-panel').hidden, true);
});

test('clicking a logo expands its description; clicking again collapses; another logo switches', () => {
  const window = bootPartners();
  const doc = window.document;
  const [a, b] = doc.querySelectorAll('#partners .partner');
  const panel = doc.querySelector('#partners .partner-panel');

  a.click();
  assert.equal(a.getAttribute('aria-expanded'), 'true');
  assert.equal(panel.hidden, false);
  assert.equal(panel.querySelector('.partner-name').textContent, 'Alpha AG');
  assert.equal(panel.querySelector('.partner-tagline').textContent, 'Alpha Slogan DE');
  assert.equal(panel.querySelector('.partner-text').textContent, 'Alpha DE');
  assert.equal(panel.querySelector('a.partner-link').getAttribute('href'), 'https://alpha.example');
  assert.equal(panel.querySelector('a.partner-link').getAttribute('rel'), 'noopener');

  b.click();
  assert.equal(a.getAttribute('aria-expanded'), 'false');
  assert.equal(b.getAttribute('aria-expanded'), 'true');
  assert.equal(panel.querySelector('.partner-text').textContent, 'Beta DE');
  assert.equal(panel.querySelector('.partner-tagline'), null, 'no tagline element without a tagline');
  assert.equal(panel.querySelector('a.partner-link'), null, 'no link without a URL');

  b.click();
  assert.equal(b.getAttribute('aria-expanded'), 'false');
  assert.equal(panel.hidden, true);
});

test('an open partner description follows the language switch', () => {
  const window = bootPartners();
  const doc = window.document;
  doc.querySelectorAll('#partners .partner')[2].click();
  doc.querySelector('.lang-switch [data-lang=en]').click();
  assert.equal(doc.querySelector('#partners .partner-text').textContent, 'Gamma EN');
  assert.equal(doc.querySelector('#partners .partner-link'), null);
});

test('the real partner config has four entries whose logos exist on disk', () => {
  const window = boot();
  const partners = window.PARTNERS;
  assert.equal(partners.length, 4);
  const fs = require('node:fs');
  const path = require('node:path');
  for (const p of partners) {
    assert.ok(p.id && p.name && p.logo, `partner ${JSON.stringify(p)} incomplete`);
    assert.ok(fs.existsSync(path.join(__dirname, '..', p.logo)), `${p.logo} missing`);
    for (const lang of ['de', 'fr', 'en']) assert.ok(p.description[lang], `${p.id} ${lang} description`);
    if (p.url) assert.match(p.url, /^https?:\/\//, `${p.id} url needs a scheme or it becomes a relative link`);
    // no German sentence may survive untranslated inside the FR/EN texts
    const deSentences = p.description.de.split(/(?<=[.!?])\s+/).filter((x) => x.length > 20);
    for (const lang of ['fr', 'en']) {
      for (const sentence of deSentences) assert.ok(!p.description[lang].includes(sentence), `${p.id} ${lang} still contains German: "${sentence}"`);
    }
    assert.ok(p.name.length <= 40, `${p.id} name is the organisation name (used as logo alt), not a slogan`);
  }
  assert.equal(window.document.querySelectorAll('#partners .partner').length, 4);
});

test('footer carries a legal-notice link in the current language', () => {
  const window = boot({ url: 'http://localhost/?lang=fr' });
  const doc = window.document;
  const link = doc.querySelector('.site-foot a.legal');
  assert.equal(link.getAttribute('href'), 'https://www.bridged.ch/de/impressum');
  assert.equal(link.getAttribute('rel'), 'noopener');
  assert.equal(link.textContent, window.I18N.fr['footer.legal']);
  doc.querySelector('.lang-switch [data-lang=en]').click();
  assert.equal(link.textContent, 'Legal notice');
});


test('the QR column is bounded so a large image cannot squeeze the text column', () => {
  const css = read('assets/style.css');
  assert.match(css, /\.donate-grid \{ grid-template-columns: minmax\(0, 1fr\) minmax\(0, 360px\)/);
  assert.ok(!/\.donate-grid \{[^}]*\bauto\b/.test(css), 'no auto-sized column in the donate grid');
});

const PAY_URL = 'https://bridged.payrexx.com/LANG/pay?cid=fb16eb5d';

test('the QR is a button that opens the Payrexx payment page in a modal', () => {
  const window = boot();
  const doc = window.document;
  const qrButton = doc.querySelector('button#qr-button');
  assert.ok(qrButton, 'QR wrapped in a button');
  assert.equal(qrButton.querySelector('#qr').id, 'qr');
  assert.equal(qrButton.getAttribute('aria-haspopup'), 'dialog');
  const dialog = doc.querySelector('dialog#pay-dialog');
  const frame = dialog.querySelector('iframe#pay-frame');
  assert.equal(dialog.open, false);
  assert.equal(frame.getAttribute('src'), null, 'nothing loaded until opened');

  qrButton.click();
  assert.equal(dialog.open, true);
  assert.equal(frame.getAttribute('src'), PAY_URL.replace('LANG', 'de'));
  assert.equal(frame.getAttribute('allow'), 'payment *');
  assert.equal(frame.getAttribute('title'), window.I18N.de['donate.modal.title']);
  assert.equal(dialog.querySelector('.pay-close').getAttribute('aria-label'), window.I18N.de['donate.modal.close']);
});

test('the modal closes via its button and unloads the payment page', () => {
  const window = boot({ url: 'http://localhost/?lang=fr' });
  const doc = window.document;
  doc.querySelector('#qr-button').click();
  const dialog = doc.querySelector('#pay-dialog');
  const frame = doc.querySelector('#pay-frame');
  assert.equal(frame.getAttribute('src'), PAY_URL.replace('LANG', 'fr'));
  dialog.querySelector('.pay-close').click();
  assert.equal(dialog.open, false);
  assert.equal(frame.getAttribute('src'), null);
});

test('clicking the backdrop closes the modal', () => {
  const window = boot();
  const doc = window.document;
  doc.querySelector('#qr-button').click();
  const dialog = doc.querySelector('#pay-dialog');
  dialog.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // target is the dialog itself = backdrop
  assert.equal(dialog.open, false);
  doc.querySelector('#qr-button').click();
  dialog.querySelector('.pay-body').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(dialog.open, true, 'clicks inside the content do not close');
});

test('the "open TWINT" button and DONATE_URL are gone', () => {
  const window = boot();
  assert.equal(window.document.querySelector('.qr-open'), null);
  assert.equal(window.document.querySelector('a#qr-link'), null);
  assert.equal(window.DONATE_URL, undefined);
  assert.equal(window.I18N.de['donate.qr.open'], undefined);
});

test('once open, the page hands Payrexx the handshake and follows its reported height', () => {
  const window = boot();
  const doc = window.document;
  doc.querySelector('#qr-button').click();
  const frame = doc.querySelector('#pay-frame');
  const sent = [];
  frame.contentWindow.postMessage = (msg, target) => sent.push({ msg, target });
  frame.dispatchEvent(new window.Event('load'));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].target, 'https://bridged.payrexx.com');
  assert.deepEqual(JSON.parse(sent[0].msg), { origin: 'http://localhost', integrationMode: 'modal' });
  window.dispatchEvent(new window.MessageEvent('message', { data: JSON.stringify({ payrexx: { height: '1234px' } }), origin: 'https://bridged.payrexx.com' }));
  assert.equal(frame.style.height, '1234px');
  window.dispatchEvent(new window.MessageEvent('message', { data: JSON.stringify({ payrexx: { height: '999px' } }), origin: 'https://evil.example' }));
  assert.equal(frame.style.height, '1234px');
});

test('the modal has exactly one scroll container: the dialog itself', () => {
  const window = boot();
  const doc = window.document;
  const frame = doc.querySelector('#pay-frame');
  assert.equal(doc.querySelector('.pay-scroll'), null, 'no inner scroll wrapper');
  assert.equal(frame.parentElement.className, 'pay-body');
  assert.equal(frame.getAttribute('scrolling'), 'no', 'the iframe never scrolls internally');
  const css = read('assets/style.css');
  const dialogRule = css.match(/\.pay-dialog \{[^}]*\}/)[0];
  assert.match(dialogRule, /overflow-y: auto/);
  assert.doesNotMatch(dialogRule, /\n\s*height: /, 'dialog grows with its content up to max-height');
  assert.match(dialogRule, /max-height: /);
  assert.match(css, /\.pay-head \{[^}]*position: sticky/, 'close button stays reachable while scrolling');
  assert.match(css, /#pay-frame \{[^}]*height: \d+px/, 'tall fallback until Payrexx reports its height');
  assert.match(css, /html\.pay-open[^{]*\{[^}]*overflow: hidden/, 'page behind is locked');
  doc.querySelector('#qr-button').click();
  assert.equal(doc.documentElement.classList.contains('pay-open'), true);
  doc.querySelector('.pay-close').click();
  assert.equal(doc.documentElement.classList.contains('pay-open'), false);
});
