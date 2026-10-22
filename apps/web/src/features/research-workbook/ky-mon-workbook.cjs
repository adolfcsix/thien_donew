'use strict';
const {freeze,fact,workbook}=require('./workbook-format.cjs');
const {readQuestionBoard}=require('../ky-mon/question-reading.cjs');
const {analyzeMonthStrength}=require('../ky-mon/month-strength.cjs');
const {analyzePatternSignals}=require('../ky-mon/pattern-signals.cjs');
const {analyzeStructuralSignals}=require('../ky-mon/structural-signals.cjs');
const {oppositePalace}=require('../ky-mon/luoshu.cjs');
function buildQimenWorkbook(base,plate,selection){
 const reading=readQuestionBoard(base,plate,selection);
 if(reading.status!=='evidence-ready')return workbook('ky-mon','Hồ sơ Kỳ Môn theo Dụng thần',reading.status,[],reading.missingData.map(x=>x.text));
 const month=analyzeMonthStrength(base,plate),patterns=analyzePatternSignals(base,plate),structural=analyzeStructuralSignals(base,plate);
 const use=reading.usePalace,indicator=reading.indicator,entry=month.byPalace[use];
 const selected=indicator.layer==='door'?entry.door:indicator.layer==='stem'?entry.stem:indicator.layer==='star'?entry.stars.find(s=>s.symbol===indicator.symbol):null;
 const states={present:'Khớp điều kiện Can',absent:'Không khớp cặp Can đang xét',convention:'Quy ước Trung 5','not-computed':'Chưa tính','not-represented':'Chưa biểu diễn'};
 const sections=[{id:'input',title:'Đầu vào và Dụng thần đang được đọc',facts:[fact('Bàn',`${base.term} · ${base.dun} độn ${base.ju} cục · giờ ${base.chief.hourName}`,'Địa bàn và thời bàn đã tái kiểm định'),fact('Dụng thần',`${indicator.name} tại cung ${use}`,'Biểu tượng thời bàn do bạn xác nhận'),fact('Nguyệt lệnh',`${month.month.branch} (${month.month.element})`,'Chi tháng tiết khí của bàn')],explanation:'Chủ đề chỉ phân loại câu hỏi. Phần mềm không chọn Dụng thần hoặc cung tham chiếu thay bạn.',questions:['Căn cứ chọn Dụng thần là gì, theo phương pháp nào?','Thời điểm giao tiết, quy ước giờ Tý và ký cung đã được xác minh chưa?']},
 {id:'selected-strength',title:'Nguyệt khí riêng của Dụng thần',facts:[fact('Trạng thái',selected?.state??'Ngoài phạm vi vượng suy hiện có',selected?`${selected.symbol} (${selected.element}) so hành tháng ${month.month.element}`:'Bát Thần chưa có bảng nguyệt khí được triển khai'),fact('Bảng đang dùng',selected?.rule==='baojian-star-month'?'Cửu Tinh Bảo Giám':selected?'Ngũ hành Môn/Can':'Chưa áp dụng','Bảng riêng theo lớp của Dụng thần')],explanation:'Vượng/Tướng/Hưu/Tù/Tử/Phế là trạng thái khí theo bảng đã chọn. Vượng suy biểu tượng khác sinh/khắc giữa các cung và không tự quyết định thuận/nghịch.',questions:['Có đang lấy hành cung thay ngũ hành của Dụng thần không?','Dị bản nguyệt khí có làm đổi tên trạng thái này không?']}];
 const nodes=[{role:'Cung Dụng thần',number:use},...(reading.referencePalace&&reading.referencePalace!==5?[{role:'Cung tham chiếu',number:reading.referencePalace}]:[]),{role:'Đối cung',number:oppositePalace(use).number}];
 for(const node of nodes){const e=month.byPalace[node.number],s=structural.byPalace[node.number],p=patterns.byPalace[node.number];
  sections.push({id:`palace-${node.role}`,title:`${node.role} · ${e.trigram} ${node.number}`,facts:[fact('Bát Môn',`${e.door.symbol}: ${e.door.state}`,'Môn thời bàn / ngũ hành Môn với tháng'),fact('Thiên Can',`${e.stem.symbol}: ${e.stem.state}`,'Can Thiên bàn / ngũ hành Can với tháng'),...e.stars.map(star=>fact(star.lodged?'Thiên Cầm ký':'Cửu Tinh',`${star.symbol}: ${star.state}`,'Sao thời bàn / bảng Bảo Giám')),fact('Môn Bách',s.door.status==='present'?'Có dấu Môn khắc cung':'Không có dấu Môn khắc cung','Dấu cấu trúc riêng'),fact('Tam Kỳ Nhập Mộ',s.grave.status==='present'?'Có dấu':s.grave.status==='out-of-scope'?'Ngoài Tam Kỳ':'Không có dấu đang xét','Bảng Ất/Bính/Đinh 2/6/8'),fact('Thanh Long / Phi Điểu',`${states[p.dragon]} / ${states[p.bird]}`,'Cặp Thiên/Địa Can; không phải kết luận cách cục tổng hợp')],explanation:'Các lớp cùng cung được đặt cạnh nhau để đối chiếu; không cộng điểm hoặc để một dấu che mất các điều kiện khác.',questions:['Dấu cấu trúc và nguyệt khí đang cho hai loại thông tin khác nhau ở điểm nào?','Cung này là căn cứ do bạn chọn hay chỉ là đối cung hình học?']});
 }
 sections.push({id:'relations',title:'Chiều quan hệ và chỗ chưa được tổng hợp',facts:reading.relations.map(r=>fact(r.role==='reference-to-use'?'Tham chiếu → Dụng thần':'Dụng thần → Đối cung',r.description,'Ngũ hành cung; giữ đúng chiều')),explanation:'Không lấy số lớp khớp làm tỷ lệ thành công. Thiếu cung tham chiếu không được thay bằng cung ngày hoặc Trung 5.',questions:['Nếu đảo chiều so sánh, mô tả sinh/khắc thay đổi thế nào?','Có dữ kiện thực tế nào có thể bác bỏ giả thuyết của bạn không?']});
 const gaps=reading.missingData.filter(m=>!(m.code==='season-strength'&&selected)).map(m=>m.text);
 gaps.push('Đã nối bảng nguyệt khí của biểu tượng khi có dữ liệu; chưa có phép tổng hợp vượng suy/cách cục thành kết quả sự kiện.','Tách bảng Diễn Nghĩa cho dấu cấu trúc với bảng Bảo Giám cho Cửu Tinh; đây là hồ sơ đối chiếu nhiều quy ước, không chứng nhận một hệ phái thống nhất.');
 return workbook('ky-mon',`Hồ sơ Kỳ Môn · ${indicator.name} · cung ${use}`,'ready',sections,gaps,month.profile.sources);
}
module.exports={buildQimenWorkbook};
