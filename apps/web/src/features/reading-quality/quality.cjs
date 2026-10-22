'use strict';
/**
 * V11.85 · Explainability and quality gates for traditional study methods.
 * Pure presentation/validation layer. Never places stars, casts hexagrams,
 * changes an engine result, predicts an outcome or assigns numeric certainty.
 */
const STATUSES = Object.freeze(['observed','needs-check','blocked']);
const LIMIT = 'Kết quả chỉ mô tả phép tính và các hệ quy chiếu truyền thống đang được chọn; không chứng minh năng lực dự báo sự kiện hoặc thay thế quyết định thực tế.';
function isSixBits(value){return typeof value==='string'&&/^[01]{6}$/.test(value);}
function lineDifference(before,after){return [...before].reduce((count,bit,i)=>count+(bit!==after[i]?1:0),0);}
function point(id,label,evidence,meaning,status='observed') {
 if(!STATUSES.includes(status))throw new RangeError('Invalid evidence status');
 return Object.freeze({id,label,evidence,meaning,status});
}
function makeReport(discipline,method,items,questions,limits=[LIMIT]){
 const blocked=items.some(item=>item.status==='blocked');
 const pending=items.some(item=>item.status==='needs-check');
 return Object.freeze({discipline,method,stage:blocked?'blocked':pending?'provisional':'structural',
  items:Object.freeze(items),questions:Object.freeze(questions),limits:Object.freeze(limits),
  notice:blocked?'Có dữ kiện không nhất quán: tạm dừng đọc diễn giải cho đến khi sửa.':pending?'Có điều kiện cần xác minh: chỉ đọc các dữ kiện cấu trúc đã quan sát.':'Các dữ kiện cấu trúc khớp điều kiện kiểm tra, không đồng nghĩa đã xác thực ý nghĩa dự báo.'});
}
function buildMaiHoaQuality(cast){
 const name='Mai Hoa Dịch Số';const method=cast?.method==='two-number-sum'?'Hai số / Tiên Thiên':cast?.method==='later-heaven-object-direction-hour'?'Hậu Thiên Đoan Pháp / vật tượng · phương vị · giờ chi':'Năm–tháng–ngày–giờ âm / Tiên Thiên';
 if(!cast)return makeReport(name,method,[point('input','Đầu vào','Chưa lập quẻ','Chỉ bắt đầu khi đầu vào hợp lệ.','blocked')],['Kiểm tra lại số nguyên hoặc ngày âm đã tra.']);
 const a=cast.original?.bits,b=cast.transformed?.bits,c=cast.nuclear?.bits;
 const bitsOK=isSixBits(a)&&isSixBits(b)&&isSixBits(c);
 const moveOK=Number.isInteger(cast.changingLine)&&cast.changingLine>=1&&cast.changingLine<=6;
 const changedOK=bitsOK&&moveOK&&lineDifference(a,b)===1&&a[cast.changingLine-1]!==b[cast.changingLine-1];
 const nuclearOK=bitsOK&&c===a.slice(1,4)+a.slice(2,5);
 const bodyOK=moveOK&&Boolean(cast.body?.bits&&cast.use?.bits)&&cast.body.bits===(cast.changingLine<=3?cast.original?.upper?.bits:cast.original?.lower?.bits)&&cast.use.bits===(cast.changingLine<=3?cast.original?.lower?.bits:cast.original?.upper?.bits);
 const verified=changedOK&&nuclearOK&&bodyOK;
 const items=[
  point('casting','Quẻ chủ',cast.original?.name||'—',`Khởi theo phương pháp ${method}; số liệu đầu vào do người dùng cung cấp.`,bitsOK?'observed':'blocked'),
  point('mutation','Hào động → quẻ biến',moveOK?`Hào ${cast.changingLine} · ${cast.original?.name??'—'} → ${cast.transformed?.name??'—'}`:'Hào không hợp lệ','Chỉ đúng một hào đổi ở vị trí được chọn, đếm từ dưới lên.',changedOK?'observed':'blocked'),
  point('nuclear','Hỗ quẻ',cast.nuclear?.name||'—','Hạ hỗ: hào 2–3–4; thượng hỗ: hào 3–4–5.',nuclearOK?'observed':'blocked'),
  point('body-use','Thể và Dụng',`${cast.body?.name??'—'} / ${cast.use?.name??'—'} · ${cast.relation?.label??'chưa có quan hệ'}`,'Thể không chứa hào động; quan hệ ngũ hành không tự là phán đoán tốt/xấu.',bodyOK?'observed':'blocked'),
  point('calendar','Độ tin cậy của đầu vào',cast.method==='lunar-branch-sum'?'Năm chi, ngày/tháng âm và giờ chi do người dùng nhập':cast.method==='later-heaven-object-direction-hour'?'Vật tượng, phương vị và chi giờ được xác nhận thủ công':'Hai con số được chọn trước khi lập',cast.method==='lunar-branch-sum'?'Cần đối chiếu âm lịch, tháng nhuận và quy ước đổi ngày của trường phái.':cast.method==='later-heaven-object-direction-hour'?'Chưa có bộ tự nhận diện vật tượng hoặc quy đổi phương vị thực địa thành số quái.':'Không thể kiểm tra liệu hai con số có được chọn trước khi xem kết quả hay không.','needs-check'),
 ];
 if(!verified)items.push(point('integrity','Đối chiếu nhất quán quẻ','Có sai lệch trong dữ liệu đầu ra','Không sử dụng bản đọc nếu hào động, hỗ quẻ hoặc Thể/Dụng không khớp phép tính.','blocked'));
 return makeReport(name,method,items,[
  'Nếu cách tính được thay theo trường phái khác, quẻ và hào động có còn như cũ không?',
  'Quan hệ Thể–Dụng cho biết điều gì về hệ biểu tượng, và điều gì nó không thể kết luận?',
  'Có thể tự kiểm tra chuỗi quẻ chủ → hỗ → biến bằng sáu hào hay không?'
 ]);
}
function buildLucHaoQuality(reading,naJia,temporal,focus){
 const name='Lục Hào';const items=[];
 const shape=Array.isArray(reading?.ledger)&&reading.ledger.length===6&&Array.isArray(naJia?.lines)&&naJia.lines.length===6;
 const coherent=shape&&reading.ledger.every((line,i)=>line.position===i+1&&naJia.lines[i].position===i+1)&&reading.original?.bits===naJia.hexagram?.bits;
 items.push(point('six-lines','Sáu hào và Nạp Giáp',coherent?`${reading.original.name} · ${naJia.palace.name} cung`:'Không khớp quẻ chủ hoặc thứ tự sáu hào','Nạp Giáp phải thuộc đúng quẻ chủ, từng hào từ dưới lên.',coherent?'observed':'blocked'));
 const moving=coherent?reading.ledger.filter(line=>line.moving).map(line=>line.position):[];
 items.push(point('movement','Hào động và quẻ biến',coherent?`${moving.length} hào: ${moving.join(', ')||'không có'} · ${reading.transformed.name}`:'Không có dữ kiện nhất quán','Hào động phải xác định từ giá trị 6/9, không suy từ Thế hoặc Ứng.',coherent?'observed':'blocked'));
 const hasTime=Boolean(temporal?.ready);
 const temporalOK=!hasTime||(coherent&&Array.isArray(temporal.lines)&&temporal.lines.length===6&&temporal.lines.every((line,i)=>line.position===i+1&&line.branch===naJia.lines[i].branch&&line.moving===reading.ledger[i].moving));
 items.push(point('day','Nhật thần và Tuần Không',hasTime?'Có lịch pháp và sáu hào được gắn ngày':'Chưa chọn ngày để tính Nhật thần','Không được gán Tuần Không hoặc quan hệ Nhật khi chưa có ngày.',!temporalOK?'blocked':hasTime?'observed':'needs-check'));
 items.push(point('month','Nguyệt kiến theo tiết khí',hasTime&&temporalOK&&temporal.monthVerified?'Nguyệt kiến đã có trong dữ kiện đang chọn':'Chưa có Nguyệt kiến đã kiểm tra','Gần giao tiết phải xác minh nhập tiết; không suy quan hệ tháng khi bỏ trống.',!temporalOK?'blocked':hasTime&&temporal.monthVerified?'observed':'needs-check'));
 const selected=typeof focus?.selected==='string'&&focus.selected.trim();
 const candidates=Array.isArray(focus?.candidates)?focus.candidates:[];
 items.push(point('focus','Ứng viên Lục Thân',selected?`${focus.selected}: ${candidates.length} hào hiển lộ`:'Chưa chọn Lục Thân để tra','Danh sách ứng viên do người học chọn; không tự nhận là Dụng Thần. Không thấy hào không phủ định Phục Thần.',selected?'observed':'needs-check'));
 return makeReport(name,'Bát Cung Kinh Phòng / Nạp Giáp / đối chiếu lịch pháp',items,[
  'Đã có Nhật Can Chi và Nguyệt kiến chính xác theo thời điểm lập quẻ chưa?',
  'Có nhiều ứng viên cùng Lục Thân cần đối chiếu động/tĩnh, Thế–Ứng và hào hóa không?',
  'Nếu ứng viên không hiển lộ, cần tra Phục Thần theo quy tắc độc lập nào?'
 ],[LIMIT,'Chưa xét Phục Thần, vượng suy tổng hợp, Dụng Thần đã xác lập hoặc ứng kỳ.']);
}
function buildKyMonQuality(formation,{source='auto',decision=null,withHour=true,hourPlate=null}={}){
 const name='Kỳ Môn Độn Giáp';const items=[];
 const valid=Boolean(formation&&['âm','dương'].includes(formation.dun)&&Number.isInteger(formation.ju)&&formation.ju>=1&&formation.ju<=9&&Array.isArray(formation.palaces)&&formation.palaces.length===9&&new Set(formation.palaces.map(p=>p.number)).size===9&&formation.palaces.every(p=>Number.isInteger(p.number)&&p.number>=1&&p.number<=9)&&formation.plate?.dun===formation.dun&&formation.plate?.ju===formation.ju);
 items.push(point('solar','Tiết khí và cục số',valid?`${formation.term} · ${formation.dun} độn · ${formation.ju} cục`:'Chưa đủ điều kiện lập cục','Dùng tiết khí × Tam nguyên theo Chai Bổ; không thay tháng âm cho tiết khí.',valid?'observed':formation?'blocked':'needs-check'));
 const sourceVerified=source==='manual'?false:Boolean(decision?.canAutoForm);
 items.push(point('calendar','Nguồn thời gian',source==='manual'?'Tự nhập tiết khí, Can Chi; chưa đối chiếu lịch thực':decision?.canAutoForm?'Gợi ý lịch pháp vượt qua cổng điều kiện':'Thiếu xác nhận lịch pháp hoặc gần ranh giới tiết','Gợi ý từ lịch thiên văn gần đúng không tự thay mốc nhập tiết được xác minh.',sourceVerified?'observed':'needs-check'));
 items.push(point('hour','Giờ và thời bàn',!withHour?'Không tính lớp theo giờ':hourPlate?.palaces?.length===9?'Đã dựng Chuyển Bàn theo giờ':'Chưa dựng lớp theo giờ','Không suy cửa, sao, thần theo giờ nếu lớp thời bàn chưa có dữ liệu.',!valid?(formation?'blocked':'needs-check'):!withHour?'needs-check':hourPlate&&Array.isArray(hourPlate.palaces)&&hourPlate.palaces.length===9?'observed':'needs-check'));
 if(source==='auto'&&decision&&!decision.canAutoForm&&formation)items.push(point('contradiction','Cổng chặn lịch pháp','Có cục số dù đầu vào lịch không đạt điều kiện','Hệ thống phải dừng việc luận trên cục số tự động chưa được xác minh.','blocked'));
 return makeReport(name,'Chai Bổ · Tam Kỳ Lục Nghi · Chuyển Bàn giờ',items,[
  'Mốc nhập tiết gần thời điểm khởi cục đã được đối chiếu tới giờ/phút chưa?',
  'Giờ Tý muộn đang được tính theo quy ước đổi ngày nào?',
  'Ký cung trung cung và phép chuyển bàn dùng quy ước của hệ phái nào?'
 ],[LIMIT,'Chưa có engine xác nhận đầy đủ cách cục, dụng thần hoặc kết luận cát hung.']);
}
function buildFengShuiQuality(orientation){
 const name='Phong thủy';
 if(!orientation)return makeReport(name,'24 sơn · Hậu Thiên / địa bàn',[point('angle','Đo phương vị','Chưa có số độ hợp lệ','Phải nhập số đo la bàn hữu hạn.','blocked')],['Đã đo ở nhiều vị trí ít nhiễu từ chưa?']);
 const d=orientation.facingDegrees, opposite=orientation.sittingDegrees;
 const consistent=Number.isFinite(d)&&Number.isFinite(opposite)&&Math.abs((((d+180)%360)-opposite))<1e-8;
 const boundary=orientation.boundaryDistance;
 const validBoundary=Number.isFinite(boundary)&&boundary>=0&&boundary<=7.5;
 const near=validBoundary&&boundary<1;
 const items=[
  point('axis','Trục tọa–hướng',`${orientation.facing?.name??'—'} (${d}°) / ${orientation.sitting?.name??'—'} (${opposite}°)`,'Tọa và hướng phải đối nhau đúng 180°, sau chuẩn hóa 0–360°.',consistent?'observed':'blocked'),
  point('sector','Độ ổn định sơn hướng',validBoundary?`${boundary.toFixed(2)}° đến ranh giới sơn gần nhất`:'Khoảng cách ranh giới không hợp lệ',near?'Rất gần hai sơn: phép gán sơn có thể đổi vì sai số đo.':'Mỗi sơn 15°; cần đối chiếu sai số la bàn trước khi dùng tính bàn.',!validBoundary?'blocked':near?'needs-check':'observed'),
  point('survey','Điều kiện hiện trường','Chưa có khảo sát thực địa độc lập','Nên đo nhiều điểm, tránh nhiễu kim loại/điện và xác định mặt hướng theo thực địa.','needs-check'),
 ];
 return makeReport(name,'24 sơn / Bát Trạch / Phi Tinh (các hệ độc lập)',items,[
  'Đã đo lại ít nhất vài vị trí để biết sai số la bàn chưa?',
  'Niên vận nhà, tọa/hướng và sơ đồ mặt bằng đã được xác minh chưa?',
  'Kết quả Bát Trạch và Phi Tinh đang dùng các giả định độc lập nào?'
 ],[LIMIT,'Không tự hợp nhất Bát Trạch và Phi Tinh thành thang điểm; chưa có Thế quái hay khảo sát hình thế.']);
}
function buildTuViQuality(reading){
 const name='Tử Vi';
 if(!reading||typeof reading.palace!=='string')return makeReport(name,'Mệnh bàn / Tam phương Tứ chính',[point('chart','Chọn cung','Chưa chọn cung hợp lệ','Cần lập địa bàn có đủ vị trí sao.','blocked')],['Chọn một cung để xem bằng chứng.']);
 const stars=Array.isArray(reading.stars)?reading.stars:[];
 const combinations=Array.isArray(reading.combinations)?reading.combinations:[];
 const main=reading.isVoChinhDieu?'Vô chính diệu':stars.map(s=>s.name).filter(Boolean).join(', ')||'Chưa có chính tinh';
 const items=[
  point('natal','Chính tinh tọa thủ',`Cung ${reading.palace}: ${main}`,'Chỉ nói sao thực sự được an ở cung; Vô chính diệu không phải cung trống.',stars.length||reading.isVoChinhDieu?'observed':'needs-check'),
  point('geometry','Liên kết cung','Cần đối chiếu Tam phương Tứ chính và Đối cung','Một sao tọa thủ riêng không thể thay toàn bộ kết cấu 12 cung.','needs-check'),
  point('patterns','Tổ hợp phù hợp điều kiện khảo sát',`${combinations.length} tổ hợp đang khớp điều kiện hỗ trợ`,'Không khớp không có nghĩa không tồn tại cách cục theo truyền bản khác.','observed'),
  point('timing','Giới hạn tầng thời gian','Bản mệnh và lớp lưu/vận không được đồng nhất','Cần tách rõ chính tinh bản mệnh khỏi sao lưu, Tiểu hạn, Đại hạn.','needs-check'),
 ];
 return makeReport(name,'Mệnh bàn / Sao tọa thủ / Tam phương Tứ chính',items,[
  'Sao có bị lẫn giữa bản mệnh với lưu tinh hoặc vận hạn không?',
  'Đối cung và hai cung tam hợp có củng cố hoặc giới hạn cách đọc tại cung này không?',
  'Độ sáng, tứ hóa và các trường phái đã được đối chiếu ở lớp chuyên sâu chưa?'
 ]);
}
module.exports={buildMaiHoaQuality,buildLucHaoQuality,buildKyMonQuality,buildFengShuiQuality,buildTuViQuality};
