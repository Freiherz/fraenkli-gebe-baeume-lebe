#!/usr/bin/env node
'use strict';
// Counts the trees financed so far (1 CHF = 1 tree) from confirmed Payrexx
// transactions and writes assets/trees.json. Run by .github/workflows/trees.yml
// every 10 minutes; needs PAYREXX_SECRET (API key) and PAYREXX_INSTANCE.
//
//   PAYREXX_SECRET=… PAYREXX_INSTANCE=bridged node scripts/trees.js

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const API = 'https://api.payrexx.com/v1.0/';
const PAGE = 100;
// Product names used by the campaign's payment pages (old name included).
// Trailing punctuation and whitespace are ignored.
const CAMPAIGN_NAMES = ['Franke lah, Bäumli ha', 'Fränkli gebe, Bäume lebe'];

function normaliseName(name) {
  return String(name || '').normalize('NFC').trim().replace(/[\s.!?…]+$/u, '');
}

function isCampaignProduct(product) {
  return CAMPAIGN_NAMES.includes(normaliseName(product && product.name));
}

// Sum of confirmed CHF amounts (in cents) for campaign products → whole trees.
function countTrees(transactions) {
  let cents = 0;
  for (const t of transactions || []) {
    if (!t || t.status !== 'confirmed') continue;
    const invoice = t.invoice || {};
    if (invoice.currencyAlpha3 && invoice.currencyAlpha3 !== 'CHF') continue;
    const products = invoice.products || [];
    if (!products.some(isCampaignProduct)) continue;
    cents += Number(t.amount) || 0;
  }
  return { trees: Math.floor(cents / 100), chf: cents / 100 };
}

function sign(query, secret) {
  return crypto.createHmac('sha256', secret).update(query).digest('base64');
}

async function fetchAllTransactions({ instance, secret, fetchImpl = fetch }) {
  const all = [];
  for (let offset = 0; ; offset += PAGE) {
    const query = new URLSearchParams({ limit: String(PAGE), offset: String(offset) }).toString();
    const url = `${API}Transaction/?instance=${encodeURIComponent(instance)}&${query}&ApiSignature=${encodeURIComponent(sign(query, secret))}`;
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`Payrexx ${res.status} at offset ${offset}`);
    const body = await res.json();
    if (body.status !== 'success') throw new Error(`Payrexx: ${body.message || 'unexpected reply'}`);
    const data = body.data || [];
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

async function main() {
  const secret = process.env.PAYREXX_SECRET;
  const instance = process.env.PAYREXX_INSTANCE;
  if (!secret || !instance) throw new Error('PAYREXX_SECRET and PAYREXX_INSTANCE are required');
  const transactions = await fetchAllTransactions({ instance, secret });
  const { trees, chf } = countTrees(transactions);
  const out = path.join(__dirname, '..', 'assets', 'trees.json');
  const written = writeIfChanged(out, { trees, chf });
  console.log(`${transactions.length} transactions → ${trees} trees (CHF ${chf.toFixed(2)}) → ${path.relative(process.cwd(), out)} ${written ? 'updated' : 'unchanged'}`);
}

// Rewrites the JSON only when trees or chf differ from what is on disk, so
// updatedAt (and the workflow's commit) only move when the count moves.
function writeIfChanged(file, { trees, chf }) {
  let current = null;
  try { current = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* missing or invalid → write */ }
  if (current && current.trees === trees && current.chf === chf) return false;
  fs.writeFileSync(file, JSON.stringify({ trees, chf, updatedAt: new Date().toISOString() }, null, 2) + '\n');
  return true;
}

module.exports = { countTrees, normaliseName, isCampaignProduct, sign, fetchAllTransactions, writeIfChanged };

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
