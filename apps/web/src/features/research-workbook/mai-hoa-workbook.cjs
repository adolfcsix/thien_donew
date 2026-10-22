'use strict';
const {freeze,fact,workbook}=require('./workbook-format.cjs');
const casting=require('../mai-hoa/casting.cjs');
const {makeDeepReading}=require('../mai-hoa/deep-reading.cjs');
const {makeLineTrace}=require('../mai-hoa/line-trace.cjs');
function trustedCast(cast){
 if(!cast||!cast.inputs)throw new TypeError('Cần kết quả khởi quẻ và đầu vào gốc.');
 const build={'two-number-sum':casting.castByNumbers,'lunar-branch-sum':casting.castByLunarTime,'later-heaven-object-direction-hour':casting.castByLaterHeaven}[cast.method];
 if(!build)throw new RangeError('Phương pháp Mai Hoa không được hỗ trợ.');
 const expected=build(cast.inputs);
 for(const key of ['changingLine','arithmetic','body','use','upper','lower','original','nuclear','transformed','relation'])if(JSON.stringify(cast[key])!==JSON.stringify(expected[key]))throw new RangeError(`Dữ kiện Mai Hoa ${key} không khớp phép khởi quẻ.`);
 return expected;
}
function buildMaiHoaWorkbook(cast){
 const c=trustedCast(cast),depth=makeDeepReading(c),trace=makeLineTrace(c),a=c.arithmetic;
 const method={'two-number-sum':'Hai số giản lược','lunar-branch-sum':'Năm chi – tháng/ngày âm – giờ chi','later-heaven-object-direction-hour':'Hậu Thiên Đoan Pháp'}[c.method];
 const sections=[{id:'casting',title:'Khởi quẻ: vì sao ra đúng quẻ và hào này?',facts:[fact('Phương pháp',method,'Quy ước bạn đã chọn'),fact('Số chọn thượng quái',`${a.base} chia 8 → số quái ${a.upperRemainder}: ${c.upper.name}`,'Đầu vào gốc / thượng quái'),fact('Số chọn hạ quái',`${a.total} chia 8 → số quái ${a.lowerRemainder}: ${c.lower.name}`,'Đầu vào gốc / hạ quái'),fact('Số chọn hào động',`${a.movingSeed} chia 6 → hào ${c.changingLine}`,'Tổng chọn hào động; dư 0 quy về 6')],explanation:'Số dư quái 0 được quy về 8. Hào đếm từ dưới lên; vị trí quái không được đảo theo hướng nhìn hình.',questions:['Các con số và phương pháp đã được chốt trước khi xem kết quả chưa?','Nếu dùng lịch âm hoặc vật tượng, bạn đã kiểm tra quy đổi và dị bản chưa?']},
 {id:'body-use',title:'Thể – Dụng: xác định chủ thể của phép so sánh',facts:[fact('Thể',`${c.body.name} (${c.body.element}) ở ${depth.bodyLocation==='upper'?'thượng':'hạ'} quái`,'Quái không chứa hào động'),fact('Dụng',`${c.use.name} (${c.use.element})`,'Quái chứa hào động'),fact('Chiều quan hệ',c.relationshipPerspective,'Từ ngũ hành Thể → ngũ hành Dụng')],explanation:'Thể là mốc so sánh cấu trúc, không phải hệ thống đã xác định con người hoặc đối tượng ngoài đời. Đảo Thể/Dụng sẽ đổi chiều quan hệ.',questions:['Đối tượng bạn muốn khảo sát có được mô tả rõ không?','Bạn đang đọc quan hệ từ Thể sang Dụng hay đã vô tình đảo chiều?']},
 ...depth.layers.map(layer=>({id:layer.id,title:layer.stage,facts:[fact('Quái đang đối chiếu',`${layer.trigram.name} (${layer.trigram.element})`,layer.what),fact('Quan hệ với Thể',layer.relation.label,`Thể ${c.body.name} → ${layer.trigram.name}`)],explanation:`${layer.relation.summary} Đây là quan hệ biểu tượng tại lớp ${layer.stage}; nhãn ban đầu/trung gian/sau biến không xác định lịch thời gian xảy ra sự kiện.`,questions:['Quan hệ ở lớp này có khác các lớp còn lại không?','Thông tin thực tế nào cần có để kiểm tra giả thuyết thay vì chỉ đọc hình tượng?']})),
 {id:'countercheck',title:'Phản kiểm: điều gì phải giữ và điều gì được đổi?',facts:[fact('Hào được đảo',`Chỉ hào ${c.changingLine}; ${trace.lines.find(l=>l.changing).before} → ${trace.lines.find(l=>l.changing).after}`,'So quẻ chủ với quẻ biến'),fact('Hạ hỗ / thượng hỗ','2–3–4 / 3–4–5','Lấy từ sáu hào quẻ chủ'),fact('Bất biến của Thể',`${c.body.name} được giữ trong quẻ biến`,'Quái không chứa hào động')],explanation:'Một quẻ chủ có thể có hào động khác khi đổi phương pháp. Cùng quẻ chủ không chứng minh cùng Thể/Dụng hoặc cùng kết quả nghiên cứu.',questions:['Nếu cộng giờ theo Hậu Thiên, hào động và Thể/Dụng có đổi không?','Nếu số đầu vào sai một đơn vị, kết quả nào sẽ phải tính lại?']}];
 const pure=c.original.bits==='111111'||c.original.bits==='000000';
 const gaps=['Chưa xét vượng suy theo lịch thực, tư lệnh hoặc ứng kỳ.','Phương pháp hai số là profile giản lược của công cụ; không gộp với phép số vật cộng giờ.','Đầu vào lịch âm chưa tự giải quyết dị bản tháng nhuận; tượng vật/phương vị do bạn tự xác minh.'];
 if(pure)gaps.unshift('Quẻ thuần Càn/Khôn: bản chép quyển I có dị bản lấy hỗ từ quẻ biến. Công cụ hiện giữ phép hỗ 2–5 từ quẻ chủ; cần đối chiếu dị bản trước khi luận.');
 return workbook('mai-hoa',`Hồ sơ Mai Hoa · ${c.original.name} → ${c.transformed.name}`,'ready',sections,gaps,[{title:'Mai Hoa Dịch Số · quyển I · khởi quẻ, hào, hỗ',url:'https://zh.wikisource.org/wiki/梅花易數/卷一'},{title:'Mai Hoa Dịch Số · quyển II · Thể Dụng',url:'https://zh.wikisource.org/wiki/梅花易數/卷二'}]);
}
module.exports={buildMaiHoaWorkbook};
