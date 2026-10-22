'use strict';
// Full, pinned IANA data. Never use the host/browser zone or Moment's gap-shifting parser.
const moment=require('moment-timezone');
const TZDB_VERSION='2026e';
if(moment.tz.dataVersion!==TZDB_VERSION)throw Error('Natal timezone dataset version mismatch.');
function wallTime(date,hour,minute){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Ngày dương lịch không hợp lệ.');
 const ms=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==date||+date.slice(0,4)<1900||+date.slice(0,4)>2100||!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw Error('Ngày/giờ cần hợp lệ trong 1900–2100.');
 return ms+(hour*60+minute)*60000;
}
function candidates(date,hour,minute,timeZone){
 const wall=wallTime(date,hour,minute);
 if(typeof timeZone!=='string'||!moment.tz.names().includes(timeZone))throw Error('Chọn định danh múi giờ IANA hợp lệ, đúng chữ hoa/thường.');
 const zone=moment.tz.zone(timeZone),found=new Map();
 for(const offset of new Set(zone.offsets)){
  const seconds=Math.round(offset*60),utc=wall+seconds*1000;
  if(Math.round(zone.utcOffset(utc)*60)===seconds)found.set(utc,{utc:new Date(utc).toISOString(),offsetSeconds:-seconds||0});
 }
 return [...found.entries()].sort((a,b)=>a[0]-b[0]).map(([,value])=>value);
}
function resolve(date,hour,minute,timeZone,disambiguation='reject'){
 if(!['reject','earlier','later'].includes(disambiguation))throw Error('Lựa chọn giờ trùng không hợp lệ.');
 const choices=candidates(date,hour,minute,timeZone);
 if(!choices.length)throw Error('Giờ địa phương không tồn tại do đổi múi giờ/DST. Kiểm tra lại giấy tờ; hệ thống không tự đẩy giờ.');
 if(choices.length>1&&disambiguation==='reject')throw Error('Giờ địa phương xuất hiện hai lần. Chọn lần sớm hoặc lần muộn theo UTC.');
 const choice=choices[disambiguation==='later'?choices.length-1:0];
 return {...choice,timeZone,tzdbVersion:TZDB_VERSION,disambiguation:choices.length>1?disambiguation:'reject'};
}
function formatOffset(seconds){const sign=seconds<0?'−':'+',n=Math.abs(seconds),pad=n=>String(n).padStart(2,'0');return 'UTC'+sign+pad(Math.floor(n/3600))+':'+pad(Math.floor(n%3600/60))+(n%60?':'+pad(n%60):'');}
module.exports={TZDB_VERSION,names:()=>moment.tz.names(),candidates,resolve,formatOffset};
