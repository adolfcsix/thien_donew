/**
 * Thiên Đồ V11.76 — tầng khởi cục nền Kỳ Môn Độn Giáp (Chai Bổ).
 * Đầu vào tiết khí / Can Chi ngày / Can Chi giờ do người dùng XÁC NHẬN, KHÔNG tự
 * suy chúng từ đồng hồ. Chỉ an ĐỊA BÀN và Trực Phù/Trực Sử gốc theo tuần giờ;
 * tuyệt đối không lấy bảng này thay cho thiên bàn/chuyển bàn hoàn chỉnh.
 *
 * 24 tiết khí x 3 nguyên: bảng 72 cục truyền thống, từ phép quyết:
 * 冬至一七四, 小寒二八五, 大寒三九六 ... 大雪四七一.
 * Xem THIEN_DO_V11_76_RELEASE_NOTES.md về quy ước và dị bản.
 */
'use strict';
const {PALACES}=require('./luoshu.cjs');
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const CYCLE=Object.freeze(Array.from({length:60},(_,i)=>Object.freeze({index:i,stem:STEMS[i%10],branch:BRANCHES[i%12],name:STEMS[i%10]+' '+BRANCHES[i%12]})));
const YUAN_NAMES=Object.freeze(['Thượng nguyên','Trung nguyên','Hạ nguyên']);
// Mỗi bản ghi: tiết khí, ba cục Thượng–Trung–Hạ, âm hay dương độn.
// Thứ tự bắt đầu từ Đông Chí thuận vòng tiết khí đến Đại Tuyết.
const SOLAR_TERMS=Object.freeze([
 ['Đông Chí',[1,7,4],'dương'],['Tiểu Hàn',[2,8,5],'dương'],['Đại Hàn',[3,9,6],'dương'],
 ['Lập Xuân',[8,5,2],'dương'],['Vũ Thủy',[9,6,3],'dương'],['Kinh Trập',[1,7,4],'dương'],
 ['Xuân Phân',[3,9,6],'dương'],['Thanh Minh',[4,1,7],'dương'],['Cốc Vũ',[5,2,8],'dương'],
 ['Lập Hạ',[4,1,7],'dương'],['Tiểu Mãn',[5,2,8],'dương'],['Mang Chủng',[6,3,9],'dương'],
 ['Hạ Chí',[9,3,6],'âm'],['Tiểu Thử',[8,2,5],'âm'],['Đại Thử',[7,1,4],'âm'],
 ['Lập Thu',[2,5,8],'âm'],['Xử Thử',[1,4,7],'âm'],['Bạch Lộ',[9,3,6],'âm'],
 ['Thu Phân',[7,1,4],'âm'],['Hàn Lộ',[6,9,3],'âm'],['Sương Giáng',[5,8,2],'âm'],
 ['Lập Đông',[6,9,3],'âm'],['Tiểu Tuyết',[5,8,2],'âm'],['Đại Tuyết',[4,7,1],'âm']
 ].map(([name,ju,dun],index)=>Object.freeze({index,name,ju:Object.freeze(ju),dun})));
const EARTH_STEMS=Object.freeze(['Mậu','Kỷ','Canh','Tân','Nhâm','Quý','Đinh','Bính','Ất']);
// Cửu tinh / Bát môn tại cung bản vị trong hệ Hậu Thiên. Trung cung không có môn.
const HOME=Object.freeze({
 1:{star:'Thiên Bồng',door:'Hưu'},2:{star:'Thiên Nhuế',door:'Tử'},
 3:{star:'Thiên Xung',door:'Thương'},4:{star:'Thiên Phụ',door:'Đỗ'},
 5:{star:'Thiên Cầm',door:null},6:{star:'Thiên Tâm',door:'Khai'},
 7:{star:'Thiên Trụ',door:'Kinh'},8:{star:'Thiên Nhậm',door:'Sinh'},
 9:{star:'Thiên Anh',door:'Cảnh'}
});
const XUN_HIDDEN=Object.freeze(['Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
// Chi giờ quy chiếu với hướng địa bàn Hậu Thiên, không phải sao hay môn thời bàn.
const BRANCH_PALACES=Object.freeze([1,8,8,3,4,4,9,2,2,7,6,6]);
function voidForHour(hourCycleIndex){
 asIntInRange(hourCycleIndex,0,59,'Can Chi giờ');
 const xunIndex=Math.floor(hourCycleIndex/10);
 const headBranchIndex=(xunIndex*10)%12;
 const branchIndices=[(headBranchIndex+10)%12,(headBranchIndex+11)%12];
 const palaceNumbers=[...new Set(branchIndices.map(i=>BRANCH_PALACES[i]))];
 return Object.freeze({xunHead:CYCLE[xunIndex*10].name,
  branches:Object.freeze(branchIndices.map(i=>BRANCHES[i])),
  branchIndices:Object.freeze(branchIndices),palaceNumbers:Object.freeze(palaceNumbers),
  note:'Tuần Không theo tuần Can Chi giờ; cung chỉ vị trí quy chiếu Địa Chi Hậu Thiên, không phải lời luận cát hung.'});
}
function asIntInRange(value,min,max,label){
 if(!Number.isInteger(value)||value<min||value>max)throw new RangeError(`${label} phải là số nguyên từ ${min} đến ${max}`);
 return value;
}
/** Lấy nguyên từ đầu nhóm năm ngày: Giáp Tý → Giáp? mỗi khối 5 ngày bắt đầu Giáp hoặc Kỷ. */
function yuanFromDay(dayCycleIndex){
 asIntInRange(dayCycleIndex,0,59,'Can Chi ngày');
 const blockStart=Math.floor(dayCycleIndex/5)*5;
 const first=CYCLE[blockStart];
 const yuanIndex=Math.floor(dayCycleIndex%15/5);
 return Object.freeze({index:yuanIndex,name:YUAN_NAMES[yuanIndex],blockStart,blockStartName:first.name,dayName:CYCLE[dayCycleIndex].name});
}
/** Ngũ Tý Độn: Can giờ Tý từ Can ngày, sau đó đi thuận 12 chi giờ. */
function hourForDayBranch(dayCycleIndex,hourBranchIndex){
 asIntInRange(dayCycleIndex,0,59,'Can Chi ngày');
 asIntInRange(hourBranchIndex,0,11,'Giờ địa chi');
 const dayStemIndex=dayCycleIndex%10;
 const hourStemIndex=(2*(dayStemIndex%5)+hourBranchIndex)%10;
 const hour=CYCLE.find(x=>x.stem===STEMS[hourStemIndex]&&x.branch===BRANCHES[hourBranchIndex]);
 if(!hour)throw new Error('Không tìm thấy giờ trong vòng lục thập');
 return hour;
}
function hoursForDay(dayCycleIndex){
 asIntInRange(dayCycleIndex,0,59,'Can Chi ngày');
 return Object.freeze(Array.from({length:12},(_,i)=>hourForDayBranch(dayCycleIndex,i)));
}
/** 24 x 3 bảng cục, người dùng tự chọn tiết khí đã được xác nhận. */
function determineJu(solarTermIndex,dayCycleIndex){
 asIntInRange(solarTermIndex,0,23,'Tiết khí');
 const term=SOLAR_TERMS[solarTermIndex];
 const yuan=yuanFromDay(dayCycleIndex);
 return Object.freeze({solarTermIndex,term:term.name,dun:term.dun,ju:term.ju[yuan.index],yuan,day:CYCLE[dayCycleIndex].name,method:'Chai Bổ / 24 tiết khí × Tam nguyên (xác nhận thủ công)'});
}
/** Địa bàn Tam Kỳ–Lục Nghi theo 9 số cung (KHÔNG theo thứ tự vẽ Lạc Thư). */
function earthPlate(dun,ju){
 if(dun!=='âm'&&dun!=='dương')throw new RangeError('Độn phải là âm hoặc dương');
 asIntInRange(ju,1,9,'Cục số');
 const step=dun==='dương'?1:-1;
 const entries=EARTH_STEMS.map((stem,i)=>Object.freeze({stem,palaceNumber:1+((ju-1+step*i+90)%9),order:i}));
 return Object.freeze({dun,ju,entries:Object.freeze(entries),byPalace:Object.freeze(Object.fromEntries(entries.map(e=>[e.palaceNumber,e.stem])))});
}
/** Tuần thủ giờ và trực phù/trực sử gốc. Chưa dịch chuyển theo giờ! */
function chiefAtHome(plate,hourCycleIndex){
 asIntInRange(hourCycleIndex,0,59,'Can Chi giờ');
 const xunIndex=Math.floor(hourCycleIndex/10);
 const xunHead=CYCLE[xunIndex*10];
 const hiddenStem=XUN_HIDDEN[xunIndex];
 const palace=plate.entries.find(item=>item.stem===hiddenStem);
 if(!palace)throw new Error('Địa bàn không chứa can ẩn tuần thủ');
 const home=HOME[palace.palaceNumber];
 const voids=voidForHour(hourCycleIndex);
 // Chỉ định vị Trực Sử (môn trực) theo số bước từ đầu tuần giờ.
 // Đây không phải phép sắp đủ 8 môn trên nhân bàn.
 const stepsFromXunHead=hourCycleIndex%10;
 const rawDoorPalace=1+((palace.palaceNumber-1+(plate.dun==='dương'?1:-1)*stepsFromXunHead+90)%9);
 const doorTime=Object.freeze({stepsFromXunHead,rawPalace:rawDoorPalace,
  hostPalace:rawDoorPalace===5?2:rawDoorPalace,borrowedCenter:rawDoorPalace===5,
  method:'Trực Sử theo số bước giờ từ tuần thủ, thuận Dương độn/nghịch Âm độn (có bước qua Trung cung 5)',
  note:'Đây là vị trí Trực Sử theo phép đếm giờ, chưa an đồng bộ cả tám môn thời bàn.'});
 // Riêng trung cung: một số phép ký cung dùng Khôn 2 để ký Tử Môn.
 return Object.freeze({hourName:CYCLE[hourCycleIndex].name,xunHead:xunHead.name,hiddenStem,
  originalPalace:palace.palaceNumber,chiefStar:home.star,chiefDoor:home.door??'Tử',
  doorHostPalace:home.door?palace.palaceNumber:2,borrowedCenter:home.door===null,voids,doorTime,
  caution:'Đây là Trực Phù / Trực Sử TẠI CUNG GỐC, chưa an thiên bàn, nhân bàn hoặc thần bàn theo thời điểm.'});
}
function makeBaseFormation({solarTermIndex,dayCycleIndex,hourCycleIndex=null}){
 const config=determineJu(solarTermIndex,dayCycleIndex);
 if(hourCycleIndex!==null && !hoursForDay(dayCycleIndex).some(x=>x.index===hourCycleIndex))
  throw new RangeError('Can Chi giờ không khớp Can Chi ngày theo Ngũ Tý Độn');
 const plate=earthPlate(config.dun,config.ju);
 const chief=hourCycleIndex===null?null:chiefAtHome(plate,hourCycleIndex);
 const palaces=Object.freeze(PALACES.map(p=>Object.freeze({...p,earthStem:plate.byPalace[p.number],
  homeStar:HOME[p.number].star,homeDoor:HOME[p.number].door,chiefHome:chief?.originalPalace===p.number,doorTimeCandidate:Boolean(chief?.doorTime.hostPalace===p.number),voidAtPalace:Boolean(chief?.voids.palaceNumbers.includes(p.number))})));
 return Object.freeze({...config,plate,chief,palaces,
  hasFullHourChart:false,
  notComputed:Object.freeze(['Thời điểm tiết khí chính xác và Can Chi ngày/giờ tự động','Thiên bàn và phép chuyển/phi bàn theo giờ','Đầy đủ Bát Môn thời bàn (mới có vị trí Trực Sử theo bước giờ)','Cửu Tinh thời bàn','Bát Thần thời bàn','Mã tinh, cách cục và luận đoán (Tuần Không giờ đã tra ở dạng ký hiệu)'])});
}
module.exports={STEMS,BRANCHES,CYCLE,YUAN_NAMES,SOLAR_TERMS,EARTH_STEMS,HOME,XUN_HIDDEN,BRANCH_PALACES,voidForHour,yuanFromDay,hourForDayBranch,hoursForDay,determineJu,earthPlate,chiefAtHome,makeBaseFormation};
