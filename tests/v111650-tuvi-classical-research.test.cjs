'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {auditClassicalPatternCandidates:study}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const NAMES=['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];
function chart(menh=0,sites={}){
 const houses=Array.from({length:12},(_,i)=>({branchIndex:i,branch:String(i),palace:NAMES[(i-menh+12)%12],stars:[],auxiliaryStars:[],yearStars:[]}));
 for(const [name,entry] of Object.entries(sites))houses[entry[0]][entry[1]??'stars'].push(name);
 return {houses};
}
const item=(r,id)=>r.records.find(x=>x.id===id);
test('Six research rules must not claim full 49 classical structures',()=>{
 const r=study(chart());
 assert.equal(r.assessed,6);assert.equal(r.referenceTotal,49);
 assert.equal(r.groups.reduce((n,g)=>n+g.totalInReference,0),49);
 assert.equal(r.groups.reduce((n,g)=>n+g.implementedHere,0),6);
 assert.equal(new Set(r.records.map(x=>x.id)).size,6);
 assert.equal(r.expertReviewed,false);
 assert.equal(r.records.every(x=>x.status!=='structural-match'),true);
});
test('Sun in Mao, with Mao as Menh, matches source-defined geometry',()=>{
 const r=study(chart(3,{'Thái Dương':[3],'Thái Âm':[8],'Vũ Khúc':[7],'Thiên Mã':[5,'yearStars'],'Lộc Tồn':[6,'auxiliaryStars']}));
 assert.equal(item(r,'dinh-quy-02').status,'structural-match');
});
test('Sun alone in Menh at Ngo required for Kim xan quang huy',()=>{
 const s={'Thái Dương':[6],'Thái Âm':[0],'Vũ Khúc':[1],'Thiên Mã':[5,'yearStars'],'Lộc Tồn':[4,'auxiliaryStars']};
 assert.equal(item(study(chart(6,s)),'dinh-phu-06').status,'structural-match');
 const c=chart(6,s);c.houses[6].stars.push('Thất Sát');
 assert.equal(item(study(c),'dinh-phu-06').status,'not-met');
});
test('Both Sun and Moon must be in Dien Trach, not just in related palaces',()=>{
 const s={'Thái Dương':[3],'Thái Âm':[3],'Vũ Khúc':[5],'Thiên Mã':[6,'yearStars'],'Lộc Tồn':[1,'auxiliaryStars']};
 assert.equal(item(study(chart(0,s)),'dinh-phu-05').status,'structural-match');
 s['Thái Âm']=[4];
 assert.equal(item(study(chart(0,s)),'dinh-phu-05').status,'not-met');
});
test('Flanking Menh is unresolved until Khong Vong prerequisites can be checked',()=>{
 const r=study(chart(0,{'Thái Dương':[11],'Thái Âm':[1],'Vũ Khúc':[5],'Thiên Mã':[6,'yearStars'],'Lộc Tồn':[8,'auxiliaryStars'],'Tả Phụ':[0,'auxiliaryStars']}));
 assert.equal(item(r,'dinh-quy-01').status,'needs-review');
 assert.equal(item(r,'dinh-quy-01').checks.at(-1).state,'unknown');
});
test('Flanking geometry is adjacent ±1, not two palaces away',()=>{
 const a=study(chart(0,{'Vũ Khúc':[8],'Thái Âm':[7],'Thái Dương':[9],'Thiên Mã':[6,'yearStars'],'Lộc Tồn':[1,'auxiliaryStars']}));
 assert.equal(item(a,'dinh-phu-02').status,'structural-match');
 const b=study(chart(0,{'Vũ Khúc':[11],'Thái Âm':[4],'Thái Dương':[5],'Thiên Mã':[0,'yearStars'],'Lộc Tồn':[1,'auxiliaryStars']}));
 assert.equal(item(b,'dinh-phu-03').status,'structural-match');
});
test('Duplicate stars or a matching name in the wrong layer cannot confirm a formation',()=>{
 const c=chart(3,{'Thái Dương':[3],'Thái Âm':[7],'Vũ Khúc':[8],'Thiên Mã':[6,'yearStars'],'Lộc Tồn':[1,'auxiliaryStars']});
 c.houses[2].stars.push('Thái Dương');
 assert.equal(item(study(c),'dinh-quy-02').status,'needs-review');
 c.houses[2].stars=[];c.houses[3].stars=[];c.houses[3].auxiliaryStars.push('Thái Dương');
 assert.equal(item(study(c),'dinh-quy-02').status,'needs-review');
});
test('Invalid chart geometry is rejected and source chart is not mutated',()=>{
 const c=chart(0,{'Thái Dương':[3]});const before=JSON.stringify(c);
 study(c);assert.equal(JSON.stringify(c),before);
 assert.throws(()=>study({houses:[...c.houses.slice(0,11)]}),/12 cung/);
 const bad=chart();bad.houses[0].branchIndex=1;assert.throws(()=>study(bad),/trùng lặp/);
});
