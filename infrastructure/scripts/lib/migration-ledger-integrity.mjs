/** Fail-closed comparison of the PostgreSQL schema_migrations ledger against
 * checked-in SQL migration files. Pure module: no database writes or connections.
 * Used by the migration runner (contiguous prefix) and E2E guard (complete).
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

export function expectedMigrationLedger(directory, files) {
  if (!Array.isArray(files) || !files.length) throw new Error('Migration manifest must not be empty');
  return files.map(name => ({name, checksum:createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')}));
}

export function assertMigrationLedger(expected, actual, {requireComplete=false}={}) {
  if (!Array.isArray(expected) || !expected.length || !Array.isArray(actual))
    throw new Error('Missing migration manifest or database ledger');
  const names = new Set();
  for (let i=0;i<expected.length;i++) {
    const entry=expected[i];
    if (!entry || typeof entry.name!=='string' || !/^[a-f0-9]{64}$/.test(entry.checksum) || names.has(entry.name))
      throw new Error('Invalid or duplicated expected SQL migration');
    names.add(entry.name);
  }
  if (actual.length>expected.length) throw new Error('Database contains unknown migration ledger entries');
  for (let i=0;i<actual.length;i++) {
    const row=actual[i];
    if (!row || row.name!==expected[i].name)
      throw new Error(`Database migration history is not a contiguous prefix at #${i+1}: ${row?.name??'(missing)'}`);
    if (row.checksum!==expected[i].checksum)
      throw new Error(`Database migration checksum mismatch: ${row.name}`);
  }
  if (requireComplete && actual.length!==expected.length)
    throw new Error(`Database schema migrations incomplete: ${actual.length}/${expected.length}`);
  return {checked:actual.length,expected:expected.length,complete:actual.length===expected.length};
}
