/**
 * Bát Trạch / 八宅 – bảng tham chiếu tám phương, phân biệt Mệnh quái và Trạch quái.
 * Đầu vào năm theo tiết Lập Xuân ĐÃ được xác nhận, không tự lấy năm dương lịch của sinh nhật.
 * Không phải đánh giá hiệu quả sức khỏe, tài chính hay kết cấu xây dựng.
 */
'use strict';
const GUA = Object.freeze({
  1: {name:'Khảm',han:'坎',direction:'Bắc',group:'Đông tứ',element:'Thủy'},
  2: {name:'Khôn',han:'坤',direction:'Tây Nam',group:'Tây tứ',element:'Thổ'},
  3: {name:'Chấn',han:'震',direction:'Đông',group:'Đông tứ',element:'Mộc'},
  4: {name:'Tốn',han:'巽',direction:'Đông Nam',group:'Đông tứ',element:'Mộc'},
  6: {name:'Càn',han:'乾',direction:'Tây Bắc',group:'Tây tứ',element:'Kim'},
  7: {name:'Đoài',han:'兌',direction:'Tây',group:'Tây tứ',element:'Kim'},
  8: {name:'Cấn',han:'艮',direction:'Đông Bắc',group:'Tây tứ',element:'Thổ'},
  9: {name:'Ly',han:'離',direction:'Nam',group:'Đông tứ',element:'Hỏa'}
});
const DIRECTIONS=Object.freeze(['Bắc','Đông Bắc','Đông','Đông Nam','Nam','Tây Nam','Tây','Tây Bắc']);
const LABELS=Object.freeze({
  sinh:'Sinh Khí',thien:'Thiên Y',nien:'Diên Niên',phuc:'Phục Vị',
  hoa:'Họa Hại',luc:'Lục Sát',ngu:'Ngũ Quỷ',tuyet:'Tuyệt Mệnh'
});
// Tám bảng du niên. Từng giá trị là hướng Bắc/N-E/Đông/... theo DIRECTIONS.
// Thứ tự giá trị: Sinh Khí, Thiên Y, Diên Niên, Phục Vị, Họa Hại, Lục Sát, Ngũ Quỷ, Tuyệt Mệnh.
const KEYS=['sinh','thien','nien','phuc','hoa','luc','ngu','tuyet'];
const TABLE=Object.freeze({
  1: ['Đông Nam','Đông','Nam','Bắc','Tây','Tây Bắc','Đông Bắc','Tây Nam'],
  2: ['Đông Bắc','Tây','Tây Bắc','Tây Nam','Đông','Nam','Đông Nam','Bắc'],
  3: ['Nam','Bắc','Đông Nam','Đông','Tây Nam','Đông Bắc','Tây Bắc','Tây'],
  4: ['Bắc','Nam','Đông','Đông Nam','Tây Bắc','Tây','Tây Nam','Đông Bắc'],
  6: ['Tây','Đông Bắc','Tây Nam','Tây Bắc','Đông Nam','Bắc','Đông','Nam'],
  7: ['Tây Bắc','Tây Nam','Đông Bắc','Tây','Bắc','Đông Nam','Nam','Đông'],
  8: ['Tây Nam','Tây Bắc','Tây','Đông Bắc','Nam','Đông','Bắc','Đông Nam'],
  9: ['Đông','Đông Nam','Bắc','Nam','Đông Bắc','Tây Nam','Tây','Tây Bắc']
});
function mod9(number){return ((number%9)+9)%9;}
function lifeGua(solarYear,method){
  if(!Number.isInteger(solarYear)||solarYear<1900||solarYear>2099)throw new RangeError('Năm tiết khí hỗ trợ: 1900–2099.');
  if(method!=='male'&&method!=='female')throw new RangeError('Chọn quy ước tính nam hoặc nữ của hệ Bát Trạch.');
  // Phép đồng dư 9 năm, tương đương bảng hằng số thay đổi từ năm 2000.
  const raw=mod9(method==='male'?2-solarYear:solarYear-5)||9;
  const number=raw===5?(method==='male'?2:8):raw;
  return Object.freeze({solarYear,method,raw,number,...GUA[number],substitution:raw===5,
    rule:'Năm dùng là năm sau Lập Xuân đã xác nhận; không tự quy đổi ngày sinh.'});
}
function directionsForGua(number){
  if(!Number.isInteger(number)||!GUA[number])throw new RangeError('Bát Trạch chỉ nhận quái 1,2,3,4,6,7,8,9.');
  const byDirection=new Map();
  KEYS.forEach((key,index)=>byDirection.set(TABLE[number][index],Object.freeze({key,label:LABELS[key],kind:index<4?'cát':'hung'})));
  return Object.freeze(DIRECTIONS.map(direction=>Object.freeze({direction,...byDirection.get(direction)})));
}
function houseGua(sittingTrigram){
  if(typeof sittingTrigram!=='string')throw new TypeError('Cần quái tọa xác định từ số đo la bàn.');
  const found=Object.entries(GUA).find(([,info])=>info.name===sittingTrigram);
  if(!found)throw new RangeError('Quái tọa không thuộc Hậu Thiên Bát Quái.');
  return Object.freeze({number:Number(found[0]),...found[1],method:'Quái nhà theo hướng tọa, không theo hướng mặt tiền.'});
}
function compareGua(lifeNumber,houseNumber){
  if(!GUA[lifeNumber]||!GUA[houseNumber])throw new RangeError('Quái mệnh hoặc quái nhà không hợp lệ.');
  return Object.freeze({sameGroup:GUA[lifeNumber].group===GUA[houseNumber].group,
    lifeGroup:GUA[lifeNumber].group,houseGroup:GUA[houseNumber].group,
    note:'Chỉ so sánh Đông/Tây tứ theo truyền thống; không suy ra hiệu quả hoặc an toàn thực tế.'});
}
module.exports={GUA,DIRECTIONS,LABELS,lifeGua,directionsForGua,houseGua,compareGua};
