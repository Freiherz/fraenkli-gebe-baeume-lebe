'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// Run a browser-style script (assigns to window.*) inside this realm so the
// objects it creates compare cleanly with assert.deepEqual. `module` is
// provided so the script's export guard fires; the exports are returned.
function loadBrowserScript(rel) {
  const window = {};
  const module = { exports: {} };
  const fn = vm.compileFunction(read(rel), ['window', 'module'], { filename: rel });
  fn.call(window, window, module);
  return Object.assign({}, window, module.exports);
}

module.exports = { ROOT, read, loadBrowserScript };
