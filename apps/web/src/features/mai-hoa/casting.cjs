/**
 * Mai Hoa Dịch Số · hai profile khởi quẻ được khai báo tường minh.
 * 1) Theo năm chi/tháng âm/ngày âm/giờ chi.
 * 2) Theo hai số nguyên chọn trước: số 1 thượng quái, số 2 hạ quái,
 *    tổng hai số lấy hào động.
 * Cả hai profile dùng Tiên Thiên 1..8; 0 dư được thay bằng 8/6.
 * Hào trong tất cả sáu hào được đánh số từ DƯỚI lên.
 */
'use strict';

const {TRIGRAMS,hexagramFromBits} = require('../iching/hexagrams.cjs');
const {compareElements} = require('../wuxing/elements.cjs');

const BRANCHES = Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const PRIOR_HEAVEN = Object.freeze(TRIGRAMS.map((trigram,index) => Object.freeze({...trigram,number:index+1})));
const ELEMENT_IDS = Object.freeze({Kim:'metal',Mộc:'wood',Thủy:'water',Hỏa:'fire',Thổ:'earth'});
const PERSPECTIVE = Object.freeze({
  same:'Thể và Dụng đồng hành',
  generate:'Thể sinh Dụng',
  'generated-by':'Dụng sinh Thể',
  control:'Thể khắc Dụng',
  'controlled-by':'Dụng khắc Thể',
});

function moduloOne(number,base) { return ((number-1)%base)+1; }
function validate(name,value,min,max) {
  if (!Number.isInteger(value)||value<min||value>max) {
    throw new RangeError(`${name} phải là số nguyên trong khoảng ${min}–${max}.`);
  }
}
function assemble(method,inputs,upperSeed,lowerSeed,movingSeed,methodNote) {
  const upperRemainder=moduloOne(upperSeed,8);
  const lowerRemainder=moduloOne(lowerSeed,8);
  const changingLine=moduloOne(movingSeed,6);
  const upper=PRIOR_HEAVEN[upperRemainder-1];
  const lower=PRIOR_HEAVEN[lowerRemainder-1];
  const original=hexagramFromBits(lower.bits+upper.bits);
  const transformedBits=original.bits.split('');
  transformedBits[changingLine-1]=transformedBits[changingLine-1]==='1'?'0':'1';
  const transformed=hexagramFromBits(transformedBits.join(''));
  const nuclear=hexagramFromBits(original.bits.slice(1,4)+original.bits.slice(2,5));
  const body=changingLine<=3?upper:lower;
  const use=changingLine<=3?lower:upper;
  const relation=compareElements(ELEMENT_IDS[body.element],ELEMENT_IDS[use.element]);
  const relationshipPerspective=PERSPECTIVE[relation.kind];
  return Object.freeze({
    method,inputs,
    arithmetic:{base:upperSeed,total:lowerSeed,upperRemainder,lowerRemainder,changingRemainder:changingLine,movingSeed},
    upper,lower,changingLine,original,transformed,nuclear,body,use,relation,relationshipPerspective,
    notes:[
      'Thể là quái không chứa hào động; Dụng là quái chứa hào động.',
      'Tương sinh/khắc Thể–Dụng mô tả ngũ hành, không tự suy cát/hung.',
      methodNote,
    ],
  });
}
function castByLunarTime({yearBranch,lunarMonth,lunarDay,hourBranch}) {
  validate('Địa chi năm',yearBranch,1,12);
  validate('Tháng âm',lunarMonth,1,12);
  validate('Ngày âm',lunarDay,1,30);
  validate('Địa chi giờ',hourBranch,1,12);
  const upperSeed=yearBranch+lunarMonth+lunarDay;
  const total=upperSeed+hourBranch;
  return assemble('lunar-branch-sum',{yearBranch,lunarMonth,lunarDay,hourBranch},upperSeed,total,total,
    'Năm và giờ phải ở dạng địa chi; tháng và ngày là âm lịch đã xác minh. Chưa xử lý tháng nhuận.');
}
function castByNumbers({first,second}) {
  validate('Số thứ nhất',first,1,1000000);
  validate('Số thứ hai',second,1,1000000);
  return assemble('two-number-sum',{first,second},first,second,first+second,
    'Hai số chọn trước khi lập, số thứ nhất chọn thượng quái, số thứ hai chọn hạ quái, tổng hai số chọn hào động.');
}
/**
 * Hậu Thiên Đoan Pháp (《梅花易數》quyển I, 物卦起例):
 * vật tượng → thượng quái, phương vị → hạ quái;
 * số quái vật + số quái phương vị + chi giờ → hào động.
 * Bắt buộc NGƯỜI NGHIÊN CỨU gán tượng/phương vị thành số Tiên Thiên.
 * Không tự suy phương vị từ GPS hay suy tượng từ tên đồ vật.
 */
function castByLaterHeaven({objectTrigram,directionTrigram,hourBranch}) {
  validate('Số quái vật tượng',objectTrigram,1,8);
  validate('Số quái phương vị',directionTrigram,1,8);
  validate('Địa chi giờ',hourBranch,1,12);
  const inputs=Object.freeze({objectTrigram,directionTrigram,hourBranch});
  const out=assemble('later-heaven-object-direction-hour',inputs,objectTrigram,directionTrigram,
    objectTrigram+directionTrigram+hourBranch,
    'Hậu Thiên Đoan Pháp: vật tượng/phương vị được người nghiên cứu xác nhận là số quái Tiên Thiên. Giờ là chi giờ Tý=1 đến Hợi=12.');
  // Keep legacy casting unchanged; freeze only new profile's projected collections.
  return Object.freeze({...out,arithmetic:Object.freeze(out.arithmetic),notes:Object.freeze(out.notes)});
}
/**
 * Hai phương pháp có cùng thượng/hạ quái, nhưng Hậu Thiên cộng giờ vào hào động.
 * So sánh CẤU TRÚC, không khẳng định dị bản nào đúng cho cùng một câu hỏi.
 */
function compareLaterHeavenWithTwoNumbers(input){
 const later=castByLaterHeaven(input);
 const simple=castByNumbers({first:input.objectTrigram,second:input.directionTrigram});
 return Object.freeze({
   status:'METHOD_COMPARISON_ONLY',
   later,simple,
   sameOriginal:later.original.bits===simple.original.bits,
   sameMovingLine:later.changingLine===simple.changingLine,
   sameTransformed:later.transformed.bits===simple.transformed.bits,
   difference:Object.freeze({movingSeedDelta:input.hourBranch,
     movingLineChanged:later.changingLine!==simple.changingLine,
     bodyChanged:later.body.id!==simple.body.id,
     useChanged:later.use.id!==simple.use.id}),
   verdict:null,
 });
}
function castByCountHour({count,hourBranch}){
 validate('Số vật quan sát',count,1,1000000);validate('Địa chi giờ',hourBranch,1,12);
 return assemble('object-count-hour',{count,hourBranch},count,hourBranch,count+hourBranch,
  'Vật số: số vật làm thượng, số chi giờ làm hạ; số vật gốc + giờ chọn hào. Đây là profile số vật gốc, không thay bằng số quái đã rút gọn.');
}
function castBySoundHour({first,second,hourBranch}){
 validate('Đợt âm thanh 1',first,1,1000000);validate('Đợt âm thanh 2',second,1,1000000);validate('Địa chi giờ',hourBranch,1,12);
 return assemble('two-sound-batches-hour',{first,second,hourBranch},first,second,first+second+hourBranch,
  'Hai đợt âm thanh ghi nhận trước khi lập; đợt đầu làm thượng, đợt sau làm hạ; tổng số gốc + chi giờ chọn hào. Ví dụ gõ cửa 1 + 5 + Dậu(10).');
}
module.exports={castByCountHour,castBySoundHour,BRANCHES,PRIOR_HEAVEN,castByLunarTime,castByNumbers,castByLaterHeaven,compareLaterHeavenWithTwoNumbers,moduloOne};
