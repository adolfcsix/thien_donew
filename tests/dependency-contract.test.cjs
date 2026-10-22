const {test} = require('node:test');
const assert = require('node:assert/strict');
const load = async () => import('../infrastructure/scripts/dependency-contract.mjs');

test('workspace aliases, relative specifiers and Node builtins are not external dependencies', async () => {
  const {packageNameForSpecifier: pkg} = await load();
  for (const value of ['./x','../mod','@/lib/api','node:fs/promises','fs','fs/promises','path','http','https', '#app/model']) {
    assert.equal(pkg(value), null, value);
  }
});

test('unscoped, scoped and subpath dependencies normalize to declared package identity', async () => {
  const {packageNameForSpecifier: pkg} = await load();
  assert.equal(pkg('express'), 'express');
  assert.equal(pkg('next/navigation'), 'next');
  assert.equal(pkg('@nestjs/core'), '@nestjs/core');
  assert.equal(pkg('@thiendo/shared-types/extra'), '@thiendo/shared-types');
});

test('undeclared direct imports cannot rely on an npm transitive dependency being hoisted', async () => {
  const {undeclaredImports} = await load();
  assert.deepEqual(undeclaredImports(['express','@nestjs/common','express','node:fs'], {
    dependencies: {'@nestjs/common':'^11.1.0'}, devDependencies: {'@types/express':'^5.0.0'},
  }), ['express']);
  assert.deepEqual(undeclaredImports(['express','@nestjs/common'], {
    dependencies: {express:'^5.1.0', '@nestjs/common':'^11.1.0'},
  }), []);
});

test('AST dependency scan ignores commented-out and example-string imports', async () => {
  const {collectModuleSpecifiers} = await load();
  const ts = require('./helpers-typeloader.cjs');
  const fixture = `
    // import fake from 'comment-only';
    const example = "import demo from 'string-only'";
    import {json} from 'express';
    import Link from 'next/link';
    export {x} from '@thiendo/shared-types';
    const future = import('dynamic-package/path');
    const read = require('fs');
    `;
  const node = ts.createSourceFile('sample.tsx', fixture, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.deepEqual(collectModuleSpecifiers(ts, node).sort(), ['@thiendo/shared-types','dynamic-package/path','express','fs','next/link']);
});

test('current API and web manifests cover imported external modules', async () => {
  const {undeclaredImports} = await load();
  const api = require('../apps/api/package.json');
  const web = require('../apps/web/package.json');
  assert.deepEqual(undeclaredImports(['express','@nestjs/core','pg','reflect-metadata'], api), []);
  assert.deepEqual(undeclaredImports(['next/link','react','@thiendo/astrology-engine'], web), []);
});
