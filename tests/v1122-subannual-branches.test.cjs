'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {calculateSubannualBranches}=require('../packages/astrology-engine/src/subannual-placements.js');
const {getSubannualResearch,getTemporalExplorer}=require('../packages/interpretation/src/temporal-explorer.cjs');
const I=require('../packages/interpretation/src/index.cjs');
const c=Engine.calculate({date:'2004-05-14',calendar:'solar',gender:'Nam',hour:12,minute:0});
const mod=x=>(x%12+12)%12;
test('V11.22: anchor follows annual Thai Tue, birth lunar month and natal hour, not the selected hour',()=>{
 for(const year of [2025,2026,2031]){
  const r=calculateSubannualBranches(c,{year,month:1,day:1,hour:0});
  const expected=mod(mod(year-4)-(c.lunar.month-1)+Math.floor(((c.hour+1)%24)/2));
  assert.equal(r.dauQuan.branchIndex,expected);
  assert.equal(r.luuNguyet.branchIndex,expected);
  assert.equal(r.annualThaiTue.branchIndex,mod(year-4));
 }
});
test('V11.22: month advances one house per numbered lunar month',()=>{
 const base=getSubannualResearch(c,2026,1,false,1,0);
 for(let month=1;month<=12;month++){
  const r=getSubannualResearch(c,2026,month,false,1,0);
  assert.equal(r.luuNguyet.branchIndex,mod(base.luuNguyet.branchIndex+month-1));
 }
});
test('V11.22: each lunar day advances one house and repeats on day 13',()=>{
 const base=getSubannualResearch(c,2026,2,false,1,0);
 for(let day=1;day<=25;day++){
  const r=getSubannualResearch(c,2026,2,false,day,0);
  assert.equal(r.luuNhat.branchIndex,mod(base.luuNguyet.branchIndex+day-1));
 }
 assert.equal(getSubannualResearch(c,2026,2,false,1,0).luuNhat.branchIndex,getSubannualResearch(c,2026,2,false,13,0).luuNhat.branchIndex);
});
test('V11.22: 23:00 uses Tý=0; 01:00 moves to Sửu=1',()=>{
 const d=getSubannualResearch(c,2026,2,false,1,23);
 assert.equal(d.luuThoi.branchIndex,d.luuNhat.branchIndex);
 const second=getSubannualResearch(c,2026,2,false,1,1);
 assert.equal(second.luuThoi.branchIndex,mod(d.luuThoi.branchIndex+1));
});
test('V11.22: 2025 leap-six repeats same monthly palace without fabricating a 14th month',()=>{
 const r=getSubannualResearch(c,2025,6,false,1,12);
 const leap=getSubannualResearch(c,2025,6,true,1,12);
 assert.equal(r.luuNguyet.branchIndex,leap.luuNguyet.branchIndex);
 assert.equal(leap.monthIsLeap,true);assert.equal(leap.leapPolicy,'repeat-regular-month');
 const july=getSubannualResearch(c,2025,7,false,1,12);
 assert.equal(july.luuNguyet.branchIndex,mod(r.luuNguyet.branchIndex+1));
});
test('V11.22: invalid lunar dates and missing leap months are rejected',()=>{
 assert.throws(()=>getSubannualResearch(c,2026,6,true,1,12),RangeError);
 assert.throws(()=>getSubannualResearch(c,2025,6,true,31,12),RangeError);
 assert.throws(()=>getSubannualResearch(c,2026,1,false,1,-1),RangeError);
 assert.throws(()=>calculateSubannualBranches(c,{year:2026,month:1,day:0,hour:12}),RangeError);
 assert.throws(()=>calculateSubannualBranches(c,{year:2026,month:6,leap:true,day:1,hour:12}),RangeError);
});
test('V11.22: error on malformed birth inputs and incomplete houses, not silent fallback',()=>{
 const broken=structuredClone(c);broken.houses.pop();
 assert.throws(()=>calculateSubannualBranches(broken,{year:2026,month:1,day:1,hour:12}),TypeError);
 const mutated=structuredClone(c);mutated.lunar.month=13;
 assert.throws(()=>calculateSubannualBranches(mutated,{year:2026,month:1,day:1,hour:12}),TypeError);
});
test('V11.22: outputs must be valid named branches with the actual chart palace',()=>{
 for(let month=1;month<=12;month++){
  const r=getSubannualResearch(c,2026,month,false,10,22);
  for(const x of [r.annualThaiTue,r.dauQuan,r.luuNguyet,r.luuNhat,r.luuThoi]){
   assert.ok(x.branchIndex>=0&&x.branchIndex<12);
   assert.equal(x.palace,c.houses.find(h=>h.branchIndex===x.branchIndex).palace);
  }
 }
});
test('V11.22: 22 baseline charts remain immutable and annual layers unchanged after new drill-down',()=>{
 for(let birth=1990;birth<2012;birth++){
  const chart=Engine.calculate({date:`${birth}-08-17`,calendar:'solar',gender:birth%2?'Nữ':'Nam',hour:(birth%12)*2,minute:0});
  const before=JSON.stringify(chart);
  const annual=Engine.annualOverview(chart,2030);
  const r=getSubannualResearch(chart,2030,2,false,12,8);
  assert.equal(JSON.stringify(chart),before);
  assert.equal(r.coverage.monthlyStars,false);
  assert.equal(r.coverage.dailyStars,false);
  assert.equal(r.coverage.hourlyStars,false);
  assert.equal(Engine.annualOverview(chart,2030).tieuHan.branchIndex,annual.tieuHan.branchIndex);
 }
});
test('V11.22: research requires opt-in and source URLs never appear in the user UI',()=>{
 assert.equal(typeof I.getSubannualResearch,'function');
 const ui=readFileSync('apps/web/src/features/chart/components/temporal-detail.tsx','utf8');
 assert.match(ui,/useState\(false\)/);assert.match(ui,/showResearch\?/);
 assert.match(ui,/getSubannualResearch\(/);assert.match(ui,/HẠN THÁNG/);
 assert.match(ui,/Chưa tính các sao lưu riêng/);assert.doesNotMatch(ui,/hocvienlyso\.org|sourcePath|referenceUrl/);
 assert.ok(!('luuNguyet' in getTemporalExplorer(c,2026,2,false,1,8)));
});
