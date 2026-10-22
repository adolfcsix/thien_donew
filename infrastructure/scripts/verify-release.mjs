/**
 * V10.8 release gate. Offline --source tests syntax/config/unit behavior.
 * --full is intentionally fail-closed: it needs a real lockfile, installed
 * dependencies, a local disposable PostgreSQL database, and explicit consent.
 * All outputs describe evidence, not an unsupported 'production ready' claim.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { assertSafeE2ETarget } from './e2e-guard.mjs';
import {RUN_TIMEOUT_MS} from './lib/test-file-runner.mjs';
const TEST_RUNNER_TIMEOUT_MS=RUN_TIMEOUT_MS+30000;
import { smokeBeforeDestructiveE2E } from './release-http-policy.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const releaseVersion = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const withQimenBrowser=process.argv.includes('--qimen-browser');
const withBrowserAcceptance=process.argv.includes('--browser-acceptance');
const mode = process.argv.includes('--full') ? 'full' : process.argv.includes('--source') ? 'source' : null;
if (!mode) throw Error('Usage: node verify-release.mjs --source | --full');
const records = [];
const started = new Date().toISOString();
const nextPort = 3000; // Matches the explicitly configured @thiendo/web start script.
const node = process.execPath;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function record(name, status, detail) {
  records.push({ name, status, detail });
  console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ''}`);
}
function run(name, command, args, timeoutMs = 120000, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: root, env, encoding: 'utf8', timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024, shell: process.platform === 'win32' && command === npm,
  });
  if (result.status === 0 && !result.error) record(name, 'PASS', 'exit code 0');
  else record(name, 'FAIL', `exit=${result.status ?? 'none'} ${result.error?.code || ''} ${(result.stderr || result.stdout || '').slice(-260).trim().replace(/\s+/g, ' ')}`);
  return result.status === 0 && !result.error;
}
function verifyTestTarget() {
  try { return { error: null, target: assertSafeE2ETarget(process.env) }; }
  catch (error) { return { error: error.message, target: null }; }
}
/** Refuse to connect to another application already listening on either port. */
async function isPortFree(port) {
  return await new Promise(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}
function stopProcess(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    // npm launches nested processes; stop its entire detached process group.
    // Killing only npm can leave Nest/Next listening after the release gate exits.
    try { process.kill(-child.pid, 'SIGTERM'); }
    catch { try { child.kill('SIGTERM'); } catch { /* already exited */ } }
  }
}
function save() {
  const report = {
    project: 'THIEN DO', version: releaseVersion, mode, started,
    completed: new Date().toISOString(),
    verdict: records.every(item => item.status === 'PASS') ? 'PASS' : 'BLOCKED',
    checks: records,
    caveat: mode === 'source' ? 'Source-only tests; no Next/Nest build, PostgreSQL or HTTP E2E proof.' :
      'Full checks still need deployment, browser accessibility, security and independent domain review.',
  };
  const reportDir = process.env.THIENDO_RELEASE_REPORT_DIR || resolve(root, 'docs/reports');
  const out = resolve(reportDir, `release-v${releaseVersion.replaceAll('.', '_')}-${mode}-evidence.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(`Evidence: ${out}`);
  console.log(`Verdict: ${report.verdict} (${mode}); source PASS does not imply deployable.`);
  if (report.verdict !== 'PASS') process.exitCode = 1;
}
async function main() {
  if (mode === 'full') {
    const target = verifyTestTarget();
    const blockers = [
      ['Dedicated local E2E target', target.error],
      ['npm lockfile', existsSync(resolve(root, 'package-lock.json')) ? null : 'create using npm install, commit lockfile, use npm ci'],
    ];
    for (const [name, error] of blockers) record(name, error ? 'BLOCKED' : 'PASS', error || 'verified');
    for (const [name, port] of [['API port free', Number(process.env.API_PORT || 8080)], ['Next port free', nextPort]]) {
      const free = Number.isInteger(port) && port > 0 && port < 65536 && await isPortFree(port);
      record(name, free ? 'PASS' : 'BLOCKED', free ? `port ${port} is free` : `port ${port} is occupied or invalid`);
      if (!free) blockers.push([name, 'occupied']);
    }
    if (blockers.some(([, error]) => error)) { save(); return; }
    if (!run('Offline npm lockfile structure', node, ['infrastructure/scripts/validate-lockfile.mjs'])) { save(); return; }
    if (!run('Strict dependency installation', npm, ['ci','--no-audit','--no-fund'], 240000)) { save(); return; }
  }
  let ok = true;
  ok = run('Source syntax and imports', node, ['infrastructure/scripts/check-source.mjs'],240000) && ok;
  ok = run('JSON dataset parse integrity', node, ['infrastructure/scripts/audit-json-datasets.mjs']) && ok;
  ok = run('Deep Tử Vi reading and annual-layer integrity', node, ['infrastructure/scripts/audit-deep-reading.cjs','--write']) && ok;
  ok = run('Tarot 78-card depth, orientation/context and combination integrity', node, ['infrastructure/scripts/audit-tarot-depth.cjs','--write']) && ok;
  ok = run('Qimen center policies, nine layers and exhaustive 17280 clocks', node, ['infrastructure/scripts/audit-qimen-depth.cjs','--write']) && ok;
  ok = run('Luc Hao declared useful god, element roles, hidden references and 4096 movement patterns', node, ['infrastructure/scripts/audit-luc-hao-depth.cjs','--write']) && ok;
  ok = run('Mai Hoa five profiles, body-use/nuclear variants and evidence round-trip', node, ['infrastructure/scripts/audit-mai-hoa-depth.cjs','--write']) && ok;
  ok = run('Synastry and Composite method and geometric reproducibility', node, ['infrastructure/scripts/audit-relationship.cjs','--write']) && ok;
  ok = run('Western Natal reading knowledge and method reproducibility', node, ['infrastructure/scripts/audit-western-depth.cjs','--write']) && ok;
  ok = run('Complete twelve-palace vector inventory and visible reference audit', node, ['infrastructure/scripts/audit-complete-chart.cjs','--write']) && ok;
  ok = run('Tarot advanced layout/method/knowledge version reproducibility', node, ['infrastructure/scripts/audit-tarot-spreads.cjs','--write']) && ok;
  ok = run('Phase 2 school contracts and 144 Da Liu Ren plate cases', node, ['infrastructure/scripts/audit-phase2-methods.cjs']) && ok;
  ok = run('HKO middle-solar-term 2025-2027 audit and USNO independent seasons', node, ['infrastructure/scripts/audit-zhongqi-reference.cjs']) && ok;
  ok = run('V11.90 Da Liu Ren Four Lessons, partial Three Transmissions and 8640 combinations', node, ['infrastructure/scripts/audit-liuren-lessons.cjs']) && ok;
  ok = run('V11.91 Taiyi research annual counting and 9999-year cycle audit', node, ['infrastructure/scripts/audit-taiyi-annual.cjs']) && ok;
  ok = run('V11.92 Zi Wei four transformations / palace flights research audit', node, ['infrastructure/scripts/audit-tuvi-phihoa.cjs']) && ok;
  ok = run('V11.93 BaZi clock correction and boundary conventions research audit', node, ['infrastructure/scripts/audit-bazi-time-research.cjs']) && ok;
  ok = run('V11.94 BaZi 12 Jie reference and UTC pillar boundary audit', node, ['infrastructure/scripts/audit-bazi-jie-reference.cjs']) && ok;
  ok = run('V11.95 BaZi month-command Ten Gods and hidden-qi evidence audit', node, ['infrastructure/scripts/audit-bazi-season-evidence.cjs']) && ok;
  ok = run('V11.96 BaZi exposed-qi and branch grouping evidence gate', node, ['infrastructure/scripts/audit-bazi-pattern-evidence.cjs']) && ok;
  ok = run('V11.97 Luc Hao Fu Shen research audit', node, ['infrastructure/scripts/audit-luc-hao-hidden.cjs']) && ok;
  ok = run('V11.98 Luc Hao inquiry and day/month evidence gate', node, ['infrastructure/scripts/audit-luc-hao-question.cjs']) && ok;
  ok = run('V11.99 Luc Hao multiple useful-god / Jie comparison audit', node, ['infrastructure/scripts/audit-luc-hao-multiple-jie.cjs']) && ok;
  ok = run('V11.104 Mai Hoa Later Heaven object-direction-hour 768-case audit', node, ['infrastructure/scripts/audit-mai-hoa-later-heaven.cjs']) && ok;
  ok = run('V11.105 Qimen hour movement and Six Instrument striking 17280-case audit', node, ['infrastructure/scripts/audit-qimen-hour-signals.cjs']) && ok;
  ok = run('V11.100 reproducible-build GitHub handoff contracts', node, ['infrastructure/scripts/audit-build-handoff.cjs']) && ok;
  ok = run('V11.101 local runtime config and loopback smoke guards', node, ['infrastructure/scripts/audit-runtime-guards.mjs']) && ok;
  ok = run('Module ownership boundaries', node, ['infrastructure/scripts/audit-architecture.cjs']) && ok;
  ok = run('Legacy stylesheet fingerprint and import order', node, ['infrastructure/scripts/audit-css-baseline.cjs']) && ok;
  ok = run('CSS declaration reconstruction', node, ['infrastructure/scripts/audit-css-dedupe.cjs']) && ok;
  ok = run('Workspace dependency contract', node, ['infrastructure/scripts/workspace-contract.mjs']) && ok;
  ok = run('Release metadata synchronization', node, ['infrastructure/scripts/audit-release-metadata.mjs']) && ok;
  ok = run('V11.120 Tarot RWS 78-card and immutable spread source audit', node, ['infrastructure/scripts/audit-tarot-rws.cjs']) && ok;
  ok = run('V11.122 Zi Wei identity and natal/annual layer matrix', node, ['infrastructure/scripts/audit-star-system.cjs']) && ok;
  ok = run('Configuration preflight', node, ['infrastructure/scripts/preflight.mjs']) && ok;
  // Each regression file is run exactly once in its own process; fail closed on
  // any missing summary, stalled subprocess, skipped test or nonzero exit.
  // Avoid nested 175-file node:test runs which previously hung intermittently.
  ok = run('Node.js regression tests (per-file deadlines)', node, ['infrastructure/scripts/verify-test-shards.mjs'], TEST_RUNNER_TIMEOUT_MS) && ok;
  if (mode === 'source') { save(); return; }
  if (!ok) { save(); return; }
  for (const [name, args] of [
    ['Typecheck both apps', ['run', 'typecheck']],
    ['Build both apps', ['run', 'build']],
    ['Read-only pre-migration E2E database check', ['run', 'check:e2e-pre-migrate']],
    ['Migrate database', ['run', 'db:migrate']],
    ['Migration repeatability', ['run', 'db:migrate']],
    ['Verify live disposable E2E database is empty', ['run', 'check:e2e-db']],
  ]) {
    if (!run(name, npm, args, 240000)) { save(); return; }
  }
  // Both servers must run: test the same first-party /api rewrite used by real browsers.
  const api = spawn(npm, ['run', 'start', '-w', '@thiendo/api'], {
    cwd: root, env: process.env, stdio: 'ignore', shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
  });
  let next;
  try {
    if (!run('API readiness', node, ['tests/wait-for-api.mjs'], 75000, { ...process.env, API_BASE_URL: `http://127.0.0.1:${process.env.API_PORT || 8080}` })) { save(); return; }
    next = spawn(npm, ['run', 'start', '-w', '@thiendo/web'], {
      cwd: root, env: process.env, stdio: 'ignore', shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
    });
    if (!run('Next + API proxy readiness', node, ['tests/wait-for-next.mjs'], 80000)) { save(); return; }
    const nextBase = process.env.WEB_ORIGIN || 'http://localhost:3000';
    const env = { ...process.env, API_BASE_URL: nextBase, NEXT_BASE_URL: nextBase }; 
    // HTTP E2E writes data. Do NOT run it after a failed smoke check.
    // This is a deliberate safety boundary, not a best-effort test suite.
    if (!smokeBeforeDestructiveE2E(stage => stage === 'smoke'
      ? run('Real Next.js routes and first-party API proxy', node, ['tests/next-proxy-smoke.mjs'], 90000, env)
      : run('PostgreSQL HTTP E2E through Next proxy', node, ['--test', 'tests/api-postgres-e2e.test.mjs'], 120000, env))) { save(); return; }
    if(withQimenBrowser&&!run('Qimen real browser save/reopen with PostgreSQL',node,['tests/qimen-browser-smoke.mjs'],180000,env)){save();return;}
    if(withQimenBrowser&&!run('Qimen structural browser UI (anonymous auth stub only)',node,['tests/qimen-structural-browser-smoke.mjs'],150000,env)){save();return;}
    if(withQimenBrowser&&!run('Qimen question confirmation and evidence browser UI (anonymous auth stub only)',node,['tests/qimen-question-browser-smoke.mjs'],180000,env)){save();return;}
    if(withBrowserAcceptance&&!run('Responsive browser acceptance (account/storage HTTP fixtures)',node,['infrastructure/scripts/verify-browser-acceptance.mjs'],1200000,env)){save();return;}
  } finally {
    stopProcess(next);
    stopProcess(api);
  }
  save();
}
main().catch(error => { record('Release runner', 'FAIL', error.message); save(); });
