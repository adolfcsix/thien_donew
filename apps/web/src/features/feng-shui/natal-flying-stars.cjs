/**
 * Huyền Không Phi Tinh — tam bàn Hạ quái (standard natal chart), tham chiếu văn hóa.
 * Chỉ nhập vận đã xác nhận, hướng đo thực; không tự xác định năm cải tạo, Thế quái hoặc tính chính xác la bàn.
 * Sao 5 dùng quái chủ của VẬN để lấy âm/dương theo cùng thứ tự sơn (quy ước công bố riêng).
 */
'use strict';
const {orientation}=require('./compass.cjs');
const {PALACES,STARS,flyFromCenter,periodStarChart}=require('./flying-stars.cjs');
const MOUNTAINS=Object.freeze({
  1:[['Nhâm','yang'],['Tý','yin'],['Quý','yin']],
  2:[['Mùi','yin'],['Khôn','yang'],['Thân','yang']],
  3:[['Giáp','yang'],['Mão','yin'],['Ất','yin']],
  4:[['Thìn','yin'],['Tốn','yang'],['Tỵ','yang']],
  6:[['Tuất','yin'],['Càn','yang'],['Hợi','yang']],
  7:[['Canh','yang'],['Dậu','yin'],['Tân','yin']],
  8:[['Sửu','yin'],['Cấn','yang'],['Dần','yang']],
  9:[['Bính','yang'],['Ngọ','yin'],['Đinh','yin']]
});
const HOME_PALACE=Object.freeze({Khảm:1,Khôn:2,Chấn:3,Tốn:4,Càn:6,Đoài:7,Cấn:8,Ly:9});
function mountainPosition(mountain){
  if(!mountain||typeof mountain.name!=='string'||typeof mountain.trigram!=='string')throw new TypeError('Cần sơn đã xác định từ la kinh.');
  const palace=HOME_PALACE[mountain.trigram];
  if(!palace)throw new RangeError('Quái sơn không hợp lệ.');
  const rank=MOUNTAINS[palace].findIndex(([name])=>name===mountain.name);
  if(rank<0)throw new RangeError('Sơn không thuộc quái chỉ định.');
  return Object.freeze({palace,rank:rank+1,name:mountain.name,polarity:MOUNTAINS[palace][rank][1]});
}
function seedFlight(seed,position,period){
  if(!Number.isInteger(seed)||seed<1||seed>9||!Number.isInteger(period)||period<1||period>9)throw new RangeError('Chỉ nhận sao/vận 1–9.');
  const borrowed=seed===5;
  const home=borrowed?period:seed;
  const [mountain,polarity]=MOUNTAINS[home][position.rank-1];
  const direction=polarity==='yang'?'forward':'reverse';
  return Object.freeze({seed,direction,polarity,homePalace:home,referenceMountain:mountain,rank:position.rank,
    borrowedFromPeriod:borrowed,
    rule:borrowed?'Sao 5 không có quái gốc: mượn quái của vận nhà, cùng thứ tự sơn.':'Tra âm dương nguyên long tại quái gốc của sao nhập trung, cùng thứ tự sơn.'});
}
function natalStarChart(period,facingDegrees){
  const base=periodStarChart(period);
  const measured=orientation(facingDegrees);
  const facing=mountainPosition(measured.facing);
  const sitting=mountainPosition(measured.sitting);
  const at=n=>base.positions.find(c=>c.number===n).star;
  const mountain=seedFlight(at(sitting.palace),sitting,period);
  const facingStar=seedFlight(at(facing.palace),facing,period);
  const mountainPositions=flyFromCenter(mountain.seed,mountain.direction);
  const facingPositions=flyFromCenter(facingStar.seed,facingStar.direction);
  const positions=Object.freeze(PALACES.map(p=>{
    const periodStar=at(p.number);
    const mountainStar=mountainPositions.find(c=>c.number===p.number).star;
    const waterStar=facingPositions.find(c=>c.number===p.number).star;
    return Object.freeze({...p,periodStar,mountainStar,waterStar,
      periodName:STARS[periodStar].name,mountainName:STARS[mountainStar].name,waterName:STARS[waterStar].name,
      sittingPalace:p.number===sitting.palace,facingPalace:p.number===facing.palace});
  }));
  return Object.freeze({period,measured,sitting,facing,mountain,facingStar,positions,
    nearBoundary:measured.boundaryDistance<3,
    method:'Hạ quái / chính bàn thông thường; chưa hỗ trợ Thế quái, kiêm hướng, phân kim và đối chiếu hình thế thực địa.',
    boundaryWarning:measured.boundaryDistance<3?'Độ la bàn nằm trong 3° tính từ ranh giới sơn: có thể cần phép kiêm hướng/Thế quái và đo lại. Bàn này chỉ là Hạ quái tham khảo.':null});
}
module.exports={MOUNTAINS,HOME_PALACE,mountainPosition,seedFlight,natalStarChart};
