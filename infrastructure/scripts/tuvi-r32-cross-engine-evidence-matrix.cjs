'use strict';
/**
 * R32 — Cross-engine evidence diagnostics, NOT a classical verdict engine.
 *
 * Inputs MUST be the two JSON snapshots produced by executing the pinned
 * reference generateChart, detectDingPin and detectDingZa (R29/R30 CI).
 * Compare exact branch coordinates and three local PROXY rules. Disagreement
 * is recorded, never hidden, and agreement NEVER proves school/semantic parity.
 */
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {evaluateSourcePatternOracle,independentlyEvaluate}=require('./tuvi-r29-evaluate-source-oracle.cjs');
const {auditRealPositive}=require('./tuvi-r30-audit-rare-positive.cjs');
const {auditClassicalPatternCandidates}=require('../../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalVoidSemanticGates}=require('../../packages/interpretation/src/classical-void-semantic-gates.cjs');
const {auditClassicalDingZaPeriods}=require('../../packages/interpretation/src/classical-dingza-period-research.cjs');
const {andKnown}=require('../../packages/interpretation/src/classical-evidence-logic.cjs');
const {SOURCE_COMMIT,SOURCE_NAMES,SOURCE_ALIASES,SOURCE_STEMS,auditSourceDoubleJiekongCodeConcordance}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');

const VERSION='2.6.1',SAMPLES=67;
const VOID=Object.freeze(['旬空','副旬','截空','副截']);
const PAIRS=Object.freeze([
 ['liem-trinh','廉贞','Liêm Trinh','stars'],
 ['loc-ton','禄存','Lộc Tồn','auxiliaryStars'],
 ['thien-ma','天马','Thiên Mã','yearStars'],
 ['that-sat','七杀','Thất Sát','stars'],
 ['dia-khong','地空','Địa Không','advancedStars'],
 ['dia-kiep','地劫','Địa Kiếp','advancedStars']
].map(x=>Object.freeze(x)));
const LIMITATION='Vị trí và logic proxy trên lá số giả lập chỉ là chẩn đoán kỹ thuật; không chứng minh hai trường phái đồng nhất sao Không Vong, vận hạn, cách cục hoặc ý nghĩa luận giải.';
const sorted=x=>[...x].sort((a,b)=>a-b);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validBranch=x=>Number.isInteger(x)&&x>=0&&x<12;
const known=x=>x==='met'?true:x==='not-met'?false:null;
const state=x=>x===null?'unknown':x?'met':'not-met';
const unique=arr=>arr.length===1?arr[0]:null;

function sourceCoordinates(record){
 const byName=new Map(),hua=[];
 for(const palace of record.palaces){
  for(const star of palace.stars){
   if(!byName.has(star.name))byName.set(star.name,[]);
   byName.get(star.name).push(palace.branch);
   if(star.siHua==='禄')hua.push(palace.branch);
  }
 }
 const get=n=>unique(byName.get(n)||[]);
 const markers=VOID.map(get);
 // R47 source vocabulary: two legacy names are NOT extra independent stars.
 const allNames=Object.freeze(Object.fromEntries(SOURCE_NAMES.map(name=>{
  const at=byName.get(name)||[];
  return [name,Object.freeze({branch:unique(at),occurrences:at.length,
   presence:at.length===0?'absent':at.length===1?'unique':'duplicate'})];
 })));
 const aliasPairs=Object.freeze(Object.fromEntries(SOURCE_ALIASES.map(({legacy,normalized})=>{
  const a=allNames[legacy].presence,b=allNames[normalized].presence;
  return [legacy+'/'+normalized,Object.freeze({legacy,normalized,
   status:a==='duplicate'||b==='duplicate'?'ambiguous':
    a==='unique'&&b==='unique'?'both-labels':
    a==='unique'?'legacy-only':b==='unique'?'normalized-only':'neither'})];
 })));
 // Distinguish the four actual *named stars* from the occupied branch SET.
 // Two name pairs may occupy the same two branches, e.g. near lunar-new-year
 // boundaries. Comparing a four-element multiset against Thiên Đồ's union
 // is an incorrect "mismatch"; preserve the source names for provenance.
 const voidNamedBranches=Object.freeze(Object.fromEntries(
  VOID.map((name,i)=>[name,markers[i]])
 ));
 const voidBranches=markers.every(validBranch)?
  Object.freeze(sorted(new Set(markers))):null;
 return Object.freeze({
  get,huaLoc:unique(hua),voidNamedBranches,voidBranches,allNames,aliasPairs
 });
}
/** R48: actual pinned-source evidence only; unknown SOURCE stem stays unknown. */
function auditSourceDefaultVoidPlacement(record,coordinates=sourceCoordinates(record)){
 const index=record?.sourceYearStemIndex;
 if(index!==undefined&&(!Number.isInteger(index)||index<0||index>9))
  throw new RangeError('Invalid SOURCE year-stem index; no local calendar inference');
 const named=coordinates.allNames;
 const xun=named['旬空'].branch,fu=named['副旬'].branch;
 const expectedFu=validBranch(xun)?(xun%2===0?(xun+1)%12:(xun+11)%12):null;
 const fuStatus=!validBranch(expectedFu)||!validBranch(fu)?'unknown':
  expectedFu===fu?'matched':'different';
 let double=null;
 if(index!==undefined){
  const model=auditSourceDoubleJiekongCodeConcordance(SOURCE_STEMS[index]);
  if(!model||model.sourceFormulaConcordant!==true||model.formulaCodes.length!==2)
   throw Error('Pinned SOURCE Jiekong formula not concordant');
  const expected=model.formulaCodes.map(code=>code-1);
  if(!expected.every(validBranch))throw Error('Invalid SOURCE default branch codes');
  const actual=[named['截空'].branch,named['副截'].branch];
  double=Object.freeze({
   sourceStem:SOURCE_STEMS[index],yearStemIndex:index,variant:'double',
   expected:Object.freeze(expected),actual:Object.freeze(actual),
   status:actual.every(validBranch)?
    actual.every((branch,i)=>branch===expected[i])?'matched':'different':'unknown'
  });
 }
 return Object.freeze({
  sourceYearStemRecorded:index!==undefined,
  jiekongDefaultDouble:double,
  fuxunPair:Object.freeze({xunBranch:xun,actualFuBranch:fu,
   expectedFuBranch:expectedFu,status:fuStatus}),
  sourceSchoolParityVerified:false,
  sourcePlacementVerifiedForLocalChart:false,
  mayDeclarePattern:false
 });
}
function localCoordinates(chart){
 const find=(name,layer)=>unique(chart.houses.flatMap(h=>
  Array.isArray(h[layer])&&h[layer].includes(name)?[h.branchIndex]:[]));
 const hua=chart.transformations?.filter(x=>x.name==='Hóa Lộc')||[];
 return Object.freeze({
  find,huaLoc:hua.length===1&&validBranch(hua[0].branch)?hua[0].branch:null
 });
}
function normalizeSource(record){
 const rule=independentlyEvaluate(record);
 if(rule.dingPin01!==record.detector.dingPin01||
    rule.dingPin02!==record.detector.dingPin02||
    !same(rule.dingZa03,record.detector.dingZa03))
  throw Error('Pinned source detector differs from independently reconstructed condition: '+record.id);
 return rule;
}
function compareRecord(record,origin){
 const actual=normalizeSource(record);
 const clockHour=origin==='r30'?record.clockHour:record.hour;
 const local=Engine.calculate({date:record.solarDate,hour:clockHour,
  minute:0,gender:record.gender,calendar:'solar'});
 const before=JSON.stringify(local);
 const natal=auditClassicalPatternCandidates(local);
 const voidGate=auditClassicalVoidSemanticGates(local);
 const period=auditClassicalDingZaPeriods(local);
 const source=sourceCoordinates(record),td=localCoordinates(local);
 const sourceDefaultPlacement=auditSourceDefaultVoidPlacement(record,source);
 const localMing=local.houses.find(x=>x.palace==='Mệnh')?.branchIndex;
 const mingAligned=localMing===record.mingGongBranch;
 const placement=Object.freeze(Object.fromEntries(PAIRS.map(([id,sourceName,localName,layer])=>{
  const a=source.get(sourceName),b=td.find(localName,layer);
  return [id,Object.freeze({sourceBranch:a,localBranch:b,
   status:a===null||b===null?'unknown':a===b?'matched':'different'})];
 })));
 const hua=Object.freeze({sourceBranch:source.huaLoc,localBranch:td.huaLoc,
  status:source.huaLoc===null||td.huaLoc===null?'unknown':
   source.huaLoc===td.huaLoc?'matched':'different'});
 const localVoid=voidGate.verifiedLocalObstructions&&
  voidGate.trietSourcePairGeometryStatus==='matched'?voidGate.proxyBranches:null;
 const voidCoordinates=Object.freeze({
  sourceNamedBranches:source.voidNamedBranches,
  sourceAllNamedEntries:source.allNames,
  sourceAliasPairStates:source.aliasPairs,
  sourceBranches:source.voidBranches,localProxyBranches:localVoid,
  status:source.voidBranches===null||localVoid===null?'unknown':
   same(source.voidBranches,localVoid)?'matched':'different',
  semanticEquivalenceVerified:false
 });
 const dingpin01=natal.pendingEvidence.find(x=>x.id==='dinh-ban-01');
 const dingpin02=natal.pendingEvidence.find(x=>x.id==='dinh-ban-02');
 const gate01=voidGate.items.find(x=>x.id==='dinh-ban-01');
 const gate02=voidGate.items.find(x=>x.id==='dinh-ban-02');
 const gate03=voidGate.items.find(x=>x.id==='dinh-tap-03');
 const period03=period.items.find(x=>x.id==='dinh-tap-03');
 if(!dingpin01||!dingpin02||!gate01||!gate02||!gate03||!period03||
  dingpin01.sourceCriterionVerified!==false||
  dingpin02.sourceCriterionVerified!==false||
  gate03.sourceCriterionVerified!==false||
  period03.sourceCriterionVerified!==false)
  throw Error('Research source gates missing or improperly elevated');
 const local01=andKnown(known(dingpin01.checks[0].state),known(gate01.checks[0].state));
 const local02=andKnown(known(dingpin02.checks[0].state),
  known(dingpin02.checks[1].state),known(gate02.checks[0].state));
 const locAndHorse=andKnown(known(gate03.checks[0].state),known(gate03.checks[1].state));
 const localPeriods=period03.periods.map(p=>({
  branch:p.branchIndex,
  status:state(andKnown(known(p.checks[0].state),locAndHorse))
 }));
 const sourcePeriodSet=new Set(actual.dingZa03.map(x=>x.palaceBranch));
 const perPeriod=localPeriods.map(p=>{
  const sourceHit=sourcePeriodSet.has(p.branch);
  return Object.freeze({branch:p.branch,sourceHit,
   localProxy:p.status,
   category:classify(sourceHit,p.status,mingAligned)});
 });
 const evidence=Object.freeze({
  'dinh-ban-01':Object.freeze({sourceHit:actual.dingPin01,localProxy:state(local01),
   category:classify(actual.dingPin01,state(local01),mingAligned)}),
  'dinh-ban-02':Object.freeze({sourceHit:actual.dingPin02,localProxy:state(local02),
   category:classify(actual.dingPin02,state(local02),mingAligned)}),
  'dinh-tap-03':Object.freeze({sourceHitPeriods:actual.dingZa03.length,
   periodComparisons:Object.freeze(perPeriod)})
 });
 if(JSON.stringify(local)!==before)throw Error('A local research auditor mutated the chart');
 if(Object.values(evidence).some(x=>x?.sourceCriterionVerified===true))
  throw Error('Source verdict accidentally promoted');
 return Object.freeze({
  id:record.id,origin,
  kind:origin==='r30'?record.role:record.kind,
  solarDate:record.solarDate,
  clockHour,gender:record.gender,
  sourceMing:record.mingGongBranch,localMing,
  mingAligned,
  placement,hua,voidCoordinates,sourceDefaultPlacement,evidence,
  sourceCriterionVerifiedForLocalChart:false,
  localPatternVerdictVerified:false,semanticEquivalenceVerified:false
 });
}
function classify(sourceHit,localState,mingAligned){
 if(!mingAligned)return 'different-ming-branch';
 if(localState==='unknown')return 'local-unknown';
 if(sourceHit&&localState==='met')return 'both-met-proxy-only';
 if(!sourceHit&&localState==='not-met')return 'both-not-met-proxy-only';
 if(sourceHit)return 'source-only';
 return 'local-proxy-only';
}
function auditCrossEngineMatrix(reference,rare,matrix){
 const r29=evaluateSourcePatternOracle(reference,matrix);
 const r30=auditRealPositive(rare);
 if(r29.total!==65||r29.checked!==65||r29.failures!==0||
    r30.checked!==2||r30.positiveCount!==1||r30.negativeCount!==1||
    r30.failures!==0)
  throw Error('R32 requires genuine R29 65/65 and R30 positive/negative runtime evidence');
 const all=[
  ...reference.records.map(x=>[x,'r29']),
  ...rare.records.map(x=>[x,'r30'])
 ];
 if(all.length!==SAMPLES||new Set(all.map(([x])=>x.id)).size!==SAMPLES)
  throw Error('R32 must compare 67 distinct real source records');
 const records=[],errors=[];
 for(const [r,origin] of all){
  try{records.push(compareRecord(r,origin));}
  catch(e){errors.push({id:r.id,reason:String(e.message||e)});}
 }
 const placements=Object.freeze(Object.fromEntries([...PAIRS.map(x=>x[0]),'hua-loc','void-pair'].map(name=>{
  const hits=records.map(x=>name==='hua-loc'?x.hua:
    name==='void-pair'?x.voidCoordinates:x.placement[name]);
  return [name,Object.freeze({
   matched:hits.filter(x=>x.status==='matched').length,
   different:hits.filter(x=>x.status==='different').length,
   unknown:hits.filter(x=>x.status==='unknown').length
  })];
 })));
 const categories={};
 for(const id of ['dinh-ban-01','dinh-ban-02','dinh-tap-03']){
  const rows=records.flatMap(r=>id==='dinh-tap-03'?
   r.evidence[id].periodComparisons.map(p=>p.category):
   [r.evidence[id].category]);
  categories[id]=Object.freeze(Object.fromEntries([...new Set(rows)].sort().map(c=>[c,rows.filter(x=>x===c).length])));
 }
 // Read-only inventory. A missing legacy name is normal when renamed by source.
  const sourceVoidNames=Object.freeze(Object.fromEntries(SOURCE_NAMES.map(name=>[
   name,Object.freeze(Object.fromEntries(['unique','absent','duplicate'].map(state=>[
    state,records.filter(x=>x.voidCoordinates.sourceAllNamedEntries[name].presence===state).length
   ])))
  ])));
  const aliasStates=['legacy-only','normalized-only','both-labels','neither','ambiguous'];
  const sourceVoidAliasPairs=Object.freeze(Object.fromEntries(SOURCE_ALIASES.map(({legacy,normalized})=>{
   const key=legacy+'/'+normalized;
   return [key,Object.freeze(Object.fromEntries(aliasStates.map(state=>[
    state,records.filter(x=>x.voidCoordinates.sourceAliasPairStates[key].status===state).length
   ])))];
  })));
  const sourceDefaultPlacement=Object.freeze({
   knownStem:records.filter(r=>r.sourceDefaultPlacement.sourceYearStemRecorded).length,
   missingStem:records.filter(r=>!r.sourceDefaultPlacement.sourceYearStemRecorded).length,
   jiekongDefaultDouble:Object.freeze(Object.fromEntries(['matched','different','unknown'].map(s=>[
    s,records.filter(r=>r.sourceDefaultPlacement.jiekongDefaultDouble?.status===s).length
   ]))),
   fuxunPair:Object.freeze(Object.fromEntries(['matched','different','unknown'].map(s=>[
    s,records.filter(r=>r.sourceDefaultPlacement.fuxunPair.status===s).length
   ])))
  });
  const out=Object.freeze({
  schema:'thiendo-r32-cross-engine-evidence-report-v1',
  sourceCommit:SOURCE_COMMIT,sourceIztroVersion:VERSION,
  referenceRuntimeVerified:true,syntheticOnly:true,
  sampleOrigins:Object.freeze({r29:65,r30:2}),
  total:SAMPLES,checked:records.length,failures:errors.length,
  counts:Object.freeze({
   mingAligned:records.filter(x=>x.mingAligned).length,
   mingDifferent:records.filter(x=>!x.mingAligned).length,
    sourceVoidNames,sourceVoidAliasPairs,
    sourceDefaultPlacement,
   placements,
   affectedSolarYears:Object.freeze(Object.fromEntries(
    [...new Set(records.filter(x=>
      Object.values(x.placement).some(v=>v.status==='different')||
      x.hua.status==='different'||x.voidCoordinates.status==='different')
     .map(x=>x.solarDate.slice(0,4)))].sort().map(y=>[y,
      records.filter(x=>x.solarDate.startsWith(y)&&(
       Object.values(x.placement).some(v=>v.status==='different')||
       x.hua.status==='different'||x.voidCoordinates.status==='different')).length
     ])
   )),
   proxyComparisons:Object.freeze(categories)
  }),
  localPatternVerdictsVerified:false,
  semanticEquivalenceVerified:false,sourceSchoolParityVerified:false,
  limitation:LIMITATION,records:Object.freeze(records),errors:Object.freeze(errors)
 });
 return out;
}
if(require.main===module){
 if(process.argv.length!==4)throw Error('R32 requires actual R29 and R30 observation paths');
 const source=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8'));
 const rare=JSON.parse(fs.readFileSync(path.resolve(process.argv[3]),'utf8'));
 const matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'../../tests/fixtures/tuvi-r27-iztro-cases.json'),'utf8'));
 const result=auditCrossEngineMatrix(source,rare,matrix);
 fs.writeFileSync('.r32-cross-engine-evidence-matrix-report.json',JSON.stringify(result,null,2)+'\n');
 console.log('R32 cross-engine evidence: '+result.checked+'/'+result.total+
  ' synthetic charts, '+result.failures+' execution errors; Mệnh branch aligned '+
  result.counts.mingAligned+'/'+result.checked+
  '; source/Thiên Đồ semantic equivalence UNVERIFIED.');
 if(result.failures||result.checked!==SAMPLES)process.exitCode=1;
}
module.exports=Object.freeze({SCHEMA:'thiendo-r32-cross-engine-evidence-report-v1',
 VERSION,SAMPLES,PAIRS,LIMITATION,classify,sourceCoordinates,compareRecord,
 auditSourceDefaultVoidPlacement,auditCrossEngineMatrix});
