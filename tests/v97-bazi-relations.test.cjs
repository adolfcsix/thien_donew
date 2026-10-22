'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const BaZi=require('../packages/astrology-engine/src/bazi.js');
const keys=['year','month','day','hour'];
function synthetic(stems,branches){return Object.fromEntries(keys.map((key,i)=>[key,{stemIndex:stems[i],branchIndex:branches[i]}]));}
function contacts(stems,branches){return BaZi.detectRelations(synthetic(stems,branches));}
test('V9.7 Ngũ Hợp: all five exact pairs and transformation direction labels',()=>{
 const pairs=[[0,5,'Thổ'],[1,6,'Kim'],[2,7,'Thủy'],[3,8,'Mộc'],[4,9,'Hỏa']];
 for(const [a,b,element] of pairs){
  for(const [x,y] of [[a,b],[b,a]]){
   const r=contacts([x,y,x,x],[0,2,4,6]);
   assert.equal(r.stemCombinations.length,3);
   assert.ok(r.stemCombinations.every(e=>e.traditionalElement===element));
   assert.deepEqual(r.stemCombinations[0].pillars,['year','month']);
  }
 }
});
test('V9.7 Can Xung only four fixed pairs; Mậu Kỷ have no direct Can Xung',()=>{
 for(const [a,b] of [[0,6],[1,7],[2,8],[3,9]]){
  const r=contacts([a,b,a,a],[0,2,4,6]);assert.equal(r.stemClashes.length,3);
 }
 assert.equal(contacts([4,5,4,5],[0,2,4,6]).stemClashes.length,0);
});
test('V9.7 Lục Hợp: six Chi pairs detected bidirectionally',()=>{
 for(const [a,b] of [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]]){
  assert.deepEqual(contacts([0,2,4,6],[a,b,a,a]).branchCombinations[0].pillars,['year','month']);
  assert.deepEqual(contacts([0,2,4,6],[b,a,a,a]).branchCombinations[0].pillars,['year','month']);
 }
});
test('V9.7 Lục Xung: six Chi opposing pairs',()=>{
 for(const [a,b] of [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]]){
  assert.deepEqual(contacts([0,2,4,6],[a,b,a,a]).branchClashes[0].pillars,['year','month']);
  assert.deepEqual(contacts([0,2,4,6],[b,a,a,a]).branchClashes[0].pillars,['year','month']);
 }
});
test('V9.7 Tam Hợp: require all three distinct Chi in three different pillars',()=>{
 const triads=[[[8,0,4],'Thủy'],[[11,3,7],'Mộc'],[[2,6,10],'Hỏa'],[[5,9,1],'Kim']];
 for(const [triad,element] of triads){
  const r=contacts([0,2,4,6],[...triad,triad[0]]);
  assert.equal(r.branchTriads.length,1);
  assert.equal(r.branchTriads[0].traditionalElement,element);
  assert.deepEqual(r.branchTriads[0].symbols,triad.map(i=>BaZi.BRANCHES[i]));
  const incomplete=contacts([0,2,4,6],[triad[0],triad[1],triad[1],triad[0]]);
  assert.equal(incomplete.branchTriads.length,0);
 }
});
test('V9.7 pair duplicates recorded per distinct source pillars, without fabricated weighted strength',()=>{
 const r=contacts([0,5,0,5],[0,1,0,1]);
 assert.equal(r.stemCombinations.length,4);
 assert.equal(r.branchCombinations.length,4);
 assert.equal(r.branchTriads.length,0);
 assert.match(r.note,/không.*hóa khí/i);
});
test('V9.7 independent detection rejects malformed pillar inputs, no silent modulo',()=>{
 for(const input of [null,{},synthetic([0,2,4,10],[0,2,4,6]),synthetic([0,2,4,6],[0,2,4,-1])])
  assert.throws(()=>BaZi.detectRelations(input));
});
test('V9.7 detection keeps input immutable even with repeat calls',()=>{
 const x=synthetic([0,5,6,2],[1,0,2,11]);const before=structuredClone(x);
 const a=BaZi.detectRelations(x);a.stemCombinations[0].symbols[0]='BAD';
 const b=BaZi.detectRelations(x);
 assert.deepEqual(x,before);assert.notEqual(b.stemCombinations[0].symbols[0],'BAD');
 assert.equal(Object.isFrozen(BaZi.BRANCH_TRIADS),true);
});
test('V9.7 sampled real birth regression: four pillars unchanged and relation layer correct',()=>{
 const input={date:'2026-02-19',hour:10,minute:30};const r=BaZi.calculate(input);
 assert.deepEqual(keys.map(k=>r.pillars[k].name),['Bính Ngọ','Canh Dần','Giáp Tý','Kỷ Tỵ']);
 assert.deepEqual(r.relations,BaZi.detectRelations(r.pillars));
 assert.equal(r.relations.stemCombinations.length,1); // Giáp + Kỷ
 assert.deepEqual(r.relations.stemCombinations[0].symbols,['Giáp','Kỷ']);
 assert.equal(r.relations.branchTriads.length,0);
 assert.equal(r.hiddenStemsRuleSet,'zi-ping-common-hidden-stems-v9.6');
});
test('V9.7 recalculates relations with change of day rollover at 23:00',()=>{
 const input={date:'2026-02-19',hour:23};
 const a=BaZi.calculate({...input,dayBoundary:'midnight'});
 const b=BaZi.calculate({...input,dayBoundary:'late-zi'});
 assert.notEqual(a.pillars.day.name,b.pillars.day.name);
 assert.deepEqual(b.relations,BaZi.detectRelations(b.pillars));
 assert.notDeepEqual(a.relations,b.relations);
});
test('V9.7 no automatic pillar transformation, strength or luck grading',()=>{
 const r=BaZi.calculate({date:'2026-02-19',hour:10});
 assert.equal(r.elementCounts['Mộc'],1);
 assert.ok(!('transformedPillars' in r));
 assert.ok(!('luckScore' in r.relations));
});
test('V9.7 Next type contract, route, CSS and standalone runtime markup integrated',()=>{
 const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 assert.match(read('packages/astrology-engine/src/index.d.ts'),/relations:BaZiRelations/);
 assert.match(read('apps/web/src/app/bazi/page.tsx'),/result\.relations\.branchTriads/);
 assert.match(read('apps/web/src/app/bazi/page.tsx'),/đã có Thập Thần, Tàng Can/);
 assert.match(read('apps/web/src/app/bazi.css'),/bz-relation-group/);
 const html=read('tools/offline/bazi.html');assert.match(html,/id="relations"/);
 assert.match(html,/data\.relations\[key\]/);
 assert.match(html,/Bát Tự/);
 assert.match(read('docs/reference/bazi-relations-v9-7.md'),/chưa kiểm định/i);
});
