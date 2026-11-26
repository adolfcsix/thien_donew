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

/** R76: identify every discrepancy from the genuine R61 source grid and
 * isolate regular lunar-coordinate replay, without changing the local chart.
 * Agreement is geometric only; a valid source lunar date need not describe
 * the same civil instant in UTC+7. No claim about leap-policy equivalence.
 */
test('R76 source/local trace, positive controls and regular lunar replay',()=>{
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const read=name=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',name),'utf8'));
 const source=read('.r61-pinned-source-void-predicate-observations.json');
 const base=read('.r33-source-1989-root-cause-observations.json');
 const prior=auditR62(source,base);
 assert.equal(prior.charts,960);
 const original=JSON.stringify(source);
 const matrix={};
 const differences=[];
 const dateKey=x=>[x.year,x.month,x.day,x.leap].join('/');
 const validDate=x=>x&&Number.isInteger(x.year)&&x.year>=1900&&x.year<=2100&&
  Number.isInteger(x.month)&&x.month>=1&&x.month<=12&&
  Number.isInteger(x.day)&&x.day>=1&&x.day<=30&&typeof x.leap==='boolean';
 function add(key,a,b){
  const c=matrix[key]??(matrix[key]={bothTrue:0,bothFalse:0,sourceOnly:0,localOnly:0,unknown:0});
  assert.equal(typeof a,'boolean');
  c[b===null?'unknown':a?(b?'bothTrue':'sourceOnly'):(b?'localOnly':'bothFalse')]++;
 }
 function operands(local){
  const inVoid=b=>local.proxy===null||b===null?null:local.proxy.has(b);
  return {liem:r73At(local.liem,local.ming),
   luOrHua:r73Or(r73At(local.lu,local.ming),r73At(local.hua,local.ming)),
   kongJie:r73And(r73At(local.kong,local.ming),r73At(local.jie,local.ming)),
   voidMing:inVoid(local.ming),locVoid:inVoid(local.lu),horseVoid:inVoid(local.horse)};
 }
 function compare(row,l){
  const o=operands(l);
  return {ban01:r73And(o.liem,o.voidMing),ban02:r73And(o.luOrHua,o.kongJie,o.voidMing),
   periods:row.periods.map(p=>({startAge:p.startAge,branch:p.branch,
    hit:r73And(l.seven===null?null:[p.branch,(p.branch+4)%12,(p.branch+8)%12,(p.branch+6)%12].includes(l.seven),o.locVoid,o.horseVoid)})),
   operands:o};
 }
 let regularReplays=0,skippedLeap=0,replayRejected=0,calendarDifferent=0,reportedDifferent=0;
 for(const row of source.records){
  const d=row.diagnostic;
  assert.ok(validDate(d?.rawLunar)&&validDate(d?.reportedLunar),row.id);
  assert.ok([2,3,4,5,6].includes(d.cuc),row.id);
  for(const name of ['liem','kong','jie','hua']){
   assert.ok(Array.isArray(d[name])&&d[name].length===1&&d[name].every(r73Branch),row.id+'/'+name);
  }
  assert.equal(d.liem.includes(row.mingBranch),row.parts.liemAtMing);
  assert.equal(d.kong.includes(row.mingBranch)&&d.jie.includes(row.mingBranch),row.parts.diKongAndDiJieAtMing);
  assert.equal(row.luBranch===row.mingBranch||d.hua.includes(row.mingBranch),row.parts.luOrHuaLuAtMing);
  const common={hour:row.hour*2,minute:0,gender:row.gender==='male'?'Nam':'Nữ'};
  const chart=R73Engine.calculate({...common,date:row.solarDate,calendar:'solar'});
  const local=r73Local(chart),result=compare(row,local);
  const sameCalendar=dateKey(chart.lunar)===dateKey(d.rawLunar);
  if(!sameCalendar)calendarDifferent++;
  if(dateKey(d.rawLunar)!==dateKey(d.reportedLunar))reportedDifferent++;
  const source1=row.sourcePredicates['dinh-ban-01'],source2=row.sourcePredicates['dinh-ban-02'];
  add('ban01',source1,result.ban01);add('ban02',source2,result.ban02);
  const changed=result.periods.filter(p=>p.hit!==row.sourcePredicates['dinh-tap-03'].includes(p.startAge));
  for(const p of result.periods)add('tap03',row.sourcePredicates['dinh-tap-03'].includes(p.startAge),p.hit);
  if(source1===result.ban01&&source2===result.ban02&&!changed.length)continue;
  const sourcePositions={ming:row.mingBranch,seven:row.sevenBranch,lu:row.luBranch,horse:row.horseBranch,
   liem:d.liem[0],kong:d.kong[0],jie:d.jie[0],hua:d.hua[0]};
  const record={id:row.id,solarDate:row.solarDate,sourceRawLunar:d.rawLunar,sourceReportedLunar:d.reportedLunar,
   localLunar:chart.lunar,sameCalendar,sourceCuc:d.cuc,localCuc:chart.cuc.number,
   sourcePositions,localPositions:{...local,proxy:local.proxy?[...local.proxy]:null},
   sourceVoidByName:row.sourceVoidByName,sourceParts:row.parts,
   sourceBan01:source1,sourceBan02:source2,localBan01:result.ban01,localBan02:result.ban02,
   localOperands:result.operands,changedPeriods:changed.map(p=>({...p,sourceHit:row.sourcePredicates['dinh-tap-03'].includes(p.startAge)})),
   lunarReplay:null};
  if(d.rawLunar.leap||d.reportedLunar.leap||dateKey(d.rawLunar)!==dateKey(d.reportedLunar)){
   skippedLeap++;record.replayStatus='leap-or-reported-runtime-ambiguity';
  }else{
   const x=d.rawLunar,date=[x.year,String(x.month).padStart(2,'0'),String(x.day).padStart(2,'0')].join('-');
   let replay;
   try{replay=R73Engine.calculate({...common,date,calendar:'lunar',leap:false});}
   catch(error){if(!(error instanceof RangeError))throw error;replayRejected++;record.replayStatus='local-lunar-input-rejected';}
   if(replay){
    assert.equal(dateKey(replay.lunar),dateKey(x),row.id);
    const l=r73Local(replay),p=compare(row,l);
    regularReplays++;
    record.replayStatus='computed';
    record.lunarReplay={solar:replay.solar,cuc:replay.cuc.number,positions:{...l,proxy:l.proxy?[...l.proxy]:null},
     ban01:p.ban01,ban02:p.ban02,remainingPeriodDifferences:p.periods.filter(v=>v.hit!==row.sourcePredicates['dinh-tap-03'].includes(v.startAge)).length,
     allNamedCoordinatesMatch:Object.keys(sourcePositions).every(key=>sourcePositions[key]===l[key])};
   }
  }
  differences.push(record);
 }
 const total=c=>Object.values(c).reduce((a,b)=>a+b,0);
 assert.equal(total(matrix.ban01),960);assert.equal(total(matrix.ban02),960);assert.equal(total(matrix.tap03),11520);
 assert.equal(matrix.ban01.bothTrue+matrix.ban01.sourceOnly,24);
 assert.equal(matrix.ban02.bothTrue+matrix.ban02.sourceOnly,4);
 assert.equal(matrix.tap03.bothTrue+matrix.tap03.sourceOnly,768);
 assert.equal(differences.length,regularReplays+skippedLeap+replayRejected);
 assert.equal(JSON.stringify(source),original);
 const report={schema:'thiendo-r76-source-discrepancy-trace-v1',sourceCommit:prior.sourceCommit,
  matrix,calendarDifferent,reportedDifferent,regularReplays,skippedLeap,replayRejected,differences,
  sameSchoolVerified:false,semanticEquivalenceVerified:false,expertReviewed:false,mayIncreaseMapping:false,
  researchMapped:31,referenceTotal:49};
 console.log('R76 discrepancy summary: '+JSON.stringify({...report,differences:undefined,traceCount:differences.length}));
 for(const record of differences)console.log('R76 trace: '+JSON.stringify(record));
});

/** R77: family-specific geometry, exact positive/negative witnesses, and
 * source-reported effective month counterfactual for the 1993 leap window.
 * Neither the counterfactual nor source family membership asserts semantics.
 */
test('R77 positive controls and distinct Void families; replay source effective month for 1993',()=>{
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const read=name=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',name),'utf8'));
 const source=read('.r61-pinned-source-void-predicate-observations.json');
 const base=read('.r33-source-1989-root-cause-observations.json');
 const prior=auditR62(source,base);
 const witnesses=prior.witnesses['dinh-ban-02'];
 assert.equal(witnesses.length,4);
 const selected=new Map();
 for(const w of witnesses){
  selected.set(w.positiveId,true);
  if(!selected.has(w.negativeId))selected.set(w.negativeId,false);
 }
 const sorted=a=>[...new Set(a)].sort((x,y)=>x-y);
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const counters={tuanMatched:0,trietMatched:0,unionMatched:0,unknown:0,verified:0};
 const controlRows=[],leapRows=[],familyMismatches=[];
 let coverage=0;
 function localFrom(row,date,calendar,leap=false){
  return R73Engine.calculate({date,calendar,leap,hour:row.hour*2,minute:0,
   gender:row.gender==='male'?'Nam':'Nữ'});
 }
 for(const row of source.records){
  const c=localFrom(row,row.solarDate,'solar'), l=r73Local(c);
  const xun=sorted(['旬空','副旬'].flatMap(n=>row.sourceVoidByName[n]));
  const jie=sorted(['截路','截空','空亡','副截'].flatMap(n=>row.sourceVoidByName[n]));
  const tuan=c.obstructionMarkers.find(x=>x.name==='Tuần');
  const triet=c.obstructionMarkers.find(x=>x.name==='Triệt');
  assert.equal(xun.length,2,row.id);assert.equal(jie.length,2,row.id);
  const verified=l.proxy!==null&&tuan?.branches?.length===2&&triet?.branches?.length===2;
  if(!verified)counters.unknown++;
  else{
   counters.verified++;
   const t=same(xun,sorted(tuan.branches)),j=same(jie,sorted(triet.branches));
   const u=same(sorted([...xun,...jie]),sorted([...l.proxy]));
   counters.tuanMatched+=Number(t);counters.trietMatched+=Number(j);counters.unionMatched+=Number(u);
   if(!t||!j||!u)familyMismatches.push({id:row.id,sourceXun:xun,sourceJie:jie,localTuan:tuan.branches,localTriet:triet.branches});
  }
  if(selected.has(row.id)){
   const wanted=selected.get(row.id),d=row.diagnostic;
   const at=l.proxy===null?null:l.proxy.has(l.ming);
   const localHit=r73And(r73Or(r73At(l.lu,l.ming),r73At(l.hua,l.ming)),
    r73And(r73At(l.kong,l.ming),r73At(l.jie,l.ming)),at);
   assert.equal(row.sourcePredicates['dinh-ban-02'],wanted,row.id);
   assert.equal(localHit,wanted,row.id);
   const sourcePositions={ming:row.mingBranch,lu:row.luBranch,hua:d.hua[0],kong:d.kong[0],jie:d.jie[0]};
   controlRows.push({id:row.id,positive:wanted,sourcePositions,
    localPositions:Object.fromEntries(Object.keys(sourcePositions).map(k=>[k,l[k]])),
    sourceRawLunar:d.rawLunar,localLunar:c.lunar,sourceVoidNamesAtMing:row.voidNamesAtMing,
    tuanAtMing:verified?tuan.branches.includes(l.ming):null,
    trietAtMing:verified?triet.branches.includes(l.ming):null,
    modes:predicateModes(row,'dinh-ban-02',null),
    allNamedCoordinatesMatch:Object.keys(sourcePositions).every(k=>sourcePositions[k]===l[k])});
  }
  if(row.solarDate==='1993-05-15'){
   const d=row.diagnostic, e=d.reportedLunar;
   assert.equal(d.rawLunar.leap,true,row.id);
   assert.equal(e.leap,false,row.id);
   assert.equal(e.month,d.rawLunar.month+1,row.id);
   const date=[e.year,String(e.month).padStart(2,'0'),String(e.day).padStart(2,'0')].join('-');
   let replay;
   try{replay=localFrom(row,date,'lunar',false);}
   catch(error){if(!(error instanceof RangeError))throw error;leapRows.push({id:row.id,status:'rejected'});coverage++;continue;}
   const q=r73Local(replay);
   assert.deepEqual([replay.lunar.year,replay.lunar.month,replay.lunar.day,replay.lunar.leap],
    [e.year,e.month,e.day,false],row.id);
   const expected={ming:row.mingBranch,seven:row.sevenBranch,lu:row.luBranch,horse:row.horseBranch,
    liem:d.liem[0],kong:d.kong[0],jie:d.jie[0],hua:d.hua[0]};
   const mismatches=local=>{
    const loc=local.proxy===null||local.lu===null?null:local.proxy.has(local.lu);
    const horse=local.proxy===null||local.horse===null?null:local.proxy.has(local.horse);
    return row.periods.filter(p=>r73And(local.seven===null?null:
     [p.branch,(p.branch+4)%12,(p.branch+8)%12,(p.branch+6)%12].includes(local.seven),loc,horse)
      !==row.sourcePredicates['dinh-tap-03'].includes(p.startAge)).length;
   };
   leapRows.push({id:row.id,status:'computed',replaySolar:replay.solar,
    sourceCuc:d.cuc,replayCuc:replay.cuc.number,originalPeriodDifferences:mismatches(l),
    replayPeriodDifferences:mismatches(q),allNamedCoordinatesMatch:Object.keys(expected).every(k=>expected[k]===q[k])});
   coverage++;
  }
 }
 assert.equal(coverage,24);
 assert.equal(controlRows.length,selected.size);
 assert.equal(controlRows.filter(x=>x.positive).length,4);
 assert.equal(controlRows.filter(x=>!x.positive).length,new Set(witnesses.map(w=>w.negativeId)).size);
 assert.equal(counters.unknown+counters.verified,960);
 const replaySummary={computed:leapRows.filter(x=>x.status==='computed').length,
  rejected:leapRows.filter(x=>x.status==='rejected').length,
  originalPeriodDifferences:leapRows.reduce((n,x)=>n+(x.originalPeriodDifferences??0),0),
  remainingPeriodDifferences:leapRows.reduce((n,x)=>n+(x.replayPeriodDifferences??0),0),
  coordinateMatches:leapRows.filter(x=>x.allNamedCoordinatesMatch).length};
 console.log('R77 family geometry: '+JSON.stringify({charts:960,counters,familyMismatches}));
 console.log('R77 Lộc phùng lưỡng sát controls: '+JSON.stringify(controlRows));
 console.log('R77 leap counterfactual: '+JSON.stringify({summary:replaySummary,rows:leapRows,
  sameCivilInstantVerified:false,schoolParityVerified:false,mayIncreaseMapping:false,researchMapped:31}));
});

/** R78: compare the full grid on source-reported effective lunar coordinates,
 * distinguish year-boundary mismatches, and verify decade age + branch identity.
 * This is a counterfactual diagnostic, never a change to the user's birth date.
 */
test('R78 effective lunar replay and full age-branch period identity',()=>{
 if(process.env.THIENDO_R33_REQUIRE_GENUINE!=='1')return;
 const read=name=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',name),'utf8'));
 const source=read('.r61-pinned-source-void-predicate-observations.json');
 const base=read('.r33-source-1989-root-cause-observations.json');
 assert.equal(auditR62(source,base).charts,960);
 const {auditSourceDoubleJiekongCodeConcordance}=require('../packages/interpretation/src/classical-source-void-vocabulary.cjs');
 const {auditClassicalPeriodGeometry}=require('../packages/interpretation/src/classical-period-geometry.cjs');
 const key=x=>[x.year,x.month,x.day,x.leap].join('/');
 const sorted=a=>[...new Set(a)].sort((a,b)=>a-b);
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const mod=(x,n)=>((x%n)+n)%n;
 const totals={charts:0,computed:0,rejected:0,skippedLeap:0,sameCivilDate:0,
  allNamedCoordinatesMatch:0,cucMatch:0,tuanMatch:0,trietMatch:0,
  ageBranchMatch:0,periodContexts:0,all12PeriodsMatch:0,
  ban01Match:0,ban02Match:0,tap03AgeMatch:0};
 const yearBoundary=[],unresolved=[];
 for(const row of source.records){
  totals.charts++;
  const d=row.diagnostic,e=d.reportedLunar;
  const common={gender:row.gender==='male'?'Nam':'Nữ',hour:row.hour*2,minute:0};
  const original=R73Engine.calculate({...common,date:row.solarDate,calendar:'solar'});
  const originalBefore=JSON.stringify(original);
  const xun=sorted(['旬空','副旬'].flatMap(n=>row.sourceVoidByName[n]));
  const jie=sorted(['截路','截空','空亡','副截'].flatMap(n=>row.sourceVoidByName[n]));
  const pair=(c,name)=>sorted(c.obstructionMarkers.find(v=>v.name===name).branches);
  const stem=R73Engine.STEMS[mod(e.year-4,10)];
  const sourceRule=auditSourceDoubleJiekongCodeConcordance(stem);
  assert.equal(sourceRule.sourceFormulaConcordant,true,row.id);
  const expectedJie=sorted(sourceRule.formulaCodes.map(n=>n-1));
  const trace={id:row.id,rawLunar:d.rawLunar,reportedLunar:e,localLunar:original.lunar,
   sourceReportedStem:stem,localCanChi:original.yearCanChi,
   sourceJie:jie,sourceReportedStemPair:expectedJie,localTriet:pair(original,'Triệt')};
  if(!same(jie,trace.localTriet))yearBoundary.push(trace);
  if(e.leap){totals.skippedLeap++;unresolved.push({...trace,reason:'reported-leap-policy-not-replayed'});continue;}
  const date=[e.year,String(e.month).padStart(2,'0'),String(e.day).padStart(2,'0')].join('-');
  let c;
  try{c=R73Engine.calculate({...common,date,calendar:'lunar',leap:false});}
  catch(error){if(!(error instanceof RangeError))throw error;totals.rejected++;unresolved.push({...trace,reason:'rejected-lunar-coordinate'});continue;}
  totals.computed++;
  assert.equal(key(c.lunar),key(e),row.id);
  if(same(c.solar,original.solar))totals.sameCivilDate++;
  const l=r73Local(c);
  const coords={ming:row.mingBranch,seven:row.sevenBranch,lu:row.luBranch,
   horse:row.horseBranch,liem:d.liem[0],kong:d.kong[0],jie:d.jie[0],hua:d.hua[0]};
  const named=Object.keys(coords).filter(k=>coords[k]!==l[k]);
  const t=same(xun,pair(c,'Tuần')),j=same(jie,pair(c,'Triệt'));
  totals.tuanMatch+=Number(t);totals.trietMatch+=Number(j);
  totals.allNamedCoordinatesMatch+=Number(!named.length);
  totals.cucMatch+=Number(d.cuc===c.cuc.number);
  const geometry=auditClassicalPeriodGeometry(c);
  assert.equal(geometry.verifiedGeometry,true,row.id);
  assert.equal(c.cycles.daiHan.length,12,row.id);
  const inVoid=b=>l.proxy===null||b===null?null:l.proxy.has(b);
  const ban1=r73And(r73At(l.liem,l.ming),inVoid(l.ming));
  const ban2=r73And(r73Or(r73At(l.lu,l.ming),r73At(l.hua,l.ming)),
   r73And(r73At(l.kong,l.ming),r73At(l.jie,l.ming)),inVoid(l.ming));
  totals.ban01Match+=Number(ban1===row.sourcePredicates['dinh-ban-01']);
  totals.ban02Match+=Number(ban2===row.sourcePredicates['dinh-ban-02']);
  let periodDifferences=0,hitDifferences=0;
  for(const period of row.periods){
   totals.periodContexts++;
   const actual=c.cycles.daiHan.find(v=>v.fromAge===period.startAge);
   const identity=!!actual&&actual.branch===period.branch&&actual.toAge===period.startAge+9;
   totals.ageBranchMatch+=Number(identity);
   if(!identity)periodDifferences++;
   const hit=identity?r73And(l.seven===null?null:
    [actual.branch,(actual.branch+4)%12,(actual.branch+8)%12,(actual.branch+6)%12].includes(l.seven),
    inVoid(l.lu),inVoid(l.horse)):null;
   const sourceHit=row.sourcePredicates['dinh-tap-03'].includes(period.startAge);
   if(hit===sourceHit)totals.tap03AgeMatch++;else hitDifferences++;
  }
  totals.all12PeriodsMatch+=Number(!periodDifferences);
  if(named.length||!t||!j||d.cuc!==c.cuc.number||periodDifferences||hitDifferences||
    ban1!==row.sourcePredicates['dinh-ban-01']||ban2!==row.sourcePredicates['dinh-ban-02'])
   unresolved.push({...trace,replaySolar:c.solar,replayCanChi:c.yearCanChi,named,
    sourceCuc:d.cuc,localCuc:c.cuc.number,replayTuan:pair(c,'Tuần'),replayTriet:pair(c,'Triệt'),
    periodDifferences,hitDifferences,ban1,ban2});
  assert.equal(JSON.stringify(original),originalBefore);
 }
 assert.equal(totals.charts,960);
 assert.equal(totals.computed+totals.rejected+totals.skippedLeap,960);
 assert.equal(totals.periodContexts,totals.computed*12);
 assert.equal(yearBoundary.length,24);
 assert.ok(yearBoundary.every(x=>x.id.startsWith('1985-02-15-')));
 console.log('R78 effective lunar replay summary: '+JSON.stringify({totals,yearBoundaryCount:yearBoundary.length,
  unresolvedCount:unresolved.length,semanticEquivalenceVerified:false,schoolParityVerified:false,
  expertReviewed:false,mayIncreaseMapping:false,researchMapped:31}));
 for(const row of yearBoundary)console.log('R78 year boundary: '+JSON.stringify(row));
 for(const row of unresolved)console.log('R78 unresolved: '+JSON.stringify(row));
});
