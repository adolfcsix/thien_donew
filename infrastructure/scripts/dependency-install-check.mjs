/** Read-only, offline verification of the actual npm installation.
 * A node_modules directory alone is NOT proof that a workspace can start.
 * No package install, npm registry access, database connection or secrets.
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export const REQUIRED_PACKAGES = Object.freeze([
  { owner: '.', name: 'concurrently' },
  { owner: 'apps/web', name: 'next' },
  { owner: 'apps/web', name: 'react' },
  { owner: 'apps/web', name: 'react-dom' },
  { owner: 'apps/web', name: '@thiendo/astrology-engine' },
  { owner: 'apps/web', name: '@thiendo/shared-types' },
  { owner: 'apps/web', name: '@thiendo/chart-export' },
  { owner: 'apps/web', name: '@thiendo/good-days-export' },
  { owner: 'apps/web', name: '@thiendo/knowledge' },
  { owner: 'apps/web', name: '@thiendo/interpretation' },
  { owner: 'apps/api', name: '@nestjs/core' },
  { owner: 'apps/api', name: '@nestjs/common' },
  { owner: 'apps/api', name: '@nestjs/platform-express' },
  { owner: 'apps/api', name: '@nestjs/cli' },
  { owner: 'apps/api', name: 'pg' },
  { owner: 'apps/api', name: '@thiendo/astrology-engine' },
  { owner: 'apps/api', name: '@thiendo/shared-types' },
  { owner: 'apps/api', name: 'typescript' },
  { owner: 'apps/web', name: 'typescript' },
]);
export const REQUIRED_COMMANDS = Object.freeze([
  {owner: '.', name: 'concurrently'},
  {owner: 'apps/web', name: 'next'},
  {owner: 'apps/api', name: 'nest'},
  {owner: 'apps/api', name: 'tsc'},
  {owner: 'apps/web', name: 'tsc'},
]);

export function inspectDependencyInstallation(projectRoot = root, {
  packages = REQUIRED_PACKAGES, commands = REQUIRED_COMMANDS,
  platform = process.platform,
} = {}) {
  const problems = [];
  for (const { owner, name } of packages) {
    try {
      const require = createRequire(resolve(projectRoot, owner, 'package.json'));
      const packagePath = require.resolve(name + '/package.json');
      if (!existsSync(packagePath)) throw new Error('package metadata vanished');
    } catch {
      problems.push(`${owner}: ${name} is missing or cannot be resolved`);
    }
  }
  for (const {owner, name} of commands) {
    const extension = platform === 'win32' ? '.cmd' : '';
    const file = name + extension;
    const candidates = [resolve(projectRoot, owner, 'node_modules/.bin', file), resolve(projectRoot, 'node_modules/.bin', file)];
    if (!candidates.some(candidate => existsSync(candidate))) {
      problems.push(`${owner}: ${file} executable is missing`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = inspectDependencyInstallation();
  if (problems.length) {
    console.error('[BLOCKED] npm install is incomplete; missing required modules or CLIs:');
    for (const item of problems) console.error(' - ' + item);
    console.error('Fix: run PREPARE_LOCKFILE_WINDOWS.bat or npm ci on a machine with npm registry access.');
    process.exitCode = 2;
  } else {
    console.log('PASS: required frontend/backend packages and executables are present. This is NOT a typecheck/build proof.');
  }
}
