'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('collection unmounts private view when account identity changes',()=>{
 const s=read('apps/web/src/app/collection/page.tsx');assert.match(s,/CollectionForUser key=\{user.id\}/);assert.match(s,/listRequest\.current\?\.abort\(\)/);assert.match(s,/detailRequest\.current\?\.abort\(\)/);
});
test('API supports cancellation and no-cache private responses',()=>{
 const s=read('apps/web/src/lib/api.ts');assert.match(s,/signal: timeout\?\.signal \?\? options\.signal/);assert.match(s,/cache: 'no-store'/);
});
test('Postgres migrations have ledger, checksums and transaction locking',()=>{
 const s=read('infrastructure/scripts/migrate.mjs');assert.match(s,/schema_migrations/);assert.match(s,/pg_advisory_lock/);assert.match(s,/checksum/);assert.match(s,/ROLLBACK/);
});
test('readiness checks database connectivity and required migrated schema',()=>{
 const s=read('apps/api/src/modules/health/health.controller.ts');assert.match(s,/to_regclass/);assert.match(s,/information_schema/);assert.match(s,/ServiceUnavailableException/);
});
test('V8.1 offers PostgreSQL integration test in CI',()=>{const s=read('.github/workflows/ci.yml');assert.match(s,/postgres:16-alpine/);assert.match(s,/run-ci-http\.sh/);assert.match(read('infrastructure/scripts/run-ci-http.sh'),/api-postgres-e2e\.test\.mjs/);});
test('migration script does not bundle actual V7 private data',()=>{assert.equal(fs.existsSync(path.join(root,'tests/compat/data/thiendo.sqlite')),false)});

test('SQLite importer defaults to dry-run and omits sessions',()=>{const s=read('infrastructure/scripts/import-v7-sqlite.mjs');assert.match(s,/if \(!apply\)/);assert.match(s,/BEGIN/);assert.match(s,/ROLLBACK/);assert.doesNotMatch(s,/INSERT INTO sessions/);});

test('chart save cap is checked inside per-user transaction lock',()=>{const s=read('apps/api/src/modules/charts/charts.service.ts');assert.match(s,/db.transaction/);assert.match(s,/pg_advisory_xact_lock/);});
