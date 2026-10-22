/** V11.135 Phong Thủy: phối hợp hiển thị độc lập, KHÔNG phối thuật toán, KHÔNG cộng điểm. */
'use strict';
const {orientation}=require('./compass.cjs');
const {natalStarChart}=require('./natal-flying-stars.cjs');
const {houseGua,lifeGua,directionsForGua}=require('./eight-mansions.cjs');
const {greatHexagramPair,validateAccuracy}=require('./great-hexagrams.cjs');
const STRUCTURES=Object.freeze({
 '1001':{id:'prosperous-both',han:'旺山旺向',label:'Vượng Sơn Vượng Hướng',description:'Sơn tinh đương vận tại tọa, Hướng tinh đương vận tại hướng'},
 '1010':{id:'double-sitting',han:'雙星到坐',label:'Song Tinh Đáo Tọa',description:'Sơn tinh và Hướng tinh đương vận cùng tại tọa'},
 '0101':{id:'double-facing',han:'雙星到向',label:'Song Tinh Đáo Hướng',description:'Sơn tinh và Hướng tinh đương vận cùng tại hướng'},
 '0110':{id:'reversed',han:'上山下水',label:'Thượng Sơn Hạ Thủy',description:'Sơn tinh đương vận ở hướng, Hướng tinh đương vận ở tọa'}
});
function classifyNatalStructure(natal){
 if(!natal||!Array.isArray(natal.positions)||!Number.isInteger(natal.period))throw new TypeError('Cần tam bàn Phi Tinh đầy đủ.');
 const sitting=natal.positions.find(p=>p.sittingPalace),facing=natal.positions.find(p=>p.facingPalace);
 if(!sitting||!facing)throw new RangeError('Thiếu tọa/hướng trong tam bàn.');
 const flags={mountainAtSitting:sitting.mountainStar===natal.period,mountainAtFacing:facing.mountainStar===natal.period,
   facingAtSitting:sitting.waterStar===natal.period,facingAtFacing:facing.waterStar===natal.period};
 const key=Object.values(flags).map(x=>x?'1':'0').join('');
 return Object.freeze({...(STRUCTURES[key]??{id:'other',han:'—',label:'Cần đối chiếu',description:'Không khớp bốn mẫu phân bố tiêu biểu'}),
   key,flags:Object.freeze(flags),facingPalace:facing.number,sittingPalace:sitting.number,
   scope:'Nhận diện cấu trúc sao, không suy ra tính tốt/xấu thực tế hoặc phương án sửa nhà.'});
}
function measurementAudit(facingDegrees,period,accuracy=0.5){
 validateAccuracy(accuracy);
 const measured=orientation(facingDegrees),natal=natalStarChart(period,measured.facingDegrees),great=greatHexagramPair(measured.facingDegrees,accuracy);
 const stableMountain=measured.boundaryDistance>accuracy+1e-9;
 const issues=[];
 if(!stableMountain)issues.push('Sai số đo chạm biên 24 sơn: tam bàn Hạ quái chỉ tham khảo, chưa thể xác nhận sơn hướng.');
 if(!great.stable)issues.push('Sai số đo chạm biên vòng 64 quẻ: chưa thể xác nhận cặp quẻ tọa–hướng.');
 if(!great.facing.lineStable)issues.push('Sai số đo chạm biên phân đoạn hào: cần đo lại nếu khảo sát đến 384 phân đoạn.');
 if(natal.nearBoundary)issues.push('Sơn hướng nằm trong vùng 3° sát biên: cần xét quy ước kiêm hướng/Thế quái trước khi sử dụng.');
 return Object.freeze({accuracy,measured,stableMountain,great,structure:classifyNatalStructure(natal),
  natal,method:'Phi Tinh Hạ quái và Đại Quái tính độc lập theo cùng số đo, không tự thay quẻ.',issues:Object.freeze(issues),
  status:stableMountain&&great.stable?'measured-stable':'requires-remeasurement',
  limitation:'Không tự tính Thế quái/kiêm hướng, thiên lệch từ, năm nhập vận, cấu trúc công trình hoặc vượng suy thực địa.'});
}
function eightMansionsDirectionAudit(sittingTrigram,solarYear,sexMethod,direction){
 const house=houseGua(sittingTrigram),life=lifeGua(solarYear,sexMethod);
 const fromHouse=directionsForGua(house.number).find(row=>row.direction===direction);
 const fromPerson=directionsForGua(life.number).find(row=>row.direction===direction);
 if(!fromHouse||!fromPerson)throw new RangeError('Hướng phải nằm trong tám phương Bát Trạch.');
 return Object.freeze({direction,house: Object.freeze({gua:house.number,label:fromHouse.label,kind:fromHouse.kind}),
  person:Object.freeze({gua:life.number,label:fromPerson.label,kind:fromPerson.kind}),
  mismatch:fromHouse.key!==fromPerson.key,note:'Bát Trạch trạch quái và mệnh quái là hai hệ quy chiếu; hai nhãn có thể khác nhau. Không lấy trung bình.'});
}
module.exports={STRUCTURES,classifyNatalStructure,measurementAudit,eightMansionsDirectionAudit};
