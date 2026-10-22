/**
 * V11.101 read-only local runtime diagnostic. No install, migration, DB write or E2E.
 * Run: node --env-file-if-exists=.env infrastructure/scripts/local-runtime-doctor.mjs [--smoke] [--json]
 * --smoke performs GET requests exclusively to loopback origins, never production.
 */
import { Socket } from 'node:net';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { localOrigin, localPostgresTarget, classifyHttpHealth, isReadyResponse } from './local-runtime-doctor-lib.mjs';
import { validateRepositoryLock } from './validate-lockfile.mjs';
import { isSupportedNodeVersion } from './diagnose-build-lib.mjs';
import { inspectDependencyInstallation } from './dependency-install-check.mjs';
import { canBindLoopback } from './local-port-check.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const env = process.env;
const report = { project: 'THIEN DO', version: JSON.parse(readFileSync(resolve(ROOT,'package.json'),'utf8')).version,
  mode: process.argv.includes('--smoke') ? 'local-readonly-http-smoke' : 'offline-runtime-prerequisites',
  status: 'BLOCKED', checks: [],
  warning: 'No npm ci, typecheck, production browser E2E, DB migration, or DB authentication verified.' };
function check(id, status, action) { report.checks.push({ id, status, action }); }
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const ver = spawnSync(npm, ['--version'], { timeout: 3500, encoding: 'utf8', shell: process.platform === 'win32' });
check('node', isSupportedNodeVersion(process.version) ? 'PASS' : 'BLOCKED', 'Requires Node >=22.13.0');
check('npm', ver.status === 0 && !ver.error ? 'PASS' : 'BLOCKED', 'Install npm with Node.js');
check('env-file', existsSync(resolve(ROOT,'.env')) ? 'PASS' : 'BLOCKED', 'Copy .env.example to .env and set a dedicated development DATABASE_URL');
const preflight = spawnSync(process.execPath, ['infrastructure/scripts/preflight.mjs'], {
  cwd:ROOT, env, timeout:5000,encoding:'utf8',maxBuffer:128*1024,
});
check('config-preflight',preflight.status===0 && !preflight.error ? 'PASS' : 'BLOCKED',
  'Validate PostgreSQL URL scheme, API port/host, WEB_ORIGIN and production cookie/TLS; use npm run check:preflight to see detail');
let lock = false;
try { lock = existsSync(resolve(ROOT,'package-lock.json')) && validateRepositoryLock(ROOT).length === 0; } catch {}
check('lockfile', lock ? 'PASS' : 'BLOCKED', 'Generate a real package-lock.json via npm registry or private GitHub CI');
const missing = inspectDependencyInstallation(ROOT);
check('dependencies', missing.length === 0 ? 'PASS' : 'BLOCKED',
  missing.length === 0 ? 'Required Next, Nest, PostgreSQL, TypeScript and npm CLIs resolve' :
    'Incomplete npm install (' + missing.join('; ') + '); run npm ci before starting');
if (env.NODE_ENV === 'production' && !process.argv.includes('--smoke')) {
  check('dev-mode', 'BLOCKED', 'Do not run the local development launcher with NODE_ENV=production');
}
// Only probe a local TCP socket. This does not establish DB identity or credentials.
async function tcp(host, port) {
  return await new Promise(done => {
    const socket = new Socket(); let settled = false;
    const finish = value => { if (settled) return; settled=true; socket.destroy(); done(value); };
    socket.setTimeout(900); socket.once('error',()=>finish(false)); socket.once('timeout',()=>finish(false));
    socket.connect(port, host, ()=>finish(true));
  });
}
if (!process.argv.includes('--smoke')) {
  const apiPort = Number(env.API_PORT || 8080), webPort = 3000;
  const apiFree = await canBindLoopback(apiPort);
  const webFree = apiPort === webPort ? false : await canBindLoopback(webPort);
  check('api-port-free', apiFree ? 'PASS' : 'BLOCKED',
    `Local API port ${apiPort} must be free before starting NestJS; stop other app instances`);
  check('web-port-free', webFree ? 'PASS' : 'BLOCKED',
    `Local Next.js port ${webPort} must be free before starting; stop other app instances`);
}
const db = localPostgresTarget(env.DATABASE_URL || '');
if (!db) check('database-tcp','BLOCKED','A local PostgreSQL DATABASE_URL is required; remote databases are not probed');
else check('database-tcp',await tcp(db.host,db.port)?'PASS':'BLOCKED','TCP only; does not authenticate or inspect database');
if (process.argv.includes('--smoke')) {
  const apiPort = Number(env.API_PORT || 8080);
  const api = localOrigin(env.API_INTERNAL_URL || `http://127.0.0.1:${apiPort}`);
  const web = localOrigin(env.WEB_ORIGIN || 'http://127.0.0.1:3000');
  const get = async (base, path, json = false) => {
    if (!base) return false;
    try {
      const response = await fetch(base + path, { method:'GET', redirect:'manual', signal:AbortSignal.timeout(1700) });
      if (!response.ok) return false;
      if (!json) { await response.body?.cancel(); return true; }
      const data = await response.json();
      return isReadyResponse(data);
    } catch { return false; }
  };
  if (!api || !web) {
    check('http-smoke','BLOCKED','Only HTTP(S) loopback URLs are permitted. Refusing nonlocal HTTP probes');
  } else {
    const [apiReady, webReady, proxiedReady] = await Promise.all([
      get(api,'/api/health/ready',true), get(web,'/'), get(web,'/api/health/ready',true),
    ]);
    const reason = classifyHttpHealth(apiReady, apiReady, webReady, proxiedReady);
    check('api-ready',apiReady?'PASS':'BLOCKED','GET /api/health/ready; includes PostgreSQL schema readiness');
    check('web-ready',webReady?'PASS':'BLOCKED','GET / through local Next.js');
    check('first-party-proxy',proxiedReady?'PASS':'BLOCKED','GET /api/health/ready through local Next.js');
    check('http-smoke',reason==='LOCAL_SMOKE_PASS'?'PASS':'BLOCKED',reason);
  }
}
report.status = report.checks.every(c=>c.status==='PASS') ? 'LOCAL_PREREQUISITES_PRESENT' : 'BLOCKED';
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`THIEN DO V${report.version} · ${report.mode}`);
  for (const step of report.checks) console.log(`[${step.status}] ${step.id} — ${step.action}`);
  console.log(`Verdict: ${report.status}`);
  console.log(report.warning);
}
process.exitCode=report.status==='BLOCKED'?2:0;
