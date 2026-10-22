'use strict';
/** Thiết Bản: editorial source-to-slot ledger, NOT a formula for determining a birth moment or article. */
const {TIME_METHODS,sliceTime}=require('./tieban-source.cjs');
const RULESET='tieban-critical-ledger-v11.146';
const FORMAT='thien-do.tieban-critical-ledger';
const FORMAT_VERSION=1;
const MAX_SOURCES=30, MAX_WITNESSES=100, MAX_JSON_BYTES=1024*1024;
const BRANCHES=Object.freeze(['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi']);
const OWN=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
function shape(x,keys,name){
 if(!plain(x)||Object.keys(x).some(k=>!keys.includes(k)))throw new TypeError(`${name}: sai cấu trúc hoặc có trường không được hỗ trợ`);
}
function str(value,name,max=150){
 if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new RangeError(`${name}: chuỗi trống, quá dài hoặc ký tự điều khiển`);
 return value.trim();
}
function id(value,name){const v=str(value,name,64);if(!/^[A-Za-z][A-Za-z0-9._-]{2,63}$/.test(v))throw new RangeError(`${name}: chỉ dùng mã ASCII từ 3–64 ký tự`);return v;}
function url(value){const v=str(value,'URL nguồn',800);let u;try{u=new URL(v);}catch{throw new RangeError('URL nguồn không hợp lệ');}if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!u.hostname||u.hash)throw new RangeError('URL nguồn phải là http(s) công khai, không chứa tài khoản, mật khẩu hoặc fragment');return v;}
function validateSource(s){
 shape(s,['id','title','edition','sourceUrl','rights','lineageId','scanStatus'],'Nguồn');
 const out={id:id(s.id,'Mã nguồn'),title:str(s.title,'Tên tư liệu',240),edition:str(s.edition,'Ấn bản',180),sourceUrl:url(s.sourceUrl),rights:str(s.rights,'Tình trạng quyền sử dụng',180),lineageId:id(s.lineageId,'Mã dòng truyền bản'),scanStatus:s.scanStatus};
 if(!['unreviewed','catalogue-only','scan-inspected'].includes(out.scanStatus))throw new RangeError('Tình trạng ảnh nguồn không hợp lệ');
 return Object.freeze(out);
}
function validateWitness(w,sourceIndex,divisions){
 shape(w,['sourceId','articleNumber','page','part','transcription','reviewStatus'],'Chứng bản');
 const sourceId=id(w.sourceId,'Mã nguồn của chứng bản');
 if(!sourceIndex.has(sourceId))throw new RangeError(`Không có tư liệu ${sourceId} trong danh mục`);
 const articleNumber=str(w.articleNumber,'Số điều trên ấn bản',60);
 if(!/^[0-9A-Za-z._-]{1,60}$/.test(articleNumber))throw new RangeError('Số điều phải là mã tra cứu nguồn, không được suy diễn');
 if(!Number.isInteger(w.part)||w.part<1||w.part>divisions)throw new RangeError(`Phần giờ phải từ 1 đến ${divisions}`);
 const out={sourceId,articleNumber,page:str(w.page,'Trang/định vị',120),part:w.part,transcription:str(w.transcription,'Trích lục có phép sử dụng',2000),reviewStatus:w.reviewStatus};
 if(!['transcribed','scan-checked'].includes(w.reviewStatus))throw new RangeError('Trạng thái đối chứng văn bản không hợp lệ');
 if(w.reviewStatus==='scan-checked'&&sourceIndex.get(sourceId).scanStatus!=='scan-inspected')throw new RangeError('Không thể xác nhận trích lục qua ảnh nguồn khi tư liệu chưa được kiểm ảnh');
 return Object.freeze(out);
}
const pad=n=>String(n).padStart(2,'0');
const clock=m=>`${pad(Math.floor(((m%1440)+1440)%1440/60))}:${pad(((m%1440)+1440)%1440%60)}`;
function buildLedger(input){
 shape(input,['methodId','branchIndex','sources','witnesses'],'Sổ khảo chứng');
 if(!OWN(TIME_METHODS,input.methodId))throw new RangeError('Quy ước chia phần không hợp lệ');
 if(!Number.isInteger(input.branchIndex)||input.branchIndex<0||input.branchIndex>=12)throw new RangeError('Chi giờ phải thuộc 12 địa chi');
 if(!Array.isArray(input.sources)||input.sources.length>MAX_SOURCES||!Array.isArray(input.witnesses)||input.witnesses.length>MAX_WITNESSES)throw new RangeError(`Vượt giới hạn ${MAX_SOURCES} tư liệu / ${MAX_WITNESSES} chứng bản`);
 const sources=input.sources.map(validateSource), byId=new Map();
 for(const s of sources){if(byId.has(s.id))throw new RangeError(`Trùng mã nguồn ${s.id}`);byId.set(s.id,s);}
 const divisions=TIME_METHODS[input.methodId].divisions;
 const witnesses=input.witnesses.map(w=>validateWitness(w,byId,divisions));
 const distinct=new Set();
 for(const w of witnesses){const key=`${w.sourceId}\u0000${w.part}\u0000${w.articleNumber}\u0000${w.page}`;if(distinct.has(key))throw new RangeError('Chứng bản bị lặp: cùng tư liệu, phần giờ, điều và trang');distinct.add(key);}
 const interval=120/divisions;
 const rows=Array.from({length:divisions},(_,i)=>{
  const part=i+1, matched=witnesses.filter(w=>w.part===part), numbers=[...new Set(matched.map(w=>w.articleNumber))];
  const lineages=[...new Set(matched.map(w=>byId.get(w.sourceId).lineageId))];
  const sourcesInSlot=[...new Set(matched.map(w=>w.sourceId))];
  const textual=[...new Set(matched.map(w=>w.transcription.normalize('NFC').replace(/\s+/g,' ').trim()))];
  const scans=matched.filter(w=>w.reviewStatus==='scan-checked').length;
  const conflicts=Object.freeze([
   ...(numbers.length>1?['DIFFERENT_ARTICLE_NUMBERS']:[]),
   ...(matched.length>1&&textual.length>1?['DIFFERENT_TRANSCRIPTIONS']:[])
  ]);
  const status=!matched.length?'NO_EVIDENCE':conflicts.length?'COLLATION_REQUIRED':
    (lineages.length>1&&scans===matched.length?'MULTIPLE_LINEAGES_CONSISTENT':'SOURCE_LINKED_UNVERIFIED');
  const start=(input.branchIndex*120-60+i*interval+1440)%1440;
  return Object.freeze({part,range:`${clock(start)}–${clock(start+interval)}`,status,articleNumbers:Object.freeze(numbers),sourceIds:Object.freeze(sourcesInSlot),lineageCount:lineages.length,scanCheckedCount:scans,collationFlags:conflicts});
 });
 return Object.freeze({ruleSet:RULESET,status:'EDITORIAL_SOURCE_MAPPING_ONLY',methodId:input.methodId,branchIndex:input.branchIndex,branch:BRANCHES[input.branchIndex],sources:Object.freeze(sources),witnesses:Object.freeze(witnesses),rows:Object.freeze(rows),limits:Object.freeze({determinesBirthTime:false,derivesArticleNumber:false,validatesPrediction:false}),notes:Object.freeze(['Một mã điều có thể không tương ứng giữa các dị bản; số điều do người nghiên cứu chép từ nguồn, không do Thiên Đồ tính.','Cùng dòng truyền bản không được tính là các chứng cứ độc lập.','Tương hợp điều văn không chứng minh công thức định điều hay khả năng dự báo.'])});
}
function exportLedger(input){const l=buildLedger(input);return JSON.stringify({format:FORMAT,version:FORMAT_VERSION,methodId:l.methodId,branchIndex:l.branchIndex,sources:l.sources,witnesses:l.witnesses},null,2);}
function importLedger(value){
 if(typeof value!=='string'||new TextEncoder().encode(value).length>MAX_JSON_BYTES)throw new RangeError('Tệp nghiên cứu không phải JSON hoặc vượt 1 MB');
 let parsed;try{parsed=JSON.parse(value);}catch{throw new TypeError('JSON không hợp lệ');}
 shape(parsed,['format','version','methodId','branchIndex','sources','witnesses'],'Tệp nghiên cứu');
 if(parsed.format!==FORMAT||parsed.version!==FORMAT_VERSION)throw new RangeError('Sai định dạng hoặc phiên bản của sổ khảo chứng');
 const l=buildLedger({methodId:parsed.methodId,branchIndex:parsed.branchIndex,sources:parsed.sources,witnesses:parsed.witnesses});
 return {methodId:l.methodId,branchIndex:l.branchIndex,sources:l.sources.map(s=>({...s})),witnesses:l.witnesses.map(w=>({...w}))};
}
function observedSlot(input){return sliceTime(input).part;}
module.exports=Object.freeze({RULESET,FORMAT,FORMAT_VERSION,MAX_SOURCES,MAX_WITNESSES,BRANCHES,validateSource,buildLedger,exportLedger,importLedger,observedSlot});
