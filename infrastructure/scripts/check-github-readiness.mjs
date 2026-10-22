#!/usr/bin/env node
// Conservative, read-only GitHub source preflight. Never marks a production release GO.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const checks = [
  ['lockfile', 'infrastructure/scripts/validate-lockfile.mjs'],
  ['migration-chain', 'infrastructure/scripts/check-migration-chain.mjs'],
  ['secret-scan', 'infrastructure/scripts/v11164-secret-scan.mjs'],
  ['architecture', 'infrastructure/scripts/audit-architecture.cjs'],
  ['source-integrity', 'infrastructure/scripts/check-source.mjs'],
];
let failed = false;
for (const [name, script] of checks) {
  const result = spawnSync(process.execPath, [resolve(root, script)], { cwd: root, encoding: 'utf8', timeout: 120000 });
  const ok = result.status === 0 && !result.error;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) { failed = true; console.error((result.stderr || result.stdout || String(result.error)).slice(-1200)); }
}
const ignore = existsSync(resolve(root, '.gitignore')) ? readFileSync(resolve(root, '.gitignore'), 'utf8') : '';
for (const pattern of ['node_modules/', '.env', '.env.*', '*.pem', '*.key']) {
  const ok = ignore.split(/\r?\n/).some(line => line.trim() === pattern);
  console.log(`${ok ? 'PASS' : 'FAIL'} gitignore ${pattern}`);
  if (!ok) failed = true;
}
const release = JSON.parse(readFileSync(resolve(root, 'infrastructure/release/current.json'), 'utf8'));
const blocked = release.status === 'NO_GO' && release.blockingGates?.every(g => g.status === 'OPEN');
console.log(`${blocked ? 'PASS' : 'FAIL'} preserve NO_GO release gates`);
if (!blocked) failed = true;
console.log(failed ? 'NOT READY: source preflight failed' : 'SOURCE PREFLIGHT PASS; NOT a full GitHub-ready or production-ready approval');
process.exitCode = failed ? 1 : 0;
