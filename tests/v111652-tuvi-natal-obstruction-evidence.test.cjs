'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Advanced=require('../packages/astrology-engine/src/advanced-placements.js');
const {auditNatalObstructionEvidence:audit}=require('../packages/interpretation/src/natal-obstruction-evidence.cjs');
const {auditClassicalPatternCandidates:research}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const PALACES=['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];
function chart(menh=10){
 const advanced=Advanced.calculate({yearStem:0,yearBranch:0,hourBranch:0,gender:'Nam'});
 return {
  yearCanChi:'Giáp Tý',lunar:{year:1984},hour:23,hourBranch:'Tý',gender:'Nam',
  advancedStarRuleSet:Advanced.RULESET,
  obstructionMarkers:advanced.obstructions.map(x=>({...x,branches:[...x.branches]})),
  houses:Array.from({length:12},(_,i)=>({
   branchIndex:i,branch:String(i),palace:PALACES[(i-menh+12)%12],stars:[],
   auxiliaryStars:[],yearStars:[],additionalStars:[],advancedStars:[],
   obstructionMarkers:advanced.obstructions.filter(o=>o.branches.includes(i)).map(o=>o.name)
  }))
 };
}
test('r9 verifies pinned Tuần/Triệt once for all 12 houses, without mutating the chart',()=>{
 const c=chart(10), before=JSON.stringify(c);
 const x=audit(c);
 assert.equal(x.verified,true);
 assert.equal(x.ruleSet,Advanced.RULESET);
 assert.deepEqual(x.atMenh,['Tuần']);
 assert.equal(JSON.stringify(c),before);
 assert.deepEqual(audit(chart(8)).atMenh,['Triệt']);
});
test('r9 absence of both paired obstructions at Mệnh is NOT absence of Không Vong',()=>{
 const x=audit(chart(0));
 assert.equal(x.verified,true);
 assert.deepEqual(x.atMenh,[]);
 assert.match(x.reason,/Không đủ loại trừ các dạng Không Vong khác/);
});
test('r9 rejects missing or incorrect source version and root marker count',()=>{
 const noVersion=chart();delete noVersion.advancedStarRuleSet;
 assert.equal(audit(noVersion).verified,false);
 const wrongVersion=chart();wrongVersion.advancedStarRuleSet='different-school';
 assert.equal(audit(wrongVersion).verified,false);
 const missing=chart();missing.obstructionMarkers=[];
 assert.equal(audit(missing).verified,false);
 const duplicated=chart();duplicated.obstructionMarkers.push({...duplicated.obstructionMarkers[0]});
 assert.equal(audit(duplicated).verified,false);
});
test('r9 rejects wrong root pair, incorrect branch order and forged provenance',()=>{
 const wrongBranch=chart();wrongBranch.obstructionMarkers[0].branches=[0,1];
 assert.equal(audit(wrongBranch).verified,false);
 const reversed=chart();reversed.obstructionMarkers[0].branches.reverse();
 assert.equal(audit(reversed).verified,false);
 const wrongMethod=chart();wrongMethod.obstructionMarkers[0].basis='other-school';
 assert.equal(audit(wrongMethod).verified,false);
 const changedRuleSet=chart();changedRuleSet.obstructionMarkers[0].ruleSet='forged';
 assert.equal(audit(changedRuleSet).verified,false);
});
test('r9 rejects missing, duplicated or forged per-house markers',()=>{
 const extra=chart();extra.houses[0].obstructionMarkers=['Tuần'];
 assert.equal(audit(extra).verified,false);
 const removed=chart();removed.houses[10].obstructionMarkers=[];
 assert.equal(audit(removed).verified,false);
 const nullList=chart();delete nullList.houses[11].obstructionMarkers;
 assert.equal(audit(nullList).verified,false);
 const duplicateBranch=chart();duplicateBranch.houses[0].branchIndex=1;
 assert.equal(audit(duplicateBranch).verified,false);
 const wrongOrder=chart(8);wrongOrder.houses[8].obstructionMarkers.reverse();
 // A single marker has no meaningful permutation; use an explicit duplicate instead.
 wrongOrder.houses[8].obstructionMarkers=['Triệt','Triệt'];
 assert.equal(audit(wrongOrder).verified,false);
});
test('r9 requires consistent year-stem, lunar year, hour and gender metadata',()=>{
 const year=chart();year.yearCanChi='Ất Sửu';
 assert.equal(audit(year).verified,false);
 const lunar=chart();lunar.lunar.year=1985;
 assert.equal(audit(lunar).verified,false);
 const hour=chart();hour.hour=7;
 assert.equal(audit(hour).verified,false);
 const invalidHour=chart();invalidHour.hourBranch='Rồng';
 assert.equal(audit(invalidHour).verified,false);
 const gender=chart();gender.gender='Khác';
 assert.equal(audit(gender).verified,false);
 const missingHour=chart();delete missingHour.hour;
 assert.equal(audit(missingHour).verified,true,'Optional civil hour can be absent if verified branch remains');
});
test('r9 keeps classical Không Vong unresolved, even when natal Tuần/Triệt pass',()=>{
 const c=chart(10);
 const result=research(c);
 const candidate=result.records.find(x=>x.id==='dinh-quy-01');
 assert.equal(result.assessed,27);
 assert.equal(result.obstructionAudit.verified,true);
 assert.equal(candidate.status,'needs-review');
 assert.equal(candidate.checks.at(-2).state,'met');
 assert.equal(candidate.checks.at(-1).state,'unknown');
 assert.match(candidate.checks.at(-1).detail,/Không Vong/);
});
test('r9 integration shows a bounded standalone evidence panel with no prediction or extra navigation tab',()=>{
 const fs=require('node:fs');
 const path=require('node:path');
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(ui,/obstructionAudit\.verified/);
 assert.match(ui,/obstructionAudit\.atMenh/);
 assert.match(ui,/không được dùng để tự kết luận mọi loại Không Vong/);
 const rules=fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/classical-pattern-research.cjs'),'utf8');
 assert.match(rules,/auditNatalObstructionEvidence\(chart\)/);
 assert.match(rules,/Đối chiếu đầy đủ điều kiện Không Vong',null/);
});
