'use strict';
const {test}=require('node:test'); const assert=require('node:assert/strict');
const {composePalaceReading}=require('../packages/interpretation/src/contextual-synthesis.cjs');
test('combines real stars from same palace without inventing other placements',()=>{
 const r=composePalaceReading({name:'Quan Lộc',stars:['Tử Vi','Tả Phụ','Hữu Bật']});
 assert.equal(r.primaryStars.length,1);assert.equal(r.primaryStars[0].star,'Tử Vi');
 assert.ok(r.combinations.some(x=>x.id==='phu-bat-dong-cung'));
 assert.equal(r.transformations.length,0);assert.equal(r.quality.validatedByExpert,false);
});
test('does not merge annual stars into natal reading',()=>{
 const r=composePalaceReading({name:'Mệnh',stars:['Tử Vi','Tả Phụ'],yearStars:['Hữu Bật']});
 assert.ok(!r.combinations.some(x=>x.id==='phu-bat-dong-cung'));
});
test('rejects malformed arrays and avoids prototype injection',()=>{
 assert.throws(()=>composePalaceReading({name:'Mệnh',stars:'Tử Vi'}),TypeError);
 assert.throws(()=>composePalaceReading({stars:[]}),TypeError);
 assert.equal(composePalaceReading({name:'__proto__',stars:['Tử Vi']}).primaryStars.length,0);
});
test('only attaches transformation if its target is really in this house',()=>{
 const r=composePalaceReading({name:'Mệnh',stars:['Tử Vi'],tuHoa:[{name:'Hóa Lộc',star:'Thiên Cơ'},{name:'Hóa Quyền',star:'Tử Vi'}]});
 assert.equal(r.transformations.length,1);assert.equal(r.transformations[0].target,'Tử Vi');
});
