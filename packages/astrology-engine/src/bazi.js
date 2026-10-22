/* THIÊN ĐỒ V9.8 — Four Pillars (Bát Tự) reference engine.
 * Fixed civil time Asia/Ho_Chi_Minh (UTC+7), supported years 1900–2100.
 * Year/month: apparent solar longitude approximation; not minute-precise near Jie.
 * Day: civil JDN, optional rollover at 23:00; hour: Five Rats formula.
 * No claims about fate, favorable elements, true solar time or Day Master strength.
 */
(function (root) {
'use strict';
const Lunar=(typeof module!=='undefined'&&module.exports)?require('./lunar.js'):root.ThienDoLunar;
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const ELEMENTS=Object.freeze(['Mộc','Mộc','Hỏa','Hỏa','Thổ','Thổ','Kim','Kim','Thủy','Thủy']);
const RULESET='four-pillars-solar-jie-v9.7-utc7';
const HIDDEN_STEMS_RULESET='zi-ping-common-hidden-stems-v9.6';
const TEN_GODS_RULESET='five-phases-polarity-v9.6';
// Canonical order: main qi, then middle/residual; these are NOT numeric weights.
const HIDDEN_STEM_INDICES=Object.freeze([
  [9], [5,9,7], [0,2,4], [1], [4,1,9], [2,6,4],
  [3,5], [5,3,1], [6,8,4], [7], [4,7,3], [8,0]
].map(indices=>Object.freeze(indices)));
const TEN_GODS=Object.freeze([
  Object.freeze(['Tỷ Kiên','Kiếp Tài']),
  Object.freeze(['Thực Thần','Thương Quan']),
  Object.freeze(['Thiên Tài','Chính Tài']),
  Object.freeze(['Thất Sát','Chính Quan']),
  Object.freeze(['Thiên Ấn','Chính Ấn'])
]);
const ELEMENT_SEQUENCE=Object.freeze(['Mộc','Hỏa','Thổ','Kim','Thủy']);
// Traditional index-pair lookup tables; observations do not imply transformation.
const RELATIONS_RULESET='bazi-contacts-stem-branch-v9.7';
const STEM_COMBINATIONS=Object.freeze([[0,5,'Thổ'],[1,6,'Kim'],[2,7,'Thủy'],[3,8,'Mộc'],[4,9,'Hỏa']].map(x=>Object.freeze(x)));
const STEM_CLASHES=Object.freeze([[0,6],[1,7],[2,8],[3,9]].map(x=>Object.freeze(x)));
const BRANCH_COMBINATIONS=Object.freeze([[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]].map(x=>Object.freeze(x)));
const BRANCH_CLASHES=Object.freeze([[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]].map(x=>Object.freeze(x)));
const BRANCH_TRIADS=Object.freeze([
  [[8,0,4],'Thủy'],[[11,3,7],'Mộc'],[[2,6,10],'Hỏa'],[[5,9,1],'Kim']
].map(([branches,element])=>Object.freeze({branches:Object.freeze(branches),element})));
const PILLAR_ORDER=Object.freeze(['year','month','day','hour']);
function detectRelations(pillars){
  if(!pillars||typeof pillars!=='object')throw new TypeError('Thiếu bốn trụ');
  const entries=PILLAR_ORDER.map(key=>{
    const p=pillars[key];
    if(!p||typeof p!=='object')throw new TypeError('Thiếu trụ '+key);
    checkStemIndex(p.stemIndex);checkBranchIndex(p.branchIndex);
    return {key,stemIndex:p.stemIndex,branchIndex:p.branchIndex};
  });
  const out={ruleSet:RELATIONS_RULESET,stemCombinations:[],stemClashes:[],branchCombinations:[],branchClashes:[],branchTriads:[],
    note:'Chỉ xác định quan hệ ký hiệu giữa các trụ; không xác nhận hóa khí, mức mạnh yếu, tốt/xấu hoặc sự kiện. Một cặp có thể xuất hiện ở nhiều trụ, không được tự cộng trọng số.'};
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const a=entries[i],b=entries[j];
    const detect=(table,key,prop,names)=>{
      const pair=table.find(row=>(row[0]===a[prop]&&row[1]===b[prop])||(row[1]===a[prop]&&row[0]===b[prop]));
      if(!pair)return;
      const obj={pillars:[a.key,b.key],symbols:[names[a[prop]],names[b[prop]]]};
      if(key==='stemCombinations')obj.traditionalElement=pair[2];
      out[key].push(obj);
    };
    detect(STEM_COMBINATIONS,'stemCombinations','stemIndex',STEMS);
    detect(STEM_CLASHES,'stemClashes','stemIndex',STEMS);
    detect(BRANCH_COMBINATIONS,'branchCombinations','branchIndex',BRANCHES);
    detect(BRANCH_CLASHES,'branchClashes','branchIndex',BRANCHES);
  }
  // All three distinct branches must occur in three distinct pillars.
  for(const triad of BRANCH_TRIADS){
    const matches=triad.branches.map(branch=>entries.find(p=>p.branchIndex===branch));
    if(matches.every(Boolean))out.branchTriads.push({pillars:matches.map(p=>p.key),symbols:triad.branches.map(i=>BRANCHES[i]),traditionalElement:triad.element});
  }
  return out;
}

function checkStemIndex(value){if(!Number.isInteger(value)||value<0||value>=10)throw new RangeError('Chỉ số Thiên Can phải thuộc 0–9');}
function checkBranchIndex(value){if(!Number.isInteger(value)||value<0||value>=12)throw new RangeError('Chỉ số Địa Chi phải thuộc 0–11');}
function tenGod(dayStemIndex,targetStemIndex){
  checkStemIndex(dayStemIndex);checkStemIndex(targetStemIndex);
  const dayElement=Math.floor(dayStemIndex/2),targetElement=Math.floor(targetStemIndex/2);
  const phaseDelta=mod(targetElement-dayElement,5);
  const relationshipIndex=([0,1,2,3,4].indexOf(phaseDelta));
  const samePolarity=dayStemIndex%2===targetStemIndex%2;
  return TEN_GODS[relationshipIndex][samePolarity?0:1];
}
function hiddenStems(branchIndex,dayStemIndex){
  checkBranchIndex(branchIndex);checkStemIndex(dayStemIndex);
  return HIDDEN_STEM_INDICES[branchIndex].map((stemIndex,order)=>({
    stem:STEMS[stemIndex],stemIndex,element:ELEMENTS[stemIndex],
    polarity:stemIndex%2===0?'Dương':'Âm',
    role:order===0?'Chính khí':order===1?'Khí phụ':'Dư khí',
    tenGod:tenGod(dayStemIndex,stemIndex)
  }));
}
const mod=(x,y)=>((x%y)+y)%y;
function pillar(stem,branch){return {stem:STEMS[stem],branch:BRANCHES[branch],stemIndex:stem,branchIndex:branch,name:`${STEMS[stem]} ${BRANCHES[branch]}`,element:ELEMENTS[stem],polarity:stem%2===0?'Dương':'Âm'};}
function solarLongitudeAtTime(year,month,day,hour,minute){
  // Meeus low-precision apparent ecliptic longitude, instant is VN civil time UTC+7.
  const jd=(Date.UTC(year,month-1,day,hour-7,minute)/86400000)+2440587.5;
  const t=(jd-2451545)/36525,r=Math.PI/180;
  const l0=280.46646+36000.76983*t+0.0003032*t*t;
  const m=357.52911+35999.05029*t-0.0001537*t*t;
  const c=(1.914602-0.004817*t-0.000014*t*t)*Math.sin(m*r)
    +(0.019993-0.000101*t)*Math.sin(2*m*r)+0.000289*Math.sin(3*m*r);
  const omega=125.04-1934.136*t;
  return mod(l0+c-0.00569-0.00478*Math.sin(omega*r),360);
}
function calculate({date,hour,minute=0,dayBoundary='midnight'}={}){
  if(typeof date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))throw new RangeError('Ngày phải là YYYY-MM-DD');
  const [year,month,day]=date.split('-').map(Number);
  if(!Lunar.validSolar(year,month,day))throw new RangeError('Ngày sinh phải hợp lệ trong khoảng 1900–2100');
  if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw new RangeError('Giờ phút không hợp lệ');
  if(!['midnight','late-zi'].includes(dayBoundary))throw new RangeError('Quy ước đổi ngày không hợp lệ');
  const solarLongitude=solarLongitudeAtTime(year,month,day,hour,minute);
  // From 315° (Lập Xuân) every 30°: Dần month=0, Mão=1, ... Sửu=11.
  const monthIndex=Math.floor(mod(solarLongitude-315,360)/30);
  const solarYear=month===1||(month===2&&solarLongitude<315)?year-1:year;
  const yearStem=mod(solarYear-4,10),yearBranch=mod(solarYear-4,12);
  const monthBranch=mod(monthIndex+2,12);
  // Ngũ Hổ Độn: Giáp/Kỷ -> Bính Dần; Ất/Canh -> Mậu Dần; etc.
  const monthStem=mod((yearStem%5)*2+2+monthIndex,10);
  const rollover=dayBoundary==='late-zi'&&hour===23;
  const civilJdn=Lunar.jd(day,month,year);
  const dayJdn=civilJdn+(rollover?1:0);
  const dayStem=mod(dayJdn+9,10),dayBranch=mod(dayJdn+1,12);
  const hourBranch=mod(Math.floor((hour+1)/2),12);
  // Ngũ Thử Độn: Giáp/Kỷ -> Giáp Tý, Ất/Canh -> Bính Tý, ...
  const hourStem=mod((dayStem%5)*2+hourBranch,10);
  const distanceToJie=mod(solarLongitude-315,30);
  const warnings=[];
  if(distanceToJie<1.2||distanceToJie>28.8)warnings.push('Gần thời điểm chuyển tiết: kinh độ Mặt Trời hiện được tính gần đúng; cần kiểm tra giờ nhập tiết chính xác khi an trụ năm/tháng.');
  if(hour===23)warnings.push('Giờ 23:00–23:59: hai quy ước đổi ngày có thể cho trụ ngày và trụ giờ khác nhau.');
  if(year<1976)warnings.push('Lịch sử múi giờ và giờ mùa hè theo nơi sinh có thể khác UTC+7 cố định; cần kiểm chứng giờ địa phương lịch sử.');
  warnings.push('Chưa hiệu chỉnh chân thái dương thời theo kinh độ nơi sinh; không dùng kết quả để suy luận vượng suy, dụng thần hoặc dự đoán sự kiện.');
  const pillars={year:pillar(yearStem,yearBranch),month:pillar(monthStem,monthBranch),day:pillar(dayStem,dayBranch),hour:pillar(hourStem,hourBranch)};
  // Add a separate explanatory layer; never alter the original pillar calculations.
  for(const [key,value] of Object.entries(pillars)){
    value.tenGod=key==='day'?null:tenGod(dayStem,value.stemIndex);
    value.hiddenStems=hiddenStems(value.branchIndex,dayStem);
  }
  const elementCounts=Object.fromEntries(['Mộc','Hỏa','Thổ','Kim','Thủy'].map(e=>[e,Object.values(pillars).filter(p=>p.element===e).length]));
  const hiddenElementCounts=Object.fromEntries(ELEMENT_SEQUENCE.map(e=>[e,Object.values(pillars).flatMap(p=>p.hiddenStems).filter(s=>s.element===e).length]));
  const combinedElementCounts=Object.fromEntries(ELEMENT_SEQUENCE.map(e=>[e,elementCounts[e]+hiddenElementCounts[e]]));
  const relations=detectRelations(pillars);
  return {ruleSet:RULESET, hiddenStemsRuleSet:HIDDEN_STEMS_RULESET,tenGodsRuleSet:TEN_GODS_RULESET,input:{date,hour,minute,dayBoundary,timeZone:'Asia/Ho_Chi_Minh',utcOffsetHours:7},
    pillars,dayMaster:{stem:pillars.day.stem,element:pillars.day.element,polarity:pillars.day.polarity},
    solarTerm:{longitudeDeg:Number(solarLongitude.toFixed(3)),monthIndex,nearBoundary:distanceToJie<1.2||distanceToJie>28.8,solarYear,precision:'approximate—not authoritative near Jie'},
    relations,
    elementCounts:{...elementCounts},hiddenElementCounts,combinedElementCounts,elementCountScope:'Bốn THIÊN CAN hiện trên các trụ, không bao gồm tàng can địa chi; KHÔNG phải tỷ lệ ngũ hành toàn mệnh.',
    elementCountNote:'Đếm ký hiệu: Thiên Can hiện và Tàng Can tính riêng, không gán trọng số khí, không suy ra tỷ lệ ngũ hành hay vượng suy, dụng thần.',
    warnings,disclaimer:'Bát Tự là phương pháp lịch pháp truyền thống phục vụ tham khảo văn hóa; không phải dự đoán khoa học.'};
}
/* V9.8: Đại Vận (Da Yun) – 12 monthly Jie, not mid-month Zhongqi.
 * Convention: Yang-year man / Yin-year woman run forward; reverse otherwise.
 * Starting age is birth-to-Jie elapsed days / 3. This is a COMPUTED ESTIMATE,
 * NOT a minute-accurate verified astronomical Jie instant or a predictive reading.
 */
const DA_YUN_RULESET='dayun-year-stem-yinyang-12jie-3days-year-v9.8';
const DAY_MS=86400000;
const JIE_NAMES=Object.freeze(['Lập Xuân','Kinh Trập','Thanh Minh','Lập Hạ','Mang Chủng','Tiểu Thử','Lập Thu','Bạch Lộ','Hàn Lộ','Lập Đông','Đại Tuyết','Tiểu Hàn']);
function longitudeAtUtc(utcMs){
  const v=new Date(utcMs+7*3600000);
  return solarLongitudeAtTime(v.getUTCFullYear(),v.getUTCMonth()+1,v.getUTCDate(),v.getUTCHours(),v.getUTCMinutes()+v.getUTCSeconds()/60+v.getUTCMilliseconds()/60000);
}
function jieBoundaryAt(utcMs,direction){
  if(!Number.isFinite(utcMs)||!['forward','reverse'].includes(direction))throw new RangeError('Mốc giờ hoặc chiều Đại Vận không hợp lệ');
  const longitude=longitudeAtUtc(utcMs);
  const pos=mod(longitude-315,360);
  const sector=Math.floor(pos/30);
  const targetSector=direction==='forward'?mod(sector+1,12):sector;
  const arc=direction==='forward'?30-pos%30:pos%30;
  // For reverse, exact boundary -> 0 duration; forward searches next boundary.
  if(direction==='reverse'&&arc<1e-10)return {timestampMs:utcMs,longitudeDeg:mod(315+targetSector*30,360),name:JIE_NAMES[targetSector],sectorIndex:targetSector,intervalDays:0};
  let left=0,right=37*DAY_MS;
  const extent=elapsed=>{
    const at=utcMs+(direction==='forward'?elapsed:-elapsed);
    return direction==='forward'?mod(longitudeAtUtc(at)-longitude,360):mod(longitude-longitudeAtUtc(at),360);
  };
  if(extent(right)<arc-1e-7)throw new RangeError('Không xác định được tiết khí trong giới hạn khảo sát');
  for(let k=0;k<52;k++){
    const mid=(left+right)/2;
    if(extent(mid)>=arc)right=mid;else left=mid;
  }
  const distance=(left+right)/2;
  const targetTs=utcMs+(direction==='forward'?distance:-distance);
  return {timestampMs:Math.round(targetTs/60000)*60000,longitudeDeg:mod(315+targetSector*30,360),name:JIE_NAMES[targetSector],sectorIndex:targetSector,intervalDays:distance/DAY_MS};
}
function formatVnTimestamp(utcMs){
  const d=new Date(utcMs+7*3600000);
  return [d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,'0'),String(d.getUTCDate()).padStart(2,'0')].join('-')+' '+String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');
}
function daYun({date,hour,minute=0,dayBoundary='midnight',sex,count=8}={}){
  if(sex!=='male'&&sex!=='female')throw new RangeError('Hãy chọn Nam hoặc Nữ để xác định chiều Đại Vận theo quy tắc truyền thống');
  if(!Number.isInteger(count)||count<1||count>12)throw new RangeError('Số đại vận phải trong khoảng 1–12');
  const birth=calculate({date,hour,minute,dayBoundary}); // validates all inputs consistently
  const direction=((birth.pillars.year.stemIndex%2===0)===(sex==='male'))?'forward':'reverse';
  const step=direction==='forward'?1:-1;
  const [year,month,day]=date.split('-').map(Number);
  const utcMs=Date.UTC(year,month-1,day,hour-7,minute);
  const boundary=jieBoundaryAt(utcMs,direction);
  const elapsedDays=boundary.intervalDays;
  const ageYears=elapsedDays/3;
  const totalMonths=Math.round(ageYears*12);
  const estimatedStartUtc=utcMs+ageYears*365.2425*DAY_MS;
  const cycles=Array.from({length:count},(_,i)=>{
    const stemIndex=mod(birth.pillars.month.stemIndex+step*(i+1),10);
    const branchIndex=mod(birth.pillars.month.branchIndex+step*(i+1),12);
    const ageStart=ageYears+i*10;
    const startUtc=estimatedStartUtc+i*10*365.2425*DAY_MS;
    const decade=pillar(stemIndex,branchIndex);
    return {index:i+1,stem:decade.stem,branch:decade.branch,stemIndex,branchIndex,name:decade.name,
      tenGod:tenGod(birth.pillars.day.stemIndex,stemIndex),
      startingAgeYears:Number(ageStart.toFixed(3)),endingAgeYears:Number((ageStart+10).toFixed(3)),
      estimatedStartCalendarYear:new Date(startUtc+7*3600000).getUTCFullYear(),
      estimatedEndCalendarYear:new Date(startUtc+10*365.2425*DAY_MS+7*3600000).getUTCFullYear()};
  });
  return {ruleSet:DA_YUN_RULESET,input:{...birth.input,sex},yearStemPolarity:birth.pillars.year.polarity,
    direction,directionLabel:direction==='forward'?'Thuận':'Nghịch',monthPillar:birth.pillars.month.name,
    referenceJie:{name:boundary.name,longitudeDeg:boundary.longitudeDeg,
      approxVietnamTime:formatVnTimestamp(boundary.timestampMs),distanceDays:Number(elapsedDays.toFixed(5))},
    startingAge:{decimalYears:Number(ageYears.toFixed(4)),years:Math.floor(totalMonths/12),months:totalMonths%12,
      precision:'ước tính theo 3 ngày = 1 năm; hiển thị tới tháng gần nhất, không phải tuổi mụ'},
    cycles,notes:[
      'Chỉ dùng 12 tiết Jie mở tháng, không dùng 12 trung khí. Thời điểm Jie từ công thức kinh độ Mặt Trời gần đúng, làm tròn đến phút; chưa kiểm định thiên văn độc lập.',
      'Chiều Đại Vận theo âm/dương CAN NĂM sinh và lựa chọn Nam/Nữ của phương pháp này, không theo Can ngày; một số trường phái có quy ước khác.',
      'Tuổi và năm khởi vận là ước tính theo tỷ lệ 3 ngày = 1 năm, không dùng làm thời điểm dự báo sự kiện hoặc vượng suy, dụng thần.',
      'Giờ sinh sử dụng UTC+7 cố định, chưa tính chân thái dương thời và thay đổi múi giờ lịch sử.'
    ]};
}
const api=Object.freeze({calculate,daYun,jieBoundaryAt,DA_YUN_RULESET,JIE_NAMES,RULESET,STEMS,BRANCHES,ELEMENTS,solarLongitudeAtTime,HIDDEN_STEMS_RULESET,TEN_GODS_RULESET,HIDDEN_STEM_INDICES,tenGod,hiddenStems,RELATIONS_RULESET,detectRelations,STEM_COMBINATIONS,STEM_CLASHES,BRANCH_COMBINATIONS,BRANCH_CLASHES,BRANCH_TRIADS});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.ThienDoBaZi=api;
})(typeof globalThis!=='undefined'?globalThis:this);
