'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {buildPalaceArgumentMap,buildFourCourtReadingLedger,buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const editorial=require('../packages/knowledge/src/palace-argument-prompts.json');
const makeChart=(date='2004-08-15',gender='Nam',hour=8)=>Engine.calculate({date,calendar:'solar',gender,hour,minute:30});
const find=(chart,palace)=>chart.houses.find(h=>h.palace===palace);
const read=(chart,palace)=>buildPalaceArgumentMap(chart,find(chart,palace).branchIndex);
const kindIds=['toa-doi','hoi-tam-hop','hoa-dich','doi-trong'];

test('V11.61 independent 12 palace profiles: 48 contextual questions and 12 counterchecks',()=>{
 const titles=Object.keys(require('../packages/knowledge/src/palace-topics.json').topics);
 assert.deepEqual(Object.keys(editorial.profiles).sort(),titles.sort());
 const questions=Object.values(editorial.profiles).flatMap(p=>Object.values(p.prompts));
 assert.equal(questions.length,48);assert.equal(new Set(questions).size,48);
 assert.ok(questions.every(q=>q.length>95));
 assert.ok(Object.values(editorial.profiles).every(p=>p.counterexample.length>85 && Object.keys(p.prompts).sort().join('|')===kindIds.slice().sort().join('|')));
 assert.equal(editorial.expertReviewed,false);
});
test('V11.61 12 houses x 4 cases, transparent checks, no annual or provenance, no input mutations',()=>{
 const c=makeChart(),before=JSON.stringify(c);
 for(const h of c.houses){const report=buildPalaceArgumentMap(c,h.branchIndex);
  assert.equal(report.arguments.length,4);assert.equal(report.summary.caseCount,4);
  assert.deepEqual(report.arguments.map(a=>a.id),kindIds);
  for(const item of report.arguments){
   assert.ok(['observed','partial','no-data','needs-review'].includes(item.status));
   assert.equal(item.expertReviewed,false);assert.equal(item.confirmedClassicalFormation,false);
   assert.equal(item.checks.length,2);
   assert.ok(item.evidence.every(v=>[h.branchIndex,(h.branchIndex+4)%12,(h.branchIndex+8)%12,(h.branchIndex+6)%12].includes(v.branchIndex)));
   if(item.status==='observed')assert.ok(item.checks.every(ch=>ch.met) && !item.issues.length);
  }
  assert.doesNotMatch(JSON.stringify(report),/sourcePath|strengthPath|targetPath|houses\[|luuStars|annual-only|fortuneScore/);
 }
 assert.equal(JSON.stringify(c),before);
});
test('V11.61 integration: reuse the exact ledger and present new panel only in deep mode',()=>{
 const c=makeChart(),h=find(c,'Mệnh');const ledger=buildFourCourtReadingLedger(c,h.branchIndex);
 assert.deepEqual(buildPalaceArgumentMap(c,h.branchIndex,{ledger}),buildPalaceArgumentMap(c,h.branchIndex));
 const reading=buildPalaceReading({chart:c,branchIndex:h.branchIndex});
 assert.deepEqual(reading.palaceArgumentMap,buildPalaceArgumentMap(c,h.branchIndex));
 assert.throws(()=>buildPalaceArgumentMap(c,(h.branchIndex+1)%12,{ledger}),/không thuộc cung/);
 const component=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
 const panel=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/palace-argument-map.tsx'),'utf8');
 assert.match(component,/level==='deep'.*palace-reading-deep/);assert.match(component,/<PalaceArgumentMapPanel map={reading.palaceArgumentMap}/);
 assert.doesNotMatch(panel,/astrology-engine|\bfetch\(|sourcePath|targetPath|strengthPath/);
});
test('V11.61 known void main differs from invalid brightness',()=>{
 const c=makeChart(),h=find(c,'Mệnh');
 const star=h.stars[0];assert.ok(star);
 h.mainStarStrengths=h.mainStarStrengths.filter(item=>item.name!==star);
 const r=read(c,'Mệnh').arguments[0];
 assert.equal(r.status,'needs-review');
 assert.ok(r.issues.some(item=>item.star===star));
 assert.ok(!r.evidence.some(item=>item.star===star && item.kind==='main'));
});
test('V11.61 duplicated stars or conflicting natal Hóa cannot give confirmed argument',()=>{
 const c=makeChart(),h=find(c,'Mệnh');h.stars.push(h.stars[0]);
 assert.equal(read(c,'Mệnh').arguments[0].status,'needs-review');
 const c2=makeChart(),target=c2.houses.find(h=>h.tuHoa.length),mark=target.tuHoa[0];
 assert.ok(mark);c2.houses.find(h=>h!==target).tuHoa.push({name:mark.name,star:'Đích giả'});
 const r=buildPalaceArgumentMap(c2,target.branchIndex).arguments.find(a=>a.id==='hoa-dich');
 assert.equal(r.status,'needs-review');assert.ok(r.issues.some(i=>i.reason));
});
test('V11.61 annual overlays do not change natal argument map',()=>{
 const c=makeChart(),h=find(c,'Mệnh'),before=read(c,'Mệnh');
 h.luuStars=['Tả Phụ','Hỏa Tinh'];h.luuTuHoa=[{name:'Hóa Quyền',star:'Tử Vi'}];
 assert.deepEqual(read(c,'Mệnh'),before);
});
test('V11.61 24 engine charts x 12 palace x 4 cases: conditions and bounds',()=>{
 for(const date of ['2004-08-15','1979-06-16','1997-12-27','2026-10-10'])for(const gender of ['Nam','Nữ'])for(const hour of [1,8,20]){
  const c=makeChart(date,gender,hour);
  for(const h of c.houses){const r=buildPalaceArgumentMap(c,h.branchIndex);
   assert.equal(r.arguments.length,4);
   for(const item of r.arguments)if(item.status==='observed'){
    assert.equal(item.missing.length,0);assert.equal(item.issues.length,0);
   }
  }
 }
});
test('V11.61 absent natal Hóa yields no-data instead of fabricated verdict',()=>{
 const c=makeChart();for(const h of c.houses)h.tuHoa=[];
 const item=read(c,'Mệnh').arguments.find(x=>x.id==='hoa-dich');
 assert.equal(item.status,'no-data');assert.equal(item.evidence.length,0);assert.equal(item.checks.filter(x=>!x.met).length,2);
});
test('V11.61 permutations of the input house array never alter observations',()=>{
 const c=makeChart(),h=find(c,'Quan Lộc');
 const before=buildPalaceArgumentMap(c,h.branchIndex);
 c.houses.reverse();
 const after=buildPalaceArgumentMap(c,h.branchIndex);
 assert.deepEqual(after,before);
});
