/** Mai Hoa Dịch Số: đối chiếu Thể với Dụng, hỗ, biến theo tầng thời đoạn tượng số.
 * Dữ liệu mô tả cấu trúc, không tự khẳng định cát hung hay dự báo tương lai.
 */
'use strict';
const {compareElements}=require('../wuxing/elements.cjs');
const {TRIGRAMS}=require('../iching/hexagrams.cjs');
const IDS=Object.freeze({Kim:'metal',Mộc:'wood',Thủy:'water',Hỏa:'fire',Thổ:'earth'});
function matchTrigram(bits){const t=TRIGRAMS.find(item=>item.bits===bits);if(!t)throw new TypeError('Không nhận diện được tam hào của quẻ.');return t;}
function makeDeepReading(cast){
 if(!cast||!cast.original||!cast.nuclear||!cast.transformed||!cast.body||!cast.use||!Number.isInteger(cast.changingLine))throw new TypeError('Cần kết quả khởi quẻ Mai Hoa hợp lệ.');
 const bodyLocation=cast.changingLine<=3?'upper':'lower';
 const transformedBody=cast.transformed[bodyLocation];
 if(transformedBody.bits!==cast.body.bits)throw new Error('Quẻ Thể đã bị biến đổi: kiểm tra lại hào động.');
 const checks=[
  {id:'immediate',stage:'Ban đầu · Dụng',trigram:cast.use,what:'Đối chiếu quái có hào động trong quẻ chủ'},
  {id:'nuclear-body',stage:'Trung gian · Hỗ Thể',trigram:cast.nuclear[bodyLocation],what:'Quái hỗ cùng vị trí với quái Thể'},
  {id:'nuclear-use',stage:'Trung gian · Hỗ Dụng',trigram:cast.nuclear[bodyLocation==='upper'?'lower':'upper'],what:'Quái hỗ cùng vị trí với quái Dụng'},
  {id:'transformed',stage:'Sau biến · quái động',trigram:cast.transformed[bodyLocation==='upper'?'lower':'upper'],what:'Quái Dụng sau khi đảo hào động'},
 ];
 const layers=checks.map(item=>Object.freeze({...item,relation:compareElements(IDS[cast.body.element],IDS[item.trigram.element])}));
 const agree=layers.filter(item=>['same','generated-by'].includes(item.relation.kind)).length;
 const oppose=layers.filter(item=>['control','controlled-by'].includes(item.relation.kind)).length;
 return Object.freeze({bodyLocation,body:cast.body,use:cast.use,original:cast.original,nuclear:cast.nuclear,transformed:cast.transformed,
  layers:Object.freeze(layers),
  checks:Object.freeze({agree,oppose,neutral:layers.length-agree-oppose}),
  limit:'Đây là đối chiếu ngũ hành của quái trong cấu trúc truyền thống; không phải phép chấm điểm tốt/xấu, không tự quyết định kết quả thực tế.'});
}
module.exports={makeDeepReading,matchTrigram};
