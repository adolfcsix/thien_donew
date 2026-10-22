'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {adjacentPalacePatterns}=require('../packages/knowledge/src/index.cjs');
const {matchAdjacentPatterns,compareMenhThan,buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const chart=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
const focus=chart.houses.find(h=>h.palace==='Mệnh').branchIndex;
const left=(focus+11)%12,right=(focus+1)%12;
function c(){const clone=structuredClone(chart);for(const h of clone.houses){
 for(const key of ['stars','auxiliaryStars','yearStars','additionalStars','advancedStars'])h[key]=[];
}return clone;}
function at(c,i){return c.houses.find(h=>h.branchIndex===i);}
function place(c,star,i,key='auxiliaryStars'){at(c,i)[key].push(star);}
function byId(c,index=focus){return matchAdjacentPatterns(c,index).map(m=>m.id);}
test('V11.11: six uniquely named pair definitions with cautious guidance',()=>{
 assert.equal(adjacentPalacePatterns.length,6);assert.equal(new Set(adjacentPalacePatterns.map(x=>x.id)).size,6);
 for(const r of adjacentPalacePatterns){assert.equal(r.stars.length,2);assert.equal(new Set(r.stars).size,2);
  assert.ok(r.interpretation.length>65);assert.ok(r.caution.length>30);}
});
test('V11.11: each pair matches only when the two sides are occupied',()=>{
 for(const r of adjacentPalacePatterns){const x=c();place(x,r.stars[0],left);place(x,r.stars[1],right);
   const match=matchAdjacentPatterns(x,focus).find(m=>m.id===r.id);assert.ok(match,r.id);
   assert.deepEqual(match.evidence.placements.map(p=>p.branchIndex),[left,right]);
   assert.deepEqual(match.evidence.placements.map(p=>p.side),['Kề trước','Kề sau']);}
});
test('V11.11: reversing star positions is also valid',()=>{
 for(const r of adjacentPalacePatterns){const x=c();place(x,r.stars[0],right);place(x,r.stars[1],left);
   assert.ok(byId(x).includes(r.id),r.id);}
});
test('V11.11: one missing star must not create a match',()=>{
 for(const r of adjacentPalacePatterns){const x=c();place(x,r.stars[0],left);assert.ok(!byId(x).includes(r.id));}
});
test('V11.11: same-house and focus-house pairs are not giáp cung',()=>{
 for(const r of adjacentPalacePatterns){const x=c();place(x,r.stars[0],left);place(x,r.stars[1],left);
   assert.ok(!byId(x).includes(r.id));place(x,r.stars[1],right);assert.ok(!byId(x).includes(r.id));
   const y=c();place(y,r.stars[0],focus);place(y,r.stars[1],right);assert.ok(!byId(y).includes(r.id));}
});
test('V11.11: stars in Tam hợp or distant branches are not adjacent',()=>{
 for(const r of adjacentPalacePatterns){const x=c();place(x,r.stars[0],(focus+4)%12);place(x,r.stars[1],right);
   assert.ok(!byId(x).includes(r.id),r.id);}
});
test('V11.11: duplicate placement in another house invalidates evidence',()=>{
 const r=adjacentPalacePatterns[0],x=c();place(x,r.stars[0],left);place(x,r.stars[1],right);
 place(x,r.stars[0],(focus+2)%12);assert.ok(!byId(x).includes(r.id));
});
test('V11.11: annual and cycle stars cannot impersonate natal stars',()=>{
 const r=adjacentPalacePatterns[0],x=c();
 at(x,left).annualStars=[r.stars[0]];at(x,right).cycleStars={thaiTue:[r.stars[1]],bacSi:[],trangSinh:[]};
 assert.ok(!byId(x).includes(r.id));
});
test('V11.11: adjacency wraps at branch zero correctly',()=>{
 const x=c(),r=adjacentPalacePatterns[0];place(x,r.stars[0],11);place(x,r.stars[1],1);
 const m=matchAdjacentPatterns(x,0).find(m=>m.id===r.id);assert.ok(m);assert.deepEqual(m.evidence.placements.map(p=>p.branchIndex),[11,1]);
});
test('V11.11: engine Mệnh–Thân fields produce consistent positional comparison',()=>{
 const m=compareMenhThan(chart,focus);assert.equal(m.status,'verified');assert.equal(m.menh.palace,'Mệnh');
 assert.equal(m.than.palace,chart.thanPalace);assert.equal(m.than.branch,chart.than);
 assert.equal(m.relevant,true);assert.equal(compareMenhThan(chart,(focus+1)%12).relevant,false);
});
test('V11.11: same-palace Thân cư Mệnh is described as one location',()=>{
 const chart2=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nữ',hour:0,minute:15});
 const m=chart2.houses.find(h=>h.palace==='Mệnh');const t=compareMenhThan(chart2,m.branchIndex);
 assert.equal(t.status,'verified');assert.equal(t.scope,'Thân cư Mệnh');assert.equal(t.menh.branchIndex,t.than.branchIndex);
});
test('V11.11: contradictory than marker or metadata is safely unavailable',()=>{
 const x=structuredClone(chart);x.than='Hư cấu';assert.equal(compareMenhThan(x,focus).status,'unavailable');
 const y=structuredClone(chart);y.houses.find(h=>h.isThan).isThan=false;assert.equal(compareMenhThan(y,focus).status,'unavailable');
 const z=structuredClone(chart);z.thanPalace='Mệnh sai';assert.equal(compareMenhThan(z,focus).status,'unavailable');
 const w=structuredClone(chart);w.houses.find(h=>h.palace!=='Mệnh').palace='Mệnh';assert.equal(compareMenhThan(w,focus).status,'unavailable');
});
test('V11.11: year viewing never changes natal giáp or Mệnh–Thân',()=>{
 const annual=Engine.annualOverview(chart,2026),before=JSON.stringify(chart);
 for(const h of chart.houses){
  const a=buildPalaceReading({chart,branchIndex:h.branchIndex});
  const b=buildPalaceReading({chart,branchIndex:h.branchIndex,annual,includeAnnual:true});
  assert.deepEqual(a.adjacentMatches,b.adjacentMatches);assert.deepEqual(a.menhThan,b.menhThan);
  assert.equal(a.coverage.adjacentPatternsEvaluated,6);
 }
 assert.equal(JSON.stringify(chart),before);
});
test('V11.11: selected house and 12 unique branches must be valid',()=>{
 assert.throws(()=>matchAdjacentPatterns({},0),RangeError);
 assert.throws(()=>compareMenhThan(chart,-1),RangeError);
 const x=structuredClone(chart);x.houses[0].branchIndex=x.houses[1].branchIndex;
 assert.throws(()=>matchAdjacentPatterns(x,focus),RangeError);
});
test('V11.11: frontend exposes reader content without internal rules or references',()=>{
 const p=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
 assert.match(p,/reading\.adjacentMatches\.map/);assert.match(p,/reading\.menhThan\.status/);
 assert.match(p,/evidence\.placements/);assert.doesNotMatch(p,/item\.sourceUrl|rule\.source/);
});
