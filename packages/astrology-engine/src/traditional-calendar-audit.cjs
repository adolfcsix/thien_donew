'use strict';
/** V11.136. Historical calendar evidence layer. No claim of astronomical minute precision. */
const Lunar=require('./lunar.js');
const Almanac=require('./almanac.js');
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const MOD=(a,b)=>(a%b+b)%b;
const RULESET='traditional-calendar-provenance-v11.136';
const CYCLE=Object.freeze(Array.from({length:60},(_,i)=>Object.freeze({ordinal:i+1,stem:STEMS[i%10],branch:BRANCHES[i%12],name:`${STEMS[i%10]} ${BRANCHES[i%12]}`})));
const RULES=Object.freeze({
  'civil-midnight':Object.freeze({id:'civil-midnight',changeHour:0,label:'Đổi ngày 00:00 theo lịch dân dụng'}),
  'late-zi':Object.freeze({id:'late-zi',changeHour:23,label:'Đổi ngày 23:00 theo quy ước Tý sơ'}),
});
function strictDate(s){
 if(typeof s!=='string'||!/^(19\d{2}|20\d{2}|2100)-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(s))throw new RangeError('Chỉ hỗ trợ ngày ISO hợp lệ trong 1900–2100');
 const [y,m,d]=s.split('-').map(Number);if(!Lunar.validSolar(y,m,d))throw new RangeError('Ngày lịch Gregory không hợp lệ');
 return {year:y,month:m,day:d};
}
function nextDay(s){const {year,month,day}=strictDate(s);const d=new Date(Date.UTC(year,month-1,day+1));const v=d.toISOString().slice(0,10);strictDate(v);return v;}
function pillar(name){const idx=CYCLE.findIndex(x=>x.name===name);return idx<0?null:CYCLE[idx];}
function assess(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Đầu vào phải là đối tượng');
 for(const key of Object.keys(input))if(!['date','hour','minute','dayBoundary','yearBoundary','confirmedLichunUtc','calendarSource'].includes(key))throw new TypeError(`Trường không hỗ trợ: ${key}`);
 const {date,hour=12,minute=0,dayBoundary='civil-midnight',yearBoundary='lunar-year',confirmedLichunUtc,calendarSource}=input;
 const original=strictDate(date);
 if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw new RangeError('Giờ/phút 24 giờ không hợp lệ');
 if(!Object.hasOwn(RULES,dayBoundary))throw new RangeError('Phép đổi ngày không được hỗ trợ');
 if(!['lunar-year','lichun-confirmed'].includes(yearBoundary))throw new RangeError('Quy tắc xác định năm không hợp lệ');
 const change=dayBoundary==='late-zi'&&hour===23;
 const effectiveDate=change?nextDay(date):date;
 const details=Almanac.dayInfo(...Object.values(strictDate(effectiveDate)));
 const civil=Almanac.dayInfo(...Object.values(original));
 let year=Object.freeze({status:'LUNAR_CYCLE',name:civil.yearCanChi,boundary:'Vietnamese lunar new year',sourceId:'almanac-calendar-utc7-v9.2'});
 if(yearBoundary==='lichun-confirmed'){
  if(confirmedLichunUtc!==undefined){
   if(typeof confirmedLichunUtc!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(confirmedLichunUtc)||!Number.isFinite(Date.parse(confirmedLichunUtc)))throw new RangeError('Mốc Lập Xuân phải là ISO UTC có giây và Z');
   const m=confirmedLichunUtc.match(/^(\d{4})-(\d{2})-(\d{2})T/);
   if(!m||Number(m[1])!==original.year||Number(m[2])!==2||Number(m[3])<2||Number(m[3])>7)throw new RangeError('Mốc Lập Xuân phải thuộc đầu tháng 2 của đúng năm đang khảo cứu');
   const source=typeof calendarSource==='string'?calendarSource.trim():'';
   if(source.length<8||source.length>500)throw new RangeError('Phải có tài liệu và múi giờ nguồn Lập Xuân');
   const utc=Date.parse(`${date}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+07:00`);
   const boundary=Date.parse(confirmedLichunUtc);
   const calendarYear=utc>=boundary?original.year:original.year-1;
   year=Object.freeze({status:'SOURCE_DECLARED_NOT_INDEPENDENTLY_VERIFIED',name:`${STEMS[MOD(calendarYear-4,10)]} ${BRANCHES[MOD(calendarYear-4,12)]}`,solarYear:calendarYear,boundary:'Lập Xuân',boundaryUtc:confirmedLichunUtc,sourceId:source});
  }else year=Object.freeze({status:'UNRESOLVED',name:null,boundary:'Lập Xuân',note:'Cần mốc thời điểm và xuất xứ thực của Lập Xuân năm sở tại.'});
 }
 return Object.freeze({ruleSet:RULESET,researchOnly:true,inputs:Object.freeze({date,hour,minute,timezone:'+07:00',dayBoundary,yearBoundary}),day:Object.freeze({originalDate:date,effectiveDate,shifted:change,pillar:details.dayCanChi,cycle:pillar(details.dayCanChi),jdn:Lunar.jd(details.solar.day,details.solar.month,details.solar.year),sourceId:'almanac-calendar-utc7-v9.2'}),year,month:Object.freeze({status:'NO_MINUTE_REFERENCE',candidate:civil.monthCanChi.name,approximate:true,nearBoundary:civil.monthCanChi.nearBoundary,sourceId:civil.monthCanChi.method,note:'Chỉ là tháng theo kinh độ Mặt Trời xấp xỉ tại 12h UTC+7; không dùng để chốt ranh giới theo giờ.'}),lunar:Object.freeze({...civil.lunar,sourceId:'lunar-v9.2'}),jie:Object.freeze({...civil.solarTerm,approximate:true}),comparisons:Object.freeze({civilMidnight:Almanac.dayInfo(...Object.values(original)).dayCanChi,lateZi:hour===23?details.dayCanChi:null}),warnings:Object.freeze(['Quy ước lịch Gregory/UTC+07:00 hiện đại, không suy ngược lịch địa phương cổ đại','Bảng ngày 1900–2100; không tính độ chính xác giờ tiết khí hay hiệu chỉnh giờ Mặt Trời thật','Năm âm lịch và năm Lập Xuân là hai phép phân định không thể tráo đổi.'])});
}
module.exports=Object.freeze({RULESET,STEMS,BRANCHES,CYCLE,RULES,strictDate,pillar,assess});
