'use strict';
/**
 * THIÊN ĐỒ — đối chiếu 6 điều kiện hình học Tử Vi, KHÔNG phải bộ phán định 49 cách cục.
 * Nguồn phương pháp tham khảo: Renhuai123/ziwei-doushu, MIT; thuật toán/diễn giải độc lập.
 * Trả về chứng cứ, điều kiện chưa xét, sai lệch dữ liệu. Không sửa lá số và không dự báo.
 */
const SOURCE='https://github.com/Renhuai123/ziwei-doushu';
const LAYERS=Object.freeze(['stars','auxiliaryStars','yearStars','additionalStars','traditionalStars','natalExtensionStars','beneficStars','advancedStars','positionalStars','derivedStars','missingStars']);
const SUPPORT=Object.freeze(['Tả Phụ','Hữu Bật','Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Lộc Tồn','Thiên Mã']);
const GROUPS=Object.freeze([
 Object.freeze({name:'Định phú',totalInReference:6,implementedHere:4,scope:'Bản mệnh'}),
 Object.freeze({name:'Định quý',totalInReference:27,implementedHere:2,scope:'Bản mệnh'}),
 Object.freeze({name:'Định bần',totalInReference:8,implementedHere:0,scope:'Bản mệnh'}),
 Object.freeze({name:'Định tạp',totalInReference:8,implementedHere:0,scope:'Đại hạn / lưu niên; không thể ghép như cách cục bản mệnh'})
]);
const mod=n=>(n%12+12)%12;
function validate(chart){
 if(!chart || !Array.isArray(chart.houses)||chart.houses.length!==12)throw new RangeError('Thiếu địa bàn 12 cung.');
 const branches=new Set(),palaces=new Set();
 for(const h of chart.houses){
  if(!h||!Number.isInteger(h.branchIndex)||h.branchIndex<0||h.branchIndex>11||typeof h.palace!=='string'||!Array.isArray(h.stars))throw new RangeError('Cấu trúc cung không hợp lệ.');
  if(branches.has(h.branchIndex)||palaces.has(h.palace))throw new RangeError('Địa bàn có cung hoặc địa chi trùng lặp.');
  branches.add(h.branchIndex);palaces.add(h.palace);
 }
 for(const name of ['Mệnh','Quan Lộc','Tài Bạch','Điền Trạch'])if(!palaces.has(name))throw new RangeError('Thiếu cung bắt buộc: '+name);
 return Object.freeze({byBranch:new Map(chart.houses.map(h=>[h.branchIndex,h])),byPalace:new Map(chart.houses.map(h=>[h.palace,h]))});
}
function getPosition(chart,name,requiredLayer){
 const matches=[];let bad=false;
 for(const h of chart.houses){
  for(const layer of LAYERS){
   const arr=h[layer];if(arr!=null&&!Array.isArray(arr)){bad=true;continue;}
   for(const v of Array.isArray(arr)?arr:[])if(v===name)matches.push({branchIndex:h.branchIndex,palace:h.palace,branch:h.branch,layer});
  }
 }
 if(bad||matches.length!==1||matches[0].layer!==requiredLayer){
  return {status:matches.length>1?'ambiguous':'unverified',name,layer:requiredLayer,
   locations:matches.map(({branchIndex,palace,layer})=>({branchIndex,palace,layer}))};
 }
 return {status:'observed',name,...matches[0]};
}
const check=(label,met,detail)=>({label,state:met===null?'unknown':met?'met':'not-met',detail});
function result(id,title,group,sourceFile,interpretation,checks,extra){
 const negative=checks.some(x=>x.state==='not-met');
 const unknown=checks.some(x=>x.state==='unknown');
 return Object.freeze({id,title,group,reference:'《Tử Vi Đẩu Số Toàn Thư》, quyển I · '+group,
  sourceUrl:SOURCE+'/blob/main/lib/ziwei/'+sourceFile,
  status:negative?'not-met':unknown?'needs-review':'structural-match',checks,
  interpretation,extra,expertReviewed:false,
  caution:'Chỉ kiểm tra điều kiện bằng dữ kiện trên lá số và một quy ước tham khảo; không tự xác nhận thành cách, cát/hung hay dự đoán sự kiện.'});
}
/** Đánh giá độc lập, giữ nguyên địa bàn, không trộn lớp lưu hạn với sao bản mệnh. */
function auditClassicalPatternCandidates(chart){
 const {byBranch,byPalace}=validate(chart);
 const sun=getPosition(chart,'Thái Dương','stars');
 const moon=getPosition(chart,'Thái Âm','stars');
 const wu=getPosition(chart,'Vũ Khúc','stars');
 const horse=getPosition(chart,'Thiên Mã','yearStars');
 const loc=getPosition(chart,'Lộc Tồn','auxiliaryStars');
 const good=[...SUPPORT].filter(name=>LAYERS.some(layer=>{const h=byPalace.get('Mệnh');return Array.isArray(h[layer])&&h[layer].includes(name);}));
 const meng=byPalace.get('Mệnh');
 const observed=x=>x.status==='observed';
 const place=(x,desc,pred)=>check(desc,observed(x)?pred(x):null,observed(x)?x.name+': '+x.palace+', chi số '+x.branchIndex:x.name+': thiếu hoặc mâu thuẫn vị trí ('+x.status+')');
 const notes={
  specific:'Cần xác định đúng vị trí sao và quy ước trường phái trước khi đọc ý nghĩa.',
  void:'Chưa có ánh xạ được thẩm định giữa các sao Không Vong nguyên bản và dữ liệu Tuần/Triệt của Thiên Đồ; không thay thế chúng một cách cơ học.'
 };
 const records=[
  result('dinh-quy-02','Nhật xuất Phù Tang','Định quý','patterns-dinggui.ts',
   'Thái Dương tại Mão, đồng thời cung Mão là Mệnh hoặc Quan Lộc. Đây là hai vị trí mà bản chú giải tham khảo xét, không thay bằng thế hội chiếu rộng.',[
   place(sun,'Thái Dương tọa Mão',x=>x.branchIndex===3),
   place(sun,'Mão thuộc Mệnh hoặc Quan Lộc',x=>['Mệnh','Quan Lộc'].includes(x.palace))],notes.specific),
  result('dinh-quy-01','Nhật Nguyệt giáp Mệnh','Định quý','patterns-dinggui.ts',
   'Hai sao Nhật – Nguyệt chia nhau hai cung kề Mệnh; bản tham khảo còn yêu cầu Mệnh không tọa Không Vong và có cát tinh. Không được bỏ qua hai điều kiện này.',[
   place(sun,'Thái Dương ở một trong hai cung giáp Mệnh',x=>[mod(meng.branchIndex-1),mod(meng.branchIndex+1)].includes(x.branchIndex)),
   place(moon,'Thái Âm ở cung giáp đối diện Thái Dương',x=>observed(sun)?x.branchIndex===mod(2*meng.branchIndex-sun.branchIndex):null),
   check('Có cát tinh trong cung Mệnh theo danh mục đối chiếu',good.length>0,good.length?good.join(', '):'Chưa thấy cát tinh từ danh mục đang hỗ trợ'),
   check('Đối chiếu đầy đủ điều kiện Không Vong',null,notes.void)],notes.void),
  result('dinh-phu-05','Nhật Nguyệt chiếu bích','Định phú','patterns-dingfu.ts',
   'Thái Dương và Thái Âm cùng tọa Điền Trạch; đây là điều kiện đồng cung, không phải chỉ đồng hội Tam Hợp.',[
    place(sun,'Thái Dương tại Điền Trạch',x=>x.palace==='Điền Trạch'),
    place(moon,'Thái Âm tại cùng Điền Trạch',x=>observed(sun)?x.palace==='Điền Trạch'&&x.branchIndex===sun.branchIndex:null)],notes.specific),
  result('dinh-phu-06','Kim xán quang huy','Định phú','patterns-dingfu.ts',
   'Mệnh ở Ngọ, Thái Dương độc thủ (không có chính tinh thứ hai cùng cung).',[
    check('Cung Mệnh đóng Ngọ',meng.branchIndex===6,'Mệnh chi số '+meng.branchIndex),
    place(sun,'Thái Dương thủ Mệnh tại Ngọ',x=>x.branchIndex===6&&x.palace==='Mệnh'),
    check('Mệnh có duy nhất một chính tinh, là Thái Dương',meng.stars.length===1&&meng.stars[0]==='Thái Dương','Chính tinh tại Mệnh: '+(meng.stars.join(', ')||'không có'))],notes.specific),
  result('dinh-phu-02','Nhật Nguyệt giáp Tài','Định phú','patterns-dingfu.ts',
   'Vũ Khúc tọa Mệnh hoặc Tài Bạch; Thái Âm ở cung trước, Thái Dương ở cung sau. Phải xét vị trí kề ±1, không tính cách hai cung.',[
    place(wu,'Vũ Khúc tại Mệnh hoặc Tài Bạch',x=>['Mệnh','Tài Bạch'].includes(x.palace)),
    place(moon,'Thái Âm ở cung trước Vũ Khúc',x=>observed(wu)?x.branchIndex===mod(wu.branchIndex-1):null),
    place(sun,'Thái Dương ở cung sau Vũ Khúc',x=>observed(wu)?x.branchIndex===mod(wu.branchIndex+1):null)],notes.specific),
  result('dinh-phu-03','Tài Lộc giáp Mã','Định phú','patterns-dingfu.ts',
   'Thiên Mã tại Mệnh, Vũ Khúc ở cung trước và Lộc Tồn ở cung sau, đối chiếu đúng chiều của bộ sao theo trường phái tham khảo.',[
    place(horse,'Thiên Mã tọa Mệnh',x=>x.palace==='Mệnh'),
    place(wu,'Vũ Khúc ở cung trước Thiên Mã',x=>observed(horse)?x.branchIndex===mod(horse.branchIndex-1):null),
    place(loc,'Lộc Tồn ở cung sau Thiên Mã',x=>observed(horse)?x.branchIndex===mod(horse.branchIndex+1):null)],notes.specific)
 ];
 const matched=records.filter(x=>x.status==='structural-match').length;
 const reviewed=records.filter(x=>x.status==='needs-review').length;
 return Object.freeze({edition:'thiendo-classical-research-2026-11-10',scope:'natal-only',
  groups:GROUPS,referenceTotal:49,assessed:records.length,matched,needsReview:reviewed,
  records:Object.freeze(records),expertReviewed:false,
  notice:'6/49 chỉ mục được ánh xạ điều kiện ban đầu; 43 mục còn lại chưa được xác minh. Đây là đối chiếu nghiên cứu, không phải nhận định đầy đủ 49 cách cục.'});
}
module.exports=Object.freeze({SOURCE,GROUPS,auditClassicalPatternCandidates});
