'use strict';
/**
 * R37 read-only scenario comparison. This is NOT the production birth-time
 * policy and does not alter the legacy Thiên Đồ chart calculation.
 *
 * Scope: user-entered Gregorian civil date/time only, no longitude, UTC
 * correction, historical timezone or true solar time. For hour 23 it compares
 * the existing same-civil-day chart with an explicit next-civil-day chart.
 */
const Engine = require('./tuvi.js');
const SCHEMA = 'thiendo-r37-late-zi-scenario-diff-v1';
const LIMITATION = 'Chỉ so sánh hai ngày dương dân sự của giờ 23:00–23:59. Chưa xác minh múi giờ lịch sử, địa điểm sinh, giờ mặt trời thực hay tương đương trường phái. Không tự đổi ngày lập lá số.';
const FIELDS = ['lunarYear','lunarMonth','lunarDay','lunarLeap','yearCanChi','menh','than','cuc','ziWei','thienPhu'];
function validateInput(input) {
  if(!input || typeof input.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||
     !Number.isInteger(input.hour)||input.hour<0||input.hour>23||
     !Number.isInteger(input.minute)||input.minute<0||input.minute>59||
     !['Nam','Nữ'].includes(input.gender)||!['solar',undefined].includes(input.calendar))
    throw new RangeError('R37 yêu cầu ngày dương YYYY-MM-DD, giờ 0–23, phút 0–59 và giới tính Nam/Nữ.');
  const [year,month,day]=input.date.split('-').map(Number);
  const d=new Date(Date.UTC(year,month-1,day));
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==input.date||year<1900||year>2100)
    throw new RangeError('R37 chỉ hỗ trợ ngày dương hợp lệ từ 1900 đến 2100.');
  return Object.freeze({date:input.date,hour:input.hour,minute:input.minute,gender:input.gender,calendar:'solar'});
}
function nextDay(date){
  const d=new Date(date+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+1);
  const iso=d.toISOString().slice(0,10);
  if(Number(iso.slice(0,4))>2100)return null;
  return iso;
}
function snapshot(chart){
  const stars={};
  for(const house of chart.houses||[])for(const name of house.stars||[]){
    if(Object.hasOwn(stars,name))throw Error('Duplicate core main star in chart: '+name);
    stars[name]=house.branch;
  }
  if(Object.keys(stars).length!==14)throw Error('R37 expected 14 core stars');
  return Object.freeze({
    lunarYear:chart.lunar.year,
    lunarMonth:chart.lunar.month,
    lunarDay:chart.lunar.day,
    lunarLeap:chart.lunar.leap===true,
    yearCanChi:chart.yearCanChi,menh:chart.menh,than:chart.than,
    cuc:chart.cuc.number,ziWei:chart.ziWei,thienPhu:chart.thienPhu,
    mainStars:Object.freeze(Object.fromEntries(Object.entries(stars).sort(([a],[b])=>a.localeCompare(b,'vi'))))
  });
}
function compareChartSummaries(a,b){
  const values=Object.fromEntries(FIELDS.map(key=>[key,Object.freeze({
    same:a[key]===b[key],sameDay:a[key],nextDay:b[key]
  })]));
  const keys=[...new Set([...Object.keys(a.mainStars),...Object.keys(b.mainStars)])].sort((x,y)=>x.localeCompare(y,'vi'));
  const mainStars=Object.fromEntries(keys.map(name=>[name,Object.freeze({
    same:a.mainStars[name]===b.mainStars[name],
    sameDay:a.mainStars[name]??null,
    nextDay:b.mainStars[name]??null
  })]));
  return Object.freeze({
    fields:Object.freeze(values),
    changedFields:Object.freeze(FIELDS.filter(key=>!values[key].same)),
    coreStars:Object.freeze(mainStars),
    changedCoreStars:Object.freeze(keys.filter(key=>!mainStars[key].same)),
    coreStarCount:keys.length
  });
}
function evaluate(rawInput){
  const input=validateInput(rawInput);
  const sameChart=Engine.calculate(input);
  const sameDay=snapshot(sameChart);
  const allowed=input.hour===23;
  const advancedDate=allowed?nextDay(input.date):null;
  if(!allowed || !advancedDate){
    return Object.freeze({
      schema:SCHEMA,calendar:'solar',clockMode:'civil-clock-no-true-solar-time',
      input,eligible:allowed,candidateAvailable:false,
      candidateDate:advancedDate,
      sameDay,comparison:null,
      selectedPolicy:'current-day',productionPolicyUnchanged:true,
      sourceSchoolEquivalenceVerified:false,astroTimezoneVerified:false,
      reason:allowed?'Ngày kế tiếp nằm ngoài phạm vi 1900–2100 được engine hỗ trợ.':'Chỉ giờ 23:00–23:59 mới có hai kịch bản chuyển ngày Tý.',
      limitation:LIMITATION
    });
  }
  const nextChart=Engine.calculate({...input,date:advancedDate});
  const nextSnapshot=snapshot(nextChart);
  return Object.freeze({
    schema:SCHEMA,calendar:'solar',clockMode:'civil-clock-no-true-solar-time',
    input,eligible:true,candidateAvailable:true,
    candidateDate:advancedDate,
    sameDay,nextDay:nextSnapshot,
    comparison:compareChartSummaries(sameDay,nextSnapshot),
    selectedPolicy:'current-day',productionPolicyUnchanged:true,
    sourceSchoolEquivalenceVerified:false,astroTimezoneVerified:false,
    reason:'Hai kết quả là kịch bản nghiên cứu, không xác định kịch bản nào đúng cho người dùng.',
    limitation:LIMITATION
  });
}
module.exports=Object.freeze({SCHEMA,LIMITATION,FIELDS,validateInput,nextDay,snapshot,compareChartSummaries,evaluate});
