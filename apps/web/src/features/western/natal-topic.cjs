'use strict';
/** Editorial lenses project the saved report, never recalculate celestial positions. */
const TOPICS=[
 {id:'self',title:'Bản thân và nền tảng',bodies:['Sun','Moon','Saturn'],houses:[1,4,12],question:'Điều bạn muốn thể hiện có phù hợp với nhu cầu nghỉ ngơi và ranh giới hiện tại?',exercise:'Ghi hai tình huống: khi bạn chủ động lựa chọn và khi chỉ phản ứng. So sánh hoàn cảnh, nhu cầu và giới hạn.',counter:'Hành vi có thể đến từ áp lực và môi trường, không phải một nét tính cách cố định.'},
 {id:'work',title:'Công việc và nguồn lực',bodies:['Sun','Mercury','Saturn'],houses:[2,6,10],question:'Vai trò mong muốn, cách xử lý thông tin và nhịp làm việc đang hỗ trợ hay cản trở nhau?',exercise:'Chọn một nhiệm vụ: viết tiêu chuẩn hoàn thành, nguồn lực, bước giao tiếp cần thiết và thời điểm nhận phản hồi.',counter:'Kỹ năng, cơ hội và điều kiện làm việc có thể giải thích kết quả tốt hơn biểu tượng của lá số.'},
 {id:'relationship',title:'Quan hệ và giao tiếp',bodies:['Moon','Venus','Mars'],houses:[5,7,11],question:'Bạn đang cần cảm giác an toàn, sự đồng thuận hay khả năng nói rõ điều mình muốn?',exercise:'Chuẩn bị một quan sát cụ thể, một nhu cầu của mình và một đề nghị có thể thương lượng. Hỏi lại cách người kia hiểu.',counter:'Không suy cảm xúc, sự chung thủy hoặc ý định của người khác từ lá số của bạn.'},
 {id:'learning',title:'Học tập và phát triển',bodies:['Mercury','Jupiter','Saturn'],houses:[3,9,11],question:'Bạn cần thu thập thông tin, mở rộng góc nhìn hay xây cấu trúc luyện tập?',exercise:'Đặt mục tiêu học nhỏ, một nguồn cần kiểm tra và một sản phẩm tự đánh giá sau bảy ngày. Ghi cả điều chưa hiểu.',counter:'Cách học thay đổi theo nhiệm vụ và luyện tập; một cấu hình không giới hạn khả năng học.'}
];
function buildNatalTopic(report,id){
 const topic=TOPICS.find(t=>t.id===id);if(!topic)throw Error('Chủ đề Natal chưa hỗ trợ.');
 if(report?.format!=='thien-do.western-depth'||report.planets?.length!==10||report.houses?.length!==12||!Array.isArray(report.aspects))throw Error('Cần báo cáo Natal đầy đủ.');
 const planets=topic.bodies.map(body=>{const p=report.planets.find(p=>p.body===body);if(!p?.profile||!Number.isFinite(p.longitude))throw Error('Thiếu dữ kiện hành tinh.');return {body,name:p.profile.name,sign:p.sign,house:p.house,longitude:p.longitude,reading:p.reading,question:p.profile.question,practice:p.profile.practice,caution:p.profile.caution};});
 const houses=topic.houses.map(number=>{const h=report.houses.find(h=>h.number===number);if(!h?.ruler||!h.profile)throw Error('Thiếu dữ kiện nhà.');return {number,area:h.profile.area,sign:h.sign,ruler:{...h.ruler},occupants:[...h.occupants],question:h.profile.question};});
 const aspects=report.aspects.filter(a=>topic.bodies.includes(a.first)||topic.bodies.includes(a.second)).map(a=>({first:a.first,second:a.second,firstName:a.firstName,secondName:a.secondName,name:a.name,orb:a.orb,targetAngle:a.targetAngle,reading:a.reading,question:a.guide?.question||'',notice:a.notice}));
 return {format:'thien-do.natal-topic',version:1,topic:id,title:topic.title,question:topic.question,exercise:topic.exercise,counter:topic.counter,planets,houses,aspects,scope:'Lăng kính học tập do Thiên Đồ biên soạn trên dữ kiện Natal hiện có; không phải phương pháp tính mới hoặc kết luận cá nhân.'};
}
module.exports={TOPICS,buildNatalTopic};
