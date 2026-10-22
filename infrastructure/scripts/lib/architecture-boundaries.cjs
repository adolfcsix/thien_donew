'use strict';
const path = require('node:path');

/** Static dependency boundary guard. No module execution, database or network. */
function importSpecifiers(source) {
  const pattern = /\b(?:from\s*|require\s*\(\s*|import\s*\(\s*|import\s+)(['"])([^'"\n]+)\1/g;
  const specifiers=[];
  for (const match of source.matchAll(pattern)) specifiers.push(match[2]);
  return specifiers;
}
function violationFor(root, from, specifier) {
  const current = path.relative(root,from).replaceAll('\\','/');
  if (!specifier.startsWith('.')) return null;
  const resolved=path.resolve(path.dirname(from),specifier);
  const target=path.relative(root,resolved).replaceAll('\\','/');
  if (target.startsWith('../')||target==='..') return `escape outside repository: ${specifier}`;
  if (current.startsWith('packages/')) {
    if (/^(apps|tests|infrastructure)\//.test(target)) return `package imports application/test/infrastructure: ${target}`;
  } else if (current.startsWith('apps/web/')) {
    if (/^(apps\/api|tests|infrastructure)\//.test(target)) return `frontend imports server/legacy/infrastructure: ${target}`;
  } else if (current.startsWith('apps/api/')) {
    if (/^(apps\/web|tests|infrastructure)\//.test(target)) return `backend imports frontend/legacy/infrastructure: ${target}`;
  }
  return null;
}
module.exports={importSpecifiers,violationFor};
