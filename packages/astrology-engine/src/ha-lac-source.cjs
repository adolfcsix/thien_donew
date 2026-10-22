'use strict';
/** Hà Lạc Lý Số, source-specific arithmetic. No automatic Yuan Tang or fortune judgment. */
const CAL=require('./traditional-calendar-audit.cjs');
const METHOD='he-luo-number-candidate-study-v11.136';
const STEM_NUMBER=Object.freeze({'Giáp':6,'Ất':2,'Bính':8,'Đinh':7,'Mậu':1,'Kỷ':9,'Canh':3,'Tân':4,'Nhâm':6,'Quý':2});
const BRANCH_OPTIONS=Object.freeze({'Tý':[1,6],'Sửu':[5,10],'Dần':[3,8],'Mão':[3,8],'Thìn':[5,10],'Tỵ':[2,7],'Ngọ':[2,7],'Mùi':[5,10],'Thân':[4,9],'Dậu':[4,9],'Tuất':[5,10],'Hợi':[1,6]});
const SOURCE_ID='he-luo-number-transcription-yi958-and-scribd-research';
const SOURCE_URLS=Object.freeze(['https://m.yi958.com/zb/posts/981','https://www.scribd.com/document/723623535/河洛理数起盘']);
const LO_SHU=Object.freeze([[4,9,2],[3,5,7],[8,1,6]].map(x=>Object.freeze(x)));
const HE_TU=Object.freeze([{pair:[1,6],element:'Thủy',direction:'Bắc'},{pair:[2,7],element:'Hỏa',direction:'Nam'},{pair:[3,8],element:'Mộc',direction:'Đông'},{pair:[4,9],element:'Kim',direction:'Tây'},{pair:[5,10],element:'Thổ',direction:'Trung'}].map(x=>Object.freeze(x)));
const sum=(nums)=>nums.reduce((a,b)=>a+b,0);
const LO_CHECK=Object.freeze({rows:LO_SHU.map(sum),columns:[0,1,2].map(x=>sum(LO_SHU.map(r=>r[x]))),diagonals:[LO_SHU[0][0]+LO_SHU[1][1]+LO_SHU[2][2],LO_SHU[0][2]+LO_SHU[1][1]+LO_SHU[2][0]]});
function validatePillars(pillars){
 if(!Array.isArray(pillars)||pillars.length!==4)throw new RangeError('Phải nhập chính xác bốn trụ Can Chi');
 return pillars.map((p,i)=>{
  if(typeof p!=='string')throw new TypeError(`Trụ ${i+1} phải là chuỗi Can Chi`);
  const [stem,branch,...rest]=p.trim().split(/\s+/);if(rest.length||!(stem in STEM_NUMBER)||!(branch in BRANCH_OPTIONS))throw new RangeError(`Trụ ${i+1} không hợp lệ`);
  if(CAL.STEMS.indexOf(stem)%2!==CAL.BRANCHES.indexOf(branch)%2)throw new RangeError(`Trụ ${i+1} trái luật âm dương`);
  return Object.freeze({label:`${stem} ${branch}`,stem,branch});
 });
}
function calculate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Đầu vào hồ sơ không hợp lệ');
 for(const k of Object.keys(input))if(!['pillars','hexagram'].includes(k))throw new TypeError(`Trường hồ sơ không hỗ trợ: ${k}`);
 const pillars=validatePillars(input.pillars);
 const trace=[];const numbers=[];
 pillars.forEach((p,i)=>{
  const stemValue=STEM_NUMBER[p.stem],pair=BRANCH_OPTIONS[p.branch];
  numbers.push(stemValue,...pair);
  trace.push(Object.freeze({pillar:p.label,stemValue,branchNumbers:Object.freeze([...pair]),stemOdd:stemValue%2!==0}));
 });
 const heaven=sum(numbers.filter(n=>n%2!==0)),earth=sum(numbers.filter(n=>n%2===0));
 const result={status:'NUMERIC_EVIDENCE_ONLY',method:METHOD,researchOnly:true,pillars:Object.freeze(pillars),sourceId:SOURCE_ID,trace:Object.freeze(trace),heaven:Object.freeze({sum:heaven,contributions:Object.freeze(numbers.filter(n=>n%2!==0))}),earth:Object.freeze({sum:earth,contributions:Object.freeze(numbers.filter(n=>n%2===0))}),loShu:LO_SHU,heTu:HE_TU,
  hexagram:null,warnings:Object.freeze(['Không có quy ước chứng thực để tự xác định Nguyên Đường, Tiên Thiên / Hậu Thiên hay đại vận','Cặp số Chi được cộng cả hai theo bảng đối chiếu; không suy từ 4 trụ sang 64 quẻ bằng phép chia dư tự đặt','Đầu vào bốn trụ phải được xác minh theo lịch pháp và quy ước đổi ngày đã chọn'])};
 if(input.hexagram!==undefined&&input.hexagram!==null){
  const h=input.hexagram;
  if(!h||typeof h!=='object'||Array.isArray(h)||Object.keys(h).some(k=>!['kingWen','yuanTangLine','referenceId','referenceDetail'].includes(k)))throw new TypeError('Hồ sơ quẻ tham chiếu không hợp lệ');
  if(!Number.isInteger(h.kingWen)||h.kingWen<1||h.kingWen>64)throw new RangeError('Số quẻ Văn Vương phải 1–64');
  if(!Number.isInteger(h.yuanTangLine)||h.yuanTangLine<1||h.yuanTangLine>6)throw new RangeError('Nguyên Đường phải là hào 1–6');
  if(typeof h.referenceId!=='string'||h.referenceId.trim().length<4||h.referenceId.length>150||typeof h.referenceDetail!=='string'||h.referenceDetail.trim().length<8||h.referenceDetail.length>400)throw new TypeError('Thiếu số hiệu và vị trí trang/dòng tài liệu của quẻ');
  result.hexagram=Object.freeze({status:'SOURCE_ENTERED_NOT_DERIVED',kingWen:h.kingWen,yuanTangLine:h.yuanTangLine,sourceId:h.referenceId.trim(),referenceDetail:h.referenceDetail.trim()});
 }
 return Object.freeze(result);
}
module.exports=Object.freeze({METHOD,SOURCE_ID,SOURCE_URLS,STEM_NUMBER,BRANCH_OPTIONS,LO_SHU,HE_TU,LO_CHECK,validatePillars,calculate});
