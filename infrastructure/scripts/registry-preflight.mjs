/**
 * THIEN DO read-only npm registry reachability check.
 * No install, no package-lock or node_modules changes, no credentials printed.
 * 0 = reachable, 2 = unavailable; the result is NOT build verification.
 */
import { spawnSync } from 'node:child_process';
import { interpretRegistryProbe } from './registry-health.mjs';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawnSync(npm, ['ping', '--fetch-retries=0', '--fetch-timeout=4500'], {
  encoding:'utf8', timeout:9000, maxBuffer: 256 * 1024,
  shell: process.platform === 'win32',
});
const result = interpretRegistryProbe({
  status: child.status,
  errorCode: child.error?.code || '',
  output: `${child.stdout || ''}\n${child.stderr || ''}\n${child.error?.message || ''}`,
});
const report = {
  name: 'THIEN_DO_NPM_REGISTRY_PREFLIGHT',
  status:result.status,
  category:result.category,
  action:result.action,
  scope:'Read-only registry connectivity; no package install, TypeScript check or Next/Nest build was performed.',
};
if (process.argv.includes('--json')) console.log(JSON.stringify(report,null,2));
else {
  console.log(`[${report.status}] npm registry: ${report.category}`);
  console.log(report.action);
  console.log(report.scope);
  if (report.status !== 'PASS') {
    console.log('Offline source testing still works: npm run check:release:source');
    console.log('Alternative for full build: GitHub Actions / bootstrap-lockfile.yml in a PRIVATE repository.');
  }
}
process.exitCode = report.status === 'PASS' ? 0 : 2;
