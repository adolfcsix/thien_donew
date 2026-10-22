'use strict';
const {buildPalaceLedger}=require('./palace-ledger.cjs');
const {SOLAR_TERMS}=require('./formation.cjs');
const {RULE_PROFILE}=require('./structural-signals.cjs');
const GENERATES=Object.freeze({Mộc:'Hỏa',Hỏa:'Thổ',Thổ:'Kim',Kim:'Thủy',Thủy:'Mộc'});
const CONTROLS=Object.freeze({Mộc:'Thổ',Thổ:'Thủy',Thủy:'Hỏa',Hỏa:'Kim',Kim:'Mộc'});
const STEM_ELEMENTS=Object.freeze({Giáp:'Mộc',Ất:'Mộc',Bính:'Hỏa',Đinh:'Hỏa',Mậu:'Thổ',Kỷ:'Thổ',Canh:'Kim',Tân:'Kim',Nhâm:'Thủy',Quý:'Thủy'});
const STAR_ELEMENTS=Object.freeze({'Thiên Bồng':'Thủy','Thiên Nhuế':'Thổ','Thiên Nhậm':'Thổ','Thiên Cầm':'Thổ','Thiên Xung':'Mộc','Thiên Phụ':'Mộc','Thiên Anh':'Hỏa','Thiên Tâm':'Kim','Thiên Trụ':'Kim'});
// Month boundaries are the twelve Jie, not the lunar or Gregorian month.
const MONTHS=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const MONTH_ELEMENTS=Object.freeze(['Thủy','Thổ','Mộc','Mộc','Thổ','Hỏa','Hỏa','Thổ','Kim','Kim','Thổ','Thủy']);
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const PROFILE=freeze({id:'thien-do-qimen-month-strength-v11112',status:'research-only',starRule:'baojian-star-month',genericRule:'five-elements-month',earthMonths:'full-branch-month',
 sources:[{title:'Bảo Giám Ngự Định · Cửu Tinh nguyệt khí',url:'https://zh.wikisource.org/w/index.php?title=奇门宝鉴御定&oldid=2353651'},{title:'Tam Mệnh Thông Hội · quyển II · ngũ hành vượng suy',url:'https://zh.wikisource.org/zh-hant/三命通會/卷二'},{title:'Diễn Nghĩa · quyển III · dị bản chưa áp dụng',url:'https://zh.wikisource.org/w/index.php?title=遁甲演義&oldid=2082234'}],
 limits:['Đối chiếu Chi tháng tiết khí đã chọn, không phải luận đoán tổng hợp hoặc xác suất sự kiện.','Cửu Tinh dùng bảng Bảo Giám riêng; Môn/Can dùng bảng ngũ hành thông thường theo quyết định nghiên cứu.','Thìn–Tuất–Sửu–Mùi xét Thổ toàn tháng chi; chưa xét tư lệnh theo ngày hoặc Thổ 18 ngày cuối mùa.','Tử/Phế là thuật ngữ khí; không dự báo tử vong hoặc vận hạn.','Bản chép số chưa thẩm định ảnh bản in hoặc phản biện chuyên gia.']});
function monthFromTerm(index){
 if(!Number.isInteger(index)||index<0||index>23)throw new RangeError('Tiết khí phải là số nguyên 0–23');
 const monthIndex=Math.floor((index+1)/2)%12;
 return freeze({termIndex:index,term:SOLAR_TERMS[index].name,branch:MONTHS[monthIndex],element:MONTH_ELEMENTS[monthIndex],basis:'solar-term-branch-month'});
}
function strengthForElement(element,monthElement,rule='five-elements-month'){
 if(!Object.hasOwn(GENERATES,element)||!Object.hasOwn(GENERATES,monthElement))throw new RangeError('Ngũ hành không hợp lệ');
 if(!['five-elements-month','baojian-star-month'].includes(rule))throw new RangeError('Quy tắc nguyệt khí không hợp lệ');
 const relation=element===monthElement?'same':GENERATES[element]===monthElement?'symbol-generates-month':GENERATES[monthElement]===element?'month-generates-symbol':CONTROLS[element]===monthElement?'symbol-controls-month':'month-controls-symbol';
 const generic={same:'vượng','symbol-generates-month':'hưu','month-generates-symbol':'tướng','symbol-controls-month':'tù','month-controls-symbol':'tử'};
 const star={same:'tướng','symbol-generates-month':'vượng','month-generates-symbol':'phế','symbol-controls-month':'hưu','month-controls-symbol':'tù'};
 return freeze({state:(rule==='baojian-star-month'?star:generic)[relation],relation});
}
function analyzeMonthStrength(base,plate=null){
 const ledger=buildPalaceLedger(base,plate),month=monthFromTerm(base.solarTermIndex);
 const observation=(symbol,element,rule)=>({status:'computed',symbol,element,rule,...strengthForElement(element,month.element,rule)});
 const unavailable=(status)=>({status,symbol:null,element:null,rule:null,state:null,relation:null});
 const entries=ledger.entries.map(({number,trigram})=>{
  if(!plate)return {number,trigram,door:unavailable('not-computed'),stem:unavailable('not-computed'),stars:[],status:'not-computed',lodgedStarHost:null};
  if(number===5)return {number,trigram,door:unavailable('convention'),stem:unavailable('convention'),stars:[],status:'convention',lodgedStarHost:plate.palaces.find(p=>p.lodgedTianQin)?.number??null};
  const cell=plate.byPalace[number],names=[cell.star,...(cell.lodgedTianQin?['Thiên Cầm']:[])];
  return {number,trigram,status:'computed',lodgedStarHost:null,
   door:observation(cell.door,RULE_PROFILE.doorElements[cell.door],PROFILE.genericRule),stem:observation(cell.heavenStem,STEM_ELEMENTS[cell.heavenStem],PROFILE.genericRule),
   stars:names.map(name=>({...observation(name,STAR_ELEMENTS[name],PROFILE.starRule),lodged:name==='Thiên Cầm'}))};
 });
 return freeze({kind:'month-strength-observations',status:plate?'research-only':'not-computed',profile:PROFILE,month,entries,byPalace:Object.fromEntries(entries.map(e=>[e.number,e])),interpretation:null});
}
module.exports={PROFILE,monthFromTerm,strengthForElement,analyzeMonthStrength};
