/**
 * V11.82: read-only validation of every JSON dataset/configuration in runtime source.
 * No npm install, writes, network access or database connection.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {resolve, relative, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_DIRS = ['apps', 'packages', 'infrastructure', 'docs', 'tests/fixtures'];
const IGNORED_DIRS = new Set(['node_modules', '.next', 'dist', 'build', '.git']);

export function auditJsonDatasets(root = ROOT, sourceDirs = SOURCE_DIRS) {
  const errors = [];
  const files = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const filename = relative(root, absolute).replaceAll('\\', '/');
        files.push(filename);
        try { JSON.parse(readFileSync(absolute, 'utf8')); }
        catch (error) { errors.push(`${filename}: ${error.message}`); }
      }
    }
  }
  for (const directory of sourceDirs) {
    try { walk(resolve(root, directory)); }
    catch (error) { errors.push(`${directory}: ${error.message}`); }
  }
  files.sort();
  return {status: errors.length === 0 && files.length > 0 ? 'PASS' : 'FAIL', scanned: files.length, files, errors};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = auditJsonDatasets();
  console.log(`JSON data integrity: ${report.scanned} files, ${report.errors.length} invalid; ${report.status}`);
  for (const error of report.errors) console.error(`FAIL ${error}`);
  if (report.status !== 'PASS') process.exitCode = 1;
}
