'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {examineNatalMultiStars,buildPalaceReading,buildConditionalStarGroupGuides}=require('../packages/interpretation/src/index.cjs');
const catalogue=require('../packages/knowledge/src/conditional-star-group-guides.json');
const chart=()=>Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
const run=(c,at=0)=>examineNatalMultiStars(c,at).conditionalGuides;
const H=(c,n)=>c.houses.find(h=>h.branchIndex===n);
const place=(c,n,star,field='auxiliaryStars')=>{H(c,n)[field]??=[];H(c,n)[field].push(star);};
const clearGroup=(c,names)=>{for(const h of c.houses)for(const key of ['stars','auxiliaryStars','yearStars','additionalStars','traditionalStars','natalExtensionStars','beneficStars','advancedStars','positionalStars','derivedStars','missingStars'])if(Array.isArray(h[key]))h[key]=h[key].filter(x=>!names.includes(x));};
const example=['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc'];

test('V11.59 six independent editorial guides have complete longform fields',()=>{
 const ids=require('../packages/knowledge/src/natal-multi-star-research.json').groups.map(x=>x.id);
 assert.deepEqual(Object.keys(catalogue.profiles).sort(),ids.sort());
 for(const entry of Object.values(catalogue.profiles))for(const field of ['focusAngle','workedFull','workedPartial','counterexample','practice','boundary'])
  assert.ok(entry[field].length>=65,`${field} too short`);
 assert.equal(catalogue.expertReviewed,false);
});
test('V11.59 only validated natal positions satisfy all four conditions',()=>{
 const c=chart();clearGroup(c,example);
 const at=0;const positions=[0,4,8,6];example.forEach((s,i)=>place(c,positions[i],s));
 const r=run(c,at).records.find(x=>x.id==='ta-huu-xuong-khuc');
 assert.equal(r.status,'complete');assert.equal(r.observed,4);assert.equal(r.conditions.allConditionsMet,true);
 assert.equal(r.evidence.filter(x=>x.relation==='Tọa cung').length,1);
 assert.equal(r.expertReviewed,false);
});
test('V11.59 all four natal stars elsewhere do not satisfy four-court match',()=>{
 const c=chart();clearGroup(c,example);
 example.forEach((s,i)=>place(c,[0,1,2,3][i],s));
 const r=run(c).records.find(x=>x.id==='ta-huu-xuong-khuc');
 assert.equal(r.status,'insufficient');assert.equal(r.observed,1);
 assert.equal(r.excluded.filter(x=>x.reason==='outside').length,3);
 assert.equal(r.conditions.allConditionsMet,false);
});
test('V11.59 partial case clearly shows missing/outside and not full formation',()=>{
 const c=chart();clearGroup(c,example);
 place(c,0,'Tả Phụ');place(c,4,'Văn Khúc');place(c,1,'Hữu Bật');
 const r=run(c).records.find(x=>x.id==='ta-huu-xuong-khuc');
 assert.equal(r.status,'partial');assert.equal(r.observed,2);
 assert.deepEqual(r.excluded.map(x=>x.reason).sort(),['absent','outside']);
 assert.equal(r.example,catalogue.profiles['ta-huu-xuong-khuc'].workedPartial);
});
test('V11.59 duplicate star in two palaces must not be counted',()=>{
 const c=chart();clearGroup(c,example);
 example.forEach((s,i)=>place(c,[0,4,8,6][i],s));place(c,1,'Tả Phụ');
 const r=run(c).records.find(x=>x.id==='ta-huu-xuong-khuc');
 assert.equal(r.status,'needs-review');assert.equal(r.observed,3);
 assert.equal(r.excluded.find(x=>x.star==='Tả Phụ').reason,'ambiguous');
 assert.equal(r.conditions.allConditionsMet,false);
});
test('V11.59 repeat in one natal layer cannot be used to complete group',()=>{
 const c=chart();clearGroup(c,example);
 example.forEach((s,i)=>place(c,[0,4,8,6][i],s));place(c,0,'Tả Phụ');
 const r=run(c).records.find(x=>x.id==='ta-huu-xuong-khuc');
 assert.equal(r.status,'needs-review');assert.equal(r.excluded.find(x=>x.star==='Tả Phụ').reason,'repeated');
});
test('V11.59 stale or forged placement record is rejected instead of taken as evidence',()=>{
 const c=chart();clearGroup(c,example);
 example.forEach((name,i)=>place(c,[0,4,8,6][i],name));
 const output=examineNatalMultiStars(c,0),records=structuredClone(output.records);
 records.find(x=>x.id==='ta-huu-xuong-khuc').placements[0].branchIndex=7;
 const r=buildConditionalStarGroupGuides(c,0,records).records.find(x=>x.id==='ta-huu-xuong-khuc');
 assert.equal(r.status,'needs-review');
 assert.equal(r.excluded.find(x=>x.star==='Tả Phụ').reason,'inconsistent');
});
test('V11.59 a star incorrectly repeated across natal layers is not counted',()=>{
 const c=chart();clearGroup(c,example);
 example.forEach((s,i)=>place(c,[0,4,8,6][i],s));place(c,0,'Tả Phụ','advancedStars');
 const r=run(c).records.find(x=>x.id==='ta-huu-xuong-khuc');
 assert.equal(r.status,'needs-review');assert.equal(r.observed,3);
});
test('V11.59 co-location exactly distinguishes đồng cung from hội chiếu',()=>{
 const c=chart();clearGroup(c,example);
 example.forEach((s,i)=>place(c,[0,0,4,6][i],s));
 const r=run(c).records.find(x=>x.id==='ta-huu-xuong-khuc');
 assert.equal(r.status,'complete');assert.equal(r.samePalacePairs.length,1);
 assert.deepEqual(r.samePalacePairs[0].stars,['Tả Phụ','Hữu Bật']);
});
test('V11.59 annual overlay cannot satisfy natal group and input is not mutated',()=>{
 const c=chart();clearGroup(c,example);place(c,0,'Tả Phụ');place(c,4,'Hữu Bật');
 const before=JSON.stringify(c),a=run(c);
 H(c,8).luuStars=['Văn Xương','Văn Khúc'];H(c,6).luuTuHoa=[{name:'Hóa Lộc',star:'Văn Xương'}];
 const b=run(c);assert.deepEqual(a,b);assert.equal(b.records[0].status,'partial');
 assert.equal(JSON.stringify(c).startsWith(before.slice(0,90)),true);
});
test('V11.59 order independent, 12 palace results, consistent with inherited observation',()=>{
 const c=chart(),before=JSON.stringify(c);
 for(const h of c.houses){
  const study=examineNatalMultiStars(c,h.branchIndex);
  const p=study.conditionalGuides;
  assert.equal(p.assessed,6);assert.equal(p.records.length,6);
  assert.equal(p.records.every(x=>x.evidence.length+x.excluded.length===x.required),true);
  assert.ok(p.records.every(x=>x.conditions.allConditionsMet===(x.status==='complete')));
  const reading=buildPalaceReading({chart:c,branchIndex:h.branchIndex});
  assert.deepEqual(reading.natalMultiStarStudy.conditionalGuides,p);
 }
 assert.equal(JSON.stringify(c),before);
 const out=run(c,0);c.houses.reverse();assert.deepEqual(run(c,0),out);
});
test('V11.59 malformed chart and unsupported profile mismatch fail closed',()=>{
 assert.throws(()=>buildConditionalStarGroupGuides({houses:[]},0,[]),RangeError);
 assert.throws(()=>buildConditionalStarGroupGuides(chart(),0,[]),TypeError);
});
test('V11.59 source wiring stays inside knowledge + interpretation + existing deep UI',()=>{
 const base=path.resolve(__dirname,'..');
 const source=fs.readFileSync(path.join(base,'apps/web/src/features/chart/components/natal-multi-star-study-panel.tsx'),'utf8');
 assert.match(source,/conditionalGuides/);assert.match(source,/counterexample/);
 assert.doesNotMatch(source,/fetch\(|sourcePath|targetPath|data-src/);
 const entry=fs.readFileSync(path.join(base,'packages/interpretation/src/index.d.ts'),'utf8');
 assert.match(entry,/interface ConditionalStarGroupGuides/);
});
test('V11.59 12 birth inputs x 12 palace: valid statuses, no annual data leaking',()=>{
 for(const date of ['2004-08-15','1988-04-06','1997-12-27'])for(const gender of ['Nam','Nữ'])for(const hour of [1,18]){
  const c=Engine.calculate({date,calendar:'solar',gender,hour,minute:0});
  for(const h of c.houses){
   const r=run(c,h.branchIndex);
   assert.equal(r.records.length,6);
   assert.ok(r.records.every(x=>['complete','partial','insufficient','needs-review'].includes(x.status)));
   assert.doesNotMatch(JSON.stringify(r),/sourcePath|luuStars|annualOverlay|targetPath/);
  }
 }
});

test('V11.59 twelve real engine snapshots are reproducible as written, across six groups',()=>{
 const fixture=require('../packages/knowledge/src/conditional-star-group-examples.json');
 assert.equal(fixture.cases.length,12);assert.equal(fixture.expertReviewed,false);
 for(const sample of fixture.cases){
  const c=Engine.calculate(sample.input);
  const group=run(c,sample.anchorBranchIndex).records.find(r=>r.id===sample.groupId);
  assert.equal(group.status,sample.status);
  assert.equal(c.houses.find(h=>h.branchIndex===sample.anchorBranchIndex).palace,sample.anchorPalace);
  assert.deepEqual(group.evidence.map(e=>({star:e.star,branchIndex:e.branchIndex,relation:e.relation})),sample.expectedEvidence);
  assert.deepEqual(group.excluded.map(e=>({star:e.star,reason:e.reason})),sample.expectedExcluded);
  assert.equal(group.referenceCases.length,2);
 }
});
