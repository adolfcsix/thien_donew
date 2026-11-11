'use strict';
/**
 * R35: read-only lunar-leap, Lunar New Year and Tý-boundary evidence.
 * Source runtime data comes exclusively from pinned reference checkout in CI.
 * Never silently normalize source dates or change the Thiên Đồ engine.
 */
const fs = require('node:fs');
const path = require('node:path');
const Engine = require('../../packages/astrology-engine/src/tuvi.js');
const {SOURCE_COMMIT} = require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {auditClassicalVoidSemanticGates} = require('../../packages/interpretation/src/classical-void-semantic-gates.cjs');
const FIXTURE_PATH = path.resolve(__dirname, '../../tests/fixtures/tuvi-r35-vietnam-lunar-boundaries.json');
const SCHEMA = 'thiendo-r35-pinned-source-lunar-transition-v1';
const REPORT = 'thiendo-r35-transition-evidence-v1';
const IZTRO = '2.6.1';
const BRANCHES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const EXPECTED = Object.freeze({
  'leap-2020-04': ['leap-start','2020-05-23',2020,4,true],
  'leap-2023-02': ['leap-start','2023-03-22',2023,2,true],
  'newyear-2024': ['lunar-new-year','2024-02-10',2024,1,false],
  'newyear-2025': ['lunar-new-year','2025-01-29',2025,1,false]
});
const eq = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const between = (v,min,max) => Number.isInteger(v)&&v>=min&&v<=max;
function solarOffset(date, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)||!between(days,-2,2)) throw Error('Invalid controlled civil date');
  const d = new Date(date+'T12:00:00Z');
  if (!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date) throw Error('Nonexistent civil date');
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
const hourBranch = hour => {
  if(!between(hour,0,23))throw Error('Invalid hour');
  return Math.floor(((hour+1)%24)/2);
};
function validateFixture(f) {
  if(!f||f.schema!=='thiendo-r35-vietnam-lunar-boundaries-v1'||
    !eq(f.offsetsDays,[-1,0,1])||!eq(f.genders,['Nam','Nữ'])||
    !eq(f.clockHours,[0,1,23])||!Array.isArray(f.anchors)||f.anchors.length!==4)
    throw Error('R35 controlled fixture shape changed');
  if(!f.provenance||!Object.keys(f.provenance).includes('scope')||
     !String(f.provenance.leap2020||'').startsWith('https://lichngaytot.com/')||
     !String(f.provenance.leap2023||'').startsWith('https://lichngaytot.com/')||
     !String(f.provenance.newyear2024||'').startsWith('https://en.baochinhphu.vn/')||
     !String(f.provenance.newyear2025||'').startsWith('https://www.census.gov/'))
    throw Error('R35 independent calendar citations lost');
  if(new Set(f.anchors.map(a=>a?.id)).size!==4)throw Error('Duplicate R35 transition anchor');
  for(const a of f.anchors){
    const exp=EXPECTED[a.id];
    if(!exp||!eq([a.type,a.date,a.lunarYear,a.lunarMonth,a.isLeapMonth],exp))
      throw Error('R35 transition anchor altered');
  }
  return true;
}
function validateSource(input,f) {
  validateFixture(f);
  if(!input||input.schema!==SCHEMA||
      input.provenance?.repository!=='Renhuai123/ziwei-doushu'||
      input.provenance.commit!==SOURCE_COMMIT||
      input.provenance.iztroVersion!==IZTRO||
      input.provenance.generator!=='generateChart'||
      input.provenance.sourceExecuted!==true||
      input.provenance.syntheticOnly!==true||
      !Array.isArray(input.records)||input.records.length!==72||
      new Set(input.records.map(r=>r?.id)).size!==72)
    throw Error('Pinned source R35 evidence missing, untrusted or incomplete');
  const byId=new Map(input.records.map(r=>[r.id,r]));
  for(const a of f.anchors)for(const offset of f.offsetsDays)
  for(const gender of f.genders)for(const hour of f.clockHours){
    const id=[a.id,offset,gender,hour].join(':');
    const r=byId.get(id);
    if(!r||r.anchorId!==a.id||r.offsetDays!==offset||
       r.solarDate!==solarOffset(a.date,offset)||r.gender!==gender||
       r.clockHour!==hour||r.hourBranch!==hourBranch(hour))
      throw Error('Source case missing/mutated: '+id);
    const s=r.source;
    if(!s||!between(s.lunarYear,1800,2200)||!between(s.lunarMonth,-12,12)||
      s.lunarMonth===0||!between(s.lunarDay,1,30)||
      typeof s.isLeapMonth!=='boolean'||!between(s.yearStem,0,9)||
      ![2,3,4,5,6].includes(s.wuxingJu)||
      !between(s.ziweiPos,0,11)||!between(s.mingGongBranch,0,11))
      throw Error('Malformed source chart: '+id);
  }
  return true;
}
function calendarClass(s,l) {
  if(s.lunarYear!==l.lunarYear)return 'different-lunar-year';
  if(s.lunarMonth!==l.lunarMonth||s.isLeapMonth!==l.isLeapMonth)
    return 'different-month-or-leap';
  if(s.lunarDay!==l.lunarDay)return 'different-lunar-day';
  return 'same-lunar-date';
}
function compare(record,anchor) {
  const chart=Engine.calculate({date:record.solarDate,hour:record.clockHour,minute:0,gender:record.gender,calendar:'solar'});
  const before=JSON.stringify(chart);
  const audit=auditClassicalVoidSemanticGates(chart);
  if(JSON.stringify(chart)!==before||audit.semanticEquivalenceVerified!==false||
    audit.sourceCriterionVerified!==false||
    audit.sourcePlacementVerifiedForCurrentChart!==false)
    throw Error('Local R35 evidence changed chart or semantic gates');
  const local={
    lunarYear:chart.lunar?.year,
    lunarMonth:chart.lunar?.month,
    lunarDay:chart.lunar?.day,
    isLeapMonth:chart.lunar?.leap===true,
    wuxingJu:chart.cuc?.number,
    ziweiPos:BRANCHES.indexOf(chart.ziWei),
    mingGongBranch:BRANCHES.indexOf(chart.menh)
  };
  if(!between(local.lunarYear,1800,2200)||!between(local.lunarMonth,1,12)||
     !between(local.lunarDay,1,30)||![2,3,4,5,6].includes(local.wuxingJu)||
     !between(local.ziweiPos,0,11)||!between(local.mingGongBranch,0,11))
    throw Error('Malformed local chart: '+record.id);
  const s=record.source;
  return {
    id:record.id,anchorId:record.anchorId,type:anchor.type,solarDate:record.solarDate,
    offsetDays:record.offsetDays,gender:record.gender,clockHour:record.clockHour,
    sourceHourBranch:record.hourBranch,
    source:s,local,calendarClass:calendarClass(s,local),
    cucAligned:s.wuxingJu===local.wuxingJu,
    ziweiAligned:s.ziweiPos===local.ziweiPos,
    mingAligned:s.mingGongBranch===local.mingGongBranch,
    anchorLunarCalendarClaim:{year:anchor.lunarYear,month:anchor.lunarMonth,leap:anchor.isLeapMonth},
    expectedVietnamAnchorDate:anchor.date,
    calendarConvention:'Vietnamese civil day UTC+7 versus reference library as executed',
    hourConventionWarning:record.clockHour===23
      ? 'Reference accepts Tý branch only; late-Tý rollover rule not independently verified'
      : 'Reference accepts hour branch; do not infer minute-level behavior',
    sourceCalendarTimezoneExplicitlyVerified:false,
    sourceLateZiRolloverVerified:false,
    semanticEquivalenceVerified:false,
    sourceSchoolParityVerified:false
  };
}
function analyze(input,f) {
  validateSource(input,f);
  const lookup=new Map(f.anchors.map(a=>[a.id,a]));
  const records=[],errors=[];
  for(const rec of input.records){
    try {records.push(compare(rec,lookup.get(rec.anchorId)));}
    catch(e){errors.push({id:rec.id,message:String(e?.message||e)});}
  }
  const categories=['same-lunar-date','different-lunar-day','different-month-or-leap','different-lunar-year'];
  const count=arr=>({
    total:arr.length,
    classes:Object.fromEntries(categories.map(k=>[k,arr.filter(x=>x.calendarClass===k).length])),
    matchingCuc:arr.filter(x=>x.cucAligned).length,
    matchingZiWei:arr.filter(x=>x.ziweiAligned).length,
    matchingMenh:arr.filter(x=>x.mingAligned).length
  });
  return {
    schema:REPORT,sourceCommit:SOURCE_COMMIT,sourceIztroVersion:IZTRO,
    checked:records.length,expected:72,failures:errors.length,
    summary:count(records),
    byAnchor:Object.fromEntries(f.anchors.map(a=>[a.id,count(records.filter(r=>r.anchorId===a.id))])),
    byHour:Object.fromEntries(f.clockHours.map(h=>[h,count(records.filter(r=>r.clockHour===h))])),
    records,errors,syntheticOnly:true,sourceRuntimeRequired:true,
    sourceLateZiRolloverVerified:false,sourceCalendarTimezoneExplicitlyVerified:false,
    semanticEquivalenceVerified:false,sourceSchoolParityVerified:false,
    localPatternVerdictsVerified:false,catalogMappedConditionsUnchanged:31,
    limitation:'72 synthetic observations are not independent proof of school equivalence. Late Tý day rollover is not encoded by the pinned source generateChart hour-branch API; retain ambiguity and do not modify the Tử Vi engine.'
  };
}
if(require.main===module){
  if(process.argv.length!==3)throw Error('R35 requires executed pinned source JSON');
  const f=JSON.parse(fs.readFileSync(FIXTURE_PATH,'utf8'));
  const input=JSON.parse(fs.readFileSync(path.resolve(process.argv[2]),'utf8'));
  const report=analyze(input,f);
  fs.writeFileSync('.r35-transition-evidence-report.json',JSON.stringify(report,null,2)+'\n');
  console.log('R35: '+report.checked+'/72 observations; '+report.failures+' malformed local/source charts');
  if(report.failures||report.checked!==72)process.exitCode=1;
}
module.exports=Object.freeze({SCHEMA,REPORT,IZTRO,solarOffset,hourBranch,validateFixture,validateSource,calendarClass,compare,analyze});
