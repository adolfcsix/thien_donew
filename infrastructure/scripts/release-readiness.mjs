/**
 * THIEN DO V11.66: offline, non-destructive readiness assessment.
 * No network requests, db queries, dependency installs, or .env file reads.
 * Run: node infrastructure/scripts/release-readiness.mjs [--json]
 */
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {auditWorkspaceGraph} from './workspace-contract.mjs';
import {auditReleaseMetadata} from './release-metadata.mjs';
import {validateRepositoryLock} from './validate-lockfile.mjs';
import {isSupportedNodeVersion} from './diagnose-build-lib.mjs';
import {assessReadiness} from './release-readiness-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeOk = isSupportedNodeVersion(process.version);
const npmProbe = spawnSync(npm, ['--version'], {cwd:root, timeout:4500,encoding:'utf8',
  shell: process.platform === 'win32'});
const npmOk = npmProbe.status === 0 && !npmProbe.error;
const workspacesOk = auditWorkspaceGraph(root).status === 'PASS';
const metadataOk = auditReleaseMetadata(root).status === 'PASS';
let lockfileOk = false;
try { lockfileOk = existsSync(resolve(root,'package-lock.json')) && validateRepositoryLock(root).length === 0; }
catch { /* Missing or invalid lockfile stays blocked */ }
const packages = [
  ['apps/web/package.json', 'next/package.json'],
  ['apps/web/package.json', 'react/package.json'],
  ['apps/api/package.json', '@nestjs/core/package.json'],
  ['apps/api/package.json', 'pg/package.json'],
  ['apps/api/package.json', 'typescript/package.json'],
];
const depsOk = packages.every(([origin, name]) => {
  try {
    const require = createRequire(resolve(root, origin));
    return Boolean(require.resolve(name));
  } catch { return false; }
});
const version = JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
const report = {project:'THIEN DO',version, ...assessReadiness({nodeOk,npmOk,workspacesOk,metadataOk,
  lockfileOk,depsOk})};
if (process.argv.includes('--json')) console.log(JSON.stringify(report,null,2));
else {
  console.log(`THIEN DO V${version} — SAFE OFFLINE READINESS CHECK`);
  for (const step of report.steps) console.log(`[${step.status}] ${step.id}${step.action?' — '+step.action:''}`);
  console.log(`Verdict: ${report.verdict}\n${report.scope}`);
  if (report.verdict !== 'PREREQUISITES_PRESENT')
    console.log('After unblocking, run npm run typecheck, npm run build and E2E ONLY against a dedicated disposable database.');
  else console.log('Prerequisites detected, but NO build/E2E passed yet. Run npm run diagnose:install-build.');
}
if (report.verdict !== 'PREREQUISITES_PRESENT') process.exitCode = 2;
