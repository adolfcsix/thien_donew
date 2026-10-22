/**
 * Phong thủy · địa bàn 24 sơn (Earth Plate), 0° Bắc, xoay theo kim đồng hồ.
 * Góc 0..360 chuẩn hóa và ranh giới [start,end). Không kết luận tốt/xấu.
 */
'use strict';
const SECTORS=Object.freeze([
 ['Tý','子','Bắc','Khảm'],['Quý','癸','Bắc','Khảm'],['Sửu','丑','Đông Bắc','Cấn'],
 ['Cấn','艮','Đông Bắc','Cấn'],['Dần','寅','Đông Bắc','Cấn'],['Giáp','甲','Đông','Chấn'],
 ['Mão','卯','Đông','Chấn'],['Ất','乙','Đông','Chấn'],['Thìn','辰','Đông Nam','Tốn'],
 ['Tốn','巽','Đông Nam','Tốn'],['Tỵ','巳','Đông Nam','Tốn'],['Bính','丙','Nam','Ly'],
 ['Ngọ','午','Nam','Ly'],['Đinh','丁','Nam','Ly'],['Mùi','未','Tây Nam','Khôn'],
 ['Khôn','坤','Tây Nam','Khôn'],['Thân','申','Tây Nam','Khôn'],['Canh','庚','Tây','Đoài'],
 ['Dậu','酉','Tây','Đoài'],['Tân','辛','Tây','Đoài'],['Tuất','戌','Tây Bắc','Càn'],
 ['Càn','乾','Tây Bắc','Càn'],['Hợi','亥','Tây Bắc','Càn'],['Nhâm','壬','Bắc','Khảm']
].map(([name,han,direction,trigram],index)=>Object.freeze({name,han,direction,trigram,center:index*15,start:(index*15+352.5)%360,end:(index*15+7.5)%360})));
function normalizeDegrees(degrees){
 if(typeof degrees!=='number'||!Number.isFinite(degrees))throw new TypeError('Hướng phải là số độ hữu hạn.');
 return ((degrees%360)+360)%360;
}
function mountainAt(degrees){const d=normalizeDegrees(degrees);return SECTORS[Math.floor(((d+7.5)%360)/15)];}
function orientation(degrees){
 const facingDegrees=normalizeDegrees(degrees);
 const sittingDegrees=(facingDegrees+180)%360;
 return Object.freeze({facingDegrees,sittingDegrees,facing:mountainAt(facingDegrees),sitting:mountainAt(sittingDegrees),
  boundaryDistance:Math.abs((facingDegrees%15)-7.5)});
}
module.exports={SECTORS,normalizeDegrees,mountainAt,orientation};
