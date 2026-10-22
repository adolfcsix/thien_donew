'use strict';
/** Presentation contract only: separates an approximate four-pillar chart from
 * provisional Jie research. No calculation or source attestation is performed here. */
function assessResearchCoverage(result){
 if(!result||typeof result!=='object'||!result.calendar||!result.methods||!result.luck)
  throw new TypeError('Thiếu kết quả nghiên cứu Bát Tự');
 const cal=result.calendar,method=result.methods,luck=result.luck;
 const status=String(cal.sourceStatus||'UNKNOWN');
 const clock=cal.nearClockBoundary===true;
 const sourceAvailable=status==='RESOLVED';
 let level,title,explanation;
 if(status==='OUT_OF_COVERAGE'){
  level='blocked'; title='Chưa có bảng giao tiết cho ngày sinh này';
  explanation='Bốn trụ phía trên là kết quả nền xấp xỉ; năm/tháng theo Jie và các phép xét chuyên sâu không được xác nhận cho ngày này. Bảng khảo cứu hiện chỉ có mốc 2025–2027 và thiếu mốc đầu tháng 01/2025.';
 }else if(status==='BOUNDARY_REVIEW'||clock||method.status==='REVIEW_REQUIRED'){
  level='review'; title='Cần đối chiếu giờ sinh hoặc mốc giao tiết';
  explanation='Thời điểm nhập sát ranh giới ngày/giờ hay mốc Jie tính theo phút. Không dùng ứng viên Cách cục, Dụng thần hoặc Đại vận để đưa ra kết luận.';
 }else if(!sourceAvailable||method.status==='BLOCKED'){
  level='blocked';title='Dữ liệu chuyên sâu chưa đủ điều kiện';
  explanation='Chưa xác định được trụ năm/tháng bằng bảng Jie nghiên cứu. Bốn trụ nền không thay thế kết quả đối chứng thiên văn.';
 }else {
  level='research';title='Đã có bảng Jie nghiên cứu, chưa xác nhận độ chính xác thiên văn';
  explanation='Ba phép xét Cách cục, Phù ức và Điều hậu chỉ trình bày chứng cứ/ứng viên; không kết luận được một Dụng thần đúng duy nhất.';
 }
 return Object.freeze({level,title,explanation,sourceAvailable,
  sourceStatus:status,methodStatus:String(method.status),luckStatus:String(luck.status),
  yearMonthSourceVerified:false,verifiedUsefulGod:false,verifiedDayun:false,
  coreChartScope:'Bốn trụ nền là phép tính lịch pháp xấp xỉ, độc lập với lớp Jie nghiên cứu.',
  luckNote:luck.status==='PROVISIONAL'?'Đại vận tính theo Jie bản chép thứ cấp, chỉ là ước lượng truyền thống.':'Đại vận theo bảng Jie chưa đủ điều kiện để đối chứng.'});
}
module.exports=Object.freeze({assessResearchCoverage});
