/** V11.75 - chứng cứ từ sáu hào quẻ Mai Hoa, đánh số từ dưới lên.
 * Hỗ quẻ: hạ hỗ = hào 2,3,4; thượng hỗ = hào 3,4,5.
 * Không nhận định một hào là cát/hung chỉ dựa trên âm dương.
 */
'use strict';
function makeLineTrace(cast){
 if(!cast||!cast.original||!cast.nuclear||!cast.transformed||!Number.isInteger(cast.changingLine)||cast.changingLine<1||cast.changingLine>6)throw new TypeError('Kết quả Mai Hoa chưa hợp lệ.');
 const {original,nuclear,transformed,changingLine}=cast;
 if(![original,nuclear,transformed].every(x=>typeof x.bits==='string'&&/^[01]{6}$/.test(x.bits)))throw new TypeError('Quẻ cần đủ sáu hào âm dương.');
 if(nuclear.bits!==original.bits.slice(1,4)+original.bits.slice(2,5))throw new Error('Hỗ quẻ không khớp với quẻ chủ.');
 for(let i=0;i<6;i++){
  if(transformed.bits[i]!== (i===changingLine-1?(original.bits[i]==='1'?'0':'1'):original.bits[i]))throw new Error('Quẻ biến sai vị trí hào động.');
 }
 const lines=Array.from({length:6},(_,i)=>Object.freeze({
  position:i+1,before:original.bits[i]==='1'?'Dương':'Âm',after:transformed.bits[i]==='1'?'Dương':'Âm',
  changing:i===changingLine-1,mainTrigram:i<3?'Hạ quái':'Thượng quái',
  inLowerNuclear:i>=1&&i<=3,inUpperNuclear:i>=2&&i<=4,
 }));
 return Object.freeze({lines:Object.freeze(lines),
  nuclearLowerPositions:Object.freeze([2,3,4]),nuclearUpperPositions:Object.freeze([3,4,5]),
  notes:Object.freeze(['Đếm hào từ dưới lên: hào 1 là dưới cùng; hào 6 là trên cùng.',
   'Hạ hỗ lấy các hào 2–3–4; thượng hỗ lấy các hào 3–4–5 của quẻ chủ.',
   'Quẻ biến chỉ đảo đúng hào động; Thể là quái không có hào động, nên quái Thể được giữ nguyên.',
   'Dấu vết hào là phép kiểm chứng cấu trúc, không phải dự đoán hoặc chấm điểm tốt/xấu.'])});
}
module.exports={makeLineTrace};
