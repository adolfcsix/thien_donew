/**
 * V11.78 · Thời gia Chai Bổ, Chuyển Bàn (轉盤) — tám cung ngoài.
 * Chỉ tính khi có địa bàn + Can Chi giờ hợp lệ từ formation.cjs.
 * Giữ Trung 5 ở địa bàn; Thiên Cầm ký gửi Thiên Nhuế tại Khôn 2.
 * Chú ý: phiên bản phương pháp cụ thể, KHÔNG tự xác minh tiết khí/true solar time.
 */
'use strict';
const {CYCLE,HOME}=require('./formation.cjs');
const {EIGHT_DEITIES}=require('./luoshu.cjs');
// Ngoại cung theo chiều kim đồng hồ trên bản đồ Bắc dưới / Nam trên.
const OUTER=Object.freeze([1,8,3,4,9,2,7,6]);
const CENTER_HOST=2;
function mod(v,n){return ((v%n)+n)%n;}
function host(p){return p===5?CENTER_HOST:p;}
function rotateHomeToTarget(homePalace,targetPalace){
 const from=OUTER.indexOf(host(homePalace)),to=OUTER.indexOf(host(targetPalace));
 if(from<0||to<0)throw new RangeError('Cung ngoài không hợp lệ');
 return mod(to-from,8);
}
function buildRotatingHourPlate(base){
 if(!base||!base.chief||!base.plate||!Array.isArray(base.palaces)||base.palaces.length!==9)
  throw new TypeError('Cần địa bàn chín cung và giờ đã kiểm tra');
 const hour=CYCLE.find(v=>v.name===base.chief.hourName);
 if(!hour)throw new RangeError('Can Chi giờ không hợp lệ');
 const chief=base.chief,earth=base.plate.byPalace;
 const trueHourStem=hour.stem==='Giáp'?chief.hiddenStem:hour.stem;
 const earthTarget=Object.entries(earth).find(([,stem])=>stem===trueHourStem);
 if(!earthTarget)throw new Error('Thiếu can giờ (hoặc can ẩn Giáp) trên địa bàn');
 const hourStemPalace=Number(earthTarget[0]);
 // Khi Trung cung 5 được dùng, gửi biểu tượng về Khôn 2 theo cùng quy ước trung cung.
 const starAnchorHome=host(chief.originalPalace);
 const starAnchorTarget=host(hourStemPalace);
 const starShift=rotateHomeToTarget(starAnchorHome,starAnchorTarget);
 const doorAnchorHome=host(chief.doorHostPalace);
 const doorAnchorTarget=host(chief.doorTime.hostPalace);
 const doorShift=rotateHomeToTarget(doorAnchorHome,doorAnchorTarget);
 const byPalace=Object.fromEntries(Array.from({length:9},(_,idx)=>{
  const number=idx+1;
  return [number,{number,earthStem:earth[number],heavenStem:null,star:null,door:null,deity:null,
   starFromPalace:null,doorFromPalace:null,chiefStarLanding:false,chiefDoorLanding:false,
   voidAtPalace:chief.voids.palaceNumbers.includes(number),lodgedTianQin:false}];
 }));
 for(let i=0;i<8;i++){
  const source=OUTER[i];
  const starPalace=OUTER[mod(i+starShift,8)];
  const doorPalace=OUTER[mod(i+doorShift,8)];
  const starResult=byPalace[starPalace],doorResult=byPalace[doorPalace];
  starResult.star=HOME[source].star;
  starResult.heavenStem=earth[source];
  starResult.starFromPalace=source;
  starResult.lodgedTianQin=source===CENTER_HOST;
  doorResult.door=HOME[source].door;
  doorResult.doorFromPalace=source;
 }
 const chiefStarLanding=starAnchorTarget;
 const chiefDoorLanding=doorAnchorTarget;
 byPalace[chiefStarLanding].chiefStarLanding=true;
 byPalace[chiefDoorLanding].chiefDoorLanding=true;
 // Bát Thần: Trực Phù thần đến đúng cung sao trực phù thời bàn;
 // dương thuận vòng ngoài, âm nghịch vòng ngoài. Khác phép chạy 1–9 để tìm Trực Sử.
 const spiritStart=OUTER.indexOf(chiefStarLanding);
 const spiritStep=base.dun==='dương'?1:-1;
 EIGHT_DEITIES.forEach((deity,i)=>{byPalace[OUTER[mod(spiritStart+spiritStep*i,8)]].deity=deity;});
 const palaces=Object.freeze(base.palaces.map(p=>Object.freeze(byPalace[p.number])));
 // Kiểm tra tính toàn vẹn kỹ thuật, KHÔNG dùng nó như bằng chứng đúng trường phái.
 const outer=palaces.filter(p=>p.number!==5);
 const unique=(field)=>new Set(outer.map(p=>p[field])).size===8&&outer.every(p=>p[field]!==null);
 if(!unique('star')||!unique('door')||!unique('deity')||!unique('heavenStem'))
  throw new Error('Chuyển bàn không bảo toàn tám sao/môn/thần/can ngoại cung');
 if(byPalace[5].star!==null||byPalace[5].door!==null||byPalace[5].deity!==null)
  throw new Error('Trung cung nhận nhầm sao/môn/thần độc lập');
 return Object.freeze({method:'Thời gia Chai Bổ · Chuyển Bàn tám cung ngoài · Thiên Cầm ký Khôn 2',
  hourName:hour.name,trueHourStem,hourStemPalace,
  chiefStar:chief.chiefStar,chiefDoor:chief.chiefDoor,
  chiefStarLanding,chiefDoorLanding,starShift,doorShift,
  centerEarthStem:earth[5],spiritDirection:spiritStep===1?'thuận':'nghịch',
  palaces,byPalace:Object.freeze(Object.fromEntries(palaces.map(p=>[p.number,p]))),
  status:'rotating-plate-convention',
  limitations:Object.freeze([
   'Mốc giao tiết, trụ ngày/giờ và lựa chọn trường phái phải được xác nhận độc lập.',
   'Chưa hiệu chỉnh chân thái dương thời, địa điểm, lịch sử múi giờ.',
   'Chưa tính Mã Tinh, Lục Nghi kích hình, môn bách, cách cục và luận đoán.',
   'Trung cung 5 được giữ ở địa bàn; Thiên Cầm ký cùng Thiên Nhuế tại cung Khôn 2.'
  ])});
}
module.exports={OUTER,CENTER_HOST,rotateHomeToTarget,buildRotatingHourPlate};
