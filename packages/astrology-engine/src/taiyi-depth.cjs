'use strict';
/**
 * Thien Do V11.133: Taiyi Jinjing annual table research and isolated period counters.
 * Historical symbolic system, not an empirical prediction tool. Do not infer any
 * traditional calendrical boundary from a civil timestamp.
 * Basis: Wang Ximing, Taiyi Jinjing Shijing, vol. I and table of 72 yang/yin ju.
 * The table is separately transcribed evidence, not an alternate epoch algorithm.
 */
const annual = require('./taiyi-annual-research.cjs');
const data = require('../data/taiyi-jinjing-72.json');
const METHOD = 'taiyi-jinjing-annual-724';
const DEEP_VERSION = '11.133';
const RING = Object.freeze([1,2,3,4,6,7,8,9]);
const PALACE_LABELS = Object.freeze({1:'Càn · 乾',2:'Ly · 離',3:'Cấn · 艮',4:'Chấn · 震',5:'Trung cung · 中',6:'Đoài · 兌',7:'Khôn · 坤',8:'Khảm · 坎',9:'Tốn · 巽'});
const DISPLAY_GRID = Object.freeze([[9,2,7],[4,5,6],[3,8,1]]);
const SIXTEEN = Object.freeze(['武德','太蔟','阴主','阴德','大义','地主','阳德','和德','吕申','高丛','太阳','大炅','大神','大威','天道','大武']);
const CN_TO_VI = Object.freeze({'武德':'Vũ Đức','太蔟':'Thái Thốc','阴主':'Âm Chủ','阴德':'Âm Đức','大义':'Đại Nghĩa','地主':'Địa Chủ','阳德':'Dương Đức','和德':'Hòa Đức','吕申':'Lữ Thân','高丛':'Cao Tùng','太阳':'Thái Dương','大炅':'Đại Quýnh','大神':'Đại Thần','大威':'Đại Uy','天道':'Thiên Đạo','大武':'Đại Vũ'});
// Sixteen fixed directions from 《太乙金鏡式經》卷二「推十六神所主法」.
// Each exact direction maps to one of eight outer palaces. They must not be
// confused with a different school assigning one deity per nine-square cell.
const GOD_STATIONS = Object.freeze([
 ['子','地主',8],['丑','阳德',null],['艮','和德',3],['寅','吕申',null],
 ['卯','高丛',4],['辰','太阳',null],['巽','大炅',9],['巳','大神',null],
 ['午','大威',2],['未','天道',null],['坤','大武',7],['申','武德',null],
 ['酉','太蔟',6],['戌','阴主',null],['乾','阴德',1],['亥','大义',null]
].map(([direction,god,palace],i,all)=>Object.freeze({direction,god,vi:CN_TO_VI[god],palace,
  // A jian-shen is BETWEEN two principal palaces. Never claim it occupies one.
  between:palace===null?Object.freeze([all[(i+15)%16][2],all[(i+1)%16][2]]):null})));
const STATION_BY_GOD=Object.freeze(Object.fromEntries(GOD_STATIONS.map(({god,...rest})=>[god,Object.freeze(rest)])));
const SIDES = Object.freeze(['yang','yin']);
const UNITS = Object.freeze(['year','month','day','hour']);
function plain(x) {return x!==null && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;}
function requireShape(x,keys) {
 if(!plain(x))throw new TypeError('Dữ liệu phải là object thuần');
 if(Object.keys(x).some(k=>!keys.includes(k)))throw new TypeError('Tham số ngoài hợp đồng: '+Object.keys(x).filter(k=>!keys.includes(k)).join(','));
}
function requireSafeInt(n,min=1,max=1000000000){if(!Number.isSafeInteger(n)||n<min||n>max)throw new RangeError('Số chu kỳ phải là số nguyên an toàn trong miền được hỗ trợ');}
function oneBased(n,div){return ((n-1)%div+div)%div+1;}
function generalsFromCount(n){
 requireSafeInt(n,1,40);
 const big=n%10 || n%9 || 9; // exact-ten convention: divide by 9, use remainder
 const small=(big*3)%10 || 0; // 0 is an explicit deputy convention, not palace 5
 return Object.freeze({count:n,majorPalace:big,deputyNumber:small,zeroConvention:small===0?'deputy-zero-not-a-nine-palace':'normal',majorRule:n%10===0?'tens-mod-nine':'last-digit',detail:`${n} → đại tướng ${big} → tham tướng ${small}`});
}
/** Independent arithmetic from the 16 fixed positions and the Jinjing counting rule.
 * Start from its own principal palace number, or 1 from a jian-shen;
 * add intervening principal palaces clockwise, excluding Taiyi destination.
 * If a principal station is itself Taiyi palace, keep the palace number.
 */
function countFromGod(god,taiyiPalace){
 if(!Object.hasOwn(STATION_BY_GOD,god)||!RING.includes(taiyiPalace))throw new RangeError('Thần hoặc cung Thái Ất không hợp lệ');
 const index=GOD_STATIONS.findIndex(x=>x.god===god);
 const start=GOD_STATIONS[index];
 if(start.palace===taiyiPalace)return taiyiPalace;
 let total=start.palace??1;
 for(let shift=1;shift<=16;shift++){
  const station=GOD_STATIONS[(index+shift)%16];
  if(station.palace===taiyiPalace)return total;
  if(station.palace!==null)total+=station.palace;
 }
 throw new Error('Không kết thúc vòng tính tại cung Thái Ất');
}
/** Independent WenChang count: doubles at YinDe and DaWu in Yang; HeDe and DaJiong in Yin. */
function deriveWenchang(ju,side){
 requireSafeInt(ju,1,72);if(!SIDES.includes(side))throw new RangeError('Cục Âm/Dương không hợp lệ');
 let remaining=oneBased(ju,18),index=side==='yang'?11:3;
 const doubles=side==='yang'?new Set([10,14]):new Set([2,6]);
 for(let step=0;step<16;step++){
  remaining-=doubles.has(index)?2:1;
  if(remaining<=0)return GOD_STATIONS[index].god;
  index=(index+1)%16;
 }
 throw new Error('Sai vòng 18 của Thiên Mục');
}
function deriveJiShen(ju,side){
 requireSafeInt(ju,1,72);if(!SIDES.includes(side))throw new RangeError('Cục Âm/Dương không hợp lệ');
 const branches=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
 const base=side==='yang'?2:8;
 return branches[(base+12-(ju-1)%12)%12];
}
function deriveShiji(wenchang,jiShen){
 const w=GOD_STATIONS.findIndex(x=>x.god===wenchang),j=GOD_STATIONS.findIndex(x=>x.direction===jiShen);
 if(w===-1||j===-1)throw new RangeError('Không có Văn Xương/Kế Thần trong Thập Lục Thần');
 return GOD_STATIONS[(w+2+16-j)%16].god;
}
function auditRow(row,side){
 const derived=Object.freeze({tianmu:deriveWenchang(row.ju,side),jiShen:deriveJiShen(row.ju,side)});
 const expectedShiji=deriveShiji(derived.tianmu,derived.jiShen);
 const hostCount=countFromGod(row.tianmu,row.taiyiPalace),guestCount=countFromGod(row.dimu,row.taiyiPalace);
 const diffs=[];
 if(row.tianmu!==derived.tianmu)diffs.push(`Văn Xương: bảng ${row.tianmu} / suy từ số ${derived.tianmu}`);
 if(row.jiShen!==derived.jiShen)diffs.push(`Kế Thần: bảng ${row.jiShen} / suy từ số ${derived.jiShen}`);
 if(row.dimu!==expectedShiji)diffs.push(`Thủy Kích: bảng ${row.dimu} / suy từ số ${expectedShiji}`);
 if(row.hostCount!==hostCount)diffs.push(`Chủ toán: bảng ${row.hostCount} / tính từ 16 vị ${hostCount}`);
 if(row.guestCount!==guestCount)diffs.push(`Khách toán: bảng ${row.guestCount} / tính từ 16 vị ${guestCount}`);
 return Object.freeze({derived:Object.freeze({...derived,dimu:expectedShiji,hostCount,guestCount}),differences:Object.freeze(diffs),requiresSourceCollation:diffs.length>0});
}
function getTableRow(ju,side){
 requireSafeInt(ju,1,72);if(!SIDES.includes(side))throw new RangeError('Cục Âm/Dương không hợp lệ');
 const raw=data.sides[side][ju-1];
 if(!raw||raw.ju!==ju)throw new Error('Bảng lập thành không đủ cục số');
 return raw;
}
function makePalaces(row,side){
 const host=generalsFromCount(row.hostCount),guest=generalsFromCount(row.guestCount);
 const pos=RING.map(p=>({number:p,name:PALACE_LABELS[p],stations:GOD_STATIONS.filter(s=>s.palace===p),tianmuDirection:STATION_BY_GOD[row.tianmu].palace===p?STATION_BY_GOD[row.tianmu].direction:null,dimuDirection:STATION_BY_GOD[row.dimu].palace===p?STATION_BY_GOD[row.dimu].direction:null,isTaiyi:p===row.taiyiPalace,hostMajor:p===host.majorPalace,guestMajor:p===guest.majorPalace,hostDeputy:p===host.deputyNumber,guestDeputy:p===guest.deputyNumber}));
 return Object.freeze({layout:DISPLAY_GRID,center:{number:5,name:PALACE_LABELS[5],taiyiAllowed:false},houses:pos,relation:'Taiyi nine-square rotated classical palace numbering, not Qimen palace numbering',side});
}
/** Annual: the Yang and Yin 72-cell sources are intentionally separated. */
function calculateAnnual(input){
 requireShape(input,['unit','methodId','traditionalYear','calendarBoundaryResolved','side','calendarEvidence']);
 if(input.unit!==undefined&&input.unit!=='year')throw new RangeError('Đây là phép Tuế kế, không được chọn loại kỳ khác');
 if(input.methodId!==METHOD)throw new RangeError('Không tự ghép phương pháp trường phái khác');
 if(!SIDES.includes(input.side))throw new RangeError('Hãy chọn cục Âm hoặc Dương tường minh');
 if(input.calendarBoundaryResolved!==true){return Object.freeze({status:'boundary-unresolved',unit:'year',methodId:METHOD,result:null,reason:'Phải xác định năm truyền thống và ranh giới năm từ lịch pháp phù hợp trước khi lập cục.'});}
 if(typeof input.calendarEvidence!=='string'||input.calendarEvidence.trim().length<3||input.calendarEvidence.length>400)throw new RangeError('Bắt buộc mô tả nguồn xác định năm truyền thống (3–400 ký tự)');
 const foundation=annual.annualTaiyiResearch({methodId:METHOD,traditionalYear:input.traditionalYear,calendarBoundaryResolved:true});
 const n=foundation.result.yearIn72Cycle,row=getTableRow(n,input.side);
 const expected=input.side==='yang'?foundation.result.taiyiPalace:10-foundation.result.taiyiPalace;
 if(row.taiyiPalace!==expected)throw new Error('Bảng 72 cục không khớp nền tích niên');
 const host=generalsFromCount(row.hostCount),guest=generalsFromCount(row.guestCount),audit=auditRow(row,input.side);
 const result=Object.freeze({methodId:METHOD,unit:'year',side:input.side,year:foundation.result.traditionalYear,
  calendarEvidence:input.calendarEvidence.trim(),accumulatedYears:foundation.result.accumulatedYears,
  yearIn360Cycle:foundation.result.yearIn360Cycle,jiIndexOneBased:foundation.result.jiIndexOneBased,yearIn60Ji:foundation.result.yearIn60Ji,
  ju:n,taiyiPalace:row.taiyiPalace,taiyiPalaceName:PALACE_LABELS[row.taiyiPalace],
  tianmu:Object.freeze({cn:row.tianmu,vi:CN_TO_VI[row.tianmu],...STATION_BY_GOD[row.tianmu],role:'chủ mục / văn xương'}),
  dimu:Object.freeze({cn:row.dimu,vi:CN_TO_VI[row.dimu],...STATION_BY_GOD[row.dimu],role:'khách mục / thủy kích'}),
  jiShen:row.jiShen,host,guest,audit,plate:makePalaces(row,input.side),
  trace:Object.freeze([
   `Mốc tích niên 724: ${annual.ANCHOR.accumulatedYears}`,`Tích niên = ${annual.ANCHOR.accumulatedYears} + (${input.traditionalYear} − 724) = ${foundation.result.accumulatedYears}`,
   `Cục số = số dư 1–72 của ${foundation.result.accumulatedYears} = ${n}`,
   `Cục ${input.side==='yang'?'Dương':'Âm'}: Thái Ất tại cung ${row.taiyiPalace}, không nhập Trung 5`,
   `Tra bản lập thành quyển I: Thiên Mục ${row.tianmu}, Địa Mục ${row.dimu}, Kế Thần ${row.jiShen}`,
   `Chủ toán ${row.hostCount}; Khách toán ${row.guestCount}; các tướng tính từ số theo phép được chọn.`
  ])});
 return Object.freeze({status:'annual-table-research',version:DEEP_VERSION,unit:'year',methodId:METHOD,school:'jinjing',source:data.sourceURL,
  verification:audit.requiresSourceCollation?'collation-needed':'table-and-independent-count-concordant',result,
  limitations:Object.freeze(['Không tự phán đoán Âm/Dương theo ngày giờ hiện đại','Đã đối chiếu phép Chủ–Khách toán độc lập, nhưng vẫn cần khảo đính bản cổ từng ô và các dị bản','Chưa lập Tam Cơ, Ngũ Phúc, Tứ Thần, Đại/Tiểu Du','Chưa xác nhận ngày giờ lịch pháp với dữ liệu thiên văn','Không dùng để khẳng định dự báo'])});
}
/** Period counter research only. Classical Month and Day both use 24-period/3-residence scheme,
 * but accumulated ordinal must be supplied independently by a calendar expert.
 * Hour method is distinct and deliberately not guessed.
 */
function calculatePeriod(input){
 requireShape(input,['methodId','unit','accumulatedOrdinal','calendarBoundaryResolved','calendarEvidence','side']);
 if(input.methodId!==METHOD)throw new RangeError('Không hỗ trợ một phương pháp khác mà không chọn bộ quy tắc mới');
 if(!['month','day','hour'].includes(input.unit))throw new RangeError('Chế độ này chỉ nhận nguyệt/nhật/thời');
 if(!SIDES.includes(input.side))throw new RangeError('Hãy chọn rõ Âm/Dương cục');
 if(input.calendarBoundaryResolved!==true)return Object.freeze({status:'boundary-unresolved',unit:input.unit,result:null,reason:'Phải xác minh lịch pháp và kỳ nguyên'});
 if(typeof input.calendarEvidence!=='string'||input.calendarEvidence.trim().length<3||input.calendarEvidence.length>400)throw new RangeError('Phải ghi xuất xứ tích kỳ');
 if(input.unit==='hour')return Object.freeze({status:'method-unresolved',unit:'hour',result:null,reason:'Thời kế yêu cầu quy tắc riêng về Đông/Hạ chí, các giờ tiết khí và Âm/Dương độn; không thể lấy công thức năm hoặc nhật để thay.'});
 requireSafeInt(input.accumulatedOrdinal,1,999999999);
 const within24=oneBased(input.accumulatedOrdinal,24),pal=RING[Math.floor((within24-1)/3)];
 return Object.freeze({status:'palace-only-research',unit:input.unit,methodId:METHOD,school:'jinjing',side:input.side,
  result:Object.freeze({accumulatedOrdinal:input.accumulatedOrdinal,cycle360:oneBased(input.accumulatedOrdinal,360),cycle72:oneBased(input.accumulatedOrdinal,72),
   cycle24:within24,residence:oneBased(input.accumulatedOrdinal,3),taiyiPalace:input.side==='yang'?pal:10-pal,
   evidence:input.calendarEvidence.trim()}),
  limitations:Object.freeze(['Tích kỳ do người dùng nhập, chưa được hệ thống chuyển từ lịch dương','Chưa an Thiên Mục, Địa Mục, Chủ–Khách toán và Kế Thần theo phép nguyệt/nhật độc lập','Không sử dụng bảng niên 72 cục cho nguyệt/nhật'])});
}
function calculateTaiyi(input){if(!plain(input))throw new TypeError('Expected object');if(input.unit==='year')return calculateAnnual(input);return calculatePeriod(input);}
function validateTaiyiSnapshot(input){requireShape(input,['format','version','input']);if(input.format!=='thien-do.taiyi'||input.version!==1)throw new RangeError('Sai định dạng hồ sơ');
 const spec=input.input;requireShape(spec,['unit','methodId','traditionalYear','accumulatedOrdinal','calendarBoundaryResolved','side','calendarEvidence']);
 if(!UNITS.includes(spec.unit))throw new RangeError('Sai đơn vị kỳ');
 calculateTaiyi(spec);
 return JSON.parse(JSON.stringify(spec));
}
module.exports=Object.freeze({METHOD,DEEP_VERSION,RING,SIDES,UNITS,GOD_STATIONS,STATION_BY_GOD,SIXTEEN,CN_TO_VI,PALACE_LABELS,DISPLAY_GRID,generalsFromCount,getTableRow,countFromGod,deriveWenchang,deriveJiShen,deriveShiji,auditRow,calculateAnnual,calculatePeriod,calculateTaiyi,validateTaiyiSnapshot});
