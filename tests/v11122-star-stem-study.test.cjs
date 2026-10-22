'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../packages/knowledge/src/star-stem-study.cjs');
const M=require('../packages/knowledge/src/star-system-matrix.cjs');
test('captured Hồng Diễm source table is explicit, birth-stem scoped and never a matrix placement',()=>{
 const expected=['Ngọ','Thân','Dần','Mùi','Thìn','Thìn','Ngọ','Dậu','Tý','Thân'];
 assert.deepEqual(S.stems.map((_,i)=>S.stemStudy(i).hongDiem.branch),expected);
 assert.equal(new Set(expected).size,7);for(let i=0;i<10;i++){const r=S.stemStudy(i);assert.equal(r.automaticPlacement,false);assert.equal(r.input,'birth-year-stem');assert.equal(r.hongDiem.evidenceLevel,'author-published-algorithm-table-not-independent-chart');}
 assert.ok(!M.catalogRows().some(r=>r.name==='Hồng Diễm'));assert.equal(M.counts().natalAndCycle,104);
});
test('Văn Tinh source disagreements and Giáp transcription conflict remain independently visible',()=>{
 assert.deepEqual(S.stems.filter((_,i)=>S.stemStudy(i).vanTinhTableDisagrees),['Đinh','Kỷ','Tân','Nhâm']);
 const g=S.stemStudy(0);assert.equal(g.vanTinhTableDisagrees,false);assert.deepEqual(g.transcriptionConflict,{stem:'Giáp',table:'Tý',verse:'Tỵ'});
 assert.deepEqual(S.stemStudy(3).vanTinh.map(r=>r.branch),['Dần','Dậu']);
});
test('research source selector rejects malformed stems instead of converting a Gregorian or annual year',()=>{
 for(const input of [-1,10,0.5,'0','Giáp',2026,null,undefined,NaN])assert.throws(()=>S.stemStudy(input));
});
test('research table outputs cannot alter captured source or a later lookup',()=>{
 const r=S.stemStudy(0);r.hongDiem.branch='fake';r.vanTinh[0].branch='fake';r.transcriptionConflict.table='fake';
 assert.equal(S.stemStudy(0).hongDiem.branch,'Ngọ');assert.equal(S.stemStudy(0).vanTinh[0].branch,'Tỵ');assert.equal(S.stemStudy(0).transcriptionConflict.table,'Tý');
});
