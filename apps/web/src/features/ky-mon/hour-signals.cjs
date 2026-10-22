/**
 * V11.105: Kỳ Môn — recorded movement (驛馬) and 六儀擊刑 position matches.
 * Research-only structural evidence, not auspicious/inauspicious predictions.
 * Source rules documented in docs/research/schools/ky-mon-hour-signals.md.
 */
'use strict';
const {BRANCHES,CYCLE,makeBaseFormation}=require('./formation.cjs');
const {buildRotatingHourPlate}=require('./hour-plate.cjs');
const {getPalace}=require('./luoshu.cjs');
const HORSE_GROUPS=Object.freeze([
 Object.freeze({members:Object.freeze(['Thân','Tý','Thìn']),horse:'Dần',palace:8,group:'Thân–Tý–Thìn'}),
 Object.freeze({members:Object.freeze(['Dần','Ngọ','Tuất']),horse:'Thân',palace:2,group:'Dần–Ngọ–Tuất'}),
 Object.freeze({members:Object.freeze(['Tỵ','Dậu','Sửu']),horse:'Hợi',palace:6,group:'Tỵ–Dậu–Sửu'}),
 Object.freeze({members:Object.freeze(['Hợi','Mão','Mùi']),horse:'Tỵ',palace:4,group:'Hợi–Mão–Mùi'})
]);
// Match against HEAVEN-plate 六儀 only; don't confuse an earth-plate match
// with one on the rotating heaven plate. These are positional observations.
const STRIKING_POSITIONS=Object.freeze([
 Object.freeze({xun:'Giáp Tý',instrument:'Mậu',palace:3,relation:'Tý–Mão hình'}),
 Object.freeze({xun:'Giáp Tuất',instrument:'Kỷ',palace:2,relation:'Tuất–Mùi hình'}),
 Object.freeze({xun:'Giáp Thân',instrument:'Canh',palace:8,relation:'Thân–Dần hình'}),
 Object.freeze({xun:'Giáp Ngọ',instrument:'Tân',palace:9,relation:'Ngọ tự hình'}),
 Object.freeze({xun:'Giáp Thìn',instrument:'Nhâm',palace:4,relation:'Thìn tự hình'}),
 Object.freeze({xun:'Giáp Dần',instrument:'Quý',palace:4,relation:'Dần–Tỵ hình'})
]);
function horseFromBranch(branch){
 if(typeof branch!=='string'||!BRANCHES.includes(branch))throw new RangeError('Chi phải thuộc 12 Địa Chi');
 const group=HORSE_GROUPS.find(item=>item.members.includes(branch));
 if(!group)throw new Error('Không tìm thấy nhóm Tam Hợp');
 const palace=getPalace(group.palace);
 return Object.freeze({basisBranch:branch,group:group.group,horseBranch:group.horse,
   palaceNumber:palace.number,direction:palace.direction,rule:'Tam Hợp -> chi xung đối trưởng sinh',
   kind:'positional-reference'});
}
function positionMatches(plate){
 if(!plate?.byPalace||typeof plate.byPalace!=='object')throw new TypeError('Cần thời bàn Chuyển Bàn đã xác nhận');
 const observations=[];
 for(const rule of STRIKING_POSITIONS){
  const cell=plate.byPalace[rule.palace];
  if(!cell||typeof cell.heavenStem!=='string'&&cell.heavenStem!==null)throw new TypeError('Thiếu dữ liệu Thiên bàn cho Lục Nghi Kích Hình');
  if(cell.heavenStem===rule.instrument){
   observations.push(Object.freeze({...rule,heavenStem:cell.heavenStem,
    kind:'positional-match',conclusion:'Không tự suy cát hung hoặc cách cục'}));
  }
 }
 return Object.freeze(observations);
}
function analyzeHourSignals(base,hourPlate){
 if(!base?.chief||!hourPlate)throw new TypeError('Kỳ Môn cần quẻ có giờ và Chuyển Bàn');
 const dayIndex=CYCLE.findIndex(v=>v.name===base.day);
 const hourIndex=CYCLE.findIndex(v=>v.name===base.chief.hourName);
 if(dayIndex<0||hourIndex<0)throw new RangeError('Can Chi ngày/giờ không hợp lệ');
 // Fail closed on mismatched or forged input: reconstruct both layers from the
 // versioned engine rather than trusting a caller-supplied palace assignment.
 const trusted=makeBaseFormation({solarTermIndex:base.solarTermIndex,
   dayCycleIndex:dayIndex,hourCycleIndex:hourIndex});
 const trustedHour=buildRotatingHourPlate(trusted);
 const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
 const configFields=['term','dun','ju','yuan','method'];
 if(configFields.some(field=>!same(base[field],trusted[field])))
  throw new RangeError('Thông tin tiết khí, nguyên hoặc cục không khớp địa bàn');
 const hourFields=['hourName','trueHourStem','hourStemPalace','chiefStar','chiefDoor',
  'chiefStarLanding','chiefDoorLanding','starShift','doorShift','centerEarthStem','spiritDirection','method','status'];
 if(hourFields.some(field=>!same(hourPlate[field],trustedHour[field])))
  throw new RangeError('Thông tin thời bàn không khớp phép Chuyển Bàn');
 if(!same(base.plate,trusted.plate)||!same(base.chief,trusted.chief)||!same(base.palaces,trusted.palaces)
  ||!same(hourPlate.byPalace,trustedHour.byPalace)||!same(hourPlate.palaces,trustedHour.palaces))
  throw new RangeError('Dữ kiện lập cục hoặc thời bàn không khớp quy tắc phiên bản');
 const hourBranch=CYCLE[hourIndex].branch;
 const dayBranch=CYCLE[dayIndex].branch;
 const hourHorse=horseFromBranch(hourBranch);
 const dayHorse=horseFromBranch(dayBranch);
 const striking=positionMatches(trustedHour);
 const byPalace=Object.freeze(Object.fromEntries(trusted.palaces.map(({number})=>[number,
   Object.freeze({palaceNumber:number,hourHorse:number===hourHorse.palaceNumber,
    dayHorse:number===dayHorse.palaceNumber,
    strikingInstruments:Object.freeze(striking.filter(s=>s.palace===number).map(s=>s.instrument))})
 ])));
 return Object.freeze({method:'Thời chi Mã Tinh / Lục Nghi Thiên bàn Kích Hình vị trí · Chuyển Bàn',
  status:'research-only',hourName:base.chief.hourName,dayName:base.day,
  hourHorse,dayHorse,horseBasis:'hour',striking,byPalace,
  limits:Object.freeze([
   'Mã Tinh chính theo chi giờ; Mã Tinh theo chi ngày chỉ hiển thị để đối chiếu, không trộn hai cách.',
   'Kích Hình chỉ xác nhận Lục Nghi tại cung tương ứng trên Thiên bàn Chuyển Bàn; không nhận diện chỉ từ địa bàn.',
   'Không tự động luận cát hung, Môn Bách, Nhập Mộ, ứng kỳ hoặc áp dụng quy tắc Phi Bàn.',
   'Phụ thuộc đầu vào tiết khí, Can Chi và dị bản Chai Bổ/Chuyển Bàn của các phiên bản trước.'
  ])});
}
module.exports={HORSE_GROUPS,STRIKING_POSITIONS,horseFromBranch,positionMatches,analyzeHourSignals};
