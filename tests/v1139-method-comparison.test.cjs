'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=require('../packages/knowledge/src/method-comparison-profiles.json');
const {auditProfiles,lookupStudyPlacement}=require('../packages/knowledge/src/method-comparison.cjs');
const {auditMethodComparison}=require('../infrastructure/scripts/audit-method-comparison.cjs');
test('V11.39: study datasets are structurally complete and cross-linked to dossiers',()=>{
 const a=auditMethodComparison();assert.deepEqual(a.errors,[]);assert.equal(a.profiles,3);assert.equal(a.lookupEntries,32);assert.equal(a.deferred,1);
});
test('V11.39: Lưu Niên Văn Tinh depends on NATAL YEAR stem, not selected viewing year',()=>{
 const p=data.profiles.find(x=>x.id==='luu-nien-van-tinh-natal-stem');
 assert.equal(p.inputAxis,'natal-year-stem');assert.equal(Object.keys(p.lookup).length,10);
 assert.equal(lookupStudyPlacement(p.id,'Giáp').branch,'Tỵ');
 assert.equal(lookupStudyPlacement(p.id,'Nhâm').branch,'Dần');
 assert.equal(lookupStudyPlacement(p.id,'Quý').branch,'Mão');
});
test('V11.39: Hồng Diễm Bát Tự day-stem lookup is not a natal-year Tử Vi placement',()=>{
 const p=data.profiles.find(x=>x.id==='hong-diem-bazi-day-stem');
 assert.equal(p.inputAxis,'day-stem');assert.equal(p.system,'bat-tu-tu-tru-reference');
 assert.equal(lookupStudyPlacement(p.id,'Bính').branch,'Dần');
 assert.equal(lookupStudyPlacement(p.id,'Tân').branch,'Dậu');
 assert.ok(data.deferredMethods.some(x=>x.id==='hong-diem-tuvi-natal-stem'));
 assert.throws(()=>lookupStudyPlacement('hong-diem-tuvi-natal-stem','Giáp'),RangeError);
});
test('V11.39: Quán Sách offset is referenced from Tuế Kiến, not Tướng Tinh',()=>{
 const p=data.profiles.find(x=>x.id==='quan-sach-sui-qian-branch');
 assert.equal(p.inputAxis,'reference-year-branch');assert.equal(p.offset,3);
 for(let i=0;i<12;i++)assert.equal(lookupStudyPlacement(p.id,data.branches[i]).branch,data.branches[(i+3)%12]);
 assert.equal(lookupStudyPlacement(p.id,'Tý').branch,'Mão');
});
test('V11.39: no method result can be mistaken for a validated or activated star',()=>{
 for(const p of data.profiles){
  const inputs=p.inputAxis==='reference-year-branch'?data.branches:data.stems;
  for(const input of inputs){const output=lookupStudyPlacement(p.id,input);
   assert.equal(output.researchOnly,true);assert.equal(output.autoPlacement,false);assert.equal(output.expertReviewed,false);
   assert.equal(output.inputAxis,p.inputAxis);
  }
 }
});
test('V11.39: mismatched input type or out-of-range value cannot fall back silently',()=>{
 for(const pair of [['luu-nien-van-tinh-natal-stem','Tý'],['hong-diem-bazi-day-stem','Tý'],['quan-sach-sui-qian-branch','Giáp']])assert.throws(()=>lookupStudyPlacement(...pair),RangeError);
 for(const v of [1,null,undefined,{},['Giáp']])assert.throws(()=>lookupStudyPlacement('luu-nien-van-tinh-natal-stem',v),TypeError);
});
test('V11.39: corrupt mapping, cycle, source or safety gates are detected',()=>{
 const clone=()=>structuredClone(data);
 const missing=clone();delete missing.profiles[0].lookup['Giáp'];assert.ok(auditProfiles(missing).errors.some(x=>x.includes('Incomplete')));
 const circle=clone();circle.profiles[2].lookup['Tý']='Ngọ';assert.ok(auditProfiles(circle).errors.some(x=>x.includes('Cycle mismatch')));
 const safety=clone();safety.autoPlacement=true;assert.ok(auditProfiles(safety).errors.some(x=>x.includes('safety')));
 const sources=clone();sources.profiles[0].sources=[];assert.ok(auditProfiles(sources).errors.some(x=>x.includes('evidence')));
 const defer=clone();defer.deferredMethods=[];assert.ok(auditProfiles(defer).errors.some(x=>x.includes('deferred')));
});
test('V11.39: research UI cannot place stars or replace production engine',()=>{
 const component=fs.readFileSync(path.join(root,'apps/web/src/app/research/method-comparison-reference.tsx'),'utf8');
 const page=fs.readFileSync(path.join(root,'apps/web/src/app/research/page.tsx'),'utf8');
 assert.match(page,/<MethodComparisonReference \/>/);
 assert.match(component,/không phải kết quả lá số/);
 assert.doesNotMatch(component,/(?:from\s*['\"]|require\s*\()['\"][^'\"]*astrology-engine|\b(?:chartEngine|placeStars|createChart|calculateNatal)\s*\(/);
});
test('V11.39: study rules module does not mutate original dataset',()=>{
 const before=JSON.stringify(data);lookupStudyPlacement('quan-sach-sui-qian-branch','Tý');
 auditProfiles();assert.equal(JSON.stringify(data),before);
});
