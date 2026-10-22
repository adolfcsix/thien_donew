'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditAnnualEvidence,buildPalaceReading,examineNatalMultiStars}=require('../packages/interpretation/src/index.cjs');
const sample=()=>({lunar:{year:2004},houses:Array.from({length:12},(_,branchIndex)=>({branchIndex,branch:['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'][branchIndex],palace:branchIndex===0?'Mệnh':`Cung ${branchIndex}`,stars:[],auxiliaryStars:[],tuHoa:[]}))});
const annual=()=>({year:2026,luuStars:{items:[]},luuTuHoa:{items:[]}});
const insert=(c,i,n)=>c.houses[i].stars.push(n);

test('V11.45 validates annual chart data and year bounds',()=>{
 const c=sample();assert.throws(()=>auditAnnualEvidence({houses:[]},annual(),0),RangeError);
 assert.throws(()=>auditAnnualEvidence(c,annual(),12),RangeError);
 for(const year of [2003,2101,NaN,2026.5])assert.throws(()=>auditAnnualEvidence(c,{...annual(),year},0),TypeError);
 assert.throws(()=>auditAnnualEvidence(c,{...annual(),luuStars:{items:new Array(257)}},0),TypeError);
});
test('V11.45 separates four courts, outside positions and exact duplicate annual star',()=>{
 const c=sample(),a=annual();a.luuStars.items=[
  {name:'Lưu A',branch:0,palace:'Mệnh'},{name:'Lưu A',branch:0,palace:'Mệnh'},
  {name:'Lưu B',branch:4,palace:'Cung 4'},{name:'Lưu C',branch:2,palace:'Cung 2'}];
 const r=auditAnnualEvidence(c,a,0);
 assert.equal(r.stars.length,3);assert.equal(r.summary.inFourCourts,2);
 assert.equal(r.stars.find(x=>x.name==='Lưu C').relation,'Ngoài Tứ chính');
 assert.equal(r.stars.find(x=>x.name==='Lưu B').relation,'Tam hợp');
 assert.equal(r.stars.every(x=>x.source==='annual-only'),true);
});
test('V11.45 conflicting star branches reject every entry of that star',()=>{
 const c=sample(),a=annual();a.luuStars.items=[{name:'Lưu X',branch:0,palace:'Mệnh'},{name:'Lưu X',branch:4,palace:'Cung 4'}];
 const r=auditAnnualEvidence(c,a,0);assert.equal(r.stars.length,0);
 assert.equal(r.rejectedStars.length,2);assert.deepEqual(new Set(r.rejectedStars.map(x=>x.reason)),new Set(['conflicting-annual-branches']));
});
test('V11.45 rejects forged palace, invalid branch and blank annual name',()=>{
 const c=sample(),a=annual();a.luuStars.items=[{name:'Lưu X',branch:0,palace:'Quan Lộc'},
  {name:'Lưu Y',branch:99},{name:' ',branch:4}];
 const r=auditAnnualEvidence(c,a,0);assert.equal(r.stars.length,0);assert.equal(r.rejectedStars.length,3);
});
test('V11.45 validates annual transformations against unique natal target',()=>{
 const c=sample(),a=annual();insert(c,8,'Thiên Cơ');
 a.luuTuHoa.items=[{name:'Hóa Lộc',star:'Thiên Cơ',branch:8,palace:'Cung 8'},
  {name:'Hóa Lộc',star:'Thiên Cơ',branch:8,palace:'Cung 8'},
  {name:'Hóa Quyền',star:'Tham Lang',branch:2,palace:'Cung 2'}];
 const r=auditAnnualEvidence(c,a,0);assert.equal(r.transformations.length,1);
 assert.equal(r.transformations[0].inFourCourts,true);
 assert.equal(r.rejectedTransformations.length,1);
 assert.equal(r.rejectedTransformations[0].reason,'unverified-natal-target');
});
test('V11.45 conflicting Hóa targets reject all even when one is a genuine natal star',()=>{
 const c=sample(),a=annual();insert(c,8,'Thiên Cơ');insert(c,0,'Liêm Trinh');
 a.luuTuHoa.items=[{name:'Hóa Lộc',star:'Thiên Cơ',branch:8}, {name:'Hóa Lộc',star:'Liêm Trinh',branch:0}];
 const r=auditAnnualEvidence(c,a,0);assert.equal(r.transformations.length,0);
 assert.equal(r.rejectedTransformations.length,2);
 assert.equal(r.rejectedTransformations.every(x=>x.reason==='conflicting-transformation-target'),true);
});
test('V11.45 duplicated natal target in two palaces is unverified rather than guessed',()=>{
 const c=sample(),a=annual();insert(c,0,'Thiên Cơ');insert(c,8,'Thiên Cơ');
 a.luuTuHoa.items=[{name:'Hóa Kỵ',star:'Thiên Cơ',branch:0}];
 const r=auditAnnualEvidence(c,a,0);assert.equal(r.transformations.length,0);
 assert.equal(r.rejectedTransformations[0].reason,'unverified-natal-target');
});
test('V11.45 validates period markers independently from annual-star layer',()=>{
 const c=sample(),a=annual();a.tieuHan={branchIndex:4,palace:'Cung 4'};
 a.activeDaiHan={branchIndex:8,palace:'Cung 8'};a.luuThaiTueBranchIndex=6;
 let r=auditAnnualEvidence(c,a,0);assert.equal(r.markers.length,3);
 a.tieuHan.palace='Mệnh';r=auditAnnualEvidence(c,a,0);assert.equal(r.markers.length,2);
});
test('V11.45 real engine fixture preserves original chart and annual records',()=>{
 const chart=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
 const a=Engine.annualOverview(chart,2026);const before=JSON.stringify([chart,a]);
 const menh=chart.houses.find(h=>h.palace==='Mệnh');
 const r=auditAnnualEvidence(chart,a,menh.branchIndex);
 assert.equal(r.stars.length,12);assert.equal(r.transformations.length,4);
 assert.equal(r.rejectedStars.length,0);assert.equal(r.rejectedTransformations.length,0);
 const study=examineNatalMultiStars(chart,menh.branchIndex,{annual:a,includeAnnual:true});
 assert.equal(study.annualOverlay.stars.every(s=>r.stars.some(x=>x.name===s.name&&x.branchIndex===s.branchIndex)),true);
 const reading=buildPalaceReading({chart,branchIndex:menh.branchIndex,annual:a,includeAnnual:true});
 assert.equal(reading.annualEvidence.scope,'annual-evidence-audit');
 assert.equal(buildPalaceReading({chart,branchIndex:menh.branchIndex,annual:a,includeAnnual:false}).annualEvidence,null);
 assert.equal(JSON.stringify([chart,a]),before);
});
test('V11.45 frontend presents separately audited annual evidence only in deep mode',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
 const panel=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/annual-evidence-panel.tsx'),'utf8');
 assert.match(src,/level==='deep'/);assert.match(src,/showAnnual&&<AnnualEvidencePanel data=\{reading\.annualEvidence\}/);
 assert.match(panel,/rejectedTransformations/);
 assert.doesNotMatch(panel,/fetch\(|\.calculate\(|astrology-engine/);
});
test('V11.45 fixture audit covers 22 charts, 44 years and 528 palace checks',()=>{
 const result=require('../infrastructure/scripts/audit-annual-evidence.cjs').audit();
 assert.equal(result.status,'PASS');assert.equal(result.stats.fixtures,22);
 assert.equal(result.stats.annualOverviews,44);assert.equal(result.stats.palaceChecks,528);
 assert.equal(result.stats.rejectedStars,0);assert.equal(result.stats.rejectedTransformations,0);
});
