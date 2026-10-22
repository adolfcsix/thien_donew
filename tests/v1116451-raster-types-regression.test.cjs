'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, existsSync} = require('node:fs');
const {resolve, dirname} = require('node:path');
const root = resolve(__dirname, '..');
const apiSrc = resolve(root, 'apps/api/src');
const contract = resolve(apiSrc, 'common/raster-image-validation.d.cts');
const runtime = require('../apps/api/src/common/raster-image-validation.cjs');

test('A24: every named raster validator export has a colocated CommonJS declaration', () => {
  assert.equal(existsSync(contract), true, 'TS7016: missing raster-image-validation.d.cts');
  const types = readFileSync(contract, 'utf8');
  for (const name of ['jpegDimensions', 'pngDimensions', 'webpDimensions', 'inspectAvatar', 'rasterMime']) {
    assert.equal(typeof runtime[name], 'function', `runtime export ${name}`);
    assert.match(types, new RegExp(`export\\s+declare\\s+function\\s+${name}\\s*\\(`), `type export ${name}`);
  }
  assert.match(types, /export type RasterMime = 'image\/jpeg' \| 'image\/png' \| 'image\/webp';/);
  assert.match(types, /maxBytes\?: number\): RasterMime \| null/);
});

test('A24: books TypeScript service resolves the local raster declaration', () => {
  const books = readFileSync(resolve(apiSrc, 'modules/books/books.service.ts'), 'utf8');
  assert.match(books, /from '\.\.\/\.\.\/common\/raster-image-validation\.cjs'/);
  const importPath = '../../common/raster-image-validation.cjs';
  const implementation = resolve(dirname(resolve(apiSrc, 'modules/books/books.service.ts')), importPath);
  assert.equal(existsSync(implementation), true);
  assert.equal(existsSync(implementation.replace(/\.cjs$/, '.d.cts')), true);
});

test('A24: adding type declarations does not change runtime image validation behavior', () => {
  const fixtures = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/avatar-valid-hex.json'), 'utf8'));
  for (const [key, format, mime] of [
    ['JPEG', 'jpeg', 'image/jpeg'], ['PNG', 'png', 'image/png'], ['WEBP', 'webp', 'image/webp'],
  ]) {
    const valid = Buffer.from(fixtures[key], 'hex');
    assert.equal(runtime.rasterMime(valid, format), mime);
    assert.equal(runtime.rasterMime(valid.subarray(0, valid.length - 10), format), null);
  }
});
