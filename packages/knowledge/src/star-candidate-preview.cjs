'use strict';
/** V11.143: READ-ONLY, source-scoped research candidates. Never import into tuvi/placement engine. */
const docket = require('./star-source-docket.json');
const comparison = require('./star-source-comparison.json');
const {stemStudy} = require('./star-stem-study.cjs');
const {compareYearLayers} = require('./star-source-review.cjs');
const vanTinh = require('./luu-nien-van-tinh-source-review.json');
const NAME_ORDER = Object.freeze(docket.records.filter(row => row.category === 'missing').map(row => row.name));
const TUONG_NAMES = Object.freeze(docket.records.filter(row => row.category === 'missing' && row.system === 'Tướng Tiền 12 thần').map(row => row.name));
const SOURCE = Object.freeze({tuong:'starlin-tuong',tue:'starlin-tue'});
const mod = (value,n) => ((value % n) + n) % n;
function int(value,min,max,key){
 if(!Number.isInteger(value) || value < min || value > max)throw new RangeError(key + ' không hợp lệ');
 return value;
}
function sourceCandidate(name, branch, methodId, sourceId, input, status='source-rule-compared') {
 if(!comparison.branches.includes(branch))throw new Error('Địa chi ngoài 12 cung cho ' + name);
 if(!docket.sources.some(source=>source.id===sourceId))throw new Error('Không có hồ sơ nguồn ' + sourceId);
 return {branch,methodId,sourceId,input,evidenceStatus:status};
}
function getStarCandidatePreview({birthCycleIndex,annualBranch,layer='birth'} = {}){
 int(birthCycleIndex,0,59,'Can Chi năm sinh');
 int(annualBranch,0,11,'Chi năm xem');
 if(layer!=='birth' && layer!=='annual')throw new RangeError('Lớp năm chỉ nhận birth/annual');
 const birthStem=mod(birthCycleIndex,10),birthBranch=mod(birthCycleIndex,12),selectedBranch=layer==='birth'?birthBranch:annualBranch;
 const stem=stemStudy(birthStem),circle=compareYearLayers(birthBranch,annualBranch,layer);
 const names=new Map();
 for(const name of TUONG_NAMES){
  const found=circle.tuong.find(row=>row.name===name);
  if(!found)throw new Error('Thiếu thần trong vòng Tướng Tiền: ' + name);
  names.set(name,[sourceCandidate(name,found.branch,'starlin-jiangqian-12-source-v11119',SOURCE.tuong,layer)]);
 }
 const quan=circle.tue.find(row=>row.name==='Quán Sách');
 if(!quan)throw new Error('Thiếu Quán Sách trong vòng Tuế Tiền');
 names.set('Quán Sách',[sourceCandidate('Quán Sách',quan.branch,'starlin-suiqian-12-source-v11119',SOURCE.tue,layer)]);
 names.set('Hồng Diễm',[sourceCandidate('Hồng Diễm',stem.hongDiem.branch,'ungkhiem-hongdiem-birthstem-table-v11122',stem.hongDiem.sourceId,'birth','author-table-not-independent')]);
 const van=stem.vanTinh.map(row=>sourceCandidate('Lưu Niên Văn Tinh',row.branch,'van-tinh-' + row.sourceId + '-v11119',row.sourceId,'birth','source-conflict-unresolved'));
 // Áo Bí transcription reports a different Giáp TABULAR reading from its own verse.
 if(birthStem===0)van.push(sourceCandidate('Lưu Niên Văn Tinh',vanTinh.transcriptionConflict.table,'van-tinh-ao-bi-transcription-table-disputed-v11119','ao-bi-transcription','birth','internal-text-conflict'));
 names.set('Lưu Niên Văn Tinh',van);
 const rows=NAME_ORDER.map(name=>{
  const record=docket.records.find(row=>row.name===name),candidates=names.get(name);
  if(!record||!candidates?.length||record.category!=='missing')throw new Error('Thiếu hồ sơ ứng viên cho ' + name);
  const uniqueBranches=new Set(candidates.map(c=>c.branch));
  return {name,system:record.system,hanzi:record.hanzi||null,status:record.state,
   input:record.system==='Tướng Tiền 12 thần'||name==='Quán Sách'?layer:'birth',
   candidates,disagreement:uniqueBranches.size>1,automaticPlacement:false,
   gate:{independentChartFixture:record.gates.independentChartFixture,schoolReview:record.gates.schoolReview},
   note:record.risk};
 });
 return {schemaVersion:1,release:'11.143.0',scope:'research-only-not-chart-placement',automaticPlacement:false,automaticAlias:false,
  birthCycleIndex,birthYear:{stem:comparison.stems[birthStem],branch:comparison.branches[birthBranch]},
  annualBranch:comparison.branches[annualBranch],selectedLayer:layer,selectedBranch:comparison.branches[selectedBranch],
  rows,blockedIntegration:true,
  notice:'Vị trí xem thử theo nguồn; không tự an vào lá số, không gộp dị danh và không thay kết quả nguyên bàn.'};
}
function auditCandidates(){
 const errors=[];
 if(NAME_ORDER.length!==11||TUONG_NAMES.length!==8||new Set(NAME_ORDER).size!==11)errors.push('Sai số lượng 11 tên/8 Tướng Tiền');
 for(let k=0;k<60;k++)for(let a=0;a<12;a++)for(const layer of ['birth','annual']){
  let preview;
  try{preview=getStarCandidatePreview({birthCycleIndex:k,annualBranch:a,layer});}catch(e){errors.push('Input '+k+'/'+a+'/'+layer+': '+e.message);continue;}
  if(preview.rows.length!==11||preview.rows.some(r=>r.automaticPlacement!==false||r.gate.independentChartFixture||r.gate.schoolReview))errors.push('Tự cấp quyền cho input '+k+'/'+a+'/'+layer);
  if(preview.rows.some(r=>!r.candidates.every(c=>comparison.branches.includes(c.branch))))errors.push('Sao ngoài cung '+k+'/'+a+'/'+layer);
  if(preview.rows.find(r=>r.name==='Hồng Diễm').input!=='birth'||preview.rows.find(r=>r.name==='Lưu Niên Văn Tinh').input!=='birth')errors.push('Lẫn lớp can năm sinh '+k+'/'+a+'/'+layer);
 }
 return {errors,inputs:60*12*2,names:NAME_ORDER.length,tuongNames:TUONG_NAMES.length,unresolved:NAME_ORDER.length,automaticPlacement:false};
}
module.exports=Object.freeze({getStarCandidatePreview,auditCandidates,NAME_ORDER,TUONG_NAMES});
