const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
test('A80: exact source metadata and NO-GO gates',()=>{
 const m=JSON.parse(read('infrastructure/release/current.json'));
 assert.match(m.bundleVersion,/^V11\.164\.\d+$/);
 assert.equal(m.status,'NO_GO');
 assert.equal(m.blockingGates.length,11);
 assert.ok(m.blockingGates.every(g=>g.status==='OPEN'));
 assert.equal(m.productionDatabaseTestPassed,false);
 assert.equal(m.legalDraftsApproved,false);
 assert.equal(m.realProviderTestsPassed,false);
});
test('A80: handover docs and validator agree on current source label',()=>{
 for(const f of ['README.md','HUONG_DAN.md','docs/BAO_CAO_HIEN_TAI.md','infrastructure/scripts/audit-handover.mjs'])
  assert.ok(read(f).includes(JSON.parse(read('infrastructure/release/current.json')).bundleVersion),f);
});
test('A80: compact navigation hover stays centered, focus state visible',()=>{
 const css=read('apps/web/src/app/global-visual-harmony-v11164182.css');
 assert.match(css,/data-navigation="compact"[^\n]*:is\(\.nav-item,\[class\*="groupToggle"\]\):hover\s*\{[^}]*transform:none/s);
 assert.match(css,/data-navigation="compact"[^\n]*:is\(\.nav-item,\[class\*="groupToggle"\]\):focus-visible\s*\{[^}]*outline:2px solid/s);
});
