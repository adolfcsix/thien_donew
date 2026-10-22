/**
 * V11.100: fail-closed handoff of a REAL npm-generated lockfile.
 * Preview by default. --apply installs a validated candidate only when the
 * repository has no lockfile; never silently overwrites an existing lock.
 * This is a file transfer, NOT npm ci, dependency verification or a build.
 */
import { readFileSync, lstatSync, existsSync, writeFileSync, linkSync, unlinkSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { validateLockFile } from './validate-lockfile.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function assessLockCandidate(candidate, root = ROOT) {
  if (typeof candidate !== 'string' || !candidate.trim()) throw Error('Specify --candidate <file>');
  const path = resolve(candidate);
  if (basename(path) !== 'package-lock.json') throw Error('Candidate filename must be package-lock.json');
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Candidate must be a regular, non-symlink file');
  const bytes = readFileSync(path);
  if (bytes.length === 0 || bytes.length > 15_000_000) throw Error('Candidate lockfile has implausible size');
  const errors = validateLockFile(path, root);
  if (errors.length) throw Error('Invalid candidate: ' + errors.join(' | '));
  const target = resolve(root, 'package-lock.json');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (existsSync(target)) {
    const existing = lstatSync(target);
    if (!existing.isFile() || existing.isSymbolicLink()) throw Error('Destination is not a regular lockfile');
    const existingHash = createHash('sha256').update(readFileSync(target)).digest('hex');
    if (existingHash !== sha256) throw Error('Existing project lockfile is different: REFUSING to overwrite');
    return { status: 'UNCHANGED', sha256, bytes: bytes.length, target, message: 'Matching lockfile already exists' };
  }
  return { status: 'READY', sha256, bytes: bytes.length, target, message: 'Valid candidate; npm ci/build have NOT run' };
}
export function importLockCandidate(candidate, root = ROOT, { apply = false } = {}) {
  const assessment = assessLockCandidate(candidate, root);
  if (!apply || assessment.status === 'UNCHANGED') return { ...assessment, applied: false };
  // Write a random, exclusive temporary file. Hard-link publication is an
  // atomic create-if-absent on the same volume: it NEVER replaces a file that
  // another process created between preview and apply.
  const temp = resolve(root, `.package-lock-${process.pid}-${randomBytes(8).toString('hex')}.tmp`);
  const contents = readFileSync(resolve(candidate));
  try {
    writeFileSync(temp, contents, { flag: 'wx', mode: 0o600 });
    // Cross-check after copying, rather than trusting the earlier candidate
    // read (which could have changed in the meantime).
    const errors = validateLockFile(temp, root);
    if (errors.length) throw Error('Candidate changed during import: ' + errors.join(' | '));
    const copiedHash = createHash('sha256').update(readFileSync(temp)).digest('hex');
    if (copiedHash !== assessment.sha256) throw Error('Candidate changed during import; refusing publication');
    linkSync(temp, assessment.target);
  } catch (error) {
    if (error.code === 'EEXIST') throw Error('Another process created package-lock.json; refusing to overwrite');
    throw error;
  } finally {
    try { unlinkSync(temp); } catch { /* clean-up attempt */ }
  }
  return { ...assessment, status: 'IMPORTED', applied: true, message: 'Lockfile transferred; run npm ci/typecheck/build to verify' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const index = process.argv.indexOf('--candidate');
    const candidate = index >= 0 ? process.argv[index + 1] : null;
    if (process.argv.some(arg => arg.startsWith('--') && !['--candidate', '--apply', '--json'].includes(arg)))
      throw Error('Usage: node import-lockfile.mjs --candidate PATH [--apply] [--json]');
    const result = importLockCandidate(candidate, ROOT, { apply: process.argv.includes('--apply') });
    if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
    else console.log(`${result.status}: ${result.message}; SHA-256 ${result.sha256}`);
  } catch (error) { console.error(`BLOCKED: ${error.message}`); process.exitCode = 2; }
}
