/**
 * V11.77 — cầu nối Kỳ Môn với engine Bát Tự hiện có.
 * Không tự tính thiên văn hoặc Can Chi lần thứ hai. Caller phải truyền kết quả
 * của Engine.baziCalculate(); đây là phép đối chiếu/đánh giá AN TOÀN đầu vào.
 * Tiết khí dựa trên kinh độ Mặt Trời gần đúng, do đó 1.2° quanh mọi mốc 15°
 * buộc tra lịch nhập tiết độc lập, KHÔNG được tự an cục.
 */
'use strict';
const {CYCLE,SOLAR_TERMS,hourForDayBranch}=require('./formation.cjs');
const mod=(n,m)=>((n%m)+m)%m;
const GUARD_DEGREES=1.2;
function localDatetime(date,hour,minute){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new RangeError('Ngày phải theo YYYY-MM-DD');
 const [year,month,day]=date.split('-').map(Number);
 if(year<1900||year>2100||month<1||month>12||day<1||day>31)throw new RangeError('Chỉ hỗ trợ ngày hợp lệ 1900–2100');
 const d=new Date(Date.UTC(year,month-1,day));
 if(d.getUTCFullYear()!==year||d.getUTCMonth()+1!==month||d.getUTCDate()!==day)throw new RangeError('Ngày dương lịch không hợp lệ');
 if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw new RangeError('Giờ/phút địa phương không hợp lệ');
 return {year,month,day};
}
/** 270° Đông Chí, 285° Tiểu Hàn, ..., 255° Đại Tuyết (24 tiết). */
function termAtLongitude(longitudeDeg){
 if(typeof longitudeDeg!=='number'||!Number.isFinite(longitudeDeg)||longitudeDeg<0||longitudeDeg>=360)
  throw new RangeError('Kinh độ Mặt Trời phải trong [0, 360) độ');
 const fromDongChi=mod(longitudeDeg-270,360);
 const index=Math.floor(fromDongChi/15);
 const offset=fromDongChi-index*15;
 const boundaryDistanceDeg=Math.min(offset,15-offset);
 const term=SOLAR_TERMS[index];
 return Object.freeze({index,name:term.name,dun:term.dun,longitudeDeg,
  boundaryDistanceDeg:Number(boundaryDistanceDeg.toFixed(3)),
  nearBoundary:boundaryDistanceDeg<=GUARD_DEGREES,
  precision:'Kinh độ Mặt Trời gần đúng (Meeus, engine Bát Tự); không phải giờ nhập tiết chuẩn'});
}
function suggestKymonContext({date,hour,minute=0,dayBoundary='midnight',longitudeDeg,dayCanChi,hourCanChi,lateZiAcknowledged=false}){
 const {year}=localDatetime(date,hour,minute);
 if(!['midnight','late-zi'].includes(dayBoundary))throw new RangeError('Quy ước giờ Tý không hợp lệ');
 if(typeof lateZiAcknowledged!=='boolean')throw new TypeError('Xác nhận giờ Tý phải là boolean');
 if(typeof dayCanChi!=='string'||typeof hourCanChi!=='string')throw new TypeError('Thiếu Can Chi ngày/giờ từ bộ lịch');
 const dayCycleIndex=CYCLE.findIndex(item=>item.name===dayCanChi);
 const hourCycleIndex=CYCLE.findIndex(item=>item.name===hourCanChi);
 if(dayCycleIndex<0||hourCycleIndex<0)throw new RangeError('Can Chi ngày hoặc giờ không hợp lệ');
 const hourBranchIndex=Math.floor((hour+1)/2)%12;
 const expectedHour=hourForDayBranch(dayCycleIndex,hourBranchIndex);
 if(expectedHour.index!==hourCycleIndex)throw new RangeError('Can Chi giờ không khớp ngày và giờ theo Ngũ Tý Độn');
 const solarTerm=termAtLongitude(longitudeDeg);
 const reasons=[];
 if(solarTerm.nearBoundary)reasons.push('Sát ranh giới 15° tiết khí: phải tra giờ nhập tiết thiên văn độc lập trước khi chốt cục số.');
 if(hour===23&&!lateZiAcknowledged)reasons.push('Giờ 23:00–23:59 có hai quy ước đổi ngày; cần chọn và xác nhận rõ quy ước.');
 if(year<1976)reasons.push('Mốc lịch sử: múi giờ Việt Nam từng thay đổi, không mặc định UTC+7 cho mọi địa điểm trước 1976.');
 return Object.freeze({source:'thien-do-bazi-solar-longitude-utc7-approx',timezone:'Asia/Ho_Chi_Minh (UTC+7 cố định)',
  date,hour,minute,dayBoundary,dayCanChi,hourCanChi,dayCycleIndex,hourCycleIndex,hourBranchIndex,solarTerm,
  status:reasons.length?'needs-verification':'ready',canAutoForm:reasons.length===0,reasons:Object.freeze(reasons),
  notes:Object.freeze(['Tiết khí suy từ kinh độ Mặt Trời gần đúng; không dùng làm thời điểm nhập tiết chuẩn.',
   'Lịch sử múi giờ và chân thái dương thời theo vị trí địa lý chưa hiệu chỉnh.',
   'Kỳ Môn Chai Bổ có dị bản Tam nguyên và khác với Trí Nhuận; kết quả là bản nghiên cứu theo quy ước V11.76.'])});
}
module.exports={GUARD_DEGREES,termAtLongitude,suggestKymonContext};
