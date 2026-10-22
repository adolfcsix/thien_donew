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
/** Server stores only reproducible inputs. Archive opens a real calculator with those inputs. */
const mapping = Object.freeze({
 'bazi':'/bazi','mai-hoa':'/mai-hoa','luc-hao':'/luc-hao','ky-mon':'/ky-mon','dai-luc-nham':'/dai-luc-nham','thai-at':'/thai-at','phong-thuy':'/phong-thuy','ha-lac':'/ha-lac','thiet-ban':'/thiet-ban','lich-phap':'/calendar',general:'/study',numerology:'/numerology','western-astrology':'/western-astrology',tarot:'/tarot',
});
const goodInt=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const isDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`))&&new Date(`${x}T00:00:00Z`).toISOString().slice(0,10)===x&&+x.slice(0,4)>=1900&&+x.slice(0,4)<=2100;
function validSnapshot(d,s){
 if(!s||typeof s!=='object'||Array.isArray(s)) return false;
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
 if(d==='mai-hoa')return s.mode==='numbers'?(goodInt(s.first,1,1000000)&&goodInt(s.second,1,1000000)):
  s.mode==='later-heaven'?(goodInt(s.objectTrigram,1,8)&&goodInt(s.directionTrigram,1,8)&&goodInt(s.hourBranch,1,12)):
  (s.mode==='time'&&goodInt(s.yearBranch,1,12)&&goodInt(s.lunarMonth,1,12)&&goodInt(s.lunarDay,1,30)&&goodInt(s.hourBranch,1,12));
 if(d==='luc-hao'&&Object.hasOwn(s,'method')){try{validateLucHaoProfile(s);return true;}catch{return false;}}
 if(d==='luc-hao'){
  if(!Array.isArray(s.lines)||s.lines.length!==6||!s.lines.every(x=>[6,7,8,9].includes(x))||!['manual','calendar'].includes(s.mode)||s.date&&!isDate(s.date))return false;
  const stems=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'],branches=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  for(const k of ['dayStem','dayBranch','monthBranch'])if(Object.hasOwn(s,k)&&(typeof s[k]!=='string'||s[k]!==''&&!(k==='dayStem'?stems:branches).includes(s[k])))return false;
  if(s.dayStem&&s.dayBranch&&stems.indexOf(s.dayStem)%2!==branches.indexOf(s.dayBranch)%2)return false;
  return true;
 }
 if(d==='ky-mon'&&Object.hasOwn(s,'method')){try{validateQimenProfile(s);return true;}catch{return false;}}
 if(d==='ky-mon')return (!Object.hasOwn(s,'lateZiAcknowledged')||typeof s.lateZiAcknowledged==='boolean')&&[true,false].includes(s.withHour)&&(s.mode==='auto'?(isDate(s.date)&&goodInt(s.hour,0,23)&&goodInt(s.minute,0,59)&&['midnight','late-zi'].includes(s.dayBoundary)):(s.mode==='manual'&&goodInt(s.solarTermIndex,0,23)&&goodInt(s.dayCycleIndex,0,59)&&goodInt(s.hourBranchIndex,0,11)));
 if(d==='phong-thuy')return typeof s.degrees==='number'&&Number.isFinite(s.degrees)&&s.degrees>=0&&s.degrees<=360;
 return false;
}
function studyHref(d,s){
 if(!Object.hasOwn(mapping,d)||!validSnapshot(d,s))return '/study';
 if(d==='thai-at')return '/study';
 if(d==='dai-luc-nham'&&s.method===DA_LIU_REN_METHOD)return '/study';
 if(d==='ky-mon'&&s.method===QIMEN_METHOD)return '/study';
 if(d==='luc-hao'&&s.method===LUC_HAO_METHOD)return '/study';
 if(d==='mai-hoa'&&s.method===MAI_HOA_METHOD)return '/study';
 if(d==='bazi')return '/study'; // Restore by authenticated ?entry=id only: no birth timestamp in URL.
 if(d==='general'||d==='numerology'||d==='western-astrology'||d==='tarot')return '/study';
 const p=new URLSearchParams();p.set('restore','1');
 if(d==='mai-hoa'){
  p.set('mode',s.mode);
  if(s.mode==='numbers'){p.set('first',String(s.first));p.set('second',String(s.second));}
  else if(s.mode==='later-heaven')for(const k of ['objectTrigram','directionTrigram','hourBranch'])p.set(k,String(s[k]));
  else for(const k of ['yearBranch','lunarMonth','lunarDay','hourBranch'])p.set(k,String(s[k]));
 }
 if(d==='luc-hao'){
  p.set('lines',s.lines.join(','));p.set('mode',s.mode);
  for(const k of ['date','dayStem','dayBranch','monthBranch'])if(typeof s[k]==='string'&&s[k])p.set(k,s[k]);
 }
 if(d==='ky-mon'){
  p.set('mode',s.mode);p.set('withHour',s.withHour?'1':'0');
  for(const k of (s.mode==='auto'?['date','hour','minute','dayBoundary']:['solarTermIndex','dayCycleIndex','hourBranchIndex']))p.set(k,String(s[k]));
  if(s.mode==='auto'&&Object.hasOwn(s,'lateZiAcknowledged'))p.set('lateZiAcknowledged',s.lateZiAcknowledged?'1':'0');
 }
 if(d==='phong-thuy')p.set('degrees',String(s.degrees));
 if(d==='ha-lac'){p.set('pillars',s.pillars.join('|'));if(s.profile){p.set('gender',s.profile.gender);if(s.profile.period){p.set('period',s.profile.period);p.set('periodReferenceId',s.profile.periodReferenceId);p.set('periodReferenceDetail',s.profile.periodReferenceDetail);}}if(s.hexagram){for(const k of ['kingWen','yuanTangLine','referenceId','referenceDetail'])p.set(k,String(s.hexagram[k]));}}
 if(d==='thiet-ban')for(const k of ['hour','minute','methodId','sourceId'])p.set(k,String(s[k]));
 if(d==='lich-phap')for(const k of ['date','hour','minute','dayBoundary','yearBoundary','confirmedLichunUtc','calendarSource'])if(s[k]!==undefined)p.set(k,String(s[k]));
 return `${mapping[d]}?${p.toString()}`;
}
function readStudyInput(d,query){
 const p=new URLSearchParams(query);
 if(p.get('restore')!=='1'||!Object.hasOwn(mapping,d)||d==='bazi')return null;
 const value=k=>p.get(k);
 const int=k=>value(k)!==null&&/^\d+$/.test(value(k))?Number(value(k)):NaN;
 let s={};
 if(d==='mai-hoa'){
  s={mode:value('mode')};
  if(s.mode==='numbers'){s.first=int('first');s.second=int('second');}
  else if(s.mode==='later-heaven')for(const k of ['objectTrigram','directionTrigram','hourBranch'])s[k]=int(k);
  else for(const k of ['yearBranch','lunarMonth','lunarDay','hourBranch'])s[k]=int(k);
 }
 if(d==='luc-hao'){
  const lineText=value('lines')||'';
  s={mode:value('mode'), lines:/^[6789](,[6789]){5}$/.test(lineText)?lineText.split(',').map(Number):[]};
  for(const k of ['date','dayStem','dayBranch','monthBranch'])if(value(k))s[k]=value(k);
 }
 if(d==='ky-mon'){
  if(!['0','1'].includes(value('withHour')))return null;
  s={mode:value('mode'), withHour:value('withHour')==='1'};
  if(p.has('lateZiAcknowledged')){
   if(!['0','1'].includes(value('lateZiAcknowledged')))return null;
   s.lateZiAcknowledged=value('lateZiAcknowledged')==='1';
  }
  for(const k of (s.mode==='auto'?['date','hour','minute','dayBoundary']:['solarTermIndex','dayCycleIndex','hourBranchIndex']))s[k]=k==='date'||k==='dayBoundary'?value(k):int(k);
 }
 if(d==='ha-lac'){const pillars=(value('pillars')||'').split('|');s={pillars};if(value('gender')){s.profile={gender:value('gender')};if(value('period')){s.profile.period=value('period');s.profile.periodReferenceId=value('periodReferenceId');s.profile.periodReferenceDetail=value('periodReferenceDetail');}}if(value('kingWen'))s.hexagram={kingWen:int('kingWen'),yuanTangLine:int('yuanTangLine'),referenceId:value('referenceId'),referenceDetail:value('referenceDetail')};}
 if(d==='thiet-ban')s={hour:int('hour'),minute:int('minute'),methodId:value('methodId'),sourceId:value('sourceId')};
 if(d==='lich-phap'){s={date:value('date'),hour:int('hour'),minute:int('minute'),dayBoundary:value('dayBoundary'),yearBoundary:value('yearBoundary')};if(value('confirmedLichunUtc')){s.confirmedLichunUtc=value('confirmedLichunUtc');s.calendarSource=value('calendarSource');}}
 if(d==='phong-thuy')s={degrees:value('degrees')!==null&&value('degrees')!==''?Number(value('degrees')):NaN};
 return validSnapshot(d,s)?s:null;
}
module.exports={studyHref,readStudyInput,validSnapshot};
