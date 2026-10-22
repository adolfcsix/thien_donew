'use strict';
const {calculateTaiyi}=require('@thiendo/astrology-engine/src/taiyi-depth.cjs');
const {validateBaziSnapshot}=require('@thiendo/astrology-engine/src/bazi-study-snapshot.cjs');
const {calculate:calculateHaLac}=require('@thiendo/astrology-engine/src/ha-lac-source.cjs');
const {calculateMinggua}=require('@thiendo/astrology-engine/src/ha-lac-minggua-v11145.cjs');
const {sliceTime:sliceTieBan}=require('@thiendo/astrology-engine/src/tieban-source.cjs');
const {assess:auditCalendar}=require('@thiendo/astrology-engine/src/traditional-calendar-audit.cjs');
const {RULESET:DA_LIU_REN_METHOD,validateDaLiuRenSnapshot}=require('@thiendo/astrology-engine/src/da-liu-ren-depth.cjs');
const {METHOD:QIMEN_METHOD,validateQimenProfile}=require('@thiendo/astrology-engine/src/qimen-profile.cjs');
const {METHOD:LUC_HAO_METHOD,validateLucHaoProfile}=require('@thiendo/astrology-engine/src/luc-hao-profile.cjs');
const {METHOD:MAI_HOA_METHOD,validateMaiHoaProfile}=require('@thiendo/astrology-engine/src/mai-hoa-profile.cjs');
const RELATIONSHIP_METHOD=require('@thiendo/knowledge/src/relationship-method-v11128.json').id;
const validateRelationshipInput=(s)=>require('@thiendo/astrology-engine/src/relationship-input.cjs').validateRelationshipInput(s);
const validateNatal=(s)=>require('@thiendo/astrology-engine/src/western-input.cjs').validateInput(s);
const {validateSpreadSnapshot:validateTarot}=require('@thiendo/astrology-engine/src/tarot-rws.cjs');
const {validateInput:validateNumerology}=require('@thiendo/astrology-engine/src/numerology-pythagorean.cjs');

const FORMAT = 'thien-do.study-export';
const VERSION = 1;
const MAX_ENTRIES = 200;
const MAX_BYTES = 2 * 1024 * 1024;
const DISCIPLINES = new Set(['general','mai-hoa','luc-hao','ky-mon','dai-luc-nham','thai-at','phong-thuy','ha-lac','thiet-ban','lich-phap','numerology','western-astrology','tarot','bazi']);

const goodInt=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const isDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`))&&new Date(`${x}T00:00:00Z`).toISOString().slice(0,10)===x&&+x.slice(0,4)>=1900&&+x.slice(0,4)<=2100;
function validSnapshot(d,s){
 if(!s||typeof s!=='object'||Array.isArray(s))return false;
 if(d==='bazi'){try{validateBaziSnapshot(s);return true;}catch{return false;}}
 if(d==='ha-lac'){try{Object.hasOwn(s,'profile')?calculateMinggua(s):calculateHaLac(s);return true;}catch{return false;}}
 if(d==='thiet-ban'){try{sliceTieBan(s);return true;}catch{return false;}}
 if(d==='lich-phap'){try{auditCalendar(s);return true;}catch{return false;}}
 if(d==='thai-at'){try{const v=calculateTaiyi(s);return s.unit==='year'&&v.status==='annual-table-research';}catch{return false;}}
 if(d==='dai-luc-nham'){try{validateDaLiuRenSnapshot(s);return true;}catch{return false;}}
 if(d==='tarot'){try{validateTarot(s);return true;}catch{return false;}}
 if(d==='western-astrology'){try{(s.method===RELATIONSHIP_METHOD?validateRelationshipInput:validateNatal)(s);return true;}catch{return false;}}
 if(d==='numerology'){try{validateNumerology(s);return true;}catch{return false;}}
 if(d==='general')return true;
 if(d==='mai-hoa'&&Object.hasOwn(s,'method')){try{validateMaiHoaProfile(s);return true;}catch{return false;}}
 if(d==='mai-hoa'&&s.method===MAI_HOA_METHOD)return validateMaiHoaProfile(s);
 if(d==='mai-hoa')return s.mode==='numbers'?(goodInt(s.first,1,1000000)&&goodInt(s.second,1,1000000)):
  s.mode==='later-heaven'?(goodInt(s.objectTrigram,1,8)&&goodInt(s.directionTrigram,1,8)&&goodInt(s.hourBranch,1,12)):
  (s.mode==='time'&&goodInt(s.yearBranch,1,12)&&goodInt(s.lunarMonth,1,12)&&goodInt(s.lunarDay,1,30)&&goodInt(s.hourBranch,1,12));
 if(d==='luc-hao'&&Object.hasOwn(s,'method')){try{validateLucHaoProfile(s);return true;}catch{return false;}}
 if(d==='luc-hao'){
  if(!Array.isArray(s.lines)||s.lines.length!==6||!s.lines.every(x=>[6,7,8,9].includes(x))||!['manual','calendar'].includes(s.mode)||s.date&&!isDate(s.date))return false;
  const stems=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'],branches=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  for(const k of ['dayStem','dayBranch','monthBranch'])if(Object.hasOwn(s,k)&&(typeof s[k]!=='string'||s[k]!==''&&!(k==='dayStem'?stems:branches).includes(s[k])))return false;
  return !(s.dayStem&&s.dayBranch&&stems.indexOf(s.dayStem)%2!==branches.indexOf(s.dayBranch)%2);
 }
 if(d==='ky-mon'&&Object.hasOwn(s,'method')){try{validateQimenProfile(s);return true;}catch{return false;}}
 if(d==='ky-mon')return (!Object.hasOwn(s,'lateZiAcknowledged')||typeof s.lateZiAcknowledged==='boolean')&&[true,false].includes(s.withHour)&&(s.mode==='auto'?(isDate(s.date)&&goodInt(s.hour,0,23)&&goodInt(s.minute,0,59)&&['midnight','late-zi'].includes(s.dayBoundary)):(s.mode==='manual'&&goodInt(s.solarTermIndex,0,23)&&goodInt(s.dayCycleIndex,0,59)&&goodInt(s.hourBranchIndex,0,11)));
 if(d==='phong-thuy')return typeof s.degrees==='number'&&Number.isFinite(s.degrees)&&s.degrees>=0&&s.degrees<=360;
 return false;
}
function snapshotForCreate(d,s){
 if(d==='bazi')return validateBaziSnapshot(s);
 if(['ha-lac','thiet-ban','lich-phap'].includes(d))return {...s};
 if(d==='thai-at')return {...s};
 if(d==='dai-luc-nham')return validateDaLiuRenSnapshot(s);
 if(d==='tarot')return validateTarot(s);
 if(d==='western-astrology')return s.method===RELATIONSHIP_METHOD?validateRelationshipInput(s):validateNatal(s);
 if(d==='numerology')return validateNumerology(s);
 if(d==='general')return {};
 if(d==='mai-hoa'&&s.method===MAI_HOA_METHOD)return validateMaiHoaProfile(s);
 if(d==='mai-hoa')return s.mode==='numbers'?{mode:s.mode,first:s.first,second:s.second}:s.mode==='later-heaven'?{mode:s.mode,objectTrigram:s.objectTrigram,directionTrigram:s.directionTrigram,hourBranch:s.hourBranch}:{mode:s.mode,yearBranch:s.yearBranch,lunarMonth:s.lunarMonth,lunarDay:s.lunarDay,hourBranch:s.hourBranch};
 if(d==='luc-hao'&&s.method===LUC_HAO_METHOD)return validateLucHaoProfile(s);
 if(d==='luc-hao')return s.mode==='calendar'?{lines:[...s.lines],mode:s.mode,...(s.date?{date:s.date}:{})}:{lines:[...s.lines],mode:s.mode,dayStem:s.dayStem??'',dayBranch:s.dayBranch??'',monthBranch:s.monthBranch??''};
 if(d==='ky-mon'&&s.method===QIMEN_METHOD)return validateQimenProfile(s);
 if(d==='ky-mon')return s.mode==='manual'?{mode:s.mode,withHour:s.withHour,solarTermIndex:s.solarTermIndex,dayCycleIndex:s.dayCycleIndex,hourBranchIndex:s.hourBranchIndex}:{mode:s.mode,withHour:s.withHour,date:s.date,hour:s.hour,minute:s.minute,dayBoundary:s.dayBoundary,...(Object.hasOwn(s,'lateZiAcknowledged')?{lateZiAcknowledged:s.lateZiAcknowledged}:{})};
 return {degrees:s.degrees};
}

function parseStudyBackup(input){
 let value=input;
 if(typeof input==='string'){
  if(input.length>MAX_BYTES)throw Error('Tệp JSON vượt giới hạn 2 MB.');
  try{value=JSON.parse(input);}catch{throw Error('Tệp không phải JSON hợp lệ.');}
 }
 if(!value||typeof value!=='object'||Array.isArray(value)||value.format!==FORMAT||value.version!==VERSION||!Array.isArray(value.entries))
  throw Error('Tệp không đúng định dạng bản sao Thư phòng Thiên Đồ phiên bản 1.');
 if(value.entries.length>MAX_ENTRIES)throw Error(`Tệp có quá ${MAX_ENTRIES} hồ sơ.`);
 const entries=value.entries.map((entry,index)=>{
  const label=`Hồ sơ ${index+1}`;
  if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error(`${label}: dữ liệu không hợp lệ.`);
  const {discipline,title,summary,notes,tags,snapshot,pinned}=entry;
  if(!DISCIPLINES.has(discipline))throw Error(`${label}: bộ môn không được hỗ trợ.`);
  if(typeof title!=='string'||!title.trim()||title.trim().length>100)throw Error(`${label}: tiêu đề phải có 1–100 ký tự.`);
  if(typeof summary!=='string'||summary.length>240)throw Error(`${label}: mô tả vượt giới hạn 240 ký tự.`);
  if(typeof notes!=='string'||notes.length>3000)throw Error(`${label}: ghi chú vượt giới hạn 3.000 ký tự.`);
  if(!Array.isArray(tags)||tags.length>5||tags.some(x=>typeof x!=='string'||!x.trim()||x.trim().length>24)||new Set(tags.map(x=>x.trim().toLocaleLowerCase('vi'))).size!==tags.length)
   throw Error(`${label}: tối đa 5 nhãn, mỗi nhãn 1–24 ký tự và không trùng.`);
  if(!validSnapshot(discipline,snapshot))throw Error(`${label}: tham số đầu vào không hợp lệ với bộ môn ${discipline}.`);
  if(typeof pinned!=='boolean')throw Error(`${label}: trạng thái ghim không hợp lệ.`);
  return {discipline,title:title.trim(),summary,notes,tags:tags.map(x=>x.trim()),snapshot:snapshotForCreate(discipline,snapshot),pinned};
 });
 return entries;
}

module.exports={FORMAT,VERSION,MAX_ENTRIES,MAX_BYTES,parseStudyBackup};
