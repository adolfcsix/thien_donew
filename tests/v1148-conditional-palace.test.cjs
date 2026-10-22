'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {buildPalaceConditionalSynthesis,createTwelvePalaceStudy,auditAnnualEvidence,buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const knowledge=require('../packages/knowledge/src/palace-conditional-synthesis.json');
const chart=()=>Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
const record=(c,h,id,options)=>buildPalaceConditionalSynthesis(c,h.branchIndex,options).records.find(x=>x.id===id);

test('V11.48 12 distinct palace profiles with four unique, scoped questions',()=>{
 const expected=require('../packages/knowledge/src/palace-topics.json').topics;
 assert.deepEqual(Object.keys(knowledge.profiles).sort(),Object.keys(expected).sort());
 const all=Object.values(knowledge.profiles).flatMap(x=>Object.values(x));
 assert.equal(all.length,48);assert.equal(new Set(all).size,48);
 assert.equal(knowledge.expertReviewed,false);
 assert.deepEqual(knowledge.patterns.map(x=>x.id),['main-support','main-challenge','main-transformation','natal-annual']);
});
test('V11.48 all 12 houses produce four conditional records without mutating chart',()=>{
 const c=chart(),snap=JSON.stringify(c);
 for(const h of c.houses){const result=buildPalaceConditionalSynthesis(c,h.branchIndex);
  assert.equal(result.status,'research-only');assert.equal(result.records.length,4);
  for(const r of result.records){assert.ok(r.question.length>50);assert.equal(r.expertReviewed,false);
   assert.ok(['observed','partial','no-data','needs-review'].includes(r.status));
   assert.ok(r.evidence.every(x=>x.scope==='natal'||x.scope==='annual'));
  }
 }
 assert.equal(JSON.stringify(c),snap);
});
test('V11.48 main + challenge at Mệnh is positioned, never described as proven fortune',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Mệnh');const r=record(c,h,'main-challenge');
 assert.equal(r.status,'observed');assert.ok(r.evidence.some(x=>x.kind==='chính tinh'&&x.strengthPath));
 assert.ok(r.evidence.some(x=>x.kind==='sát tinh'&&x.sourcePath));assert.equal(r.expertReviewed,false);
});
test('V11.48 missing brightness blocks all syntheses using the main star',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Mệnh');
 h.mainStarStrengths=h.mainStarStrengths.filter(x=>x.name!==h.stars[0]);
 const r=record(c,h,'main-challenge');
 assert.equal(r.status,'needs-review');assert.ok(r.missing.some(x=>x.includes('độ sáng')));
});
test('V11.48 duplicated main star at two palaces cannot be used as verified evidence',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Mệnh');
 c.houses.find(x=>x!==h).stars.push(h.stars[0]);
 assert.equal(record(c,h,'main-challenge').status,'needs-review');
});
test('V11.48 duplicated supporting star at two palaces invalidates matching support group',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Phu Thê');
 const sup=h.auxiliaryStars.find(x=>['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Lộc Tồn','Thiên Mã','Thiên Quan','Thiên Phúc'].includes(x)) ||
 [h.yearStars,h.additionalStars,h.beneficStars,h.advancedStars].filter(Array.isArray).flat().find(x=>['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Lộc Tồn','Thiên Mã','Thiên Quan','Thiên Phúc'].includes(x));
 assert.ok(sup);
 c.houses.find(x=>x!==h).auxiliaryStars.push(sup);
 assert.equal(record(c,h,'main-support').status,'needs-review');
});
test('V11.48 natal Hóa may only connect with a verified local main-star target',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Mệnh');
 const result=record(c,h,'main-transformation');
 assert.equal(result.status,'observed');
 assert.ok(result.evidence.some(x=>x.kind==='Tứ Hóa năm sinh'&&h.stars.includes(x.star)));
});
test('V11.48 conflicting Hóa assignments never produce a confirmed match',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Mệnh');
 const hoa=h.tuHoa[0];assert.ok(hoa);
 c.houses.find(x=>x!==h).tuHoa.push({name:hoa.name,star:'Sao không tồn tại'});
 assert.equal(record(c,h,'main-transformation').status,'needs-review');
});
test('V11.48 copied annual audit from another branch is not accepted',()=>{
 const c=chart(),a=Engine.annualOverview(c,2026),e=auditAnnualEvidence(c,a,0);
 const h=c.houses.find(x=>x.branchIndex===4);
 const r=record(c,h,'natal-annual',{annualEvidence:e});
 assert.equal(r.evidence.some(x=>x.scope==='annual'),false);
 assert.notEqual(r.status,'observed');
});
test('V11.48 annual-only data stays out of natal synthesis',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Mệnh'),a=Engine.annualOverview(c,2026);
 const before=JSON.stringify(c);
 a.luuStars.items.push({name:'Tả Phụ',branch:h.branchIndex,palace:h.palace});
 const study=buildPalaceConditionalSynthesis(c,h.branchIndex);
 assert.equal(study.records.some(r=>r.evidence.some(e=>e.scope==='annual')),false);
 assert.equal(JSON.stringify(c),before);
});
test('V11.48 only audited local annual stars and transformations may be included',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Mệnh');const a=Engine.annualOverview(c,2026);
 a.luuStars.items.push({name:'Sao lỗi',branch:h.branchIndex,palace:'Cung giả'});
 const e=auditAnnualEvidence(c,a,h.branchIndex);
 const r=record(c,h,'natal-annual',{annualEvidence:e});
 assert.ok(r.evidence.filter(x=>x.scope==='annual').every(x=>x.palace===h.palace&&x.year===2026));
 assert.ok(r.evidence.every(x=>x.star!=='Sao lỗi'));
});
test('V11.48 public reading omits internal houses[] paths while audits preserve source trace',()=>{
 const c=chart(),h=c.houses.find(x=>x.palace==='Mệnh');
 const raw=buildPalaceConditionalSynthesis(c,h.branchIndex);
 assert.ok(raw.records.some(r=>r.evidence.some(e=>e.sourcePath?.startsWith('houses['))));
 const pub=createTwelvePalaceStudy(c,h.branchIndex);
 assert.equal(pub.conditionalSynthesis.records.length,4);
 assert.doesNotMatch(JSON.stringify(pub),/houses\[/);
 const reading=buildPalaceReading({chart:c,branchIndex:h.branchIndex});
 assert.equal(reading.twelvePalaceStudy.conditionalSynthesis.records.length,4);
});
test('V11.48 deep panel consumes public synthesis and does not access astrology engine',()=>{
 const f=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/twelve-palace-study-panel.tsx'),'utf8');
 assert.match(f,/conditionalSynthesis\.records\.map/);
 assert.doesNotMatch(f,/astrology-engine|fetch\(/);
 const t=fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/index.d.ts'),'utf8');
 assert.match(t,/interface PalaceConditionalSynthesis/);
});
test('V11.48 invalid chart structure and unknown palace fail safely',()=>{
 assert.throws(()=>buildPalaceConditionalSynthesis({houses:[]},0),RangeError);
 const c=chart();c.houses[0].palace='Không có trong nghiên cứu';
 assert.equal(buildPalaceConditionalSynthesis(c,c.houses[0].branchIndex).status,'unavailable');
});
test('V11.48 audit covers fixtures and maintains read-only semantics',()=>{
 const r=require('../infrastructure/scripts/audit-conditional-palace.cjs').audit();
 assert.equal(r.status,'PASS');assert.equal(r.stats.charts,22);
 assert.equal(r.stats.palaceChecks,264);assert.equal(r.stats.recordChecks,1056);
});
