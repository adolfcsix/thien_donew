'use strict';
/** Proleptic Julian/Gregorian date-label comparison; not an imperial-calendar or lunar ephemeris. */
const METHOD='civil-julian-gregorian-calendar-reform-v11.136';
function mod(n,m){return(n%m+m)%m;}
function leap(y,kind){return kind==='julian'?y%4===0:y%4===0&&(y%100!==0||y%400===0);}
function validate(y,m,d,kind){
 if(!['gregorian','julian'].includes(kind))throw new RangeError('Chỉ hỗ trợ hai lịch dương Julius/Gregory');
 if(!Number.isInteger(y)||y<1||y>3000||!Number.isInteger(m)||m<1||m>12||!Number.isInteger(d))throw new RangeError('Ngày lịch phải thuộc năm 0001–3000');
 const days=[31,leap(y,kind)?29:28,31,30,31,30,31,31,30,31,30,31];
 if(d<1||d>days[m-1])throw new RangeError('Ngày không tồn tại trong kiểu lịch đang chọn');
}
function toJdn(year,month,day,style){
 validate(year,month,day,style);
 const a=Math.floor((14-month)/12),y=year+4800-a,m=month+12*a-3;
 return day+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)+(style==='gregorian'?-Math.floor(y/100)+Math.floor(y/400)-32045:-32083);
}
function fromJdn(jdn,style){
 if(!Number.isInteger(jdn)||jdn<1721424||jdn>2817152)throw new RangeError('JDN vượt phạm vi biểu diễn năm 0001–3000');
 if(!['gregorian','julian'].includes(style))throw new RangeError('Lịch không hợp lệ');
 if(style==='gregorian'){const alpha=jdn+32044;const b=Math.floor((4*alpha+3)/146097),c=alpha-Math.floor(146097*b/4);
  const d=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*d/4),m=Math.floor((5*e+2)/153);
  const day=e-Math.floor((153*m+2)/5)+1,month=m+3-12*Math.floor(m/10),year=100*b+d-4800+Math.floor(m/10);
  return Object.freeze({year,month,day,style});
 }
 const c=jdn+32082,d=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*d/4),m=Math.floor((5*e+2)/153);
 return Object.freeze({year:d-4800+Math.floor(m/10),month:m+3-12*Math.floor(m/10),day:e-Math.floor((153*m+2)/5)+1,style});
}
function compare(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Đầu vào không hợp lệ');
 for(const k of Object.keys(input))if(!['year','month','day','style'].includes(k))throw new TypeError(`Trường không được hỗ trợ: ${k}`);
 const {year,month,day,style}=input;
 const jdn=toJdn(year,month,day,style),otherStyle=style==='julian'?'gregorian':'julian';
 return Object.freeze({method:METHOD,researchOnly:true,referenceCalendar:style,source:Object.freeze({year,month,day}),jdn,sameDayInOtherStyle:fromJdn(jdn,otherStyle),weekdayIndex:mod(jdn+1,7),limitation:'Đây là phép chuyển hai lịch dương mang tính số học. Không tự suy ngày lễ cổ, tên triều đại, múi giờ lịch sử, lịch âm, thời điểm Lập Xuân hoặc Can Chi năm/tháng.'});
}
module.exports=Object.freeze({METHOD,leap,toJdn,fromJdn,compare});
