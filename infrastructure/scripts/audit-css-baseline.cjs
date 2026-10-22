/** Read-only guard for chart CSS cascade. Does NOT assert visual equivalence. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const cssDir = path.join(root, 'apps/web/src/app');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/validation/css-components-sha256.json'), 'utf8'));
const layout = fs.readFileSync(path.join(cssDir, 'layout.tsx'), 'utf8');
const imports = Array.from(layout.matchAll(/import '\.\/(.+?\.css)';/g), match => match[1]);
const expected = Object.keys(baseline.files);
const problems = [];
// The protected historical imports must stay in their original order.
// Additive presentation layers are permitted after the protected baseline.
if (JSON.stringify(imports.slice(0,expected.length)) !== JSON.stringify(expected)) problems.push('Protected CSS import order changed in layout.tsx');
const extraImports=imports.slice(expected.length);
if (new Set(imports).size !== imports.length) problems.push('Duplicate CSS imports in layout.tsx');
for (const name of extraImports) {
  if (!fs.existsSync(path.join(cssDir,name))) problems.push('Added CSS layer missing: ' + name);
}
for (const name of expected) {
  const file = path.join(cssDir, name);
  if (!fs.existsSync(file)) { problems.push('CSS file missing: ' + name); continue; }
  const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (hash !== baseline.files[name]) problems.push('CSS content modified without visual review: ' + name);
}
if (problems.length) { for (const problem of problems) console.error('FAIL ' + problem); process.exitCode = 1; }
else console.log('PASS: ' + expected.length + ' stylesheet hashes and layout import order preserved. This is not a browser screenshot comparison.');
