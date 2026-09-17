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

function boot({ url = 'http://localhost/', navLang = 'de-CH', stored, ends, team, partners, trees } = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => { throw err; });
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  windows.push(window);
  Object.defineProperty(window.navigator, 'language', { value: navLang, configurable: true });
  if (stored) window.localStorage.setItem('lang', stored);
  if (ends) window.document.querySelector('#countdown').dataset.ends = ends;
  // assets/trees.json stand-in: `trees` = { ok, body } for a stubbed fetch, or
  // 'reject' for a network failure; without it fetch stays undefined (no-JS path).
  window.fetchCalls = [];
  if (trees === 'reject') window.fetch = (url) => { window.fetchCalls.push(url); return Promise.reject(new Error('offline')); };
  else if (trees) window.fetch = (url) => { window.fetchCalls.push(url); return Promise.resolve({ ok: trees.ok !== false, json: async () => trees.body }); };
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
  assert.equal(doc.querySelector('h1').textContent, 'Franke lah, Bäumli ha');
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

test('analytics: GoatCounter script is loaded async and both donate links are counted as events', () => {
  const doc = boot().document;
  const script = doc.querySelector('script[data-goatcounter]');
  assert.ok(script, 'GoatCounter script present');
  assert.equal(script.getAttribute('data-goatcounter'), 'https://franke-lah.goatcounter.com/count');
  assert.equal(script.getAttribute('src'), 'https://gc.zgo.at/count.js', 'explicit https, not protocol-relative');
  assert.ok(script.hasAttribute('async'), 'never blocks rendering');
  assert.equal(doc.querySelector('#hero-cta').getAttribute('data-goatcounter-click'), 'click-hero-button');
  assert.equal(doc.querySelector('#qr-link').getAttribute('data-goatcounter-click'), 'click-qr-code');
  assert.equal(doc.querySelectorAll('[data-goatcounter-click]').length, 2);
});

test('the QR code is present and points at the swappable asset', () => {
  const doc = boot().document;
  const qr = doc.querySelector('#qr');
  assert.equal(qr.getAttribute('src'), 'assets/qr.png');
  assert.ok(require('node:fs').existsSync(require('node:path').join(__dirname, '..', 'assets/qr.png')));
  assert.ok(qr.alt.length > 0);
});

test('all asset references are relative (GitHub Pages sub-path); only Google Fonts and GoatCounter may be external', () => {
  const doc = boot().document;
  for (const el of doc.querySelectorAll('link[href], script[src], img[src]')) {
    const ref = el.getAttribute('href') || el.getAttribute('src');
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(ref)) continue;
    if (ref === 'https://gc.zgo.at/count.js') continue; // analytics, see below
    assert.ok(!ref.startsWith('/') && !ref.startsWith('http'), `absolute reference: ${ref}`);
  }
});

test('hero: single donate CTA opens the QR link in a new tab, tree animation is inline SVG', () => {
  const window = boot();
  const doc = window.document;
  const ctas = doc.querySelectorAll('.hero-actions a');
  assert.equal(ctas.length, 1, 'exactly one CTA — the prize-draw button is gone');
  assert.equal(window.CTA_URL, 'https://bridged.payrexx.com/pay?qrid=b5263244-d60f-4304-a79f-d53c287d6970#cddb5a90ceee104a7f83c2cdf41bf773dd79cf8a#');
  assert.equal(ctas[0].getAttribute('href'), window.CTA_URL);
  assert.equal(window.QR_URL, undefined, 'old name retired');
  assert.equal(ctas[0].getAttribute('target'), '_blank');
  assert.equal(ctas[0].getAttribute('rel'), 'noopener');
  assert.ok(doc.querySelector('#spenden'), 'donate section still exists');
  assert.ok(doc.querySelector('.hero-art svg.tree .coin'), 'coin + tree SVG present');
  assert.equal(doc.querySelector('.hero-art').getAttribute('aria-hidden'), 'true');
});

test('phones: the hero art is smaller and pulled up so the donate button fits the first screen', () => {
  const css = read('assets/style.css');
  const block = css.match(/@media \(max-width: 839px\) \{([\s\S]*?)\n\}/);
  assert.ok(block, 'phone hero block exists');
  assert.match(block[1], /\.hero-art \{[^}]*width: min\(100%, 240px\)/);
  assert.match(block[1], /\.hero-art \{[^}]*margin-top: -40px/);
  assert.match(block[1], /\.hero \{[^}]*padding-block: 0 /);
  assert.match(block[1], /\.site-head \{[^}]*padding-block: 12px/);
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
  assert.equal(cd.previousElementSibling.id, 'trees', 'trees line sits between the button and the countdown');
  assert.equal(cd.previousElementSibling.previousElementSibling.className, 'hero-actions');
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

const tick = () => new Promise((r) => setImmediate(r));

test('trees planted: placeholder 𐂷𐂷𐂷 from config.js when no fetch is available, right above the countdown', () => {
  const window = boot();
  const doc = window.document;
  const el = doc.querySelector('#trees');
  const count = el.querySelector('.trees-count');
  assert.equal(window.TREES_PLACEHOLDER, '𐂷𐂷𐂷');
  assert.equal(window.TREES_PLANTED, undefined, 'no static number any more');
  assert.equal(el.hidden, false);
  assert.equal(count.textContent, 'Schon 𐂷𐂷𐂷 Bäumli gepflanzt.');
  assert.equal(el.nextElementSibling.id, 'countdown', 'sits directly in front of the countdown');
  doc.querySelector('.lang-switch [data-lang="en"]').click();
  assert.equal(count.textContent, '𐂷𐂷𐂷 little trees planted already.');
  doc.querySelector('.lang-switch [data-lang="fr"]').click();
  assert.equal(count.textContent, 'Déjà 𐂷𐂷𐂷 petits arbres plantés.');
  for (const lang of ['de', 'fr', 'en']) assert.match(window.I18N[lang]['trees.planted'], /\{n\}/);
});

test('trees planted: inline small print «↻ alle 10 Min.» with a scaled-up arrow', () => {
  const window = boot();
  const doc = window.document;
  const note = doc.querySelector('#trees small.trees-note');
  assert.equal(note.textContent.replace(/\s+/g, ' ').trim(), '↻ alle 10 Min.');
  assert.equal(note.querySelector('.trees-arrow').getAttribute('aria-hidden'), 'true');
  doc.querySelector('.lang-switch [data-lang="en"]').click();
  assert.equal(note.textContent.replace(/\s+/g, ' ').trim(), '↻ every 10 min');
  doc.querySelector('.lang-switch [data-lang="fr"]').click();
  assert.equal(note.textContent.replace(/\s+/g, ' ').trim(), '↻ toutes les 10 min');
  const css = read('assets/style.css');
  assert.doesNotMatch(css.match(/\.trees-note \{[^}]*\}/)[0], /display: block/, 'same line as the counter');
  assert.match(css, /\.trees-arrow \{[^}]*font-size: 1\.\d+em/, 'arrow scaled up to text size');
});

test('trees planted: placeholder paints first, then the live number swaps in with the animation classes', async () => {
  const window = boot({ trees: { body: { trees: 41, chf: 41.5, updatedAt: '2026-09-17T10:00:00Z' } } });
  const doc = window.document;
  const n = doc.querySelector('#trees .trees-n');
  assert.equal(doc.querySelector('#trees .trees-count').textContent, 'Schon 𐂷𐂷𐂷 Bäumli gepflanzt.', 'placeholder before the fetch resolves');
  await tick(); await tick();
  assert.deepEqual(window.fetchCalls, ['assets/trees.json']);
  assert.equal(n.className, 'trees-n is-out', 'placeholder animates out');
  assert.equal(n.textContent, '𐂷𐂷𐂷', 'text unchanged until the out-animation ends');
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(n.className, 'trees-n is-in', 'number animates in');
  assert.equal(doc.querySelector('#trees .trees-count').textContent, 'Schon 41 Bäumli gepflanzt.');
  doc.querySelector('.lang-switch [data-lang="en"]').click();
  assert.equal(doc.querySelector('#trees .trees-count').textContent, '41 little trees planted already.');
  assert.equal(n.className, 'trees-n is-in', 'language switch does not re-animate');
});

test('trees planted: a failed or malformed fetch keeps the placeholder', async () => {
  for (const trees of ['reject', { ok: false, body: {} }, { body: { trees: 'many' } }, { body: null }]) {
    const window = boot({ trees });
    await tick(); await tick();
    assert.equal(window.document.querySelector('#trees .trees-count').textContent, 'Schon 𐂷𐂷𐂷 Bäumli gepflanzt.', JSON.stringify(trees));
  }
});

test('trees planted: hidden once the live count is known to be zero, or when no placeholder is configured', async () => {
  const live = boot({ trees: { body: { trees: 0 } } });
  await tick(); await tick();
  assert.equal(live.document.querySelector('#trees').hidden, true);
  const bare = boot();
  bare.TREES_PLACEHOLDER = '';
  bare.document.querySelector('.lang-switch [data-lang="de"]').click();
  assert.equal(bare.document.querySelector('#trees').hidden, true);
});

test('assets/trees.json is committed and well-formed (first paint before the workflow ever ran)', () => {
  const json = JSON.parse(read('assets/trees.json'));
  assert.ok(Number.isInteger(json.trees) && json.trees >= 0);
});

test('countdown after the end shows the ended message and no digits', () => {
  const window = boot({ ends: '2000-01-01T00:00:00+01:00' });
  const cd = window.document.querySelector('#countdown');
  assert.equal(cd.dataset.ended, 'true');
  assert.equal(cd.querySelector('.cd-value'), null);
  assert.equal(cd.textContent.trim(), window.I18N.de['countdown.ended']);
});

test('after the deadline the hero button is disabled and the QR gives way to the thank-you line', () => {
  const window = boot({ ends: '2000-01-01T00:00:00+01:00' });
  const doc = window.document;
  const cta = doc.querySelector('#hero-cta');
  assert.equal(cta.getAttribute('href'), null, 'no destination any more');
  assert.equal(cta.getAttribute('aria-disabled'), 'true');
  assert.equal(doc.querySelector('.qr-card').hidden, true, 'QR card hidden');
  const done = doc.querySelector('#donate-done');
  assert.equal(done.hidden, false);
  assert.equal(done.textContent, window.I18N.de['donate.done']);
  assert.match(window.I18N.en['donate.done'], /^It’s done\. Thanks to everyone who donated\.$/);
  doc.querySelector('.lang-switch [data-lang="fr"]').click();
  assert.equal(done.textContent, window.I18N.fr['donate.done']);
  assert.equal(doc.querySelector('.qr-card').hidden, true, 'still hidden after a language switch');
});

test('before the deadline the QR card is shown, the thank-you line hidden and the button live', () => {
  const doc = boot({ ends: FAR }).document;
  assert.equal(doc.querySelector('.qr-card').hidden, false);
  assert.equal(doc.querySelector('#donate-done').hidden, true);
  assert.equal(doc.querySelector('#hero-cta').getAttribute('aria-disabled'), null);
  assert.ok(doc.querySelector('#hero-cta').getAttribute('href'));
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

test('the QR is a link to the Payrexx page, opened in a new tab', () => {
  const window = boot();
  const doc = window.document;
  const link = doc.querySelector('a#qr-link');
  assert.ok(link, 'QR wrapped in a link');
  assert.equal(link.querySelector('#qr').tagName, 'IMG');
  assert.equal(window.QR_LINK, 'https://bridged.payrexx.com/pay?qrid=b8ad2ff0-9c12-4aa9-8f43-ad575dbcc04a');
  assert.equal(link.getAttribute('href'), window.QR_LINK);
  assert.equal(link.getAttribute('target'), '_blank');
  assert.equal(link.getAttribute('rel'), 'noopener');
});

test('both donate links carry their URLs in the HTML itself — no JS (or a stale cached script) needed', () => {
  const html = read('index.html');
  const href = (id) => html.match(new RegExp(`id="${id}"[^>]*href="([^"]*)"`))[1];
  const window = boot();
  assert.equal(href('hero-cta'), window.CTA_URL, 'hero static href matches config.js');
  assert.equal(href('qr-link'), window.QR_LINK, 'QR static href matches config.js');
});

test('the payment modal is gone entirely', () => {
  const window = boot();
  const doc = window.document;
  assert.equal(doc.querySelector('dialog, iframe, #pay-dialog, #pay-frame, .pay-close'), null);
  assert.equal(doc.querySelector('.qr-open'), null);
  assert.equal(window.DONATE_URL, undefined);
  for (const lang of ['de', 'fr', 'en']) {
    for (const key of Object.keys(window.I18N[lang])) assert.doesNotMatch(key, /modal/, `${lang}: ${key}`);
  }
  assert.doesNotMatch(read('assets/style.css'), /pay-dialog|pay-frame|pay-open/);
  assert.doesNotMatch(read('assets/app.js'), /payrexx|postMessage|showModal/i);
});
