'use strict';
const {buildPalaceLedger}=require('./palace-ledger.cjs');
const {EARTH_STEMS}=require('./formation.cjs');
const XUN=Object.freeze({'Giáp Tý':'Mậu','Giáp Tuất':'Kỷ','Giáp Thân':'Canh','Giáp Ngọ':'Tân','Giáp Thìn':'Nhâm','Giáp Dần':'Quý'});
const SOURCE='https://zh.wikisource.org/w/index.php?title=遁甲演義&oldid=2082234';
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function observePatternPair(xun,heaven,earth){
 if(!Object.hasOwn(XUN,xun)||!EARTH_STEMS.includes(heaven)||!EARTH_STEMS.includes(earth))throw new RangeError('Tuần và cặp Thiên/Địa Can phải hợp lệ');
 const hidden=XUN[xun];
 return freeze({dragon:heaven===hidden&&earth==='Bính'?'present':'absent',bird:heaven==='Bính'&&earth===hidden?'present':'absent'});
}
function analyzePatternSignals(base,plate=null){
 const ledger=buildPalaceLedger(base,plate);
 const xun=base.chief?.xunHead??null,hidden=xun?XUN[xun]:null;
 if(plate&&(!hidden||base.chief.hiddenStem!==hidden))throw new RangeError('Can ẩn Giáp không khớp tuần giờ');
 const entries=ledger.entries.map(({number,trigram,direction})=>{
  const cell=plate?.byPalace[number];
  const pair=!plate?{dragon:'not-computed',bird:'not-computed'}:number===5?{dragon:'convention',bird:'convention'}:observePatternPair(xun,cell.heavenStem,cell.earthStem);
  return {number,trigram,direction,heavenStem:cell?.heavenStem??null,earthStem:base.plate.byPalace[number],...pair};
 });
 const patterns=[{id:'dragon',name:'Thanh Long Hồi Thủ',heavenStem:hidden,earthStem:'Bính'},{id:'bird',name:'Phi Điểu Điệt Huyệt',heavenStem:'Bính',earthStem:hidden}].map(rule=>{
  const target=plate?.palaces.find(p=>p.number!==5&&p.heavenStem===rule.heavenStem);
  return {...rule,status:!plate?'not-computed':!target?'not-represented':entries.find(e=>e.number===target.number)[rule.id],palaceNumber:target?.number??null};
 });
 return freeze({kind:'can-pattern-observations',status:plate?'research-only':'not-computed',profileId:'thien-do-qimen-yanyi-can-patterns-v11111',sourceUrl:SOURCE,xunHead:xun,hiddenStem:hidden,entries,byPalace:Object.fromEntries(entries.map(e=>[e.number,e])),patterns,interpretation:null,
  limits:['Chỉ nhận diện cặp Thiên/Địa Can; không kết luận cát hung hay kết quả câu hỏi.','Giáp của tuần giờ cho cả hai dấu là quy ước nghiên cứu được chọn; chưa chứng nhận mọi trường phái.','Chưa xét vượng suy, chủ/khách, điều kiện phối hợp hoặc Can ký chưa biểu diễn ở Trung 5.']});
}
module.exports={observePatternPair,analyzePatternSignals};
