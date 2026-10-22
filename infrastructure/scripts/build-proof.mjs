/**
 * V11.100: transparent, commit-bound CI completion receipt. This receipt
 * is a report, NOT a cryptographic signature or production certification.
 * The GitHub workflow writes it only AFTER strict npm ci + TypeScript + build
 * + migrated disposable PostgreSQL + HTTP E2E steps have succeeded.
 * Only trust a receipt downloaded from a matching GitHub Actions run.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const shaPattern = /^[0-9a-f]{40}$/i;
const runPattern = /^[1-9][0-9]*$/;
export function verifyBuildProof(proof, { sha, runId, version } = {}) {
  const errors = [];
  if (!proof || proof.schema !== 'thien-do/build-proof/v1') errors.push('Unknown build-proof schema');
  if (!shaPattern.test(sha || '') || proof?.commitSha !== sha?.toLowerCase()) errors.push('Git commit SHA mismatch');
  if (!runPattern.test(String(runId ?? '')) || proof?.runId !== String(runId)) errors.push('GitHub run ID mismatch');
  if (typeof version !== 'string' || proof?.version !== version) errors.push('Release version mismatch');
  if (proof?.scope !== 'CI_TEST_ONLY' || proof?.status !== 'FULLSTACK_CHECKS_PASSED') errors.push('Missing fullstack test status');
  const names = ['npm-ci', 'source-regression', 'typescript', 'next-nest-build', 'disposable-postgresql', 'http-e2e'];
  if (!names.every(name => proof?.checks?.[name] === 'PASS') || Object.keys(proof?.checks ?? {}).length !== names.length)
    errors.push('Incomplete build/E2E check manifest');
  if (proof?.productionReady !== false) errors.push('CI receipt must not claim production readiness');
  return errors;
}
export function createCiBuildProof(env = process.env, version) {
  if (env.GITHUB_ACTIONS !== 'true' || !shaPattern.test(env.GITHUB_SHA || '') || !runPattern.test(env.GITHUB_RUN_ID || ''))
    throw Error('CI proof generation requires GitHub Actions commit SHA and run ID');
  if (env.GITHUB_WORKFLOW_REF && !env.GITHUB_WORKFLOW_REF.includes('bootstrap-lockfile.yml@'))
    throw Error('Unexpected workflow. Proof generation is for bootstrap-lockfile.yml only');
  return {
    schema: 'thien-do/build-proof/v1', version, commitSha: env.GITHUB_SHA.toLowerCase(), runId: env.GITHUB_RUN_ID,
    status: 'FULLSTACK_CHECKS_PASSED', scope: 'CI_TEST_ONLY', productionReady: false,
    checks: Object.fromEntries(['npm-ci', 'source-regression', 'typescript', 'next-nest-build',
      'disposable-postgresql', 'http-e2e'].map(name => [name, 'PASS'])),
    caveat: 'Created only after all strict GitHub job steps passed; no real-world production, browser, security or metaphysics certification.',
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    if (process.argv.includes('--write')) {
      const index = process.argv.indexOf('--write');
      const file = resolve(process.argv[index + 1] || '');
      if (!file.startsWith(resolve(ROOT, 'docs/reports') + '/')) throw Error('Write CI proof only under docs/reports/');
      const proof = createCiBuildProof(process.env, pkg.version);
      writeFileSync(file, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log('CI completion receipt written (not a production certificate).');
    } else if (process.argv.includes('--verify')) {
      const index = process.argv.indexOf('--verify');
      const file = process.argv[index + 1];
      const shaIndex = process.argv.indexOf('--sha');
      const runIndex = process.argv.indexOf('--run-id');
      if (!file || shaIndex < 0 || runIndex < 0) throw Error('Usage: --verify FILE --sha SHA --run-id ID');
      const proof = JSON.parse(readFileSync(resolve(file), 'utf8'));
      const errors = verifyBuildProof(proof, { sha: process.argv[shaIndex + 1], runId: process.argv[runIndex + 1], version: pkg.version });
      if (errors.length) throw Error(errors.join(' | '));
      console.log('PASS: CI proof fields match this version, commit and run. Confirm artifact origin in GitHub UI.');
    } else throw Error('Usage: --write docs/reports/FILE | --verify FILE --sha SHA --run-id ID');
  } catch (error) { console.error(`BLOCKED: ${error.message}`); process.exitCode = 2; }
}
