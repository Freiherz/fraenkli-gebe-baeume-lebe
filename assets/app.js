// DOM wiring: language switch and translation rendering.
(function () {
  'use strict';

  var DEFAULT_LANG = 'de';
  var I18N = window.I18N;
  var Logic = window.Logic;
  var lang = DEFAULT_LANG;

  function $$(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function t(key) { return Logic.translate(I18N, lang, key); }

  function readStored() {
    try { return localStorage.getItem('lang'); } catch (e) { return null; }
  }
  function writeStored(value) {
    try { localStorage.setItem('lang', value); } catch (e) { /* private mode */ }
  }

  function renderList(el, items) {
    el.innerHTML = '';
    items.forEach(function (text) {
      var li = document.createElement('li');
      li.textContent = text;
      el.appendChild(li);
    });
  }

  function cell(value, unitKey) {
    var wrap = document.createElement('div');
    wrap.className = 'cd-cell';
    var v = document.createElement('span');
    v.className = 'cd-value';
    v.textContent = value;
    var u = document.createElement('span');
    u.className = 'cd-unit';
    u.textContent = t(unitKey);
    wrap.appendChild(v);
    wrap.appendChild(u);
    return wrap;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function renderCountdown() {
    var el = document.getElementById('countdown');
    if (!el) return;
    var left = Logic.countdown(el.dataset.ends, new Date());
    el.dataset.ended = String(left.ended);
    el.innerHTML = '';
    if (left.ended) { el.textContent = t('countdown.ended'); return; }

    var label = document.createElement('span');
    label.className = 'cd-label';
    label.textContent = t('countdown.label');
    var grid = document.createElement('div');
    grid.className = 'cd-grid';
    grid.appendChild(cell(String(left.days), 'countdown.days'));
    grid.appendChild(cell(pad(left.hours), 'countdown.hours'));
    grid.appendChild(cell(pad(left.minutes), 'countdown.minutes'));
    grid.appendChild(cell(pad(left.seconds), 'countdown.seconds'));
    var until = document.createElement('span');
    until.className = 'cd-until';
    until.textContent = t('countdown.until') + ' ' + Logic.formatDeadline(el.dataset.ends, lang);
    el.appendChild(label);
    el.appendChild(grid);
    el.appendChild(until);
  }

  // "Team: A, B und C" — names with a URL become LinkedIn links.
  function renderTeam() {
    var el = document.querySelector('#about .team');
    var team = window.TEAM || [];
    if (!el || !team.length) return;
    el.innerHTML = '';
    var label = document.createElement('span');
    label.className = 'team-label';
    label.textContent = t('about.team');
    el.appendChild(label);
    el.appendChild(document.createTextNode(' '));
    team.forEach(function (member, i) {
      if (i > 0) el.appendChild(document.createTextNode(i === team.length - 1 ? ' ' + t('about.and') + ' ' : ', '));
      var node = document.createElement(member.url ? 'a' : 'span');
      node.className = 'team-member';
      node.textContent = member.name;
      if (member.url) {
        node.href = member.url;
        node.target = '_blank';
        node.rel = 'noopener';
      }
      el.appendChild(node);
    });
  }

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;
    writeStored(next);
    document.title = t('meta.title');
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-alt]').forEach(function (el) { el.alt = t(el.dataset.i18nAlt); });
    $$('[data-i18n-aria-label]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)); });
    $$('[data-i18n-list]').forEach(function (el) { renderList(el, t(el.dataset.i18nList)); });
    $$('.lang-switch button').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === next));
    });
    renderCountdown();
    renderTeam();
  }

  function init() {
    applyLang(Logic.pickLang({
      query: new URLSearchParams(location.search).get('lang'),
      stored: readStored(),
      navigator: navigator.language,
      fallback: DEFAULT_LANG,
    }));
    $$('.lang-switch button').forEach(function (btn) {
      btn.addEventListener('click', function () { applyLang(btn.dataset.lang); });
    });
    setInterval(renderCountdown, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
