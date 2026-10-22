#!/usr/bin/env node
'use strict';
/** Source audit, NOT production visual regression. Keeps prior baseline reconstructible. */
const fs = require('node:fs');
const path = require('node:path');
const { restoreCss, sha256 } = require('./lib/css-dedupe-evidence.cjs');
const root = path.resolve(__dirname, '../..');
const readJSON = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const manifest = readJSON(path.join(root, 'tests/fixtures/validation/css-dedupe-manifest.json'));
const original = readJSON(path.join(root, 'tests/fixtures/validation/css-before-components-sha256.json'));
const current = readJSON(path.join(root, 'tests/fixtures/validation/css-components-sha256.json'));
const cssDir = path.join(root, 'apps/web/src/app');
const imports = [...fs.readFileSync(path.join(cssDir, 'layout.tsx'), 'utf8').matchAll(/import '\.\/(.+?\.css)';/g)].map(m => m[1]);
const errors=[];
if (JSON.stringify(imports.slice(0,Object.keys(original.files).length)) !== JSON.stringify(Object.keys(original.files))) errors.push('Original CSS import order changed');
if (JSON.stringify(imports.slice(0,Object.keys(current.files).length)) !== JSON.stringify(Object.keys(current.files))) errors.push('Current CSS import order changed');
if (new Set(imports).size !== imports.length) errors.push('Duplicate CSS import');
for (const name of imports.slice(Object.keys(current.files).length)) if (!fs.existsSync(path.join(cssDir,name))) errors.push('Missing additive stylesheet: ' + name);
let count=0;
for(const name of Object.keys(current.files)) {
  const css = fs.readFileSync(path.join(cssDir, name), 'utf8');
  if (sha256(css) !== current.files[name]) errors.push(name+': new stylesheet SHA mismatch');
  const evidence=manifest.files[name];
  const restored=evidence ? restoreCss(css,evidence) : css;
  if (sha256(restored)!==original.files[name]) errors.push(name+': reconstructing V11.33 CSS failed');
  if(evidence) {
    if(sha256(restored)!==evidence.sha256Before || sha256(css)!==evidence.sha256After) errors.push(name+': manifest hash mismatch');
    count+=evidence.removed.length;
    for(const item of evidence.removed) {
      if(!imports.includes(item.laterFile) || imports.indexOf(item.laterFile)<=imports.indexOf(name)) errors.push(name+': duplicate target is not imported later');
      const target=fs.readFileSync(path.join(cssDir,item.laterFile),'utf8');
      if (!target.includes(item.property)) errors.push(item.laterFile+': matching property missing');
    }
  }
}
if(count!==manifest.removedDeclarations) errors.push(`Expected ${manifest.removedDeclarations} removals, got ${count}`);
if(errors.length) { errors.forEach(x=>console.error('FAIL '+x)); process.exitCode=1; }
else console.log(`PASS: ${count} exact CSS declarations removed from ${Object.keys(manifest.files).length} files; all ${Object.keys(current.files).length} original stylesheets reconstruct byte-for-byte; import order unchanged. Browser visual equivalence NOT tested.`);
