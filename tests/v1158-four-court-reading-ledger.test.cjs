'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {buildFourCourtReadingLedger,buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const catalogue=require('../packages/knowledge/src/four-court-reading-ledger.json');
const getChart=()=>Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
const getHouse=(c,name)=>c.houses.find(h=>h.palace===name);
const matrix=(c,name)=>buildFourCourtReadingLedger(c,getHouse(c,name).branchIndex);

test('V11.58 editorial questions: 12 named palaces, 36 unique subject-specific questions',()=>{
 const topics=Object.keys(require('../packages/knowledge/src/palace-topics.json').topics);
 assert.deepEqual(Object.keys(catalogue.profiles).sort(),topics.sort());
 const questions=Object.values(catalogue.profiles).flatMap(x=>Object.values(x));
 assert.equal(questions.length,36);assert.equal(new Set(questions).size,36);
 assert.ok(questions.every(q=>q.length>=85));
 assert.equal(catalogue.expertReviewed,false);
});
test('V11.58 each house: one center, two triads, one opposition, five evidence questions, pure data',()=>{
 const c=getChart(),before=JSON.stringify(c);
 for(const h of c.houses){
  const out=buildFourCourtReadingLedger(c,h.branchIndex);
  assert.equal(out.scope,'natal-four-court-evidence-ledger');
  assert.equal(out.summary.courtCount,4);assert.equal(out.courts.length,4);assert.equal(out.questions.length,5);
  assert.deepEqual(out.courts.map(x=>x.branchIndex),[h.branchIndex,(h.branchIndex+4)%12,(h.branchIndex+8)%12,(h.branchIndex+6)%12]);
  assert.deepEqual(out.courts.map(x=>x.relation),['tọa cung','tam hợp','tam hợp','đối cung']);
  assert.equal(out.expertReviewed,false);
  assert.ok(out.questions.every(x=>x.expertReviewed===false));
  assert.doesNotMatch(JSON.stringify(out),/houses\[|sourcePath|targetPath|strengthPath|annual-only|luuStars/);
 }
 assert.equal(JSON.stringify(c),before);
});
test('V11.58 layout invariant under permutation of chart.houses',()=>{
 const c=getChart(),h=getHouse(c,'Mệnh');const one=buildFourCourtReadingLedger(c,h.branchIndex);
 c.houses.reverse();const two=buildFourCourtReadingLedger(c,h.branchIndex);
 assert.deepEqual(two.courts.map(x=>x.palace),one.courts.map(x=>x.palace));
 assert.deepEqual(two.summary,one.summary);
});
test('V11.58 missing main brightness rejects evidence; does not describe as vo chinh dieu',()=>{
 const c=getChart(),h=getHouse(c,'Mệnh');const star=h.stars[0];
 assert.ok(star);h.mainStarStrengths=h.mainStarStrengths.filter(x=>x.name!==star);
 const r=matrix(c,'Mệnh');
 assert.equal(r.summary.focusIsVoChinhDieu,false);
 assert.ok(!r.courts[0].groups.main.some(x=>x.star===star));
 assert.ok(r.courts[0].issues.some(x=>x.star===star));
 assert.equal(r.questions[0].status,'needs-review');
});
test('V11.58 duplicate natal main in two palaces is rejected',()=>{
 const c=getChart(),h=getHouse(c,'Mệnh'),star=h.stars[0];
 const other=c.houses.find(x=>x!==h);other.stars.push(star);
 const r=matrix(c,'Mệnh');assert.ok(!r.courts[0].groups.main.some(x=>x.star===star));
 assert.ok(r.courts[0].issues.some(x=>x.star===star));
});
test('V11.58 same-layer repeated main star cannot be confirmed',()=>{
 const c=getChart(),h=getHouse(c,'Mệnh'),star=h.stars[0];h.stars.push(star);
 const r=matrix(c,'Mệnh');assert.ok(r.courts[0].issues.some(x=>x.star===star));
 assert.ok(!r.courts[0].groups.main.some(x=>x.star===star));
});
test('V11.58 Hóa with conflicting labels does not enter verified list',()=>{
 const c=getChart(),h=getHouse(c,'Mệnh');const hoa=h.tuHoa[0];
 assert.ok(hoa);c.houses.find(x=>x!==h).tuHoa.push({name:hoa.name,star:'Sao không có'});
 const r=matrix(c,'Mệnh');assert.equal(r.questions.find(x=>x.id==='natal-hoa').status,'needs-review');
 assert.ok(!r.courts[0].groups.transformation.some(x=>x.transformation===hoa.name));
});
test('V11.58 annual overlay is never counted in natal report',()=>{
 const c=getChart(),h=getHouse(c,'Mệnh');const before=matrix(c,'Mệnh');
 h.luuStars=['Tả Phụ'];h.luuTuHoa=[{name:'Hóa Kỵ',star:'Thái Dương'}];
 const after=matrix(c,'Mệnh');assert.deepEqual(after,before);
});
test('V11.58 unknown subject fails closed; malformed chart throws',()=>{
 assert.throws(()=>buildFourCourtReadingLedger({houses:[]},0),RangeError);
 const c=getChart();c.houses[0].palace='Cung giả';
 assert.equal(buildFourCourtReadingLedger(c,c.houses[0].branchIndex).status,'unavailable');
});
test('V11.58 integrated in public PalaceReading and deep-only visual panel',()=>{
 const c=getChart(),h=getHouse(c,'Mệnh');
 const reading=buildPalaceReading({chart:c,branchIndex:h.branchIndex});
 assert.deepEqual(reading.fourCourtReadingLedger,matrix(c,'Mệnh'));
 const app=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
 const panel=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/four-court-reading-ledger.tsx'),'utf8');
 assert.match(app,/level==='deep'.*palace-reading-deep/);assert.match(app,/<FourCourtReadingLedgerPanel/);
 assert.doesNotMatch(panel,/astrology-engine|fetch\(|sourcePath|strengthPath|targetPath/);
 const decl=fs.readFileSync(path.resolve(__dirname,'../packages/interpretation/src/index.d.ts'),'utf8');
 assert.match(decl,/interface FourCourtReadingLedger/);
});
test('V11.58 36 diverse birth charts / 432 palace checks: four-court topology; no unverified record can be surfaced as observed',()=>{
 const inputs=[];for(const date of ['2004-08-15','1988-04-06','1997-12-27','2026-10-10','2016-02-29','1979-06-16']){
 for(const hour of [1,8,22])for(const gender of ['Nam','Nữ'])inputs.push({date,calendar:'solar',gender,hour,minute:0});
 }
 assert.equal(inputs.length,36);
 for(const input of inputs){const c=Engine.calculate(input);
  for(const h of c.houses){const r=buildFourCourtReadingLedger(c,h.branchIndex);
   assert.equal(r.courts.length,4);
   for(const court of r.courts){
    assert.ok(court.groups.main.every(item=>['M','V','D','B','H'].includes(item.strength)));
    assert.ok(court.groups.transformation.every(x=>['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ'].includes(x.transformation)));
   }
  }
 }
});
