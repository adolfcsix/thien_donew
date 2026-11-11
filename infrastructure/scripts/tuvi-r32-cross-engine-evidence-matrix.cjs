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
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');

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
 return Object.freeze({
  get, huaLoc:unique(hua), voidBranches:markers.every(validBranch)?Object.freeze(sorted(markers)):null
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
  sourceMing:record.mingGongBranch,localMing,
  mingAligned,
  placement,hua,voidCoordinates,evidence,
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
 const out=Object.freeze({
  schema:'thiendo-r32-cross-engine-evidence-report-v1',
  sourceCommit:SOURCE_COMMIT,sourceIztroVersion:VERSION,
  referenceRuntimeVerified:true,syntheticOnly:true,
  sampleOrigins:Object.freeze({r29:65,r30:2}),
  total:SAMPLES,checked:records.length,failures:errors.length,
  counts:Object.freeze({
   mingAligned:records.filter(x=>x.mingAligned).length,
   mingDifferent:records.filter(x=>!x.mingAligned).length,
   placements,
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
 auditCrossEngineMatrix});
