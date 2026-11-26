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
 assert.deepEqual(result.counts,{
  'dinh-ban-01':{contexts:960,sourcePositive:24,xunOnlyPositive:16,
   jiekongOnlyPositive:8,onlyTogether:0,familyOnlyXun:16,familyOnlyJiekong:8},
  'dinh-ban-02':{contexts:960,sourcePositive:4,xunOnlyPositive:2,
   jiekongOnlyPositive:2,onlyTogether:0,familyOnlyXun:2,familyOnlyJiekong:2},
  'dinh-tap-03':{contexts:11520,sourcePositive:768,xunOnlyPositive:0,
   jiekongOnlyPositive:0,onlyTogether:768,familyOnlyXun:0,familyOnlyJiekong:0}
 },'R62 must not silently change source family sensitivities');
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

/** R73: extend the existing genuine R61/R62 sample, not a second source probe.
 * Same civil solar date, gender and hour branch; the source lunar day/policy
 * is not captured by R61, so this does not establish same school or calendar.
 */
const R73Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalVoidSemanticGates: r73VoidGate}=
 require('../packages/interpretation/src/classical-void-semantic-gates.cjs');
const r73Branch=x=>Number.isInteger(x)&&x>=0&&x<12;
const r73Compare=(source,local)=>local===null?'unknown':source===local?'matched':'different';
const r73And=(...values)=>values.includes(false)?false:values.includes(null)?null:true;
const r73At=(star,branch)=>star===null?null:star===branch;
const r73Or=(a,b)=>a===true||b===true?true:a===null||b===null?null:false;
function r73Local(chart){
 const find=(name,layer)=>{
  const hits=chart.houses.filter(h=>h[layer]?.includes(name)).map(h=>h.branchIndex);
  return hits.length===1&&r73Branch(hits[0])?hits[0]:null;
 };
 const ming=R73Engine.BRANCHES.indexOf(chart.menh);
 assert.ok(r73Branch(ming));
 const hua=chart.transformations.filter(t=>t.name==='Hóa Lộc');
 const gate=r73VoidGate(chart);
 assert.equal(gate.sourceCriterionVerified,false);
 const proxy=gate.verifiedLocalObstructions&&gate.trietSourcePairGeometryStatus==='matched'
   &&Array.isArray(gate.proxyBranches)&&gate.proxyBranches.every(r73Branch)
   ?new Set(gate.proxyBranches):null;
 return {ming,seven:find('Thất Sát','stars'),lu:find('Lộc Tồn','auxiliaryStars'),
  horse:find('Thiên Mã','yearStars'),liem:find('Liêm Trinh','stars'),
  kong:find('Địa Không','advancedStars'),jie:find('Địa Kiếp','advancedStars'),
  hua:hua.length===1&&r73Branch(hua[0].branch)?hua[0].branch:null,proxy};
}
test('R73 three-valued geometry comparisons do not turn missing operands into matches',()=>{
 assert.equal(r73Compare(3,null),'unknown');
 assert.equal(r73Compare(false,null),'unknown');
 assert.equal(r73Compare(false,false),'matched');
 assert.equal(r73Compare(3,4),'different');
 assert.equal(r73And(true,null),null);
 assert.equal(r73And(false,null),false);
 assert.equal(r73Or(false,null),null);
 assert.equal(r73Or(true,null),true);
 assert.equal(r73At(null,3),null);
});
test('R73 genuine R61 grid: compare named placements and bounded local proxy predicates',()=>{
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const read=name=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',name),'utf8'));
 const source=read('.r61-pinned-source-void-predicate-observations.json');
 const base=read('.r33-source-1989-root-cause-observations.json');
 const prior=auditR62(source,base);
 assert.equal(prior.charts,960);
 assert.equal(prior.matchedNegativeControlCount,796);
 const before=JSON.stringify(source);
 const counts={};
 function add(key,a,b){
  const status=r73Compare(a,b);
  const cell=counts[key]??(counts[key]={matched:0,different:0,unknown:0});
  cell[status]++;
 }
 const byMing={matched:0,different:0};
 const seen=new Set();
 for(const row of source.records){
  assert.ok(!seen.has(row.id));seen.add(row.id);
  const hour=row.hour*2;
  assert.equal(R73Engine.hourBranch(hour),row.hour);
  const chart=R73Engine.calculate({date:row.solarDate,hour,minute:0,
   gender:row.gender==='male'?'Nam':'Nữ',calendar:'solar'});
  const localBefore=JSON.stringify(chart);
  const l=r73Local(chart), aligned=row.mingBranch===l.ming;
  byMing[aligned?'matched':'different']++;
  for(const [key,a,b] of [
   ['menh',row.mingBranch,l.ming],['that-sat',row.sevenBranch,l.seven],
   ['loc-ton',row.luBranch,l.lu],['thien-ma',row.horseBranch,l.horse]
  ])add(key,a,b);
  const voidAt=b=>l.proxy===null||b===null?null:l.proxy.has(b);
  const liem=r73At(l.liem,l.ming);
  const luOrHua=r73Or(r73At(l.lu,l.ming),r73At(l.hua,l.ming));
  const kongJie=r73And(r73At(l.kong,l.ming),r73At(l.jie,l.ming));
  const voidMing=voidAt(l.ming);
  const locVoid=voidAt(l.lu),horseVoid=voidAt(l.horse);
  add('liem-at-own-menh',row.parts.liemAtMing,liem);
  add('loc-or-hua-at-own-menh',row.parts.luOrHuaLuAtMing,luOrHua);
  add('kong-jie-at-own-menh',row.parts.diKongAndDiJieAtMing,kongJie);
  add('void-at-own-menh-proxy',row.voidNamesAtMing.length>0,voidMing);
  add('loc-void-proxy',row.parts.luInSourceVoid,locVoid);
  add('horse-void-proxy',row.parts.horseInSourceVoid,horseVoid);
  const stratum=aligned?'same-menh':'different-menh';
  const p1=r73And(liem,voidMing),p2=r73And(luOrHua,kongJie,voidMing);
  add('dinh-ban-01-proxy',row.sourcePredicates['dinh-ban-01'],p1);
  add('dinh-ban-02-proxy',row.sourcePredicates['dinh-ban-02'],p2);
  add('dinh-ban-01-proxy/'+stratum,row.sourcePredicates['dinh-ban-01'],p1);
  add('dinh-ban-02-proxy/'+stratum,row.sourcePredicates['dinh-ban-02'],p2);
  for(const p of row.periods){
   // Compare geometry at the same BRANCH, not local major-period age identity.
   const four=[p.branch,(p.branch+4)%12,(p.branch+8)%12,(p.branch+6)%12];
   const hit=r73And(l.seven===null?null:four.includes(l.seven),locVoid,horseVoid);
   add('dinh-tap-03-same-branch-proxy',
    row.sourcePredicates['dinh-tap-03'].includes(p.startAge),hit);
  }
  assert.equal(JSON.stringify(chart),localBefore);
 }
 assert.equal(seen.size,960);
 const total=key=>Object.values(counts[key]??{}).reduce((a,b)=>a+b,0);
 for(const key of ['menh','that-sat','loc-ton','thien-ma','liem-at-own-menh',
  'loc-or-hua-at-own-menh','kong-jie-at-own-menh','void-at-own-menh-proxy',
  'loc-void-proxy','horse-void-proxy','dinh-ban-01-proxy','dinh-ban-02-proxy'])
  assert.equal(total(key),960,key);
 assert.equal(total('dinh-tap-03-same-branch-proxy'),11520);
 for(const key of ['dinh-ban-01-proxy','dinh-ban-02-proxy']){
  assert.equal(total(key+'/same-menh'),byMing.matched);
  assert.equal(total(key+'/different-menh'),byMing.different);
 }
 assert.equal(JSON.stringify(source),before);
 console.log('R73 genuine grid observations: '+JSON.stringify({
  charts:seen.size,periodBranchContexts:11520,byMing,counts,
  sameLunarPolicyVerified:false,matchedPeriodAgeVerified:false,
  semanticEquivalenceVerified:false,mayChangeChartRules:false,
  researchMapped:31,referenceTotal:49,mayIncreaseMapping:false
 }));
});
