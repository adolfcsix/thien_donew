'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculate}=require('../packages/astrology-engine/src/tuvi.js');
const {evidenceForConditionalPatterns,buildPalaceReading,matchCombinations,matchRelationshipPatterns}=require('../packages/interpretation/src/index.cjs');
const {combinationRules,relationshipPatterns}=require('../packages/knowledge/src/index.cjs');
const guide=require('../packages/knowledge/src/star-study-guide.json');
const make=(year=2004,hour=8)=>calculate({date:`${year}-03-15`,hour,minute:30,calendar:'solar',leap:false,gender:'Nam'});
const check=c=>c.houses.map(h=>evidenceForConditionalPatterns(c,h.branchIndex));
const candidates=()=>({date:'2004-03-15',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'});

test('V11.70 evaluates all declared same-palace/transformations and inter-palace rules, including unmet cases',()=>{
 const chart=make();const first=evidenceForConditionalPatterns(chart,0);
 assert.equal(first.assessed,combinationRules.length+relationshipPatterns.length);
 assert.equal(first.records.length,first.assessed);
 assert.equal(new Set(first.records.map(r=>r.id)).size,first.assessed);
 assert.ok(first.records.some(x=>x.status==='unmet'));
 for(const item of first.records){
  assert.ok(item.conditions.length);
  assert.ok(['matched','partial','unmet','needs-review'].includes(item.status));
  if(item.status==='matched')assert.ok(item.conditions.every(x=>x.met));
  if(item.status==='matched')assert.equal(item.excluded.length,0);
 }
});
test('V11.70 recorded evidence comes only from natal placements and branch-correct houses; inputs are unchanged',()=>{
 for(let year=1999;year<=2010;year++){
  const chart=make(year,(year%12)*2);const before=JSON.stringify(chart);
  for(const data of check(chart))for(const item of data.records)for(const place of item.observed){
   const house=chart.houses.find(h=>h.branchIndex===place.branchIndex);
   assert.ok(house);
   assert.equal(house.palace,place.palace);
   assert.equal(place.relation,place.branchIndex===data.anchorBranchIndex?'Tọa cung':
     [(data.anchorBranchIndex+4)%12,(data.anchorBranchIndex+8)%12].includes(place.branchIndex)?'Tam hợp':
     (data.anchorBranchIndex+6)%12===place.branchIndex?'Đối cung':'Ngoài Tứ chính');
  }
  assert.equal(JSON.stringify(chart),before);
 }
});
test('V11.70 an extra annual star cannot satisfy a natal-only match',()=>{
 const c=make();const before=JSON.stringify(check(c));
 const edited=structuredClone(c);
 for(const h of edited.houses){h.luuStars=['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc'];h.luuTuHoa=[{name:'Hóa Khoa',star:'Tả Phụ'}];}
 assert.equal(JSON.stringify(check(edited)),before);
});
test('V11.70 refuses ambiguous same-name placements in another house',()=>{
 const c=make();const first=evidenceForConditionalPatterns(c,0);
 const chosen=first.records.find(x=>x.kind==='inter-palace'&&x.observed.length>0);
 assert.ok(chosen);
 const selected=chosen.observed[0];
 const edited=structuredClone(c);
 edited.houses.find(x=>x.branchIndex!==(selected.branchIndex)).additionalStars.push(selected.star);
 const altered=evidenceForConditionalPatterns(edited,0).records.find(x=>x.id===chosen.id);
 assert.equal(altered.status,'needs-review');
 assert.ok(altered.excluded.some(x=>x.star===selected.star&&x.reason==='ambiguous'));
});
test('V11.70 refuses duplicate natal star even when only repeated at one location',()=>{
 const c=make();const first=evidenceForConditionalPatterns(c,0);
 const chosen=first.records.find(x=>x.kind==='inter-palace'&&x.observed.length>0);
 const selected=chosen.observed[0];
 const edited=structuredClone(c);
 edited.houses.find(x=>x.branchIndex===selected.branchIndex).additionalStars.push(selected.star);
 const altered=evidenceForConditionalPatterns(edited,0).records.find(x=>x.id===chosen.id);
 assert.equal(altered.status,'needs-review');
 assert.ok(altered.excluded.some(x=>x.star===selected.star&&x.reason==='repeated'));
});
test('V11.70 rejects conflicting natal Hóa assignment with same label',()=>{
 const c=make(),original=c.houses.find(h=>h.tuHoa.length);
 const name=original.tuHoa[0].name;
 const edited=structuredClone(c);
 const elsewhere=edited.houses.find(h=>h.branchIndex!==original.branchIndex);
 elsewhere.tuHoa.push({name,star:elsewhere.stars[0]??'Tử Vi'});
 const proof=evidenceForConditionalPatterns(edited,original.branchIndex);
 const record=proof.records.find(x=>x.kind==='natal-transformation'&&x.required[0]===name);
 assert.equal(record.status,'needs-review');
 assert.ok(record.excluded.some(x=>x.reason==='transformation-conflict'));
});
test('V11.70 rejects incomplete or duplicated 12-branch chart',()=>{
 const c=make();
 assert.throws(()=>evidenceForConditionalPatterns({houses:c.houses.slice(1)},0),/12 cung/);
 const duplicated=structuredClone(c);duplicated.houses[1].branchIndex=duplicated.houses[0].branchIndex;
 assert.throws(()=>evidenceForConditionalPatterns(duplicated,0),/12 cung/);
});
test('V11.70 shown in deep reading and not mixed into basic reading',()=>{
 const c=make(),r=buildPalaceReading({chart:c,branchIndex:c.houses[0].branchIndex,guide});
 assert.equal(r.conditionalPatternEvidence.assessed,19);
 assert.equal(r.conditionalPatternEvidence.expertReviewed,false);
 const src=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
 assert.match(src,/level==='deep'/);
 assert.match(src,/<ConditionalPatternEvidencePanel data=\{reading\.conditionalPatternEvidence\}/);
 const ui=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/conditional-pattern-evidence.tsx'),'utf8');
 assert.match(ui,/Đã khớp/);assert.match(ui,/Tất cả/);
 assert.doesNotMatch(ui,/Math\.random|annualOverview|window\./);
});

test('V11.70 keeps all legacy 9+10 match detections across 36 calculated charts',()=>{
 for(let year=1999;year<=2010;year++)for(const hour of [1,8,18]){
  const chart=make(year,hour);
  for(const house of chart.houses){
   const before=[...matchCombinations(house),...matchRelationshipPatterns(chart,house.branchIndex)].map(x=>x.id).sort();
   const after=evidenceForConditionalPatterns(chart,house.branchIndex).records.filter(x=>x.status==='matched').map(x=>x.id).sort();
   assert.deepEqual(after,before,`${year}/${hour}/${house.branchIndex}`);
  }
 }
});
