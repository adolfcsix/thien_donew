/**
 * V11.74 · quan hệ Địa Chi mô tả cho từng hào của quẻ chủ.
 * Tương ứng lâm Nhật/Nguyệt, Lục Xung, Lục Hợp và Tuần Không.
 * Không lấy các nhãn đơn này làm kết luận vượng/suy, Dụng Thần hay ứng kỳ.
 */
'use strict';
const {BRANCHES}=require('./temporal.cjs');
const {makeNaJiaChart,BRANCH_ELEMENTS}=require('./na-jia.cjs');
const {compareElements}=require('../wuxing/elements.cjs');
const ELEMENT_IDS=Object.freeze({Kim:'metal',Mộc:'wood',Thủy:'water',Hỏa:'fire',Thổ:'earth'});
const SIX_COMBINE=Object.freeze([['Tý','Sửu'],['Dần','Hợi'],['Mão','Tuất'],['Thìn','Dậu'],['Tỵ','Thân'],['Ngọ','Mùi']]);
function relation(branch,target){
 if(target==null)return Object.freeze([]);
 const a=BRANCHES.indexOf(branch),b=BRANCHES.indexOf(target);
 if(a<0||b<0)throw new RangeError('Địa Chi so sánh không hợp lệ.');
 const flags=[];
 if(a===b)flags.push('đồng chi');
 if((a+6)%12===b)flags.push('lục xung');
 if(branch!==target&&SIX_COMBINE.some(pair=>pair.includes(branch)&&pair.includes(target)))flags.push('lục hợp');
 return Object.freeze(flags);
}
function lineTemporalEvidence(chart,reading,context){
 if(!chart||!Array.isArray(chart.lines)||chart.lines.length!==6||!reading||!Array.isArray(reading.ledger)||reading.ledger.length!==6)throw new TypeError('Cần đủ sáu hào Nạp Giáp và sổ sáu hào.');
 if(context==null)return Object.freeze({source:null,lines:Object.freeze([]),ready:false,notes:Object.freeze(['Chưa chọn ngày hoặc nhập Can Chi để đối chiếu Nhật/Nguyệt.'])});
 if(!BRANCHES.includes(context.dayBranch)|| (context.monthBranch!==null&&!BRANCHES.includes(context.monthBranch)) || !Array.isArray(context.voidBranches)||context.voidBranches.length!==2)throw new TypeError('Ngữ cảnh lịch pháp không hợp lệ.');
 const changedChart=makeNaJiaChart(reading.transformed);
 const lines=chart.lines.map((line,index)=>{
  if(line.position!==index+1||reading.ledger[index].position!==index+1)throw new TypeError('Thứ tự hào không khớp.');
  const day=relation(line.branch,context.dayBranch);
  const month=relation(line.branch,context.monthBranch);
  const changed=reading.ledger[index].moving ? changedChart.lines[index] : null;
  const dayElement=compareElements(ELEMENT_IDS[line.element],ELEMENT_IDS[BRANCH_ELEMENTS[context.dayBranch]]);
  const monthElement=context.monthBranch ? compareElements(ELEMENT_IDS[line.element],ELEMENT_IDS[BRANCH_ELEMENTS[context.monthBranch]]) : null;
  const tags=[
   ...(context.voidBranches.includes(line.branch)?['Tuần Không']:[]),
   ...day.map(name=>`Nhật ${name}`),
   ...month.map(name=>`Nguyệt ${name}`),
   ...(reading.ledger[index].moving?['Hào động']:[]),
  ];
  return Object.freeze({position:line.position,branch:line.branch,moving:reading.ledger[index].moving,
    void:context.voidBranches.includes(line.branch),day,month,dayElement:dayElement.label,monthElement:monthElement?.label||null,
    changed:changed ? Object.freeze({branch:changed.branch,stemBranch:changed.stemBranch,element:changed.element,relation:relation(line.branch,changed.branch)}) : null,
    tags:Object.freeze(tags)});
 });
 return Object.freeze({source:context.source,ready:true,monthVerified:context.monthBranch!==null,
  lines:Object.freeze(lines),notes:Object.freeze([
   'Lục Hợp, Lục Xung và đồng chi là quan hệ cấu trúc; không tự kết luận sinh khắc hay cát/hung.',
   'Tuần Không theo Can Chi ngày, không tự đồng nhất với vô hiệu/hư không tuyệt đối.',
   'Ngũ hành so từ HÀNH HÀO sang hành Nhật/Nguyệt; hào hóa chỉ đối chiếu Chi quẻ biến, không tự thay cung gốc để tính Lục Thân.',
   ...(context.monthBranch===null?['Nguyệt kiến đang chờ kiểm tra chuyển tiết; toàn bộ nhãn Nguyệt được bỏ qua.']:[]),
  ])});
}
module.exports={SIX_COMBINE,relation,lineTemporalEvidence};
