'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');
const load = () => import('../infrastructure/scripts/e2e-db-policy.mjs');
const fresh = {databaseName:'thiendo_test', tables:[]};
test('V11.44 accepts a truly fresh disposable test database', async () => {
  const {assertPreMigrationDatabaseState:check}=await load();
  assert.deepEqual(check('thiendo_test', fresh), {databaseName:'thiendo_test', checkedTables:0, checked:true});
});
test('V11.44 allows migration history but no application data',async()=>{
  const {assertPreMigrationDatabaseState:check}=await load();
  assert.equal(check('thiendo_test', {databaseName:'thiendo_test',tables:[
    {schema:'public',name:'schema_migrations',hasRows:true},{schema:'public',name:'users',hasRows:false},{schema:'public',name:'charts',hasRows:false}
  ]}).checkedTables,3);
});
test('V11.44 blocks existing accounts, charts and unknown app tables',async()=>{
  const {assertPreMigrationDatabaseState:check}=await load();
  for(const name of ['users','charts','orders','audit_events']){
    assert.throws(()=>check('thiendo_test',{...fresh,tables:[{schema:'public',name,hasRows:true}]}),/contains data/);
  }
});
test('V11.44 rejects wrong identity, malformed or repeated table observations',async()=>{
  const {assertPreMigrationDatabaseState:check}=await load();
  assert.throws(()=>check('production',fresh),/_test/);
  assert.throws(()=>check('thiendo_test',{...fresh,databaseName:'other_test'}),/identity/);
  assert.throws(()=>check('thiendo_test',{...fresh,tables:[{schema:'public',name:'users',hasRows:0}]}),/Invalid/);
  assert.throws(()=>check('thiendo_test',{...fresh,tables:[{schema:'public',name:'users',hasRows:false},{schema:'public',name:'users',hasRows:false}]}),/duplicated/);
  assert.throws(()=>check('thiendo_test',{...fresh,tables:[{schema:'private',name:'schema_migrations',hasRows:true}]}),/contains data/);
});
test('V11.44 runner only reads database; migrations appear AFTER read-only safety check',()=>{
  const code=read('infrastructure/scripts/check-e2e-before-migrate.mjs');
  assert.match(code,/READ ONLY/);
  assert.match(code,/assertSafeE2ETarget/);
  assert.doesNotMatch(code,/\b(?:INSERT|UPDATE|DELETE|CREATE TABLE|DROP TABLE|ALTER TABLE)\b/i);
  const runner=read('infrastructure/scripts/verify-release.mjs');
  assert.ok(runner.indexOf('Read-only pre-migration E2E database check') < runner.indexOf("['Migrate database',"));
  for(const workflow of ['.github/workflows/ci.yml','.github/workflows/bootstrap-lockfile.yml']){
    const config=read(workflow);
    assert.ok(config.indexOf('npm run check:e2e-pre-migrate') < config.indexOf('npm run db:migrate'));
  }
});
