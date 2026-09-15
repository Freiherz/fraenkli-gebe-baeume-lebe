// Pure, DOM-free helpers used by app.js. Exposed on window for the browser
// and on module.exports for the Node test suite.
(function (root) {
  'use strict';

  var LANGS = ['de', 'fr', 'en'];
  var LOCALES = { de: 'de-CH', fr: 'fr-CH', en: 'en-GB' };
  var PLACEHOLDER_ENDPOINT = 'PASTE_APPS_SCRIPT_WEB_APP_URL';

  function supported(value) {
    return typeof value === 'string' && LANGS.indexOf(value) !== -1;
  }

  // Priority: ?lang= → localStorage → navigator language prefix → fallback.
  function pickLang(sources) {
    if (supported(sources.query)) return sources.query;
    if (supported(sources.stored)) return sources.stored;
    var nav = typeof sources.navigator === 'string' ? sources.navigator.slice(0, 2).toLowerCase() : '';
    if (supported(nav)) return nav;
    return sources.fallback;
  }

  function translate(table, lang, key) {
    var strings = table[lang] || {};
    if (key in strings) return strings[key];
    if (key in table.de) return table.de[key];
    return key;
  }

  function isClosed(deadline, now) {
    return now.getTime() > new Date(deadline).getTime();
  }

  function formatDeadline(deadline, lang) {
    return new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.de, {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Europe/Zurich',
    }).format(new Date(deadline));
  }

  function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function buildPayload(values, lang, userAgent) {
    var donated = values.donated === 'yes' ? 'yes' : 'no';
    var amount = donated === 'yes' ? Number(values.amount) : null;
    return {
      lang: lang,
      email: clean(values.email),
      phone: clean(values.phone),
      donated: donated,
      why: donated === 'yes' ? clean(values.why) : '',
      amount: donated === 'yes' && isFinite(amount) ? amount : null,
      website: typeof values.website === 'string' ? values.website : '',
      ua: userAgent,
    };
  }

  var KNOWN_CODES = ['ok', 'duplicate', 'closed', 'invalid'];

  function statusFor(reply) {
    if (!reply || typeof reply !== 'object') return 'error';
    if (reply.ok === true) return 'ok';
    return KNOWN_CODES.indexOf(reply.code) !== -1 ? reply.code : 'error';
  }

  function isConfigured(endpoint) {
    return typeof endpoint === 'string' && endpoint.length > 0 && endpoint !== PLACEHOLDER_ENDPOINT;
  }

  var Logic = {
    LANGS: LANGS,
    pickLang: pickLang,
    translate: translate,
    isClosed: isClosed,
    formatDeadline: formatDeadline,
    buildPayload: buildPayload,
    statusFor: statusFor,
    isConfigured: isConfigured,
  };

  root.Logic = Logic;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Logic: Logic };
})(typeof window !== 'undefined' ? window : this);
