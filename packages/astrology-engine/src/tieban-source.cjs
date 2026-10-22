'use strict';
/** Thiết Bản: evidence & transcription registry; never synthesize 12,000 traditional verses. */
const METHOD='tie-ban-source-text-and-time-slices-v11.136';
const TIME_METHODS=Object.freeze({
 'eight-parts':Object.freeze({id:'eight-parts',label:'Tám phần thời thần (15 phút / phần)',divisions:8,methodStatus:'RESEARCH_CONVENTION'}),
 'twelve-parts':Object.freeze({id:'twelve-parts',label:'Mười hai phần thời thần (10 phút / phần)',divisions:12,methodStatus:'ALTERNATIVE_RESEARCH_CONVENTION'})
});
const pad=(n)=>String(n).padStart(2,'0');
function sliceTime(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Đầu vào giờ cần là đối tượng');
 const {hour,minute=0,methodId='eight-parts',sourceId}=input;
 if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw new RangeError('Giờ/phút ngoài 0–23, 0–59');
 if(typeof methodId!=='string'||!Object.prototype.hasOwnProperty.call(TIME_METHODS,methodId))throw new RangeError('Phương pháp phân phần chưa được định danh');
 const method=TIME_METHODS[methodId];
 const src=typeof sourceId==='string'?sourceId.trim():'';if(src.length<4||src.length>150)throw new RangeError('Chỉ rõ phiên bản tài liệu của phép phân phần');
 const minuteOfDay=hour*60+minute;
 const branchIndex=Math.floor(((minuteOfDay+60)%1440)/120); // Tý 23:00—00:59, Sửu 01:00—02:59
 const offset=(minuteOfDay+60)%120;
 const minutesPerPart=120/method.divisions;
 const partIndex=Math.floor(offset/minutesPerPart);
 const startMinute=(branchIndex*120-60+1440+partIndex*minutesPerPart)%1440;
 const endMinute=(startMinute+minutesPerPart)%1440;
 const clock=n=>`${pad(Math.floor(n/60))}:${pad(n%60)}`;
 return Object.freeze({ruleSet:METHOD,methodId,methodStatus:method.methodStatus,sourceId:src,hour,minute,branchIndex,branch:['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'][branchIndex],part:partIndex+1,partCount:method.divisions,startLocal:clock(startMinute),endLocal:clock(endMinute),status:'TIME_SEGMENT_ONLY',noTextLookup:true,limitation:'Không biến chỉ số phần giờ thành số điều Thiết Bản khi chưa có bảng đối chiếu đúng dị bản.'});
}
function validateCorpusEntry(entry){
 if(!entry||typeof entry!=='object'||Array.isArray(entry))throw new TypeError('Tư liệu phải là đối tượng');
 const keys=['corpusId','edition','sourceUrl','page','section','articleNumber','transcription','license','verification','notes'];
 for(const k of Object.keys(entry))if(!keys.includes(k))throw new TypeError(`Trường điều văn không hợp lệ: ${k}`);
 for(const k of ['corpusId','edition','sourceUrl','page','articleNumber','transcription','license'])if(typeof entry[k]!=='string'||entry[k].trim().length<2||entry[k].length>3000)throw new RangeError(`Thiếu/chưa rõ: ${k}`);
 // An URL prefix alone is insufficient: malformed hosts and embedded credentials
 // must not be persisted as a research reference.
 if(entry.sourceUrl.length>1000)throw new RangeError('Nguồn phải có URL http(s) hợp lệ');
 let sourceUrl;
 try{sourceUrl=new URL(entry.sourceUrl);}catch{throw new RangeError('Nguồn phải có URL http(s) hợp lệ');}
 if(!['http:','https:'].includes(sourceUrl.protocol)||!sourceUrl.hostname||sourceUrl.username||sourceUrl.password)
  throw new RangeError('Nguồn phải có URL http(s) hợp lệ, không chứa tài khoản/mật khẩu');
 if(!/^[0-9]{1,6}[A-Za-z-]*$/.test(entry.articleNumber))throw new RangeError('Số điều phải là mã tra nguồn, không được tự suy');
 if(!['unchecked','two-witnesses','source-scan-checked'].includes(entry.verification))throw new RangeError('Phải khai báo mức đối chứng (chưa kiểm / hai chứng bản / ảnh nguồn)');
 const extra=['section','notes'].reduce((x,k)=>({...x,[k]:typeof entry[k]==='string'?entry[k].slice(0,800):''}),{});
 return Object.freeze({...Object.fromEntries(keys.filter(k=>!['section','notes','verification'].includes(k)).map(k=>[k,entry[k].trim()])),...extra,verification:entry.verification});
}
function compareEntries(entries){
 if(!Array.isArray(entries)||entries.length>100)throw new RangeError('Tối đa 100 trích lục/lượt');
 const rows=entries.map(validateCorpusEntry);
 const group=new Map();for(const row of rows){const key=`${row.corpusId}#${row.articleNumber}`;group.set(key,[...(group.get(key)||[]),row]);}
 // Compare canonical text, but leave each source transcription unchanged for collation.
 const canonicalText=(value)=>value.normalize('NFC').replace(/\s+/gu,' ').trim();
 return Object.freeze({ruleSet:METHOD,status:'DOCUMENT_COMPARISON_NOT_DIVINATION',entries:Object.freeze(rows),variants:Object.freeze([...group].map(([key,items])=>{
  const variants=new Set(items.map(x=>canonicalText(x.transcription))).size;
  return Object.freeze({key,editions:Object.freeze(items.map(x=>x.edition)),textVariants:variants,requiresCollation:variants>1});
 })),warnings:Object.freeze(['Không có thư khố điều văn được kiểm chứng/bản quyền cấp sẵn','Các phép định điều khác truyền bản phải có bảng/nguồn và fixture riêng','Dữ liệu người dùng nhập chỉ là ghi chép nghiên cứu, không chứng minh tính dự báo của Thiết Bản.'])});
}
module.exports=Object.freeze({METHOD,TIME_METHODS,sliceTime,validateCorpusEntry,compareEntries});
