// Pure, DOM-free helpers used by app.js. Exposed on window for the browser
// and on module.exports for the Node test suite.
(function (root) {
  'use strict';

  var LANGS = ['de', 'fr', 'en'];
  var LOCALES = { de: 'de-CH', fr: 'fr-CH', en: 'en-GB' };

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

  function formatDeadline(iso, lang) {
    return new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.de, {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Europe/Zurich',
    }).format(new Date(iso));
  }

  // Whole days/hours/minutes/seconds left until `iso`; ended once `now` is past it.
  function countdown(iso, now) {
    var left = Math.floor((new Date(iso).getTime() - now.getTime()) / 1000);
    if (left < 0) return { ended: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      ended: false,
      days: Math.floor(left / 86400),
      hours: Math.floor((left % 86400) / 3600),
      minutes: Math.floor((left % 3600) / 60),
      seconds: left % 60,
    };
  }

  var Logic = {
    LANGS: LANGS,
    pickLang: pickLang,
    translate: translate,
    formatDeadline: formatDeadline,
    countdown: countdown,
  };

  root.Logic = Logic;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Logic: Logic };
})(typeof window !== 'undefined' ? window : this);
