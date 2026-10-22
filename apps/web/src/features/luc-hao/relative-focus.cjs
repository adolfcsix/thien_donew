/**
 * V11.75 - Tra cứu ứng viên Dụng Thần dựa trên Lục Thân do người học CHỌN.
 * Không tự chọn Dụng Thần, tính Phục Thần, chấm cát/hung hoặc ứng kỳ.
 * Mỗi ứng viên bắt buộc là một hào Nạp Giáp có thật trong quẻ chủ.
 */
'use strict';

const {makeNaJiaChart}=require('./na-jia.cjs');
const {relation}=require('./temporal-relations.cjs');
const RELATIVES=Object.freeze(['Phụ Mẫu','Huynh Đệ','Tử Tôn','Thê Tài','Quan Quỷ']);

function relativeFocus(chart,reading,evidence,selected=null){
 if(!chart||!Array.isArray(chart.lines)||chart.lines.length!==6||!reading||!Array.isArray(reading.ledger)||reading.ledger.length!==6){
  throw new TypeError('Cần bảng Nạp Giáp và đủ sáu hào quẻ chủ.');
 }
 if(selected!==null&&!RELATIVES.includes(selected))throw new RangeError('Lục Thân không nằm trong nhóm được hỗ trợ.');
 if(!reading.original||!reading.transformed||chart.hexagram.bits!==reading.original.bits)throw new TypeError('Bảng Nạp Giáp không tương ứng quẻ chủ.');
 const transformedChart=makeNaJiaChart(reading.transformed);
 const ready=Boolean(evidence&&evidence.ready);
 if(ready&&(!Array.isArray(evidence.lines)||evidence.lines.length!==6))throw new TypeError('Bảng lịch pháp không đủ sáu hào.');
 const candidates=[];
 for(let i=0;i<6;i++){
  const line=chart.lines[i],original=reading.ledger[i];
  if(line.position!==i+1||original.position!==i+1)throw new TypeError('Vị trí hào thiếu nhất quán.');
  if(!RELATIVES.includes(line.family))throw new TypeError('Lục Thân chưa xác định trong bảng Nạp Giáp.');
  const temporal=ready?evidence.lines[i]:null;
  if(ready&&(temporal.position!==i+1||temporal.branch!==line.branch||temporal.moving!==original.moving))throw new TypeError('Đối chiếu Nhật/Nguyệt không khớp với quẻ chủ.');
  if(line.family!==selected)continue;
  const changedLine=original.moving?transformedChart.lines[i]:null;
  const changed=changedLine?Object.freeze({branch:changedLine.branch,stemBranch:changedLine.stemBranch,element:changedLine.element,relation:relation(line.branch,changedLine.branch)}):null;
  if(ready&&JSON.stringify(temporal.changed)!==JSON.stringify(changed))throw new TypeError('Hào hóa không khớp bằng chứng quẻ biến.');
  candidates.push(Object.freeze({position:line.position,stemBranch:line.stemBranch,branch:line.branch,element:line.element,
   family:line.family,role:line.role,moving:original.moving,
   void:ready?temporal.void:null,day:ready?Object.freeze([...temporal.day]):null,
   month:ready&&evidence.monthVerified?Object.freeze([...temporal.month]):null,
   changed}));
 }
 return Object.freeze({selected,ready:selected!==null,count:candidates.length,hasTemporal:ready,
  candidates:Object.freeze(candidates),
  notes:Object.freeze([
   'Lục Thân là tiêu chí lọc do người dùng chọn, không phải Dụng Thần đã được tự động xác lập.',
   'Nhiều hào cùng Lục Thân phải xét thêm động/tĩnh, Thế–Ứng và điều kiện Nhật–Nguyệt trước khi biện luận.',
   'Không thấy hào mang Lục Thân trên quẻ chủ KHÔNG đồng nghĩa không có Phục Thần; cần một phép tra Phục Thần độc lập.',
   'Chưa có lịch pháp hợp lệ thì không gán Tuần Không, ngày hay tháng cho hào.',
   ...(ready&&!evidence.monthVerified?['Nguyệt kiến chưa được xác minh tại ranh giới tiết khí: không đánh nhãn quan hệ tháng.']:[]),
  ])});
}
module.exports={RELATIVES,relativeFocus};
