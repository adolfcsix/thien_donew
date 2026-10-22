/** V11.129 · shared strict INPUT contract. No web/runtime dependency. */
'use strict';
const METHOD='mai-hoa-evidence-v1', VERSION=1;
const MODES=Object.freeze(['time','numbers','later-heaven','count-hour','sound-hour']);
const FIELDS=Object.freeze({time:['yearBranch','lunarMonth','lunarDay','hourBranch'],numbers:['first','second'],'later-heaven':['objectTrigram','directionTrigram','hourBranch'],'count-hour':['count','hourBranch'],'sound-hour':['first','second','hourBranch']});
function integer(x,min,max,label){if(!Number.isInteger(x)||x<min||x>max)throw new RangeError(`${label}: cần số nguyên ${min}–${max}.`);return x;}
function choice(x,values,label){if(!values.includes(x))throw new RangeError(`${label} không được hỗ trợ.`);return x;}
function text(x,max,label){if(typeof x!=='string'||x.length>max)throw new RangeError(`${label} tối đa ${max} ký tự.`);return x.trim();}
function validateMaiHoaProfile(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('Đầu vào Mai Hoa phải là đối tượng.');
 if(JSON.stringify(raw).length>2048)throw new RangeError('Hồ sơ Mai Hoa vượt 2048 ký tự.');
 if(raw.method!==METHOD||raw.version!==VERSION||raw.knowledge!=='11.129')throw new RangeError('Phiên bản Mai Hoa chưa hỗ trợ; không tự nâng cấp phương pháp.');
 const s={method:METHOD,version:VERSION,knowledge:'11.129',mode:choice(raw.mode,MODES,'Khởi quẻ')};
 for(const k of FIELDS[s.mode])s[k]=integer(raw[k],1,k==='lunarMonth'||k.includes('Branch')?12:k==='lunarDay'?30:k.includes('Trigram')?8:1000000,k);
 s.nuclearPolicy=choice(raw.nuclearPolicy,['original','pure-transformed'],'Phép hỗ');
 s.seasonBranch=raw.seasonBranch===null?null:integer(raw.seasonBranch,1,12,'Chi thời lệnh');
 s.timingUnit=choice(raw.timingUnit,['unresolved','day','month','year'],'Đơn vị thời ứng');
 s.pace=choice(raw.pace,['unresolved','slow','medium','fast'],'Nhịp bối cảnh');
 s.question=text(raw.question,160,'Câu hỏi');
 if(!Array.isArray(raw.evidence)||raw.evidence.length>5)throw new RangeError('Tối đa 5 chứng cứ.');
 s.evidence=raw.evidence.map(e=>{if(!e||typeof e!=='object'||Array.isArray(e))throw new TypeError('Chứng cứ không hợp lệ.');return {kind:choice(e.kind,['observation','assumption','counter'],'Loại chứng cứ'),statement:text(e.statement,120,'Nội dung chứng cứ')};});
 return s;
}
function createMaiHoaProfile(input){return validateMaiHoaProfile({method:METHOD,version:VERSION,knowledge:'11.129',nuclearPolicy:'original',seasonBranch:null,timingUnit:'unresolved',pace:'unresolved',question:'',evidence:[],...input});}
module.exports={METHOD,VERSION,MODES,FIELDS,validateMaiHoaProfile,createMaiHoaProfile};
