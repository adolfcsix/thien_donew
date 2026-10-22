'use strict';
/**
 * V11.132 | 大六壬 | explicit, separate 九宗門 research profile.
 * Original v11.90 partial engine stays byte-for-byte unchanged.
 * Branches not backed by unambiguous rule evidence return unresolved instead of guesses.
 * Method: Yuan Shushan, 大六壬探原, 推演篇 (see docs/research/schools/dai-luc-nham-v11132.md).
 */
const {BRANCHES}=require('./da-liu-ren-plates.cjs');
const {buildFourLessons,STEMS,STEM_LODGING,STEM_ELEMENTS,BRANCH_ELEMENTS,CONTROLS}=require('./da-liu-ren-four-lessons.cjs');
const RULESET='da-liu-ren-nine-gates-yuanshushan-research-v1';
const GENERALS=Object.freeze(['Quý Nhân','Đằng Xà','Chu Tước','Lục Hợp','Câu Trần','Thanh Long','Thiên Không','Bạch Hổ','Thái Thường','Huyền Vũ','Thái Âm','Thiên Hậu']);
const GATE_NAMES=Object.freeze({'zei-ke':'Tặc Khắc','bi-yong':'Bỉ Dụng','she-hai':'Thiệp Hại','yao-ke':'Dao Khắc','mao-xing':'Mão Tinh','bie-ze':'Biệt Trách','ba-zhuan':'Bát Chuyên','fu-yin':'Phục Ngâm','fan-yin':'Phản Ngâm'});
const GUIREN=Object.freeze({
 'Giáp':['Sửu','Mùi'],'Ất':['Tý','Thân'],'Bính':['Hợi','Dậu'],'Đinh':['Hợi','Dậu'],
 'Mậu':['Sửu','Mùi'],'Kỷ':['Tý','Thân'],'Canh':['Sửu','Mùi'],'Tân':['Ngọ','Dần'],
 'Nhâm':['Tỵ','Mão'],'Quý':['Tỵ','Mão'],
});
// Deliberately explicit variants. Do not silently choose clock-time day/night.
const DAY_NIGHT=Object.freeze({manual:'Người dùng xác định trực tiếp (có nguồn)','hour-mao-shen':'Chi Mão–Thân là ban ngày; Dậu–Dần là ban đêm'});
const COMBINED_STEM=Object.freeze({'Giáp':'Kỷ','Kỷ':'Giáp','Ất':'Canh','Canh':'Ất','Bính':'Tân','Tân':'Bính','Đinh':'Nhâm','Nhâm':'Đinh','Mậu':'Quý','Quý':'Mậu'});
const PUNISH=Object.freeze({'Tý':'Mão','Mão':'Tý','Sửu':'Tuất','Tuất':'Mùi','Mùi':'Sửu','Dần':'Tỵ','Tỵ':'Thân','Thân':'Dần','Thìn':'Thìn','Ngọ':'Ngọ','Dậu':'Dậu','Hợi':'Hợi'});
const THREE_COMBINE_NEXT=Object.freeze({'Tý':'Thìn','Thìn':'Thân','Thân':'Tý','Dần':'Ngọ','Ngọ':'Tuất','Tuất':'Dần','Tỵ':'Dậu','Dậu':'Sửu','Sửu':'Tỵ','Hợi':'Mão','Mão':'Mùi','Mùi':'Hợi'});
const HORSE=Object.freeze({'Tý':'Dần','Thìn':'Dần','Thân':'Dần','Dần':'Thân','Ngọ':'Thân','Tuất':'Thân','Tỵ':'Hợi','Dậu':'Hợi','Sửu':'Hợi','Hợi':'Tỵ','Mão':'Tỵ','Mùi':'Tỵ'});
const bIndex=b=>BRANCHES.indexOf(b);
const at=(plate,earth)=>plate.positions[bIndex(earth)].heaven;
const inverse=(plate,heaven)=>plate.positions.find(p=>p.heaven===heaven).earth;
const opposite=b=>BRANCHES[(bIndex(b)+6)%12];
const turn=(b,n)=>BRANCHES[(bIndex(b)+n+120)%12];
const yang=s=>STEMS.indexOf(s)%2===0;
const cands=ls=>ls.map(l=>({lesson:l.number,upper:l.upper,lower:l.lower,relation:l.relation,yinYang:l.upperYinYang}));
const steps=(...parts)=>Object.freeze(parts.map((description,i)=>Object.freeze({order:i+1,description})));
const frozenSeq=seq=>Object.freeze(seq);
function makeGenerals({plate,dayStem,divinationHour,dayNight='manual',manualPeriod=null}){
 if(!Object.hasOwn(DAY_NIGHT,dayNight))throw new RangeError('Explicit day/night method required');
 // A stored/imported manual value must not silently disagree with the hour-based convention.
 if(dayNight==='hour-mao-shen'&&manualPeriod!==null&&manualPeriod!==undefined)
  throw new RangeError('Manual day/night value conflicts with hour-mao-shen method; use null');
 let period=manualPeriod;
 if(dayNight==='hour-mao-shen')period=bIndex(divinationHour)>=3&&bIndex(divinationHour)<=8?'day':'night';
 if(period!==null&&!['day','night'].includes(period))throw new RangeError('Period must be day, night, or null');
 if(!period)return Object.freeze({status:'missing-day-night',period:null,method:dayNight,positions:null,reason:'Chưa có lựa chọn ngày/đêm có căn cứ: không tự an Quý Nhân và Thập Nhị Thiên Tướng.'});
 const nobleHeaven=GUIREN[dayStem][period==='day'?0:1];
 const nobleEarth=inverse(plate,nobleHeaven);
 const direction=['Hợi','Tý','Sửu','Dần','Mão','Thìn'].includes(nobleEarth)?'thuận':'nghịch';
 const dir=direction==='thuận'?1:-1;
 const positions=Object.freeze(BRANCHES.map(earth=>{
  const delta=(bIndex(earth)-bIndex(nobleEarth)+12)%12;
  const general=GENERALS[((dir*delta)%12+12)%12];
  return Object.freeze({earth,heaven:at(plate,earth),general});
 }));
 return Object.freeze({status:'computed',method:dayNight,period,nobleHeaven,nobleEarth,direction,positions});
}
function buildDepth(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Input must be a profile object');
 const keys=Object.keys(input).sort();
 if(keys.join(',')!==['dayBranch','dayNight','dayStem','divinationHour','manualPeriod','monthGeneral'].sort().join(','))throw new TypeError('Supply exactly dayStem, dayBranch, monthGeneral, divinationHour, dayNight, manualPeriod');
 const {dayStem,dayBranch,monthGeneral,divinationHour,dayNight,manualPeriod}=input;
 const four=buildFourLessons({dayStem,dayBranch,monthGeneral,divinationHour});
 const generals=makeGenerals({plate:four.plate,dayStem,divinationHour,dayNight,manualPeriod});
 const {lessons,plate}=four;
 const resultBase={ruleSet:RULESET,methodId:'yuanshushan-nine-gates-partial',status:'research-only',fourLessons:four,generals,
  schools:Object.freeze({nineGates:'袁树珊《大六壬探原》推演篇',noble:'古传贵人口诀；昼夜区分单独确认'}),
  boundaries:Object.freeze(['Hệ quy tắc từng trường phái độc lập','Không tự suy Can Chi/nguyệt tướng từ ngày dương','Không suy kết quả bói đoán thực nghiệm'])};
 const explain=(gate,subtype,seq,trace,extra={})=>Object.freeze({...resultBase,verdict:'derived-subroutine-only',gate,gateName:GATE_NAMES[gate],subtype,
  transmissions:Object.freeze({initial:seq[0],middle:seq[1],final:seq[2],sequence:frozenSeq(seq)}),trace:steps(...trace),...extra});
 const unresolved=(gate,reason,candidates=[],trace=[])=>Object.freeze({...resultBase,verdict:'unresolved',gate,gateName:GATE_NAMES[gate]||'Chưa định',reason,
  transmissions:null,candidates:Object.freeze(cands(candidates)),trace:steps(...trace)});
 const follow=initial=>[initial,at(plate,initial),at(plate,at(plate,initial))];
 // Repeated identical 上神 may appear in several 課: they are ONE candidate for 九宗門.
 const uniqueUpper=ls=>[...new Map(ls.map(l=>[l.upper,l])).values()];
 const down=uniqueUpper(lessons.filter(l=>l.relation==='lower-attacks-upper'));
 const up=uniqueUpper(lessons.filter(l=>l.relation==='upper-controls-lower'));
 const group=down.length?down:up;
 const priority=down.length?'lower-attacks-upper':'upper-controls-lower';
 const chooseDirect=()=>{
  if(!group.length)return {status:'none'};
  if(group.length===1)return {status:'chosen',lesson:group[0],gate:'zei-ke',subtype:priority,trace:['Ưu tiên Hạ tặc Thượng; chỉ khi không có mới xét Thượng khắc Hạ','Chỉ một khóa ứng viên: lấy Thượng thần làm Sơ truyền']};
  const fit=group.filter(l=>l.upperYinYang===(yang(dayStem)?'yang':'yin'));
  if(fit.length===1)return {status:'chosen',lesson:fit[0],gate:'bi-yong',subtype:'yin-yang-unique',trace:['Nhiều khóa cùng nhóm khắc ưu tiên','Bỉ Dụng: chỉ một Thượng thần cùng âm/dương với nhật can']};
  return {status:'ambiguous',gate:'she-hai',candidates:fit.length?fit:group,reason:'Thiệp Hại còn khác biệt về đếm lộ trình và quy tắc đồng hạng; chưa tự định Sơ truyền',trace:['Nhiều khóa khắc cùng ưu tiên; Bỉ Dụng không phân xử duy nhất','Thiệp Hại cần đếm đường và đối chiếu trường phái/ngoại lệ']};
 };
 const direct=chooseDirect();
 const mapped=(found,variant)=>explain(found.gate,variant||found.subtype,follow(found.lesson.upper),found.trace,{selectedLesson:found.lesson.number,priority,candidates:Object.freeze(cands(group))});
 if(plate.pattern==='phuc-ngam'){
  // Unlike ordinary 相因, 伏吟 moves through 刑, then 冲 only when mandated.
  if(direct.status==='ambiguous')return unresolved('fu-yin',direct.reason,direct.candidates,direct.trace);
  const stemTop=lessons[0].upper,branchTop=lessons[2].upper;
  const first=direct.status==='chosen'?direct.lesson.upper:yang(dayStem)?stemTop:branchTop;
  let second=PUNISH[first],third;
  let subtype=direct.status==='chosen'?'bat-ngu':yang(dayStem)?'tu-nham':'tu-tin';
  if(second===first){subtype='do-truyen';second=yang(dayStem)?branchTop:stemTop;}
  third=PUNISH[second]===second?opposite(second):PUNISH[second];
  // Specific classical three Yin-stem Mao-day exception: 丁己辛卯, self-standing 伏吟.
  if(['Đinh','Kỷ','Tân'].includes(dayStem)&&dayBranch==='Mão'&&direct.status==='none')third=opposite(second);
  return explain('fu-yin',subtype,[first,second,third],['Phục Ngâm: Thiên bàn trùng Địa bàn','Lập Sơ truyền từ khóa khắc hoặc âm/dương nhật can','Lấy hình; tự hình thì đổi qua khóa đối và khi cần dùng xung']);
 }
 if(plate.pattern==='phan-ngam'){
  if(direct.status==='ambiguous')return unresolved('fan-yin',direct.reason,direct.candidates,direct.trace);
  if(direct.status==='chosen'){
   const first=direct.lesson.upper;
   return explain('fan-yin','vo-y',[first,opposite(first),first],['Phản Ngâm: Thiên bàn xung Địa bàn','Có khóa khắc: lấy Sơ theo Tặc Khắc/Bỉ Dụng','Trung lấy xung Sơ, Mạt lấy xung Trung'],{selectedLesson:direct.lesson.number});
  }
  const first=HORSE[dayBranch];const mid=at(plate,dayBranch),last=lessons[0].upper;
  if(!['Tân','Đinh','Kỷ'].includes(dayStem)||!['Sửu','Mùi'].includes(dayBranch))return unresolved('fan-yin','Không đủ hồ sơ ngoại lệ Phản Ngâm không khắc',[],['Phải đối chiếu từng ngày không khắc theo truyền bản']);
  return explain('fan-yin','vo-than',[first,['Đinh','Kỷ'].includes(dayStem)&&dayBranch==='Mùi'?last:mid,last],['Phản Ngâm không khắc: lấy Dịch Mã của nhật chi làm Sơ','Trung lấy Chi thượng thần, Mạt lấy Can thượng thần (bản thường)']);
 }
 if(direct.status==='ambiguous')return unresolved('she-hai',direct.reason,direct.candidates,direct.trace);
 if(direct.status==='chosen')return mapped(direct);
 const structurallyDistinct=new Set(lessons.map(l=>`${l.number===1?STEM_LODGING[dayStem]:l.lower}-${l.upper}`)).size;
 const twoLessons=STEM_LODGING[dayStem]===dayBranch;
 if(twoLessons){
  // 八專 uses two real lessons. In this family, a direct 克 would already have been taken.
  const base=yang(dayStem)?lessons[0].upper:lessons[3].upper;
  const first=turn(base,yang(dayStem)?2:-2);
  const t=[first,lessons[0].upper,lessons[0].upper];
  return explain('ba-zhuan',t.every(x=>x===t[0])?'doc-tuc':'bat-chuyen',t,['Nhật can ký cung trùng nhật chi: hai khóa thực','Không có khắc trực tiếp: dùng Bát Chuyên, không vào Dao Khắc',`Từ ${base} trên Thiên bàn đếm ${yang(dayStem)?'thuận':'nghịch'} ba vị (tính cả điểm xuất phát)`]);
 }
 // 遥克: upper gods in lessons 2,3,4, never first upper when compared with the same day stem.
 const remote=lessons.slice(1);
 const hit=remote.filter(l=>CONTROLS[l.upperElement]===STEM_ELEMENTS[dayStem]);
 const miss=remote.filter(l=>CONTROLS[STEM_ELEMENTS[dayStem]]===l.upperElement);
 const yaos=hit.length?hit:miss;
 if(yaos.length){
  const distinct=[...new Map(yaos.map(l=>[l.upper,l])).values()];
  const fit=distinct.filter(l=>l.upperYinYang===(yang(dayStem)?'yang':'yin'));
  const chosen=distinct.length===1?distinct[0]:fit.length===1?fit[0]:null;
  if(!chosen)return unresolved('yao-ke','Nhiều ứng viên Dao Khắc chưa được Bỉ Dụng phân xử duy nhất',distinct,['Không có tặc khắc trực tiếp','Ưu tiên Thượng thần khắc nhật can, sau đó nhật can khắc Thượng thần']);
  return explain('yao-ke',hit.length?'hao-thi':'dan-xa',follow(chosen.upper),['Bốn khóa không có khắc trực tiếp','Xét khóa 2–4: Thượng thần khắc nhật can trước, rồi nhật can khắc Thượng thần','Lấy Thượng thần ứng viên làm Sơ truyền'],{selectedLesson:chosen.number});
 }
 if(structurallyDistinct===3){
  const first=yang(dayStem)?at(plate,STEM_LODGING[COMBINED_STEM[dayStem]]):THREE_COMBINE_NEXT[dayBranch];
  return explain('bie-ze','biet-trach',[first,lessons[0].upper,lessons[0].upper],['Không có khắc trực tiếp hoặc Dao Khắc','Tứ Khóa thực chỉ có ba khóa: dùng Biệt Trách',yang(dayStem)?'Dương can: lấy Can hợp rồi tìm Thượng thần ký cung':'Âm can: lấy chi kế tiếp trong tam hợp (không gia thiên bàn)','Trung/Mạt đều lấy Can thượng thần']);
 }
 if(structurallyDistinct===4){
  const first=yang(dayStem)?at(plate,'Dậu'):inverse(plate,'Dậu');
  const mid=yang(dayStem)?lessons[2].upper:lessons[0].upper;
  const last=yang(dayStem)?lessons[0].upper:lessons[2].upper;
  return explain('mao-xing',yang(dayStem)?'ho-thi':'dong-xa',[first,mid,last],['Bốn khóa đủ; không trực khắc hoặc Dao Khắc','Dương nhật lấy Dậu địa bàn thượng thần; âm nhật lấy Dậu thiên bàn hạ thần','Trung/Mạt lấy Chi thượng rồi Can thượng (dương), đảo chiều (âm)']);
 }
 return unresolved('bie-ze','Trường hợp khóa không đúng hai/ba/bốn khóa cần đối chiếu riêng',[],['Không được tự suy từ phép dịch bàn']);
}
/** Only reproducible input is eligible for account storage/import. No report is trusted. */
function validateDaLiuRenSnapshot(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('Hồ sơ Đại Lục Nhâm phải là đối tượng');
 const permitted=['method','dayStem','dayBranch','monthGeneral','divinationHour','dayNight','manualPeriod','source'];
 if(Object.keys(raw).some(key=>!permitted.includes(key)))throw new TypeError('Hồ sơ có trường không được hỗ trợ');
 if(raw.method!==RULESET)throw new RangeError('Phương pháp Đại Lục Nhâm không khớp');
 const {dayStem,dayBranch,monthGeneral,divinationHour,dayNight,manualPeriod}=raw;
 const input={dayStem,dayBranch,monthGeneral,divinationHour,dayNight,manualPeriod};
 buildDepth(input);
 if(Object.hasOwn(raw,'source')&&(typeof raw.source!=='string'||raw.source.length>200))throw new RangeError('Nguồn lập khóa tối đa 200 ký tự');
 return Object.freeze({method:RULESET,...input,...(Object.hasOwn(raw,'source')?{source:raw.source.trim()}:{})});
}
module.exports=Object.freeze({RULESET,BRANCHES,STEMS,GENERALS,GATE_NAMES,GUIREN,DAY_NIGHT,makeGenerals,buildDepth,validateDaLiuRenSnapshot});
