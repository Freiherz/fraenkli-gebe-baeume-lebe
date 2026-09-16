'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { countTrees, normaliseName, sign, fetchAllTransactions, writeIfChanged } = require('../scripts/trees');
const os = require('node:os');

const tx = (over) => ({
  status: 'confirmed', amount: 100,
  invoice: { currencyAlpha3: 'CHF', products: [{ name: 'Franke lah, Bäumli ha!', amount: 100 }] },
  ...over,
});

test('countTrees: 1 CHF = 1 tree over confirmed campaign transactions only', () => {
  const r = countTrees([
    tx(), tx({ amount: 500 }), tx({ amount: 200 }),
    tx({ status: 'cancelled' }), tx({ status: 'expired' }), tx({ status: 'declined' }),
  ]);
  assert.deepEqual(r, { trees: 8, chf: 8 });
});

test('countTrees: accepts all three punctuation variants and the pre-rename product name', () => {
  const names = ['Franke lah, Bäumli ha!', 'Franke lah, Bäumli ha.', 'Franke lah, Bäumli ha', 'Fränkli gebe, Bäume lebe'];
  const r = countTrees(names.map((name) => tx({ invoice: { currencyAlpha3: 'CHF', products: [{ name }] } })));
  assert.equal(r.trees, 4);
});

test('countTrees: ignores other products, empty names, foreign currency and garbage', () => {
  const r = countTrees([
    tx({ invoice: { currencyAlpha3: 'CHF', products: [{ name: 'Something else' }] } }),
    tx({ invoice: { currencyAlpha3: 'CHF', products: [{ name: '' }] } }),
    tx({ invoice: { currencyAlpha3: 'CHF', products: [] } }),
    tx({ invoice: { currencyAlpha3: 'EUR', products: [{ name: 'Franke lah, Bäumli ha' }] } }),
    null, {}, tx({ amount: 'abc' }),
  ]);
  assert.deepEqual(r, { trees: 0, chf: 0 });
});

test('countTrees: rounds down to whole trees, reports exact CHF', () => {
  assert.deepEqual(countTrees([tx({ amount: 150 }), tx({ amount: 120 })]), { trees: 2, chf: 2.7 });
  assert.deepEqual(countTrees([]), { trees: 0, chf: 0 });
});

test('normaliseName strips trailing punctuation/whitespace only', () => {
  assert.equal(normaliseName('  Franke lah, Bäumli ha!  '), 'Franke lah, Bäumli ha');
  assert.equal(normaliseName('Franke lah, Bäumli ha...'), 'Franke lah, Bäumli ha');
  assert.equal(normaliseName('Franke lah! Bäumli ha'), 'Franke lah! Bäumli ha');
});

test('sign: base64 HMAC-SHA256 of the query string (Payrexx ApiSignature)', () => {
  assert.equal(sign('limit=100&offset=0', 'secret'), require('node:crypto').createHmac('sha256', 'secret').update('limit=100&offset=0').digest('base64'));
});

test('fetchAllTransactions pages by 100 with a signed query and stops on a short page', async () => {
  const calls = [];
  const page = (n) => Array.from({ length: n }, (_, i) => tx({ id: i }));
  const fetchImpl = async (url) => {
    calls.push(url);
    const offset = Number(new URL(url).searchParams.get('offset'));
    return { ok: true, json: async () => ({ status: 'success', data: offset === 0 ? page(100) : page(7) }) };
  };
  const all = await fetchAllTransactions({ instance: 'bridged', secret: 's', fetchImpl });
  assert.equal(all.length, 107);
  assert.equal(calls.length, 2);
  const u = new URL(calls[0]);
  assert.equal(u.origin + u.pathname, 'https://api.payrexx.com/v1.0/Transaction/');
  assert.equal(u.searchParams.get('instance'), 'bridged');
  assert.equal(u.searchParams.get('ApiSignature'), sign('limit=100&offset=0', 's'));
  assert.equal(new URL(calls[1]).searchParams.get('offset'), '100');
});

test('fetchAllTransactions fails loudly on HTTP or API errors', async () => {
  await assert.rejects(fetchAllTransactions({ instance: 'x', secret: 's', fetchImpl: async () => ({ ok: false, status: 401 }) }), /401/);
  await assert.rejects(fetchAllTransactions({ instance: 'x', secret: 's', fetchImpl: async () => ({ ok: true, json: async () => ({ status: 'error', message: 'bad' }) }) }), /bad/);
});

test('writeIfChanged: touches the file (and updatedAt) only when the count moves', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'trees-')), 'trees.json');
  assert.equal(writeIfChanged(file, { trees: 5, chf: 5 }), true, 'missing file → written');
  const first = fs.readFileSync(file, 'utf8');
  assert.equal(writeIfChanged(file, { trees: 5, chf: 5 }), false, 'same count → untouched');
  assert.equal(fs.readFileSync(file, 'utf8'), first);
  assert.equal(writeIfChanged(file, { trees: 6, chf: 6.5 }), true, 'new count → rewritten');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(json.trees, 6); assert.equal(json.chf, 6.5); assert.ok(json.updatedAt);
  fs.writeFileSync(file, 'not json');
  assert.equal(writeIfChanged(file, { trees: 6, chf: 6.5 }), true, 'corrupt file → rewritten');
});

test('workflow: cron every 10 minutes, secret from repo secrets, script and JSON in place', () => {
  const yml = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/trees.yml'), 'utf8');
  assert.match(yml, /cron: '\*\/10 \* \* \* \*'/);
  assert.match(yml, /PAYREXX_SECRET: \$\{\{ secrets\.PAYREXX_SECRET \}\}/);
  assert.match(yml, /node scripts\/trees\.js/);
  assert.match(yml, /contents: write/);
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/trees.json'), 'utf8'));
  assert.equal(typeof json.trees, 'number');
  assert.equal(typeof json.updatedAt, 'string');
  const repo = fs.readFileSync(path.join(__dirname, '..', 'scripts/trees.js'), 'utf8');
  assert.match(repo, /process\.env\.PAYREXX_SECRET/, 'key comes from the environment');
  assert.doesNotMatch(repo, /PAYREXX_SECRET\s*=\s*['"]/, 'no key literal in the script');
});
