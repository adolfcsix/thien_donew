'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {SCHEMA,IDS,MODES,familiesAt,predicateModes,auditR62}=
 require('../infrastructure/scripts/tuvi-r33-r62-matched-source-void-controls.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const makeUnitRow=()=>({
 mingBranch:3,luBranch:3,horseBranch:5,sevenBranch:4,
 sourceVoidByName:{'旬空':[3],'副旬':[],'截路':[],
  '截空':[5],'空亡':[],'副截':[]},
 parts:{liemAtMing:true,luOrHuaLuAtMing:true,diKongAndDiJieAtMing:true}
});
test('R62 source-only family extraction never confuses canonical aliases and Thai/Vietnamese Void interpretations',()=>{
 const row=makeUnitRow();
 assert.equal(SCHEMA,'thiendo-r62-genuine-source-matched-controls-v1');
 assert.deepEqual(IDS,['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
 assert.deepEqual(MODES,['both','xun-only','jiekong-only','neither']);
 assert.deepEqual(familiesAt(row,3),{
  xun:true,jiekong:false,sourceNames:['旬空']
 });
 assert.deepEqual(familiesAt(row,5),{
  xun:false,jiekong:true,sourceNames:['截空']
 });
 const oldName=clone(row);
 oldName.sourceVoidByName['截空']=[];
 oldName.sourceVoidByName['截路']=[5];
 assert.deepEqual(familiesAt(oldName,5),{
  xun:false,jiekong:true,sourceNames:['截路']
 });
 const duplicate=clone(row);
 duplicate.sourceVoidByName['截路']=[5];
 assert.throws(()=>familiesAt(duplicate,5),/double-counted/);
 assert.throws(()=>familiesAt(row,12),/invalid branch/);
});
test('R62 predicate modes retain natal or major-period geometry and preserve a genuine mixed-family counterfactual',()=>{
 const row=makeUnitRow();
 const one=predicateModes(row,'dinh-ban-01',null);
 const two=predicateModes(row,'dinh-ban-02',null);
 const period=predicateModes(row,'dinh-tap-03',{branch:4});
 assert.equal(one.both,true);
 assert.equal(one['xun-only'],true);
 assert.equal(one['jiekong-only'],false);
 assert.equal(two.both,true);
 assert.equal(two.familyOnlyXun,true);
 assert.equal(period.both,true);
 assert.equal(period['xun-only'],false);
 assert.equal(period['jiekong-only'],false);
 assert.equal(period.onlyTogether,true);
 assert.equal(period.neither,false);
 const noVoidMing=clone(row);noVoidMing.mingBranch=9;
 assert.equal(predicateModes(noVoidMing,'dinh-ban-01',null).both,false);
 assert.throws(()=>predicateModes(row,'dinh-tap-03',null),/source period/);
 assert.throws(()=>predicateModes(row,'dinh-tap-03',{branch:12}),/source period/);
 assert.throws(()=>predicateModes(row,'unknown',null));
});
test('R62 genuine 960 charts yield 24/4 natal and 768 decade positive/negative matched controls without changing 31/49',()=>{
 assert.throws(()=>auditR62(null,null));
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const p=path.resolve(__dirname,'../.r61-pinned-source-void-predicate-observations.json');
 const b=path.resolve(__dirname,'../.r33-source-1989-root-cause-observations.json');
 for(const file of [p,b])assert.ok(fs.existsSync(file),'R62 genuine source missing: '+file);
 const source=JSON.parse(fs.readFileSync(p,'utf8'));
 const base=JSON.parse(fs.readFileSync(b,'utf8'));
 const before=JSON.stringify([source,base]);
 const result=auditR62(source,base);
 assert.equal(result.charts,960);
 assert.equal(result.dateGenderControlGroups,80);
 assert.equal(result.decadeContexts,11520);
 assert.equal(result.positiveContexts,796);
 assert.equal(result.matchedNegativeControlCount,796);
 assert.equal(result.genuineSourceDetectorVerified,true);
 assert.deepEqual(result.counts['dinh-ban-01'].contexts,960);
 assert.deepEqual(result.counts['dinh-ban-02'].contexts,960);
 assert.deepEqual(result.counts['dinh-tap-03'].contexts,11520);
 assert.equal(result.counts['dinh-ban-01'].sourcePositive,24);
 assert.equal(result.counts['dinh-ban-02'].sourcePositive,4);
 assert.equal(result.counts['dinh-tap-03'].sourcePositive,768);
 assert.equal(result.witnesses['dinh-ban-01'].length,24);
 assert.equal(result.witnesses['dinh-ban-02'].length,4);
 assert.equal(result.witnesses['dinh-tap-03'].length,768);
 assert.ok(result.witnesses['dinh-ban-02'].every(w=>
  w.positiveId!==w.negativeId&&w.positiveModes.both===true&&
  w.negativeModes.both===false&&w.comparisonKind===
   'same-date-gender-different-birth-hour-branch'&&
  w.matchedBirthInstant===false&&w.hourBranchDistance>=1));
 assert.ok(result.witnesses['dinh-tap-03'].every(w=>
  w.positiveId===w.negativeId&&w.positiveModes.both===true&&
  w.negativeModes.both===false&&w.comparisonKind===
   'same-chart-different-major-period'&&w.sameSourceChart===true&&
   w.sourcePositivePeriodStartAge!==w.sourceNegativePeriodStartAge));
 assert.equal(result.sourceSchoolParityVerified,false);
 assert.equal(result.semanticEquivalenceVerified,false);
 assert.equal(result.sourceToLocalPlacementParityVerified,false);
 assert.equal(result.alternateCalendarPolicyVerified,false);
 assert.equal(result.expertReviewed,false);
 assert.equal(result.mayIncreaseMapping,false);
 assert.equal(result.researchMapped,31);
 assert.equal(result.referenceTotal,49);
 assert.equal(result.mayChangeChartRules,false);
 assert.equal(JSON.stringify([source,base]),before,'R62 input mutated');
 assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.witnesses['dinh-ban-02']));
 assert.deepEqual(result,auditR62(source,base));
 const bad=clone(source);
 bad.hitCounts['dinh-ban-02']++;
 assert.throws(()=>auditR62(bad,base));
 const tampered=clone(source);
 tampered.records[0].sourcePredicates['dinh-ban-01']=
  !tampered.records[0].sourcePredicates['dinh-ban-01'];
 assert.throws(()=>auditR62(tampered,base));
 const duplicate=clone(source);
 duplicate.records[1].id=duplicate.records[0].id;
 assert.throws(()=>auditR62(duplicate,base));
 const wrongCommit=clone(source);
 wrongCommit.provenance.commit='unpinned';
 assert.throws(()=>auditR62(wrongCommit,base));
 console.log('R62 genuine matched source controls: 24+4 natal, 768 decade; '+
  JSON.stringify(result.counts)+'; 31/49 unchanged');
});
