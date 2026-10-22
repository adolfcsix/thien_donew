'use strict';
const Timezone=require('./natal-timezone.cjs');
const READING=require('../../knowledge/src/western-reading-method-v11127.json');
const METHOD='western-tropical-geocentric-whole-sign-v1',ZONED_METHOD='western-tropical-geocentric-whole-sign-iana-v2';
function number(n,min,max,integer=false){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||integer&&!Number.isInteger(n))throw Error('Tham số số học nằm ngoài phạm vi.');return n;}
function validateInput(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||![METHOD,ZONED_METHOD].includes(raw.method)||raw.houseSystem!=='whole-sign')throw Error('Chỉ hỗ trợ tropical, địa tâm và nhà Whole Sign trong phiên bản này.');
 const date=raw.date;if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||+date.slice(0,4)<1900||+date.slice(0,4)>2100)throw Error('Ngày dương lịch cần hợp lệ trong 1900–2100.');
 if(raw.method===METHOD&&raw.offsetConfirmed!==true)throw Error('Cần xác nhận độ lệch UTC tại thời điểm sinh, gồm DST nếu có.');
 const hour=number(raw.hour,0,23,true),minute=number(raw.minute,0,59,true);
 const resolved=raw.method===ZONED_METHOD?Timezone.resolve(date,hour,minute,raw.timeZone,raw.disambiguation):null;
 if(resolved){for(const key of ['tzdbVersion','resolvedUtc','offsetSeconds']){const expected=key==='resolvedUtc'?resolved.utc:resolved[key];if(raw[key]!==undefined&&raw[key]!==expected)throw Error('Dữ liệu múi giờ đã lưu không khớp phiên bản/UTC. Cần đối chiếu trước khi tính lại.');}}
 const input={method:raw.method,date,hour,minute,utcOffsetMinutes:resolved?resolved.offsetSeconds/60:number(raw.utcOffsetMinutes,-840,840,true),offsetConfirmed:true,...(resolved?{timeZone:resolved.timeZone,disambiguation:resolved.disambiguation,tzdbVersion:resolved.tzdbVersion,resolvedUtc:resolved.utc,offsetSeconds:resolved.offsetSeconds}:{}),latitude:number(raw.latitude,-65,65),longitude:number(raw.longitude,-180,180),houseSystem:'whole-sign',orb:number(raw.orb,0,10)};
 if(raw.uncertaintyMinutes!==undefined)input.uncertaintyMinutes=number(raw.uncertaintyMinutes,0,120,true);
 if(raw.reading!==undefined){
  const r=raw.reading;
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(READING).filter(k=>k!=='contexts').some(k=>r[k]!==READING[k])||!READING.contexts.includes(r.context))throw Error('Phiên bản luận Natal chưa được hỗ trợ; không tự nâng cấp.');
  const {contexts,...meta}=READING;input.reading={...meta,context:r.context};
 }
 const utc=utcTime(input);
 if(input.uncertaintyMinutes&&(utc.getTime()-input.uncertaintyMinutes*60000<Date.parse('1900-01-01T00:00:00Z')||utc.getTime()+input.uncertaintyMinutes*60000>=Date.parse('2101-01-01T00:00:00Z')))throw Error('Khoảng sai số vượt phạm vi UTC hỗ trợ.');
 if(utc<new Date('1900-01-01T00:00:00Z')||utc>=new Date('2101-01-01T00:00:00Z'))throw Error('Thời điểm UTC nằm ngoài 1900–2100.');
 return input;
}
function utcTime(input){if(input.method===ZONED_METHOD)return new Date(input.resolvedUtc);return new Date(Date.parse(input.date+'T00:00:00Z')+(input.hour*60+input.minute-input.utcOffsetMinutes)*60000);}
module.exports={METHOD,ZONED_METHOD,validateInput,utcTime};
