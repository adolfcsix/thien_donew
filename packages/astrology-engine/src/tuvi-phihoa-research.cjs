'use strict';
/**
 * THIEN DO V11.92 | Tử Vi Tứ Hóa / Phi Hóa research kernel.
 * No predictive statements, no inferred star locations, no overwrite of natal engine.
 * Source/provenance and unresolved cases: docs/research/schools/tu-vi-phi-tinh.md.
 */
const STEMS=Object.freeze(['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý']);
const TYPES=Object.freeze(['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ']);
const DEFAULT_PROFILE='toan-tap-common';
const COMMON=Object.freeze([
 ['Liêm Trinh','Phá Quân','Vũ Khúc','Thái Dương'],
 ['Thiên Cơ','Thiên Lương','Tử Vi','Thái Âm'],
 ['Thiên Đồng','Thiên Cơ','Văn Xương','Liêm Trinh'],
 ['Thái Âm','Thiên Đồng','Thiên Cơ','Cự Môn'],
 ['Tham Lang','Thái Âm','Hữu Bật','Thiên Cơ'],
 ['Vũ Khúc','Tham Lang','Thiên Lương','Văn Khúc'],
 ['Thái Dương','Vũ Khúc','Thái Âm','Thiên Đồng'],
 ['Cự Môn','Thái Dương','Văn Khúc','Văn Xương'],
 ['Thiên Lương','Tử Vi','Tả Phụ','Vũ Khúc'],
 ['Phá Quân','Cự Môn','Thái Âm','Tham Lang']
]);
function variant(changes){const rows=COMMON.map(row=>row.slice());for(const [stem,row] of Object.entries(changes))rows[Number(stem)]=row.slice();return rows;}
function freezeDeep(x){if(x&&typeof x==='object'){for(const v of Object.values(x))freezeDeep(v);Object.freeze(x);}return x;}
const PROFILES=freezeDeep({
 'toan-tap-common':{title:'Bảng thông dụng hệ Toàn Tập (bản đang dùng trong Thiên Đồ)',status:'baseline-compatible',rows:COMMON},
 'toan-thu-research':{title:'Dị bản Toàn Thư (cần xác minh nguyên bản)',status:'research-comparison',rows:variant({6:['Thái Dương','Vũ Khúc','Thiên Đồng','Thái Âm']})},
 'trung-chau-research':{title:'Dị bản Trung Châu theo bảng tổng hợp (cần xác minh nguyên bản)',status:'research-comparison',rows:variant({4:['Tham Lang','Thái Âm','Thái Dương','Thiên Cơ'],6:['Thái Dương','Vũ Khúc','Thiên Phủ','Thiên Đồng'],8:['Thiên Lương','Tử Vi','Thiên Phủ','Vũ Khúc']})}
});
function parseStem(stem){
 const value=typeof stem==='string'?STEMS.indexOf(stem):stem;
 if(!Number.isInteger(value)||value<0||value>=10)throw new RangeError('Thiên Can phải là chỉ số 0–9 hoặc tên Việt chuẩn');
 return value;
}
function profileById(profileId){
 if(typeof profileId!=='string'||!Object.hasOwn(PROFILES,profileId))throw new RangeError('Mã bảng Tứ Hóa chưa được đăng ký');
 return PROFILES[profileId];
}
function lookupFour(stem,profileId=DEFAULT_PROFILE){
 const n=parseStem(stem),profile=profileById(profileId);
 return Object.freeze(profile.rows[n].map((star,index)=>Object.freeze({type:TYPES[index],star,stem:STEMS[n],stemIndex:n,profileId,profileStatus:profile.status})));
}
function validatePalaces(palaces){
 if(!Array.isArray(palaces)||palaces.length!==12)throw new RangeError('Phải có đúng 12 cung thật');
 const byBranch=new Map();
 for(const p of palaces){
  if(!p||!Number.isInteger(p.branchIndex)||p.branchIndex<0||p.branchIndex>11||byBranch.has(p.branchIndex))throw new RangeError('Địa chi cung bị thiếu/trùng/sai');
  if(!Array.isArray(p.stars)||!Array.isArray(p.auxiliaryStars))throw new TypeError('Cần dữ liệu sao thực an (stars, auxiliaryStars)');
  for(const list of [p.stars,p.auxiliaryStars])if(list.some(s=>typeof s!=='string'||!s.trim()))throw new TypeError('Tên sao không hợp lệ');
  byBranch.set(p.branchIndex,p);
 }
 return byBranch;
}
function locateStar(byBranch,name){
 const branches=[];
 for(const p of byBranch.values())if(p.stars.includes(name)||p.auxiliaryStars.includes(name))branches.push(p.branchIndex);
 if(branches.length===0)return {status:'unresolved',reason:'STAR_NOT_LOCATED',targetBranchIndex:null};
 if(branches.length!==1)return {status:'unresolved',reason:'STAR_MULTIPLE_PALACES',targetBranchIndex:null};
 return {status:'located',reason:null,targetBranchIndex:branches[0]};
}
/** One flight layer must provide its own explicit stem. Palace flight reads the source palace stem. */
function buildFlights({palaces,scope,sourceBranchIndex=null,sourceStem=null,profileId=DEFAULT_PROFILE}={}){
 if(!['palace-stem','birth-year','annual-year'].includes(scope))throw new RangeError('Thiếu nhãn tầng Tứ Hóa');
 const byBranch=validatePalaces(palaces);
 let stem;
 if(scope==='palace-stem'){
  if(!Number.isInteger(sourceBranchIndex)||!byBranch.has(sourceBranchIndex))throw new RangeError('Thiếu cung phát Phi Hóa');
  stem=parseStem(byBranch.get(sourceBranchIndex).stem);
  if(sourceStem!==null&&parseStem(sourceStem)!==stem)throw new RangeError('Can cung được cung cấp mâu thuẫn dữ liệu lá số');
 }else{
  if(sourceBranchIndex!==null)throw new RangeError('Tứ Hóa năm không có cung xuất phát; không được giả lập cung can');
  stem=parseStem(sourceStem);
 }
 const flights=lookupFour(stem,profileId).map(item=>{
  const target=locateStar(byBranch,item.star);
  return Object.freeze({...item,scope,sourceBranchIndex,targetBranchIndex:target.targetBranchIndex,
   targetPalace:target.targetBranchIndex===null?null:byBranch.get(target.targetBranchIndex).palace??null,
   status:target.status,reason:target.reason,
   selfTransformation:target.status==='located'&&sourceBranchIndex!==null&&target.targetBranchIndex===sourceBranchIndex,
   oppositePalace:target.status==='located'&&sourceBranchIndex!==null&&(target.targetBranchIndex-sourceBranchIndex+12)%12===6
  });
 });
 return Object.freeze({ruleSet:'tuvi-phihoa-research-v11.92',scope,profileId,profileStatus:profileById(profileId).status,
  sourceStem:STEMS[stem],sourceStemIndex:stem,sourceBranchIndex,
  flights:Object.freeze(flights),complete:flights.every(x=>x.status==='located'),
  researchOnly:true, disclaimer:'Chỉ lập quan hệ cung và sao thực an; không tự luận đoán hoặc thay thế kết quả Tử Vi.'});
}
function compareProfiles(leftId,rightId){
 const left=profileById(leftId),right=profileById(rightId),changes=[];
 for(let i=0;i<10;i++)for(let j=0;j<4;j++)if(left.rows[i][j]!==right.rows[i][j])changes.push(Object.freeze({stem:STEMS[i],type:TYPES[j],left:left.rows[i][j],right:right.rows[i][j]}));
 return Object.freeze({leftId,rightId,changes:Object.freeze(changes),count:changes.length,researchOnly:true});
}
module.exports=Object.freeze({STEMS,TYPES,DEFAULT_PROFILE,PROFILES,parseStem,lookupFour,buildFlights,compareProfiles});
