/** Read-only release prerequisite policy. No network, installs, migrations or servers. */
export function assessReadiness(facts) {
  const steps = [];
  const add = (id, ok, action) => steps.push({ id, status: ok ? 'PASS' : 'BLOCKED', action: ok ? null : action });
  add('node', facts.nodeOk, 'Install Node.js 22.13 or newer.');
  add('npm', facts.npmOk, 'Install npm alongside Node.js.');
  add('workspaces', facts.workspacesOk, 'Run npm run audit:workspaces and repair local file: links.');
  add('metadata', facts.metadataOk, 'Run npm run audit:release-metadata and reconcile release versions.');
  add('lockfile', facts.lockfileOk, 'Generate a genuine package-lock.json with npm install --package-lock-only --ignore-scripts on a networked machine, validate it, and commit it.');
  add('dependencies', facts.depsOk, 'After committing a validated lockfile, run npm ci --no-audit --no-fund.');
  return {
    verdict: steps.every(x => x.status === 'PASS') ? 'PREREQUISITES_PRESENT' : 'BLOCKED',
    steps,
    scope: 'Read-only prerequisite inspection only; typecheck, Next/Nest build, PostgreSQL and browser E2E NOT RUN.',
    next: steps.filter(x => x.status === 'BLOCKED').map(x => x.action),
  };
}
