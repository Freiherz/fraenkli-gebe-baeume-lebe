// DOM wiring: language switch, conditional fields, deadline lock, submit.
// All decisions live in logic.js; this file only reads and writes the page.
(function () {
  'use strict';

  var DEFAULTS = {
    endpoint: 'PASTE_APPS_SCRIPT_WEB_APP_URL',
    deadline: '2026-09-19T23:59:59+02:00',
    defaultLang: 'de',
  };
  var CONFIG = Object.assign({}, DEFAULTS, window.APP_CONFIG || {});
  var I18N = window.I18N;
  var Logic = window.Logic;

  var lang = CONFIG.defaultLang;
  var statusCode = null;

  function $(selector) { return document.querySelector(selector); }
  function $$(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function t(key) { return Logic.translate(I18N, lang, key); }

  function readStored() {
    try { return localStorage.getItem('lang'); } catch (e) { return null; }
  }
  function writeStored(value) {
    try { localStorage.setItem('lang', value); } catch (e) { /* private mode */ }
  }

  function renderList(el, items, tag) {
    el.innerHTML = '';
    items.forEach(function (text) {
      var child = document.createElement(tag);
      child.textContent = text;
      el.appendChild(child);
    });
  }

  function setStatus(code) {
    statusCode = code;
    var el = $('.status');
    if (!code) { el.textContent = ''; delete el.dataset.kind; return; }
    el.textContent = t('status.' + code);
    el.dataset.kind = code;
  }

  function applyLang(next) {
    lang = next;
    document.documentElement.lang = next;
    writeStored(next);
    document.title = t('meta.title');
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-placeholder]').forEach(function (el) { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$('[data-i18n-alt]').forEach(function (el) { el.alt = t(el.dataset.i18nAlt); });
    $$('[data-i18n-list]').forEach(function (el) { renderList(el, t(el.dataset.i18nList), 'li'); });
    $$('.lang-switch button').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === next));
    });
    $('#deadline').textContent = Logic.formatDeadline(CONFIG.deadline, next);
    setStatus(statusCode);
  }

  function updateDonationDetails() {
    var donated = $('[name=donated]:checked');
    var show = !!donated && donated.value === 'yes';
    var details = $('#donation-details');
    details.hidden = !show;
    $$('#donation-details input, #donation-details textarea').forEach(function (el) { el.required = show; });
  }

  function formValues(form) {
    var data = new FormData(form);
    var out = {};
    ['email', 'phone', 'donated', 'why', 'amount', 'website'].forEach(function (name) {
      var v = data.get(name);
      out[name] = v === null ? '' : String(v);
    });
    return out;
  }

  function setPending(pending) {
    $('button[type=submit]').disabled = pending;
  }

  function onSubmit(event) {
    event.preventDefault();
    var form = event.target;
    if (Logic.isClosed(CONFIG.deadline, new Date())) { lock(); return; }
    if (!form.checkValidity()) {
      if (typeof form.reportValidity === 'function') form.reportValidity();
      return;
    }
    if (!Logic.isConfigured(CONFIG.endpoint)) {
      console.error('APP_CONFIG.endpoint is not set');
      setStatus('error');
      return;
    }

    var payload = Logic.buildPayload(formValues(form), lang, navigator.userAgent);
    setPending(true);
    setStatus('pending');

    // No Content-Type header: the body goes as text/plain, which is a CORS
    // "simple request". Apps Script cannot answer a preflight, so this is required.
    fetch(CONFIG.endpoint, { method: 'POST', body: JSON.stringify(payload) })
      .then(function (res) { return res.json(); })
      .then(function (reply) {
        var code = Logic.statusFor(reply);
        setStatus(code);
        if (code === 'ok') form.hidden = true;
      })
      .catch(function (err) {
        console.error(err);
        setStatus('error');
      })
      .then(function () { setPending(false); });
  }

  function lock() {
    setPending(true);
    setStatus('closed');
  }

  function init() {
    var query = new URLSearchParams(location.search).get('lang');
    applyLang(Logic.pickLang({
      query: query,
      stored: readStored(),
      navigator: navigator.language,
      fallback: CONFIG.defaultLang,
    }));

    $$('.lang-switch button').forEach(function (btn) {
      btn.addEventListener('click', function () { applyLang(btn.dataset.lang); });
    });
    $$('[name=donated]').forEach(function (radio) {
      radio.addEventListener('change', updateDonationDetails);
    });
    updateDonationDetails();

    $('form').addEventListener('submit', onSubmit);
    if (Logic.isClosed(CONFIG.deadline, new Date())) lock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
