'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {getStarCandidatePreview:preview,auditCandidates,NAME_ORDER}=require('../packages/knowledge/src/star-candidate-preview.cjs');
const sources=require('../packages/star-audit/fixtures/v11143-source-reading-examples.json');
const {calculate:calculateTuvi}=require('../packages/astrology-engine/src/tuvi.js');
const {auditDocket}=require('../packages/knowledge/src/star-source-review.cjs');
const registry=require('../packages/knowledge/src/star-identity-registry.json');
const van=require('../packages/knowledge/src/luu-nien-van-tinh-source-review.json');
const stemStudy=require('../packages/knowledge/src/star-stem-study.cjs').stemStudy;
const example=()=>preview({birthCycleIndex:0,annualBranch:6,layer:'birth'});
test('11 source-scoped names, all integration/alias gates closed and 4 aliases kept outside candidate list',()=>{
 const r=example();assert.equal(r.rows.length,11);assert.equal(new Set(r.rows.map(x=>x.name)).size,11);
 assert.deepEqual(r.rows.map(x=>x.name),[...NAME_ORDER]);assert.equal(r.blockedIntegration,true);
 assert.equal(r.automaticAlias,false);assert.equal(r.automaticPlacement,false);
 assert.ok(r.rows.every(row=>!row.gate.independentChartFixture&&!row.gate.schoolReview&&!row.automaticPlacement));
 assert.deepEqual(auditDocket().errors,[]);
 const ids=new Set(registry.records.map(x=>x.name));assert.ok(r.rows.every(x=>!ids.has(x.name)));
});
test('published author examples are separate fixtures, never marked independent chart evidence',()=>{
 assert.equal(sources.independentChartFixture,false);assert.equal(sources.fixtureKind,'manually-transcribed-published-examples-not-independent-chart');
 for(const x of sources.cases){let r=preview(x),entry=r.rows.find(row=>row.name===x.name);
  assert.equal(entry.candidates[0].branch,x.expectedBranch,x.example);
 }
});
test('all 1440 year/layer combinations checked; no exceptions, auto placement, non-branch positions',()=>{
 assert.deepEqual(auditCandidates(),{errors:[],inputs:1440,names:11,tuongNames:8,unresolved:11,automaticPlacement:false});
});
test('birth versus annual layer moves Tướng Tiền and Quán Sách, never Hồng Diễm or Văn Tinh',()=>{
 const b=preview({birthCycleIndex:0,annualBranch:6,layer:'birth'});
 const a=preview({birthCycleIndex:0,annualBranch:6,layer:'annual'});
 for(const name of ['Tướng Tinh','Quán Sách'])assert.notEqual(b.rows.find(x=>x.name===name).candidates[0].branch,a.rows.find(x=>x.name===name).candidates[0].branch);
 for(const name of ['Hồng Diễm','Lưu Niên Văn Tinh'])assert.deepEqual(b.rows.find(x=>x.name===name).candidates,a.rows.find(x=>x.name===name).candidates);
 assert.equal(a.birthYear.stem,'Giáp');assert.equal(a.birthYear.branch,'Tý');assert.equal(a.annualBranch,'Ngọ');
});
test('Văn Tinh keeps four mismatched stems and Giáp internal transcription disagreement; Hồng Diễm stays birth-year-stem',()=>{
 const disputed=[];
 for(let i=0;i<10;i++){
  const r=preview({birthCycleIndex:i,annualBranch:0});const vanRow=r.rows.find(x=>x.name==='Lưu Niên Văn Tinh');
  const hong=r.rows.find(x=>x.name==='Hồng Diễm');
  assert.equal(hong.candidates[0].branch,stemStudy(i).hongDiem.branch);
  assert.equal(vanRow.candidates[0].branch,van.sources[0].positions[i]);
  assert.equal(vanRow.candidates[1].branch,van.sources[1].positions[i]);
  if(van.sources[0].positions[i]!==van.sources[1].positions[i])disputed.push(r.birthYear.stem);
  if(i===0){assert.equal(vanRow.candidates.length,3);assert.equal(vanRow.candidates[2].branch,'Tý');assert.equal(vanRow.disagreement,true);}
  else assert.equal(vanRow.candidates.length,2);
 }
 assert.deepEqual(disputed,van.disputedStems);
});
test('invalid inputs and unknown year branches fail closed',()=>{
 for(const x of [-1,60,3.5,'1',null,undefined,NaN])assert.throws(()=>preview({birthCycleIndex:x,annualBranch:6}));
 for(const x of [-1,12,1.5,'0',null])assert.throws(()=>preview({birthCycleIndex:0,annualBranch:x}));
 for(const x of ['natal','both',null])assert.throws(()=>preview({birthCycleIndex:0,annualBranch:6,layer:x}));
});
test('preview callers cannot mutate source or create new natal stars',()=>{
 const c=example();c.rows[0].candidates[0].branch='ZZ';c.rows.pop();assert.equal(example().rows.length,11);assert.notEqual(example().rows[0].candidates[0].branch,'ZZ');
 const chart=calculateTuvi({date:'2004-08-15',calendar:'solar',hour:8,minute:30,gender:'Nam'});
 const text=JSON.stringify(chart);for(const name of NAME_ORDER)assert.ok(!text.includes('\"name\":\"'+name+'\"'),name+' must not be autoplaced');
});

test('source import exception is restricted to the built smoke identity module only',async()=>{
 const {isDeferredBuildIdentityImport:f}=await import('../infrastructure/scripts/source-import-policy.mjs');
 assert.equal(f('infrastructure/scripts/production-smoke.mjs','../../apps/api/dist/common/e2e-identity.js'),true);
 assert.equal(f('apps/web/src/app/page.tsx','../../apps/api/dist/common/e2e-identity.js'),false);
 assert.equal(f('infrastructure/scripts/production-smoke.mjs','../../apps/api/dist/auth/secrets.js'),false);
});
