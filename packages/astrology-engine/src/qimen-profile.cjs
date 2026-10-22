 'use strict';
const METHOD='qimen-nine-palace-evidence-v1',VERSION=1;
const STEMS=['Mậu','Kỷ','Canh','Tân','Nhâm','Quý','Đinh','Bính','Ất'];
const STARS=['Thiên Bồng','Thiên Nhuế','Thiên Xung','Thiên Phụ','Thiên Cầm','Thiên Tâm','Thiên Trụ','Thiên Nhậm','Thiên Anh'];
const DOORS=['Hưu','Sinh','Thương','Đỗ','Cảnh','Tử','Kinh','Khai'];
const DEITIES=['Trực Phù','Đằng Xà','Thái Âm','Lục Hợp','Bạch Hổ','Huyền Vũ','Cửu Địa','Cửu Thiên'];
const TOPICS=['career','finance','relationship','health','travel','study','other'];
const INDICATORS=[...DOORS.map(s=>'door:'+s),...STEMS.map(s=>'stem:'+s),...STARS.map(s=>'star:'+s),...DEITIES.map(s=>'deity:'+s)];
function choice(v,a,label){if(!a.includes(v))throw new RangeError(label+' không hợp lệ.');return v;}
function int(v,a,b,label){if(!Number.isInteger(v)||v<a||v>b)throw new RangeError(label+' ngoài phạm vi.');return v;}
function txt(v,max,label){if(typeof v!=='string'||v.length>max)throw new RangeError(label+' vượt giới hạn.');return v.trim();}
function exact(a,b,label){if(a.length!==b.length||new Set(a).size!==b.length||a.some(s=>!b.includes(s)))throw new RangeError(label+' phải đủ và không trùng.');}
function validateQimenProfile(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('Hồ sơ Kỳ Môn phải là đối tượng.');
 if(JSON.stringify(raw).length>2048)throw new RangeError('Hồ sơ Kỳ Môn vượt 2048 ký tự.');
 if(raw.method!==METHOD||raw.version!==1||raw.knowledge!=='11.131')throw new RangeError('Phiên bản Kỳ Môn chưa hỗ trợ; không tự nâng cấp phương pháp.');
 const out={method:METHOD,version:1,knowledge:'11.131',solarTermIndex:int(raw.solarTermIndex,0,23,'Tiết khí'),dayCycleIndex:int(raw.dayCycleIndex,0,59,'Ngày'),hourBranchIndex:int(raw.hourBranchIndex,0,11,'Chi giờ'),center:choice(raw.center,['khon2','yin8-yang2'],'Ký Trung cung'),rules:choice(raw.rules,['yanyi','baojian'],'Nhập Mộ'),clockSource:txt(raw.clockSource,100,'Nguồn lịch'),question:txt(raw.question,120,'Câu hỏi'),rationale:txt(raw.rationale,100,'Lý do'),topic:choice(raw.topic,TOPICS,'Bối cảnh'),indicator:raw.indicator===null?null:choice(raw.indicator,INDICATORS,'Mốc'),referencePalace:raw.referencePalace===null?null:int(raw.referencePalace,1,9,'Cung đối chiếu'),readBoard:choice(raw.readBoard,['auto','reference'],'Bàn đọc'),reference:null};
 if(!out.clockSource)throw new RangeError('Cần ghi nguồn Tiết khí và Can Chi thủ công.');
 if(out.indicator&&(!out.question||!out.rationale))throw new RangeError('Cần câu hỏi và lý do chọn mốc.');
 if(raw.reference!==null){const q=raw.reference;if(!q||typeof q!=='object'||Array.isArray(q))throw new TypeError('Bàn tham chiếu không hợp lệ.');
  for(const k of ['solarTermIndex','dayCycleIndex','hourBranchIndex'])if(q[k]!==out[k])throw new RangeError('Bàn tham chiếu phải cùng mốc Tiết khí, ngày và giờ.');
  if(!Array.isArray(q.rows)||q.rows.length!==9)throw new RangeError('Bàn tham chiếu cần chín cung.');
  const layout=choice(q.layout,['rotating-reference','flying-reference'],'Bố cục tham chiếu'),rows=q.rows.map(row=>{if(!Array.isArray(row)||row.length!==6||!Array.isArray(row[2])||!Array.isArray(row[3])||row[2].length>2||row[3].length>2)throw new RangeError('Mỗi hàng cần [cung, địa can, thiên can[], sao[], môn, thần].');return [int(row[0],1,9,'Cung'),choice(row[1],STEMS,'Địa can'),row[2].map(v=>choice(v,STEMS,'Thiên can')),row[3].map(v=>choice(v,STARS,'Sao')),row[4]===null?null:choice(row[4],DOORS,'Môn'),row[5]===null?null:choice(row[5],DEITIES,'Thần')];});
  exact(rows.map(v=>v[0]),[1,2,3,4,5,6,7,8,9],'Chín cung');exact(rows.map(v=>v[1]),STEMS,'Địa bàn');exact(rows.flatMap(v=>v[3]),STARS,'Cửu Tinh');exact(rows.map(v=>v[4]).filter(Boolean),DOORS,'Bát Môn');exact(rows.map(v=>v[5]).filter(Boolean),DEITIES,'Bát Thần');
  const sky=rows.flatMap(v=>v[2]);if(sky.length<8||sky.length>9||new Set(sky).size!==sky.length)throw new RangeError('Thiên bàn cần 8–9 can khác nhau; phần thiếu được ghi rõ.');
  if(layout==='rotating-reference'){const c=rows.find(v=>v[0]===5);if(c[2].length||c[3].length||c[4]||c[5])throw new RangeError('Chuyển Bàn tham chiếu giữ Trung cung chỉ có địa can.');if(rows.filter(v=>v[0]!==5).some(v=>v[2].length!==1||!v[3].length||!v[4]||!v[5]))throw new RangeError('Chuyển Bàn cần đủ tám ngoại cung.');}
  if(layout==='flying-reference'&&rows.some(v=>v[3].length!==1))throw new RangeError('Phi Bàn tham chiếu cần một sao mỗi cung.');
  const school=txt(q.school,60,'Trường phái'),source=txt(q.source,120,'Nguồn bàn');if(!school||!source)throw new RangeError('Cần trường phái và nguồn của bàn tham chiếu.');
  out.reference={layout,school,source,solarTermIndex:out.solarTermIndex,dayCycleIndex:out.dayCycleIndex,hourBranchIndex:out.hourBranchIndex,rows:rows.sort((a,b)=>a[0]-b[0])};
 }
 if(out.readBoard==='reference'&&!out.reference)throw new RangeError('Chưa có bàn tham chiếu để đọc.');return out;
}
function createQimenProfile(p={}){return validateQimenProfile({method:METHOD,version:1,knowledge:'11.131',solarTermIndex:0,dayCycleIndex:0,hourBranchIndex:0,center:'khon2',rules:'yanyi',clockSource:'Ví dụ thủ công: Đông Chí · Giáp Tý · giờ Tý',question:'',rationale:'',topic:'career',indicator:null,referencePalace:null,readBoard:'auto',reference:null,...p});}
module.exports={METHOD,VERSION,STEMS,STARS,DOORS,DEITIES,TOPICS,INDICATORS,validateQimenProfile,createQimenProfile};
