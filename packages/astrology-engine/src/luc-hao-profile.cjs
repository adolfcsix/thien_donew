 'use strict';
const REGISTRY=require('../../knowledge/src/luc-hao-candidates-v11130.json');
const METHOD='luc-hao-jingfang-evidence-v1',VERSION=1,FAMILIES=Object.freeze(['Phụ Mẫu','Huynh Đệ','Tử Tôn','Thê Tài','Quan Quỷ']);
const STEMS=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'],BRANCHES=['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
function choice(v,values,label){if(!values.includes(v))throw new RangeError(`${label} không hợp lệ.`);return v;}
function text(v,max,label){if(typeof v!=='string'||v.length>max)throw new RangeError(`${label} tối đa ${max} ký tự.`);return v.trim();}
function validateLucHaoProfile(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('Hồ sơ Lục Hào phải là đối tượng.');
 if(JSON.stringify(raw).length>2048)throw new RangeError('Hồ sơ Lục Hào vượt 2048 ký tự.');
 if(raw.method!==METHOD||raw.version!==VERSION||raw.knowledge!=='11.130')throw new RangeError('Phiên bản Lục Hào chưa hỗ trợ; không tự nâng cấp phương pháp.');
 if(!Array.isArray(raw.lines)||raw.lines.length!==6||raw.lines.some(v=>![6,7,8,9].includes(v)))throw new RangeError('Cần sáu hào 6/7/8/9 từ dưới lên.');
 const out={method:METHOD,version:VERSION,knowledge:'11.130',lines:[...raw.lines],family:choice(raw.family,FAMILIES,'Lục Thân'),selection:null,question:text(raw.question,160,'Câu hỏi'),rationale:text(raw.rationale,160,'Lý do chọn Dụng'),calendar:null};
 if(raw.selection!==null){const s=raw.selection;if(!s||typeof s!=='object'||!Number.isInteger(s.position)||s.position<1||s.position>6)throw new RangeError('Vị trí Dụng thần phải từ 1–6.');out.selection={kind:choice(s.kind,['visible','hidden'],'Loại Dụng'),position:s.position};const candidate=REGISTRY.entries[out.lines.map(v=>v===7||v===9?'1':'0').join('')].families[out.family];if(candidate.kind!==out.selection.kind||!candidate.positions.includes(out.selection.position))throw new RangeError('Dụng đã chọn không thuộc ứng viên Lục Thân ở quẻ này; hãy chọn lại.');if(!out.rationale)throw new RangeError('Cần ghi lý do chọn Dụng thần.');}
 const c=raw.calendar;if(!c||typeof c!=='object'||Array.isArray(c))throw new TypeError('Nguồn Nhật–Nguyệt phải là đối tượng.');
 const mode=choice(c.mode,['none','manual','calendar'],'Nguồn Nhật–Nguyệt');
 if(mode==='none')out.calendar={mode};
 if(mode==='manual'){
  const dayStem=choice(c.dayStem,STEMS,'Nhật can'),dayBranch=choice(c.dayBranch,BRANCHES,'Nhật chi');
  if(STEMS.indexOf(dayStem)%2!==BRANCHES.indexOf(dayBranch)%2)throw new RangeError('Can Chi ngày trái luật âm dương.');
  if(c.confirmed!==true)throw new RangeError('Cần xác nhận nguồn Can Chi thủ công.');
  out.calendar={mode,dayStem,dayBranch,monthBranch:c.monthBranch===null?null:choice(c.monthBranch,BRANCHES,'Nguyệt kiến'),confirmed:true};
 }
 if(mode==='calendar'){
  const date=c.date;if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||+date.slice(0,4)<1900||+date.slice(0,4)>2100)throw new RangeError('Ngày phải hợp lệ trong 1900–2100.');
  out.calendar={mode,date};
 }
 return out;
}
function createLucHaoProfile(raw={}){return validateLucHaoProfile({method:METHOD,version:VERSION,knowledge:'11.130',lines:[7,7,7,9,7,7],family:'Phụ Mẫu',selection:null,question:'',rationale:'',calendar:{mode:'none'},...raw});}
module.exports={METHOD,VERSION,FAMILIES,validateLucHaoProfile,createLucHaoProfile};
