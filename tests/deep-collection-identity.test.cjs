'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const source = readFileSync(resolve(__dirname, '../apps/web/src/app/collection/page.tsx'), 'utf8');
test('Deep audit: saved chart board identity includes time as well as date', () => {
  // Distinct births on the same calendar day must not reuse the previous
  // board's local selection or annual-year state during React reconciliation.
  assert.match(source, /<ChartBoard key=\{\[selected\.solar\.year,selected\.solar\.month,selected\.solar\.day,selected\.hour,selected\.minute,selected\.gender,selected\.ruleSet\]/);
});
test('Deep audit: account changes cancel stale list, detail, export and import requests', () => {
  assert.match(source, /<CollectionForUser key=\{user\.id\}/);
  for (const ref of ['listRequest','detailRequest','exportRequest','importRequest']) {
    assert.match(source,new RegExp(ref+'\\.current\\?\\.abort\\(\\)'));
  }
});
