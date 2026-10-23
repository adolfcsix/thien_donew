import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {verifyMigrationChain,defaultDbDir,defaultBaselinePath,defaultExtensionPath} from '../infrastructure/scripts/lib/migration-chain-integrity.mjs';

const proof=verifyMigrationChain(defaultDbDir,defaultBaselinePath);
test('Current migrations are contiguous and reviewed frozen SQL 001-018 is unchanged',()=>{
 assert.equal(proof.total,37);
 assert.equal(proof.frozen,37);
 assert.equal(proof.files[0],'001_core.sql');
 assert.equal(proof.files[29],'030_admin_insights.sql');assert.equal(proof.files[32],'033_community_experts_access.sql');assert.equal(proof.files[33],'034_admin_badge_showcase.sql');assert.equal(proof.files[34],'035_admin_trusted_devices.sql');assert.equal(proof.files.at(-1),'037_lifetime_pro_entitlements.sql');
});
function withFixture(work){const dir=mkdtempSync(join(tmpdir(),'thiendo-migrations-'));
 const sqlDir=join(dir,'db');mkdirSync(sqlDir);
 try{
  for(const f of proof.files)copyFileSync(join(defaultDbDir,f),join(sqlDir,f));
  const baseline=join(dir,'baseline.json');copyFileSync(defaultBaselinePath,baseline);
  const extension=join(dir,'extension.json');copyFileSync(defaultExtensionPath,extension);
  work({sqlDir,baseline,extension,files:proof.files});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('Refuse omitted middle migration instead of silently migrating past it',()=>withFixture(({sqlDir,baseline,extension})=>{
 rmSync(join(sqlDir,'020_huyen_giai_ai.sql'));
 assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/incomplete or duplicate/);
}));
test('Refuse duplicate sequence even with different file names',()=>withFixture(({sqlDir,baseline,extension})=>{
 writeFileSync(join(sqlDir,'027_alternative.sql'),'SELECT 1;\n');
 assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/incomplete or duplicate/);
}));
test('Refuse mutation of frozen migration SQL',()=>withFixture(({sqlDir,baseline,extension})=>{
 writeFileSync(join(sqlDir,'009_tarot_rws_study.sql'),readFileSync(join(sqlDir,'009_tarot_rws_study.sql'),'utf8')+'\n-- edited\n');
 assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/was modified/);
}));
test('Refuse missing frozen baseline',()=>withFixture(({sqlDir,baseline,extension})=>{
 rmSync(baseline);assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/Missing or invalid frozen/);
}));
test('Allow a properly numbered future migration without changing old ones',()=>withFixture(({sqlDir,baseline,extension})=>{
 writeFileSync(join(sqlDir,'038_future_additive.sql'),'SELECT 1;\n');
 assert.equal(verifyMigrationChain(sqlDir,baseline,extension).total,38);
}));

test('Refuse mutation of migration 019–027 even if not yet in a DB ledger',()=>withFixture(({sqlDir,baseline,extension})=>{
 writeFileSync(join(sqlDir,'027_tinh_canh_manual_grants.sql'),readFileSync(join(sqlDir,'027_tinh_canh_manual_grants.sql'),'utf8')+'\n-- changed\n');
 assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/was modified/);
}));
test('Refuse invalid SQL migration filenames instead of silently ignoring them',()=>withFixture(({sqlDir,baseline,extension})=>{
 writeFileSync(join(sqlDir,'029 NEW migration.sql'),'SELECT 1;\n');
 assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/Invalid SQL migration filename/);
}));

test('Refuse mutation of the new analytics migration checksum',()=>withFixture(({sqlDir,baseline,extension})=>{
 const name='030_admin_insights.sql';
 writeFileSync(join(sqlDir,name),readFileSync(join(sqlDir,name),'utf8')+'\n-- altered\n');
 assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/Immutable SQL migration was modified/);
}));

test('Refuse mutation of new034 showcase migration',()=>withFixture(({sqlDir,baseline,extension})=>{writeFileSync(join(sqlDir,'034_admin_badge_showcase.sql'),readFileSync(join(sqlDir,'034_admin_badge_showcase.sql'),'utf8')+'\n-- changed\n');assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/Immutable 034/);}));

test('A62 refuse tampering of frozen 035 trusted-browser migration',()=>withFixture(({sqlDir,baseline,extension})=>{
 const f='035_admin_trusted_devices.sql';writeFileSync(join(sqlDir,f),readFileSync(join(sqlDir,f),'utf8')+'\n-- change refused\n');
 assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/Immutable 035/);
}));

test('A63 refuse tampering of new 036 specialty badges migration',()=>withFixture(({sqlDir,baseline,extension})=>{
 const name='036_specialty_badges.sql';writeFileSync(join(sqlDir,name),readFileSync(join(sqlDir,name),'utf8')+'\n-- tampered\n');
 assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/Immutable 036/);
}));

test('Refuse tampering of lifetime grant migration 037',()=>withFixture(({sqlDir,baseline,extension})=>{const name='037_lifetime_pro_entitlements.sql';writeFileSync(join(sqlDir,name),readFileSync(join(sqlDir,name),'utf8')+'\n-- altered\n');assert.throws(()=>verifyMigrationChain(sqlDir,baseline,extension),/Immutable 037/);}));
