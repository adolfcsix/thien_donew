 'use strict';
/**
 * V11.144: 涉害 counting according to 袁树珊《大六壬探原》推演篇.
 * Source: https://shuyuan.zhiming.life/read/大六壬探原(推演篇)-上/0 and /1.
 * Distinct from the simplified 孟仲 shortcut: evaluate every earth palace and
 * each of the ten stem lodgings it contains; stop at the upper god's home.
 * This is research reconstruction, not a claim of divination validity.
 */
const {BRANCHES}=require('./da-liu-ren-plates.cjs');
const {STEM_LODGING,STEM_ELEMENTS,BRANCH_ELEMENTS,CONTROLS}=require('./da-liu-ren-four-lessons.cjs');
const MENG=Object.freeze(['Dần','Thân','Tỵ','Hợi']);
const ZHONG=Object.freeze(['Tý','Ngọ','Mão','Dậu']);
const STEMS_AT=Object.freeze(Object.fromEntries(BRANCHES.map(branch=>[branch,Object.freeze(Object.keys(STEM_LODGING).filter(s=>STEM_LODGING[s]===branch))])));
const at=(plate,earth)=>plate.positions[BRANCHES.indexOf(earth)].heaven;
const earthOf=(plate,heaven)=>plate.positions.find(p=>p.heaven===heaven)?.earth;
const freeze=obj=>Object.freeze(obj);
function countSheHai(plate,lesson){
 if(!lesson||!BRANCHES.includes(lesson.upper)||!['lower-attacks-upper','upper-controls-lower'].includes(lesson.relation))throw new RangeError('A competing direct-control lesson is required');
 const from=earthOf(plate,lesson.upper),to=lesson.upper;
 if(!from)throw new RangeError('Incomplete twelve-branch plate');
 const countDirection=lesson.relation==='lower-attacks-upper'?'earth-controls-upper':'upper-controls-earth';
 const hits=[];const passage=[];
 const compare=element=>countDirection==='earth-controls-upper'?CONTROLS[element]===lesson.upperElement:CONTROLS[lesson.upperElement]===element;
 for(let i=0;i<12;i++){
  const earth=BRANCHES[(BRANCHES.indexOf(from)+i)%12];
  const local=[];
  if(compare(BRANCH_ELEMENTS[earth]))local.push(freeze({kind:'earth-branch',value:earth,element:BRANCH_ELEMENTS[earth]}));
  for(const stem of STEMS_AT[earth])if(compare(STEM_ELEMENTS[stem]))local.push(freeze({kind:'lodged-stem',value:stem,element:STEM_ELEMENTS[stem],lodging:earth}));
  hits.push(...local);
  passage.push(freeze({earth,hits:freeze(local)}));
  if(earth===to)return freeze({lesson:lesson.number,upper:lesson.upper,lower:lesson.lower,relation:lesson.relation,startEarth:from,homeEarth:to,direction:countDirection,count:hits.length,passage:freeze(passage),hits:freeze(hits),locationClass:MENG.includes(from)?'meng':ZHONG.includes(from)?'zhong':'ji'});
 }
 throw new RangeError('The traversal did not reach the home branch in twelve steps');
}
function resolveSheHai({plate,candidates,dayStem}){
 if(!Array.isArray(candidates)||candidates.length<2||!dayStem)throw new RangeError('At least two unique candidates and the day stem are required');
 const scored=freeze(candidates.map(lesson=>countSheHai(plate,lesson)));
 const highest=Math.max(...scored.map(c=>c.count));
 const finalists=scored.filter(c=>c.count===highest);
 let stage='depth',survivors=finalists;
 if(survivors.length>1){
  const meng=survivors.filter(x=>x.locationClass==='meng');
  const zhong=survivors.filter(x=>x.locationClass==='zhong');
  if(meng.length){stage='jian-ji';survivors=meng;}
  else if(zhong.length){stage='cha-wei';survivors=zhong;}
  else{stage='zhuixia-candidates';}
 }
 // 同孟复等: 阳日取干两课先见者; 阴日取支两课先见者.
 // Only decide if precisely ONE candidate in the designated lessons remains.
 if(survivors.length>1){
  const {STEMS}=require('./da-liu-ren-four-lessons.cjs');
  const yang=STEMS.indexOf(dayStem)%2===0;
  const selected=survivors.filter(x=>yang?x.lesson<=2:x.lesson>=3);
  if(selected.length===1){stage='zhui-xia';survivors=selected;}
  else{stage='unresolved-tie';}
 }
 const winner=survivors.length===1?survivors[0]:null;
 return freeze({status:winner?'resolved':'unresolved',stage,highestDepth:highest,scored,finalists:freeze(survivors),selectedLesson:winner?.lesson??null,selectedUpper:winner?.upper??null,trace:freeze([
  'Ưu tiên nhóm Hạ tặc Thượng; chỉ khi không có mới dùng Thượng khắc Hạ.',
  'Từ vị trí địa bàn đang chở Thượng thần đi thuận từng cung tới bản vị địa chi của chính Thượng thần (tính hai đầu).',
  'Mỗi cung đếm cả địa chi và thiên can ký cung; phân biệt Hạ tặc Thượng / Thượng khắc Hạ khi xác định chiều tương khắc.',
  ...scored.map(x=>`Khóa ${x.lesson}, ${x.upper} gia ${x.startEarth}: ${x.count} lần khắc · ${x.passage.map(p=>p.earth+(p.hits.length?'('+p.hits.map(h=>h.value).join(',')+')':'')).join(' → ')}`),
  `Điểm tối đa ${highest}; bước phân xử ${stage}${winner?`; chọn khóa ${winner.lesson} ${winner.upper}`:'; chưa chốt duy nhất'}.`,
 ])});
}
module.exports=freeze({MENG,ZHONG,STEMS_AT,countSheHai,resolveSheHai});
