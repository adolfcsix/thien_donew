'use strict';
/**
 * R33 diagnostic-only comparison. Not a fix to either engine.
 * Requires exact-source runtime observations from R33 TS probe, recomputes all
 * local charts, categorizes first divergence in the date -> year -> Cục ->
 * Tử Vi -> main stars -> Hóa Lộc dependency chain.
 * A discrepancy is a valid observation, never silently patched or rejected.
 */
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {auditClassicalVoidSemanticGates}=require('../../packages/interpretation/src/classical-void-semantic-gates.cjs');
const SCHEMA='thiendo-r33-source-1989-root-cause-v1';
const REPORT='thiendo-r33-1989-root-cause-report-v1';
const VERSION='2.6.1';
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const DATES=Object.freeze(['1988-08-15','1989-08-14','1989-08-15','1989-08-16','1990-08-15']);
const HOURS=Object.freeze([0,8,22]);
const GENDERS=Object.freeze(['Nam','Nữ']);
const LIMITATION='Chỉ chẩn đoán nguồn sinh sai khác lịch/Cục/vị trí sao trên 30 ca giả lập. Không suy ra trường phái đúng hơn, không tự hiệu chỉnh an sao hoặc mở kết luận cách cục.';
const isBranch=x=>Number.isInteger(x)&&x>=0&&x<12;
/**
 * Independent astronomical phase datum: NASA GSFC, Phases of the Moon 1901–2000,
 * new moon 1989-08-01 at 16:06 UT.
 * The month-start civil day differs between UTC+7 and UTC+8 (23:06 vs 00:06).
 * This explains a compatible one-day lunar-month offset; it does NOT establish
 * school semantics, rule suitability, or override an existing chart.
 */
const BOUNDARY=Object.freeze({
 newMoonUtc:'1989-08-01T16:06:00Z',
 reference:'https://eclipse.gsfc.nasa.gov/phase/phases1901.html',
 vietnamOffsetHours:7,chinaOffsetHours:8,
 expectedVietnamMonthStart:'1989-08-01',
 expectedChinaMonthStart:'1989-08-02'
});
function civilDateAtOffset(iso,offsetHours){
 const utc=Date.parse(iso);
 if(!Number.isFinite(utc)||!Number.isInteger(offsetHours))throw Error('Invalid UTC boundary');
 return new Date(utc+offsetHours*3600000).toISOString().slice(0,10);
}
function evaluateCalendarBoundary(date,source,local){
 const vietnam=civilDateAtOffset(BOUNDARY.newMoonUtc,7);
 const china=civilDateAtOffset(BOUNDARY.newMoonUtc,8);
 if(vietnam!==BOUNDARY.expectedVietnamMonthStart||china!==BOUNDARY.expectedChinaMonthStart)
  throw Error('Invalid independent 1989 astronomical date boundary');
 const inWindow=['1989-08-14','1989-08-15','1989-08-16'].includes(date);
 const compatible=inWindow&&source.lunarYear===local.lunarYear&&
  source.lunarMonth===local.lunarMonth&&
  source.isLeapMonth===local.isLeapMonth&&
  local.lunarDay===source.lunarDay+1;
 return Object.freeze({
  status:!inWindow?'control-date':compatible?'compatible-with-civil-timezone-boundary':'not-established',
  sourceLunarDay:source.lunarDay,localLunarDay:local.lunarDay,
  vietnamNewMoonCivilDate:vietnam,chinaNewMoonCivilDate:china,
  reference:BOUNDARY.reference,
  provenSchoolEquivalence:false
 });
}
const unknown=()=>{throw Error('Incomplete or corrupted source observations');};
const missingRequired=(x,lo,hi)=>!Number.isInteger(x)||x<lo||x>hi;
function validateSource(input){
 if(!input||input.schema!==SCHEMA||!input.provenance||
  input.provenance.repository!=='Renhuai123/ziwei-doushu'||
  input.provenance.commit!==SOURCE_COMMIT||
  input.provenance.iztroVersion!==VERSION||
  input.provenance.sourceExecuted!==true||
  input.provenance.syntheticOnly!==true||
  JSON.stringify(input.provenance.functions)!==
   JSON.stringify(['generateChart','detectDingPin','detectDingZa'])||
  !Array.isArray(input.records)||input.records.length!==30)unknown();
 const byId=new Map();
 for(const record of input.records){
  if(!record||typeof record.id!=='string'||byId.has(record.id))unknown();
  byId.set(record.id,record);
 }
 for(const date of DATES)for(const gender of GENDERS)for(const hour of HOURS){
  const id=date+'-'+gender+'-'+hour;
  const rec=byId.get(id);
  if(!rec||rec.solarDate!==date||rec.gender!==gender||
   rec.clockHour!==hour||rec.hourBranch!==Math.floor(((hour+1)%24)/2))unknown();
  const s=rec.source;
  if(!s||missingRequired(s.lunarYear,1800,2200)||
   missingRequired(s.lunarMonth,1,12)||missingRequired(s.lunarDay,1,30)||
   typeof s.isLeapMonth!=='boolean'||
   missingRequired(s.yearStem,0,9)||missingRequired(s.yearBranch,0,11)||
   !['split','next-month','prev-month','origin-month'].includes(s.leapMonthPolicy)||
   ![2,3,4,5,6].includes(s.wuxingJu)||
   !isBranch(s.ziweiPos)||!isBranch(s.mingGongBranch)||
   !isBranch(s.liemTrinhBranch)||!isBranch(s.thatSatBranch)||!isBranch(s.huaLocBranch)||
   typeof s.dingPin01!=='boolean'||typeof s.dingPin02!=='boolean'||
   missingRequired(s.dingZa03Count,0,12))unknown();
 }
 return true;
}
function compareCase(rec){
 const s=rec.source;
 const local=Engine.calculate({date:rec.solarDate,hour:rec.clockHour,
  minute:0,gender:rec.gender,calendar:'solar'});
 const prior=JSON.stringify(local);
 const aux=auditClassicalVoidSemanticGates(local);
 if(aux.sourceCriterionVerified!==false||aux.semanticEquivalenceVerified!==false||
    aux.items.some(x=>x.sourceCriterionVerified!==false)||JSON.stringify(local)!==prior)
  throw Error('Research-only source semantics were incorrectly promoted or chart mutated');
 const singleBranch=(name)=>{
  const hits=local.houses.filter(h=>Array.isArray(h.stars)&&h.stars.includes(name));
  if(hits.length!==1||!isBranch(hits[0].branchIndex))throw Error('Missing/duplicate local main star '+name);
  return hits[0].branchIndex;
 };
 const hua=local.transformations?.filter(x=>x.name==='Hóa Lộc')||[];
 if(hua.length!==1||!isBranch(hua[0].branch))throw Error('Missing/duplicate local Hóa Lộc');
 const l={
  lunarYear:local.lunar.year,lunarMonth:local.lunar.month,lunarDay:local.lunar.day,
  isLeapMonth:local.lunar.leap===true,
  yearStem:STEMS.indexOf(local.yearCanChi?.split(' ')[0]),
  wuxingJu:local.cuc?.number,ziweiPos:BRANCHES.indexOf(local.ziWei),
  mingGongBranch:BRANCHES.indexOf(local.menh),
  liemTrinhBranch:singleBranch('Liêm Trinh'),
  thatSatBranch:singleBranch('Thất Sát'),
  huaLocBranch:hua[0].branch
 };
 if(missingRequired(l.yearStem,0,9)||![2,3,4,5,6].includes(l.wuxingJu)||
    !isBranch(l.ziweiPos)||!isBranch(l.mingGongBranch))throw Error('Invalid local diagnostic values');
 const checks=Object.freeze({
  lunarYear:s.lunarYear===l.lunarYear,
  lunarMonth:s.lunarMonth===l.lunarMonth,
  lunarDay:s.lunarDay===l.lunarDay,
  leapMonth:s.isLeapMonth===l.isLeapMonth,
  yearStem:s.yearStem===l.yearStem,
  wuxingJu:s.wuxingJu===l.wuxingJu,
  ziweiPos:s.ziweiPos===l.ziweiPos,
  mingGong:s.mingGongBranch===l.mingGongBranch,
  liemTrinh:s.liemTrinhBranch===l.liemTrinhBranch,
  thatSat:s.thatSatBranch===l.thatSatBranch,
  huaLoc:s.huaLocBranch===l.huaLocBranch
 });
 const calendarBoundary=evaluateCalendarBoundary(rec.solarDate,s,l);
 const firstDifference=!checks.lunarYear||!checks.lunarMonth||!checks.lunarDay||!checks.leapMonth?
  'calendar-difference':!checks.yearStem?'year-stem-difference':
  !checks.wuxingJu?'cuc-difference':
  !checks.ziweiPos?'ziwei-anchor-difference':
  !checks.mingGong?'ming-palace-difference':
  !checks.liemTrinh||!checks.thatSat?'major-star-difference':
  !checks.huaLoc?'four-hua-difference':'matched';
 return Object.freeze({
  id:rec.id,solarDate:rec.solarDate,gender:rec.gender,clockHour:rec.clockHour,
  source:Object.freeze({...s}),local:Object.freeze(l),checks,firstDifference,calendarBoundary,
  sourcePattern01:s.dingPin01,sourcePattern02:s.dingPin02,
  sourcePeriod03Count:s.dingZa03Count,
  localSourceCriterionVerified:false,
  semanticEquivalenceVerified:false
 });
}
function analyzeRootCause(input){
 validateSource(input);
 const records=[],failures=[];
 for(const date of DATES)for(const gender of GENDERS)for(const hour of HOURS){
  const id=date+'-'+gender+'-'+hour;
  const rec=input.records.find(x=>x.id===id);
  try{records.push(compareCase(rec));}
  catch(e){failures.push({id,reason:String(e?.message||e)});}
 }
 const keys=['lunarYear','lunarMonth','lunarDay','leapMonth','yearStem',
  'wuxingJu','ziweiPos','mingGong','liemTrinh','thatSat','huaLoc'];
 const differences=Object.freeze(Object.fromEntries(keys.map(k=>[
  k,records.filter(x=>!x.checks[k]).length
 ])));
 const byDate=Object.freeze(Object.fromEntries(DATES.map(date=>[
  date,Object.freeze({
   records:records.filter(x=>x.solarDate===date).length,
   firstDifferences:Object.freeze(Object.fromEntries(
    [...new Set(records.filter(x=>x.solarDate===date).map(x=>x.firstDifference))]
    .sort().map(k=>[k,records.filter(x=>x.solarDate===date&&x.firstDifference===k).length]))
   )
  })
 ])));
 return Object.freeze({
  schema:REPORT,sourceCommit:SOURCE_COMMIT,sourceIztroVersion:VERSION,
  genuineSourceRequired:true,syntheticOnly:true,
  compared:records.length,expected:30,failures:failures.length,
  differences,byDate,
  calendarBoundaryCount:records.filter(x=>x.calendarBoundary.status==='compatible-with-civil-timezone-boundary').length,
  calendarBoundaryReference:BOUNDARY.reference,
  records,errors:failures,
  semanticEquivalenceVerified:false,localPatternVerdictsVerified:false,
  engineChanged:false,limitation:LIMITATION
 });
}
if(require.main===module){
 if(process.argv.length!==3)throw Error('R33 requires genuinely executed source observation file');
 const input=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8'));
 const report=analyzeRootCause(input);
 fs.writeFileSync('.r33-1989-root-cause-report.json',JSON.stringify(report,null,2)+'\n');
 console.log('R33 source/local diagnostic '+report.compared+'/30; errors '+report.failures+
  '; first differences '+JSON.stringify(Object.fromEntries(Object.entries(report.byDate)
   .map(([date,x])=>[date,x.firstDifferences]))));
 if(report.compared!==30||report.failures)process.exitCode=1;
}
module.exports=Object.freeze({SCHEMA,REPORT,VERSION,DATES,HOURS,GENDERS,LIMITATION,
 validateSource,compareCase,analyzeRootCause,BOUNDARY,civilDateAtOffset,evaluateCalendarBoundary});
