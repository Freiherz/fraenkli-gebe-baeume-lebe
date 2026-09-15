// Pure, DOM-free helpers used by app.js. Exposed on window for the browser
// and on module.exports for the Node test suite.
(function (root) {
  'use strict';

  var LANGS = ['de', 'fr', 'en'];

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

  var Logic = { LANGS: LANGS, pickLang: pickLang, translate: translate };

  root.Logic = Logic;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Logic: Logic };
})(typeof window !== 'undefined' ? window : this);
