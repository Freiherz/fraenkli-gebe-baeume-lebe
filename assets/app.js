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

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;
    writeStored(next);
    document.title = t('meta.title');
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-alt]').forEach(function (el) { el.alt = t(el.dataset.i18nAlt); });
    $$('[data-i18n-list]').forEach(function (el) { renderList(el, t(el.dataset.i18nList)); });
    $$('.lang-switch button').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === next));
    });
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
