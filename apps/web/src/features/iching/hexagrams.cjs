/**
 * Thiên Đồ · tra cứu tượng quẻ Dịch theo thứ tự Văn Vương.
 * Thứ tự hào trong toàn bộ module: từ DƯỚI lên TRÊN (hào 1..6).
 * Chỉ tính cấu trúc quẻ, không tự suy diễn lục thân, thế ứng hoặc cát/hung.
 */
'use strict';

const TRIGRAMS = Object.freeze([
  { id:'qian', name:'Càn', han:'乾', symbol:'☰', element:'Kim', image:'Trời', bits:'111' },
  { id:'dui', name:'Đoài', han:'兌', symbol:'☱', element:'Kim', image:'Đầm', bits:'110' },
  { id:'li', name:'Ly', han:'離', symbol:'☲', element:'Hỏa', image:'Lửa', bits:'101' },
  { id:'zhen', name:'Chấn', han:'震', symbol:'☳', element:'Mộc', image:'Sấm', bits:'100' },
  { id:'xun', name:'Tốn', han:'巽', symbol:'☴', element:'Mộc', image:'Gió', bits:'011' },
  { id:'kan', name:'Khảm', han:'坎', symbol:'☵', element:'Thủy', image:'Nước', bits:'010' },
  { id:'gen', name:'Cấn', han:'艮', symbol:'☶', element:'Thổ', image:'Núi', bits:'001' },
  { id:'kun', name:'Khôn', han:'坤', symbol:'☷', element:'Thổ', image:'Đất', bits:'000' },
]);

// Hàng = thượng quái, cột = hạ quái; cùng thứ tự với TRIGRAMS.
// Khóa Văn Vương 1..64. Quy tắc này KHÔNG phải thứ tự nhị phân Phục Hy.
const KING_WEN_GRID = Object.freeze([
  [1,10,13,25,44,6,33,12],
  [43,58,49,17,28,47,31,45],
  [14,38,30,21,50,64,56,35],
  [34,54,55,51,32,40,62,16],
  [9,61,37,42,57,59,53,20],
  [5,60,63,3,48,29,39,8],
  [26,41,22,27,18,4,52,23],
  [11,19,36,24,46,7,15,2],
]);

// Biên soạn mới: tên truyền thống + chủ đề tự suy ngẫm, không phải lời đoán số.
const DESCRIPTORS = Object.freeze([
  ['Thuần Càn','Sáng tạo · chủ động','Đâu là việc cần chủ động khởi sự?'],
  ['Thuần Khôn','Tiếp nhận · nâng đỡ','Điều gì cần kiên nhẫn bồi đắp?'],
  ['Thủy Lôi Truân','Khởi đầu gian nan','Nguồn lực nào cần chuẩn bị khi bắt đầu?'],
  ['Sơn Thủy Mông','Học hỏi · khai trí','Điều chưa biết quan trọng nhất là gì?'],
  ['Thủy Thiên Nhu','Chờ thời','Khi nào nên kiên nhẫn thay vì thúc ép?'],
  ['Thiên Thủy Tụng','Tranh luận · bất đồng','Làm sao giảm đối đầu và tìm dữ kiện?'],
  ['Địa Thủy Sư','Kỷ luật · tổ chức','Ai đang chịu trách nhiệm, và quy tắc nào cần rõ?'],
  ['Thủy Địa Tỷ','Gắn kết · liên minh','Mối quan hệ nào đáng để vun đắp?'],
  ['Phong Thiên Tiểu Súc','Tích lũy nhỏ','Việc nhỏ nào tạo nền tảng bền vững?'],
  ['Thiên Trạch Lý','Ứng xử · bước đi','Giới hạn ứng xử nào nên được tôn trọng?'],
  ['Địa Thiên Thái','Thông đạt · hòa hợp','Yếu tố nào đang phối hợp thuận lợi?'],
  ['Thiên Địa Bĩ','Bế tắc · chia cách','Điều gì đang ngăn trở sự trao đổi?'],
  ['Thiên Hỏa Đồng Nhân','Đồng lòng','Mục tiêu chung nào gắn kết mọi người?'],
  ['Hỏa Thiên Đại Hữu','Dồi dào · trách nhiệm','Có nguồn lực rồi cần dùng ra sao?'],
  ['Địa Sơn Khiêm','Khiêm nhường','Có thể lắng nghe ai trước khi quyết định?'],
  ['Lôi Địa Dự','Hào hứng · chuẩn bị','Sự lạc quan có đi kèm kế hoạch?'],
  ['Trạch Lôi Tùy','Thích nghi · thuận theo','Nên theo điều gì, nên giữ điều gì?'],
  ['Sơn Phong Cổ','Sửa chữa cái cũ','Thói quen nào cần được cải tổ?'],
  ['Địa Trạch Lâm','Tiếp cận · dẫn dắt','Tiếp cận vấn đề với thái độ nào?'],
  ['Phong Địa Quan','Quan sát · chiêm nghiệm','Góc nhìn nào còn thiếu?'],
  ['Hỏa Lôi Phệ Hạp','Tháo gỡ trở ngại','Vấn đề nào cần xử lý dứt điểm?'],
  ['Sơn Hỏa Bí','Trang sức · hình thức','Đâu là thực chất phía sau hình thức?'],
  ['Sơn Địa Bác','Suy giảm · bóc tách','Điều gì không còn làm trụ cột?'],
  ['Địa Lôi Phục','Trở lại · hồi phục','Giá trị gốc nào nên được phục hồi?'],
  ['Thiên Lôi Vô Vọng','Chân thành · không vọng động','Giả định nào đang thiếu căn cứ?'],
  ['Sơn Thiên Đại Súc','Tích lũy lớn','Nội lực nào cần rèn lâu dài?'],
  ['Sơn Lôi Di','Nuôi dưỡng','Thứ gì đang nuôi dưỡng tư duy và thể chất?'],
  ['Trạch Phong Đại Quá','Gánh nặng vượt mức','Có thể giảm tải ở đâu?'],
  ['Thuần Khảm','Hiểm trở · chiều sâu','Rủi ro nào cần hiểu kỹ?'],
  ['Thuần Ly','Sáng rõ · nương tựa','Những điều gì làm vấn đề sáng tỏ?'],
  ['Trạch Sơn Hàm','Cảm ứng · ảnh hưởng','Ai và điều gì đang tác động qua lại?'],
  ['Lôi Phong Hằng','Bền bỉ','Điều nào đáng duy trì nhất quán?'],
  ['Thiên Sơn Độn','Rút lui đúng lúc','Khi nào rút lui là lựa chọn khôn ngoan?'],
  ['Lôi Thiên Đại Tráng','Sức mạnh · tự chủ','Sức mạnh cần giới hạn nào?'],
  ['Hỏa Địa Tấn','Tiến triển','Bước tiến nhỏ tiếp theo là gì?'],
  ['Địa Hỏa Minh Di','Che ánh sáng','Cách giữ giá trị khi hoàn cảnh bất lợi?'],
  ['Phong Hỏa Gia Nhân','Nề nếp gia đình','Vai trò và trách nhiệm đã rõ chưa?'],
  ['Hỏa Trạch Khuê','Khác biệt','Làm sao tôn trọng bất đồng?'],
  ['Thủy Sơn Kiển','Trở ngại','Có đường vòng nào hợp lý hơn?'],
  ['Lôi Thủy Giải','Hóa giải','Điều gì có thể được tháo gỡ ngay?'],
  ['Sơn Trạch Tổn','Giảm bớt','Bỏ đi điều gì để giữ phần quan trọng?'],
  ['Phong Lôi Ích','Tăng trưởng','Ai cùng hưởng lợi từ sự cải thiện?'],
  ['Trạch Thiên Quải','Quyết đoán','Sự dứt khoát cần dựa vào dữ kiện nào?'],
  ['Thiên Phong Cấu','Gặp gỡ bất ngờ','Mối gặp gỡ nào cần đánh giá thận trọng?'],
  ['Trạch Địa Tụy','Hội tụ','Điểm chung nào kết nối tập thể?'],
  ['Địa Phong Thăng','Tiến lên từ từ','Bậc thang nào cần đi vững?'],
  ['Trạch Thủy Khốn','Bị giới hạn','Điều gì vẫn nằm trong tầm kiểm soát?'],
  ['Thủy Phong Tỉnh','Nguồn lực chung','Nguồn lực nền tảng có được chăm sóc?'],
  ['Trạch Hỏa Cách','Đổi mới','Điều kiện nào cho thấy đã đến lúc thay đổi?'],
  ['Hỏa Phong Đỉnh','Chuyển hóa · kiến tạo','Cấu trúc mới nào tạo giá trị lâu bền?'],
  ['Thuần Chấn','Chấn động · thức tỉnh','Phản ứng nào cần bình tĩnh trước biến động?'],
  ['Thuần Cấn','Dừng lại · tĩnh tại','Điểm dừng phù hợp hiện nay là gì?'],
  ['Phong Sơn Tiệm','Tiến dần','Lộ trình phát triển từng bước ra sao?'],
  ['Lôi Trạch Quy Muội','Quan hệ · không cân xứng','Các bên đã hiểu đúng vị trí của mình?'],
  ['Lôi Hỏa Phong','Đầy đủ · cực thịnh','Khi sung túc cần giữ cân bằng ra sao?'],
  ['Hỏa Sơn Lữ','Lữ hành · tạm trú','Quy tắc nào giúp thích nghi nơi xa lạ?'],
  ['Thuần Tốn','Thẩm thấu · thuận nhập','Tác động mềm nào tích lũy theo thời gian?'],
  ['Thuần Đoài','Vui vẻ · giao tiếp','Lời nói nào giúp đối thoại tích cực?'],
  ['Phong Thủy Hoán','Phân tán · khai thông','Làm sao nối lại những phần rời rạc?'],
  ['Thủy Trạch Tiết','Chừng mực · tiết chế','Ranh giới nào giúp sử dụng nguồn lực tốt?'],
  ['Phong Trạch Trung Phu','Thành tín','Niềm tin đang được xây bằng hành động nào?'],
  ['Lôi Sơn Tiểu Quá','Vượt mức nhỏ','Việc nào cần đặc biệt cẩn trọng?'],
  ['Thủy Hỏa Ký Tế','Đã hoàn thành','Sau thành công cần bảo dưỡng điều gì?'],
  ['Hỏa Thủy Vị Tế','Chưa hoàn thành','Điều kiện cuối cùng còn thiếu là gì?'],
]);

const HEXAGRAMS = Object.freeze(KING_WEN_GRID.flatMap((row, upperIndex) => row.map((number, lowerIndex) => {
  const upper = TRIGRAMS[upperIndex], lower = TRIGRAMS[lowerIndex];
  const [name, theme, inquiry] = DESCRIPTORS[number - 1];
  const bits = lower.bits + upper.bits;
  return Object.freeze({number,name,theme,inquiry,upper,lower,bits});
})).sort((a,b) => a.number - b.number));
const HEXAGRAM_BY_BITS = new Map(HEXAGRAMS.map(hexagram => [hexagram.bits,hexagram]));

function hexagramFromBits(bits) {
  if (typeof bits !== 'string' || !/^[01]{6}$/.test(bits)) throw new TypeError('Cần đúng sáu hào âm/dương, từ dưới lên.');
  return HEXAGRAM_BY_BITS.get(bits);
}
function hexagramByNumber(number) {
  if (!Number.isInteger(number) || number < 1 || number > 64) return null;
  return HEXAGRAMS[number-1];
}
function hexagramFromLines(lines) {
  if (!Array.isArray(lines) || lines.length !== 6 || !lines.every(n => Number.isInteger(n) && n>=6 && n<=9)) {
    throw new TypeError('Cần sáu trị số 6, 7, 8 hoặc 9, nhập từ hào dưới cùng.');
  }
  const bits = lines.map(n => n % 2 === 1 ? '1' : '0').join('');
  const changing = lines.flatMap((n,i) => n===6||n===9?[i+1]:[]);
  const changedBits = lines.map(n => n===6?'1':n===9?'0':n%2===1?'1':'0').join('');
  return Object.freeze({original:hexagramFromBits(bits), transformed:hexagramFromBits(changedBits), changing, lines:[...lines]});
}
/** 2 = one face, 3 = the other. 3 coins per line, 6 lines, bottom first. */
function castThreeCoins(random = Math.random) {
  return Array.from({length:6},()=> Array.from({length:3},()=>random()<0.5?2:3).reduce((a,b)=>a+b,0));
}
module.exports = {TRIGRAMS,KING_WEN_GRID,HEXAGRAMS,hexagramFromBits,hexagramByNumber,hexagramFromLines,castThreeCoins};
