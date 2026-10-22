'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {pathToFileURL}=require('node:url');
let modulePromise=import(pathToFileURL(path.join(root,'infrastructure/scripts/audit-stability-v11150.mjs')).href);
test('V11.150 whole-source non-destructive release gate is source-scoped',async()=>{
 const {auditAll}=await modulePromise;
 const result=auditAll(root);
 assert.equal(result.verdict,'PASS',result.errors.join('\n'));
 assert.equal(result.scope,'SOURCE_ONLY');
 assert.ok(result.notProven.includes('native PostgreSQL'));
 assert.ok(result.notProven.includes('payOS webhook/settlement'));
});
test('V11.150 migration baseline has 18 checksums and no numbered holes',async()=>{
 const {auditMigrations}=await modulePromise;
 const result=auditMigrations(root);
 assert.equal(result.pass,true,result.errors.join('\n'));
 assert.equal(result.baselineFiles,18);
 assert.ok(result.files>=18);
});
test('V11.150 migration audit rejects changed SQL and removed migrations',async()=>{
 const {auditMigrations}=await modulePromise;
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-150-audit-'));
 try {
  const original=path.join(root,'infrastructure/db/baselines/migrations-001-018.json');
  fs.mkdirSync(path.join(temp,'infrastructure/db/baselines'),{recursive:true});
  fs.mkdirSync(path.join(temp,'infrastructure/db'),{recursive:true});
  fs.copyFileSync(original,path.join(temp,'infrastructure/db/baselines/migrations-001-018.json'));
  for(const file of fs.readdirSync(path.join(root,'infrastructure/db')).filter(x=>x.endsWith('.sql')))
    fs.copyFileSync(path.join(root,'infrastructure/db',file),path.join(temp,'infrastructure/db',file));
  assert.equal(auditMigrations(temp).pass,true);
  const first=path.join(temp,'infrastructure/db/001_core.sql');
  fs.appendFileSync(first,'\n-- unauthorized mutation\n');
  assert.match(auditMigrations(temp).errors.join(' '),/001_core.sql: immutable migration was modified/);
  fs.copyFileSync(path.join(root,'infrastructure/db/001_core.sql'),first);
  fs.rmSync(path.join(temp,'infrastructure/db/018_operational_query_indexes.sql'));
  assert.equal(auditMigrations(temp).pass,false);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('V11.150 migration runner bounds PostgreSQL connection and advisory-lock waits',()=>{
 const code=fs.readFileSync(path.join(root,'infrastructure/scripts/migrate.mjs'),'utf8');
 assert.match(code,/connectionTimeoutMillis: 10_000/);
 assert.match(code,/SET statement_timeout = '30s'/);
 assert.match(code,/RESET statement_timeout/);
 assert.match(code,/pg_advisory_unlock/);
 assert.match(code,/checksum/);
});
test('V11.150 migration runner rejects duplicate sequence numbers before connecting',()=>{
 const code=fs.readFileSync(path.join(root,'infrastructure/scripts/migrate.mjs'),'utf8');
 const verifier=fs.readFileSync(path.join(root,'infrastructure/scripts/lib/migration-chain-integrity.mjs'),'utf8');
 assert.match(code,/verifyMigrationChain\(dir,defaultBaselinePath\)/);
 assert.ok(code.indexOf('verifyMigrationChain(dir,defaultBaselinePath)') < code.indexOf('await db.connect()'));
 assert.match(verifier,/SQL migration chain incomplete or duplicate/);
 assert.match(verifier,/Immutable SQL migration was modified/);
});
