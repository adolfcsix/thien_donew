 'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const D=require('../packages/astrology-engine/src/da-liu-ren-depth.cjs');
const S=require('../packages/astrology-engine/src/da-liu-ren-she-hai.cjs');
const {STEM_LODGING}=require('../packages/astrology-engine/src/da-liu-ren-four-lessons.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/v11144-yuanshushan-shehai.json'),'utf8'));
const make=(s,d,g,h='Tý')=>({dayStem:s,dayBranch:d,monthGeneral:g,divinationHour:h,dayNight:'manual',manualPeriod:'day'});
function fromFirstUpper(dayStem,upper){const k=(D.BRANCHES.indexOf(upper)-D.BRANCHES.indexOf(STEM_LODGING[dayStem])+12)%12;return D.BRANCHES[k];}
for(const row of fixture.rows){
 test(`Independent source ${row.reference}: ${row.dayStem}${row.dayBranch} can-top ${row.firstUpper}`,()=>{
  const input=make(row.dayStem,row.dayBranch,fromFirstUpper(row.dayStem,row.firstUpper));
  const value=D.buildDepth(input);
  assert.equal(value.fourLessons.lessons[0].upper,row.firstUpper);
  assert.equal(value.verdict,'derived-subroutine-only');
  assert.deepEqual(value.transmissions.sequence,row.expected);
  assert.ok(value.sheHai?.scored.length>=2);
  assert.equal(value.ruleSet,D.RULESET);
 });
}
test('Traveled road counts both 12 earth branches and exactly one placement per 10 lodged stems',()=>{
 const x=D.buildDepth(make('Giáp','Thìn','Thân'));
 const [a,b]=x.sheHai.scored;
 assert.deepEqual([a.upper,a.startEarth,a.count,b.upper,b.startEarth,b.count],['Tuất','Dần',4,'Tý','Thìn',5]);
 assert.deepEqual(a.hits.map(h=>h.value),['Dần','Giáp','Mão','Ất']);
 assert.deepEqual(b.hits.map(h=>h.value),['Thìn','Mậu','Mùi','Kỷ','Tuất']);
 assert.equal(a.passage[0].earth,'Dần');assert.equal(a.passage.at(-1).earth,a.homeEarth);
 for(const c of [a,b]){assert.equal(c.hits.length,c.count);assert.ok(Object.isFrozen(c));assert.ok(Object.isFrozen(c.passage));}
 assert.deepEqual(Object.values(S.STEMS_AT).flat().sort(),['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'].sort());
});
test('Fan Yin special exceptions apply only to classical Wu Chen and Wu Xu with exact layout',()=>{
 for(const branch of ['Thìn','Tuất']){const x=D.buildDepth(make('Mậu',branch,'Ngọ'));assert.equal(x.subtype,'vo-y-zhui-xia-source-exception');assert.deepEqual(x.transmissions.sequence,['Hợi','Tỵ','Hợi']);assert.equal(x.sourceException,'yuanshushan-wu-chen-wu-xu-fan-yin');}
 const other=D.buildDepth(make('Giáp','Tý','Ngọ'));assert.notEqual(other.sourceException,'yuanshushan-wu-chen-wu-xu-fan-yin');
});
test('All 720 sexagenary days × 12 month generals (hour Tý) are resolved without invented fallback',()=>{
 const counts={},stages={};let n=0;
 for(let i=0;i<60;i++)for(const general of D.BRANCHES){
  const x=D.buildDepth(make(D.STEMS[i%10],D.BRANCHES[i%12],general));++n;
  assert.equal(x.verdict,'derived-subroutine-only');assert.equal(x.transmissions.sequence.length,3);
  assert.ok(x.transmissions.sequence.every(b=>D.BRANCHES.includes(b)));
  counts[x.gate]=(counts[x.gate]||0)+1;
  if(x.sheHai){assert.ok(x.sheHai.scored.length>=2);stages[x.sheHai.stage]=(stages[x.sheHai.stage]||0)+1;}
 }
 assert.equal(n,720);assert.equal(counts['she-hai'],76);assert.equal(counts['fan-yin'],60);
 assert.equal(stages['unresolved-tie'],2);assert.equal(stages['zhui-xia'],1);assert.equal(stages['jian-ji'],9);assert.equal(stages['cha-wei'],2);
});
test('Legacy persisted snapshots preserve v11.132 method and old unresolved while new method resolves',()=>{
 const input=make('Đinh','Mão','Sửu');
 const legacy=D.buildDepthByMethod(input,D.LEGACY_RULESET),modern=D.buildDepthByMethod(input,D.RULESET);
 assert.equal(legacy.verdict,'unresolved');assert.equal(legacy.gate,'she-hai');assert.equal(modern.verdict,'derived-subroutine-only');
 assert.equal(legacy.ruleSet,D.LEGACY_RULESET);assert.equal(modern.ruleSet,D.RULESET);
 for(const method of [D.LEGACY_RULESET,D.RULESET]){
  const snapshot={method,...input,source:'calendar externally reviewed'};
  assert.deepEqual(D.validateDaLiuRenSnapshot(snapshot),snapshot);
 }
 for(const raw of [{method:'invented',...input},{method:D.RULESET,...input,outcome:'trust-me'},{method:D.LEGACY_RULESET,...input,dayBranch:'Tý'}])assert.throws(()=>D.validateDaLiuRenSnapshot(raw));
});
test('Source UI explicitly selects legacy versus latest methods, imports and saves exact method',()=>{
 const ui=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/dai-luc-nham/depth-panel.tsx'),'utf8');
 assert.match(ui,/LEGACY_RULESET/);assert.match(ui,/setMethod\(snap.method\)/);assert.match(ui,/buildDepthByMethod\(profile,snap.method\)/);
 assert.match(ui,/snapshot:\{method,\.\.\.input/);assert.match(ui,/report\.sheHai\.scored/);
 const api=fs.readFileSync(path.resolve(__dirname,'../apps/api/src/modules/study/study-validation.ts'),'utf8');assert.match(api,/validateDaLiuRenSnapshot\(input\)/);
});
