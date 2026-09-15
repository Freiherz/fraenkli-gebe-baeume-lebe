// Presentation only: scroll reveals and a ?theme= override for previews.
// Independent of app.js.
(function () {
  'use strict';
  var html = document.documentElement;
  html.classList.add('js');

  // ?theme=dark|light forces a colour scheme (previews / QA); otherwise
  // prefers-color-scheme decides.
  var theme = new URLSearchParams(location.search).get('theme');
  if (theme === 'dark' || theme === 'light') html.dataset.theme = theme;

  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('is-visible'); });
  }
})();
