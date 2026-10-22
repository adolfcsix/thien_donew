/** V11.82: use workspace TypeScript first; source-only CI can fall back to global. */
'use strict';
const path = require('node:path');
const {execFileSync} = require('node:child_process');
try { module.exports = require('typescript'); }
catch {
  try {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const root = execFileSync(command, ['root', '-g'], {encoding:'utf8'}).trim();
    module.exports = require(path.join(root, 'typescript'));
  } catch {
    throw new Error('Thiên Đồ tests require TypeScript: install workspace dependencies (npm ci), or install TypeScript globally for source-only checks.');
  }
}
