'use strict';
/**
 * R53: explain each pinned source Void predicate by actual named source stars
 * and compare with local diagnostic classifications, WITHOUT interpreting
 * matching geometry/proxy as semantic equivalence. No Thiên Đồ engine change.
 */
const fs=require('node:fs');
const {auditCrossEngineMatrix,SCHEMA}=require('./tuvi-r32-cross-engine-evidence-matrix.cjs');
const {independentlyEvaluate}=require('./tuvi-r29-evaluate-source-oracle.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const VOID=Object.freeze(['旬空','副旬','截路','截空','空亡','副截']);
const IDS=Object.freeze(['dinh-ban-01','dinh-ban-02','dinh-tap-03']);
const BRANCHES=12;
const at=(record,branch)=>{
 if(!Number.isInteger(branch)||branch<0||branch>=BRANCHES)throw new TypeError('R53 invalid source branch');
 const matches=record.palaces.filter(x=>x.branch===branch);
 if(matches.length!==1||!Array.isArray(matches[0].stars))throw new Error('R53 source branch unavailable');
 return matches[0].stars;
};
function namedVoidAt(record,branch){
 return Object.freeze(at(record,branch).filter(s=>VOID.includes(s.name)).map(s=>s.name).sort());
}
function uniqueStarBranch(record,name){
 const found=record.palaces.filter(p=>p.stars.some(s=>s.name===name));
 if(found.length!==1||found[0].stars.filter(s=>s.name===name).length!==1)
  throw new Error('R53 required source star absent/duplicated: '+name);
 return found[0].branch;
}
function sourceAtoms(record){
 const independent=independentlyEvaluate(record);
 const ming=record.mingGongBranch;
 const mingStars=at(record,ming);
 const has=name=>mingStars.some(x=>x.name===name);
 const voidAtMing=namedVoidAt(record,ming);
 const lienTrinh=has('廉贞');
 const locAtMing=has('禄存')||mingStars.some(s=>s.siHua==='禄');
 const diaKhong=has('地空'),diaKiep=has('地劫');
 const loc=uniqueStarBranch(record,'禄存'),horse=uniqueStarBranch(record,'天马');
 const locVoid=namedVoidAt(record,loc),horseVoid=namedVoidAt(record,horse);
 const periodAtoms=record.daXians.map(dx=>{
  const sf=[dx.palaceBranch,(dx.palaceBranch+4)%12,
   (dx.palaceBranch+8)%12,(dx.palaceBranch+6)%12];
  const sat7=sf.some(b=>at(record,b).some(s=>s.name==='七杀'));
  const result=sat7&&locVoid.length>0&&horseVoid.length>0;
  return Object.freeze({palaceBranch:dx.palaceBranch,
   startAge:dx.startAge,endAge:dx.endAge,
   sat7InPeriodSanFang:sat7,
   locTonVoidNamedStars:locVoid,thienMaVoidNamedStars:horseVoid,
   sourceRuleHit:result});
 });
 const first=voidAtMing.length>0&&lienTrinh;
 const second=locAtMing&&voidAtMing.length>0&&diaKhong&&diaKiep;
 if(first!==independent.dingPin01||second!==independent.dingPin02||
    periodAtoms.length!==12||
    periodAtoms.filter(x=>x.sourceRuleHit).length!==independent.dingZa03.length||
    periodAtoms.some(x=>x.sourceRuleHit!==independent.dingZa03.some(
      p=>p.palaceBranch===x.palaceBranch)))
  throw new Error('R53 source atoms disagree with independent pinned predicates');
 return Object.freeze({
  mingBranch:ming,mingVoidNamedStars:voidAtMing,
  liemTrinhAtMing:lienTrinh,locOrHuaLocAtMing:locAtMing,
  diaKhongAtMing:diaKhong,diaKiepAtMing:diaKiep,
  locTonBranch:loc,thienMaBranch:horse,
  locTonVoidNamedStars:locVoid,thienMaVoidNamedStars:horseVoid,
  sourceDinhBan01Hit:first,sourceDinhBan02Hit:second,
  majorPeriods:Object.freeze(periodAtoms)
 });
}
function buildR53(source,rare,fixture){
 // R32 independently verifies both provenance-locked genuine source probes.
 const matrix=auditCrossEngineMatrix(source,rare,fixture);
 if(matrix.schema!==SCHEMA||matrix.checked!==67||matrix.failures!==0||
    matrix.referenceRuntimeVerified!==true||matrix.semanticEquivalenceVerified!==false||
    matrix.sourceSchoolParityVerified!==false||matrix.localPatternVerdictsVerified!==false)
  throw new Error('R53 cannot use incomplete or promoted R32 source matrix');
 const recordMap=new Map([...source.records,...rare.records].map(x=>[x.id,x]));
 if(recordMap.size!==67)throw new Error('R53 missing/duplicated genuine source records');
 const counts={sourceVoidAtMing:0,sourceVoidAtLocTon:0,
  sourceVoidAtThienMa:0,sourceBan01Positive:0,sourceBan02Positive:0,
  sourceTap03HitPeriods:0,proxyDisagreementBan01:0,
  proxyDisagreementBan02:0,proxyDisagreementTap03:0};
 const cases=matrix.records.map(row=>{
  const record=recordMap.get(row.id);
  if(!record)throw new Error('R53 unknown source case');
  const atoms=sourceAtoms(record);
  if(atoms.sourceDinhBan01Hit!==row.evidence['dinh-ban-01'].sourceHit||
     atoms.sourceDinhBan02Hit!==row.evidence['dinh-ban-02'].sourceHit||
     atoms.majorPeriods.filter(x=>x.sourceRuleHit).length!==
       row.evidence['dinh-tap-03'].sourceHitPeriods)
   throw new Error('R53 atoms do not match source detector evidence');
  const index=new Map(atoms.majorPeriods.map(x=>[x.palaceBranch,x]));
  const periods=row.evidence['dinh-tap-03'].periodComparisons.map(x=>{
   const sourcePeriod=index.get(x.branch);
   if(!sourcePeriod||sourcePeriod.sourceRuleHit!==x.sourceHit)
    throw new Error('R53 source major-period branch mismatch');
   if(['source-only','local-proxy-only','different-ming-branch','local-unknown'].includes(x.category))
    counts.proxyDisagreementTap03++;
   return Object.freeze({...sourcePeriod,localProxy:x.localProxy,
    comparisonCategory:x.category,sourceCriterionVerifiedForLocalChart:false});
  });
  if(atoms.mingVoidNamedStars.length)counts.sourceVoidAtMing++;
  if(atoms.locTonVoidNamedStars.length)counts.sourceVoidAtLocTon++;
  if(atoms.thienMaVoidNamedStars.length)counts.sourceVoidAtThienMa++;
  if(atoms.sourceDinhBan01Hit)counts.sourceBan01Positive++;
  if(atoms.sourceDinhBan02Hit)counts.sourceBan02Positive++;
  counts.sourceTap03HitPeriods+=atoms.majorPeriods.filter(x=>x.sourceRuleHit).length;
  const bad=c=>['source-only','local-proxy-only','different-ming-branch','local-unknown'].includes(c);
  if(bad(row.evidence['dinh-ban-01'].category))counts.proxyDisagreementBan01++;
  if(bad(row.evidence['dinh-ban-02'].category))counts.proxyDisagreementBan02++;
  return Object.freeze({id:row.id,origin:row.origin,
   sourceMingBranch:atoms.mingBranch,localMingBranch:row.localMing,
   sourceAtoms:Object.freeze({...atoms,majorPeriods:Object.freeze(periods)}),
   localProxyCategories:Object.freeze({
    'dinh-ban-01':row.evidence['dinh-ban-01'].category,
    'dinh-ban-02':row.evidence['dinh-ban-02'].category}),
   sourceSchoolParityVerified:false,semanticEquivalenceVerified:false,
   mayDeclarePattern:false});
 });
 if(cases.length!==67||counts.sourceBan02Positive<1||
    matrix.sampleOrigins.r29!==65||matrix.sampleOrigins.r30!==2)
  throw new Error('R53 required source controls incomplete');
 return Object.freeze({
  schema:'thiendo-r53-pinned-source-void-atom-breakdown-v1',
  sourceCommit:SOURCE_COMMIT,iztroVersion:'2.6.1',
  sourceCases:67,sourceMajorPeriods:804,
  sourceVoidNames:VOID,blockedCriteria:IDS,
  counts:Object.freeze(counts),cases:Object.freeze(cases),
  sourceSchoolParityVerified:false,semanticEquivalenceVerified:false,
  sourceCriterionVerifiedForLocalChart:false,expertReviewed:false,
  mappedResearch:31,referenceTotal:49,mayIncreaseMapping:false,
  mayDeclarePattern:false,
  limitation:'Phân tách sao và điều kiện trong engine nguồn chỉ phục vụ nghiên cứu; tên sao nguồn/Không Vong không mặc nhiên tương đương Tuần/Triệt hoặc luận đoán Thiên Đồ.'
 });
}
if(require.main===module){
 if(process.argv.length!==4)throw new Error('R53 requires genuine R29 and R30 observation files');
 const matrix=JSON.parse(fs.readFileSync('tests/fixtures/tuvi-r27-iztro-cases.json','utf8'));
 const source=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const rare=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 const result=buildR53(source,rare,matrix);
 fs.writeFileSync('.r53-source-void-atom-breakdown.json',JSON.stringify(result,null,2)+'\n');
 console.log('R53: 67 genuine source atoms, 804 period contexts, 3 unverified criteria; mapping 31/49');
}
module.exports=Object.freeze({VOID,IDS,namedVoidAt,sourceAtoms,buildR53});
