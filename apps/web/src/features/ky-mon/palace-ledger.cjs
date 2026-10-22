'use strict';
/** V11.108: presentation evidence from existing Chai Bổ/Chuyển Bàn outputs.
 * No new placement rules or auspicious/inauspicious judgments. */
const {CYCLE,makeBaseFormation}=require('./formation.cjs');
const {analyzeHourSignals}=require('./hour-signals.cjs');
function buildPalaceLedger(base,plate=null){
 if(!base||!Array.isArray(base.palaces))throw new TypeError('Cần địa bàn hợp lệ');
 const day=CYCLE.findIndex(x=>x.name===base.day);
 const hour=base.chief?CYCLE.findIndex(x=>x.name===base.chief.hourName):null;
 if(day<0||hour===-1)throw new RangeError('Can Chi không hợp lệ');
 const trusted=makeBaseFormation({solarTermIndex:base.solarTermIndex,dayCycleIndex:day,hourCycleIndex:hour});
 for(const key of ['term','dun','ju','yuan','method','plate','chief','palaces'])
  if(JSON.stringify(base[key])!==JSON.stringify(trusted[key]))throw new RangeError('Địa bàn không khớp dữ kiện lập cục');
 if(Boolean(base.chief)!==Boolean(plate))throw new TypeError('Thời bàn phải đi cùng dữ kiện giờ');
 const signals=plate?analyzeHourSignals(base,plate):null;
 const tianQinHost=plate?.palaces.find(p=>p.lodgedTianQin)?.number??null;
 const field=(key,label,value,status,explanation,sourcePalace=null)=>Object.freeze({key,label,value,status,explanation,sourcePalace});
 const entries=Object.freeze(trusted.palaces.map(p=>{
  const cell=plate?.byPalace[p.number];
  const local=signals?.byPalace[p.number];
  const center=p.number===5;
  const unavailable='Chưa tính: cần dữ kiện giờ và thời bàn hợp lệ.';
  const absent='Không có dấu này tại cung đang chọn; không suy thành tốt hoặc xấu.';
  const fields=Object.freeze([
   field('earth','Địa Can',p.earthStem,'present',`Tam Kỳ–Lục Nghi theo ${base.dun} độn ${base.ju} cục; Mậu khởi tại cung ${base.ju}.`),
   field('heaven','Thiên Can',cell?.heavenStem??null,!plate?'not-computed':center?'convention':'present',!plate?unavailable:center?'Trung 5 giữ Địa Can; không an Thiên Can thời bàn độc lập.':`Can theo sao từ cung ${cell.starFromPalace}, xoay +${plate.starShift} vị trí trên vòng tám cung ngoài.`,cell?.starFromPalace??null),
   field('star','Cửu Tinh',cell?.star??null,!plate?'not-computed':center?'convention':'present',!plate?unavailable:center?`Thiên Cầm bản vị Trung 5, ký cùng Thiên Nhuế tại cung ${tianQinHost} trên thời bàn này.`:`Từ cung bản vị ${cell.starFromPalace}${cell.lodgedTianQin?'; ký thêm Thiên Cầm theo quy ước Khôn 2':''}.`,center?tianQinHost:cell?.starFromPalace??null),
   field('door','Bát Môn',cell?.door??null,!plate?'not-computed':center?'convention':'present',!plate?unavailable:center?'Trung 5 không có môn riêng; khi Trực Sử bước qua Trung 5, ký Khôn 2 theo quy ước hiện tại.':`Môn từ cung bản vị ${cell.doorFromPalace}, xoay +${plate.doorShift} vị trí trên vòng tám cung ngoài.`,cell?.doorFromPalace??null),
   field('deity','Bát Thần',cell?.deity??null,!plate?'not-computed':center?'convention':'present',!plate?unavailable:center?'Không an thần riêng ở Trung 5.':`Trực Phù thần khởi tại cung ${plate.chiefStarLanding}; đi ${plate.spiritDirection} theo vòng tám cung ngoài.`,plate&&!center?plate.chiefStarLanding:null),
   field('void','Tuần Không giờ',!plate?null:cell.voidAtPalace?'Có dấu':'Không có dấu',!plate?'not-computed':cell.voidAtPalace?'present':'absent',!plate?unavailable:`Tuần ${base.chief.xunHead}: ${base.chief.voids.branches.join(' – ')}; quy chiếu cung ${base.chief.voids.palaceNumbers.join(', ')}. Không tự suy cát hung.`),
   field('hourHorse','Mã Tinh giờ',!signals?null:local.hourHorse?signals.hourHorse.horseBranch:'Không có dấu',!signals?'not-computed':local.hourHorse?'present':'absent',!signals?unavailable:`Chi giờ ${signals.hourHorse.basisBranch} → nhóm ${signals.hourHorse.group} → ${signals.hourHorse.horseBranch} → cung ${signals.hourHorse.palaceNumber}.`,signals?.hourHorse.palaceNumber??null),
   field('dayHorse','Mã Tinh ngày · đối chiếu',!signals?null:local.dayHorse?signals.dayHorse.horseBranch:'Không có dấu',!signals?'not-computed':local.dayHorse?'present':'absent',!signals?unavailable:`Chi ngày ${signals.dayHorse.basisBranch} → nhóm ${signals.dayHorse.group} → cung ${signals.dayHorse.palaceNumber}. Tách khỏi Mã Tinh giờ.`,signals?.dayHorse.palaceNumber??null),
   field('striking','Lục Nghi Kích Hình',!signals?null:local.strikingInstruments.length?local.strikingInstruments.join(', '):'Không có dấu',!signals?'not-computed':local.strikingInstruments.length?'present':'absent',!signals?unavailable:local.strikingInstruments.length?signals.striking.filter(x=>x.palace===p.number).map(x=>`${x.xun} ẩn ${x.instrument}; ${x.relation}`).join('; ')+'. Chỉ là trùng vị trí Thiên bàn.':absent)
  ]);
  return Object.freeze({number:p.number,direction:p.direction,trigram:p.trigram,element:p.element,fields,
   homeStar:p.homeStar,homeDoor:p.homeDoor,chiefStarLanding:Boolean(cell?.chiefStarLanding),chiefDoorLanding:Boolean(cell?.chiefDoorLanding),lodgedTianQin:Boolean(cell?.lodgedTianQin)});
 }));
 const steps=Object.freeze([
  `Tiết ${base.term} · ${base.yuan.name} từ ${base.yuan.blockStartName} → ${base.dun} độn ${base.ju} cục.`,
  `Địa bàn: Mậu ở cung ${base.ju}; an Kỷ, Canh, Tân, Nhâm, Quý, Đinh, Bính, Ất theo chiều ${base.dun==='dương'?'thuận':'nghịch'} số cung 1–9.`,
  ...(plate?[
   `Giờ ${base.chief.hourName} thuộc tuần ${base.chief.xunHead}; Giáp ẩn ${base.chief.hiddenStem}, cung gốc ${base.chief.originalPalace}.`,
   `Trực Phù sao ${plate.chiefStar}: theo Can giờ ${plate.trueHourStem} đến cung ${plate.hourStemPalace}${plate.hourStemPalace===5?' (ký Khôn 2)':''}; đích thời bàn ${plate.chiefStarLanding}, xoay +${plate.starShift} trên vòng tám cung ngoài.`,
   `Trực Sử ${plate.chiefDoor}: ${base.chief.doorTime.stepsFromXunHead} bước ${base.dun==='dương'?'thuận':'nghịch'} từ cung ${base.chief.originalPalace} → ${base.chief.doorTime.rawPalace}${base.chief.doorTime.borrowedCenter?' (ký Khôn 2)':''}; đích ${plate.chiefDoorLanding}, xoay môn +${plate.doorShift}.`,
   `Bát Thần: Trực Phù thần khởi cung ${plate.chiefStarLanding}, đi ${plate.spiritDirection} vòng tám cung ngoài. Thiên Cầm ký cùng Thiên Nhuế tại cung ${tianQinHost}.`
  ]:['Chưa có dữ kiện giờ: chỉ trình bày địa bàn và bản vị; không gán các lớp thời bàn hoặc tín hiệu giờ.'])
 ]);
 return Object.freeze({status:plate?'research-only':'earth-only',method:plate?.method??base.method,entries,
  byPalace:Object.freeze(Object.fromEntries(entries.map(p=>[p.number,p]))),steps,
  note:'Hiện diện là có dữ kiện hoặc dấu tại cung; không có dấu khác với chưa tính. Quy ước ký cung được trình bày riêng. Không suy cát hung từ riêng một dấu; quy ước này không áp dụng cho Phi Bàn hoặc Trí Nhuận.'});
}
module.exports={buildPalaceLedger};
