/**
 * THIEN DO build diagnostics. Without --install runs read-only npm/source checks.
 * With --install may install dependencies, run TypeScript and compile apps; never database
 * migrations, server startup or destructive E2E. No .env contents collected.
 * Usage: node infrastructure/scripts/diagnose-build.mjs [--install]
 * Exit: 0 = local build verified, 2 = blocked/failed; 1 = internal error.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { redactDiagnostic, classifyCheck, chooseInstallStrategy, isSupportedNodeVersion } from './diagnose-build-lib.mjs';
import { validateRepositoryLock } from './validate-lockfile.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const releaseVersion = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const reports = resolve(root, 'docs/reports');
const installRequested = process.argv.includes('--install');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync(reports, { recursive: true });
const base = `build-diagnostics-${timestamp}`;
const results = [];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
// Network installs need a generous default; allow a SHORTER timeout when diagnosing broken DNS.
const requestedTimeout = Number(process.env.THIENDO_INSTALL_TIMEOUT_MS);
const installTimeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout >= 5000 && requestedTimeout <= 600000 ? requestedTimeout : 180000;

function check(name, fileTag, command, args, timeoutMs=120000, acceptOutput=()=>true) {
  console.log(`Checking ${name}...`);
  // npm.cmd needs Windows cmd shell; args are fixed trusted strings.
  const result = spawnSync(command, args, {
    cwd: root, env: process.env, shell: process.platform === 'win32' && command === npm,
    encoding: 'utf8', timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024,
  });
  const code = result.error ? (result.error.code || result.error.message) : result.status;
  const text = redactDiagnostic([result.stdout || '', result.stderr || '', result.error?.message || ''].join('\n'));
  const logName = `${base}-${fileTag}.log`;
  writeFileSync(resolve(reports, logName), text, 'utf8');
  const status = classifyCheck(null, result.status === 0 && !result.error && acceptOutput(result.stdout || '') ? 0 : 1);
  results.push({ name, status, exitCode: code, log: logName });
  console.log(`  [${status}] ${name} (${logName})`);
  return status === 'PASS';
}
function skip(name, reason) {
  results.push({name, status:'SKIPPED', reason });
  console.log(`  [SKIPPED] ${name}: ${reason}`);
}
function save() {
  const required = ['Node.js version','npm version','Source syntax/imports','Unit and regression tests',
    'Verified npm lockfile','Reproducible npm ci','TypeScript typecheck','Next.js and NestJS build'];
  const passes = new Set(results.filter(x=>x.status === 'PASS').map(x=>x.name));
  const pass = required.every(x=>passes.has(x));
  const report = {
    project:'THIEN DO', source:`V${releaseVersion} Build Diagnostics`, generated:new Date().toISOString(),
    installationAttempted:installRequested,
    verdict:pass?'BUILD_VERIFIED':'BLOCKED',
    scope:'No PostgreSQL migration, HTTP E2E, production deploy or app-browser test performed.',
    steps:results,
    privacy:'Only command output is collected; no .env files are included. Review logs before sharing.',
  };
  const file = resolve(reports, `${base}.json`);
  writeFileSync(file, JSON.stringify(report,null,2)+'\n');
  console.log(`\nRESULT: ${report.verdict}`);
  console.log(`Report: ${file}`);
  console.log('Logs:   '+reports);
  console.log('Send the JSON report and relevant failing .log file after checking for secrets.');
  process.exitCode=pass?0:2;
}
try {
  const nodeOk = check('Node.js version','node',process.execPath,['--version'],12000, isSupportedNodeVersion);
  const npmOk = check('npm version','npm-version',npm,['--version'],12000);
  // Prefer exact lockfile installs. A valid lockfile does NOT require an
  // existing node_modules directory; npm ci creates it from scratch.
  // Validate locally before deciding whether registry resolution is necessary.
  let validExistingLock = false;
  try { validExistingLock = validateRepositoryLock().length === 0; } catch { /* absent lock */ }
  const strategy = chooseInstallStrategy({
    installRequested, npmAvailable: npmOk,
    lockfileValid: validExistingLock,
    hasNodeModules: existsSync(resolve(root, 'node_modules')),
  });
  let registryBlocked = false;
  if (strategy === 'GENERATE_LOCK') {
    const registryOk = check('npm registry connectivity','npm-registry',process.execPath,
      ['infrastructure/scripts/registry-preflight.mjs'],12000);
    if (registryOk) check('npm install from registry','npm-install',npm,
      ['install','--no-audit','--no-fund','--fetch-retries=0','--fetch-timeout=15000'],installTimeoutMs);
    else {
      registryBlocked = true;
      skip('npm install from registry', 'Registry check failed. Do not modify dependencies; fix DNS/network or use private GitHub Actions.');
    }
  } else {
    skip('npm install from registry', !npmOk ? 'npm is unavailable' : validExistingLock
      ? 'Valid existing lockfile: prefer exact npm ci over resolving new versions'
      : 'Use --install to generate a real lockfile from npm registry');
  }
  const sourceOk = check('Source syntax/imports','source',process.execPath,
    ['infrastructure/scripts/check-source.mjs'],80000);
  // Fail fast on a confirmed npm connectivity blocker instead of waiting for
  // the unrelated 201-year legacy regression suite; offline tests stay available.
  if (registryBlocked) skip('Unit and regression tests',
    'Network prerequisite blocked this install-build attempt. Run npm test separately for source-only evidence.');
  else check('Unit and regression tests','tests',npm,['test'],150000);
  const lockOk = check('Verified npm lockfile','lockfile',process.execPath,
    ['infrastructure/scripts/validate-lockfile.mjs'],15000);
  // Never mutate node_modules in diagnostic-only mode. An existing folder
  // does NOT authorize npm ci; explicit --install is required.
  const ciOk = npmOk && lockOk && installRequested
    ? check('Reproducible npm ci','npm-ci',npm,
      ['ci','--no-audit','--no-fund','--fetch-retries=0','--fetch-timeout=20000'],installTimeoutMs)
    : (skip('Reproducible npm ci',
        !lockOk ? 'Requires a real, validated npm package-lock.json' :
        !npmOk ? 'npm is unavailable' :
        'Run with --install to authorize npm ci from a validated lockfile'), false);
  if (ciOk) {
    check('TypeScript typecheck','typecheck',npm,['run','typecheck'],180000);
    check('Next.js and NestJS build','build',npm,['run','build'],240000);
  } else {
    skip('TypeScript typecheck','No verified npm ci installation');
    skip('Next.js and NestJS build','No verified npm ci installation');
  }
  save();
} catch(error) {
  results.push({name:'Diagnostic runner',status:'FAIL',reason:redactDiagnostic(error?.message||error)});
  save();
}
