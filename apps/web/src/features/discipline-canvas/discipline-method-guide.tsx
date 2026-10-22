import Link from 'next/link';
import css from './discipline-method-guide.module.css';
type School='bat-tu'|'mai-hoa'|'luc-hao'|'ky-mon'|'phong-thuy'|'ha-lac'|'thiet-ban'|'dich-hoc'|'thai-at'|'dai-luc-nham';
const guides:Record<School,{input:string;method:string;read:string}>={
 'bat-tu':{input:'Ghi rõ giờ địa phương, âm/dương lịch, múi giờ và ngày cận tiết khí.',method:'Đối chiếu giao tiết và phép an trụ trước khi đọc thập thần, dụng thần hoặc đại vận.',read:'Phân biệt bốn trụ tính được với nhận định phụ thuộc trường phái và độ chính xác giờ sinh.'},
 'mai-hoa':{input:'Chọn cách khởi quẻ: số, thời điểm hoặc tượng; giữ lại đầu vào và quy tắc chọn.',method:'Kiểm quẻ chủ, quẻ hỗ, quẻ biến, hào động và thể–dụng theo cùng hệ quy ước.',read:'Tượng và quan hệ ngũ hành là dấu để luận, không phải bằng chứng cho sự kiện chắc chắn.'},
 'luc-hao':{input:'Lưu sáu hào từ dưới lên cùng ngày và cách xác định Nhật–Nguyệt.',method:'Kiểm quẻ chủ, hào động, Nạp Giáp, Thế–Ứng, Lục Thân và Dụng Thần.',read:'Trường hợp thiếu ngày hoặc chưa xác định Dụng Thần cần giữ kết luận ở mức điều kiện.'},
 'ky-mon':{input:'Nhập ngày giờ, múi giờ và kiểm điểm giao tiết/giờ Tý.',method:'Xác nhận cục, Thiên–Địa bàn, Bát Môn và quy tắc chuyển bàn đã chọn.',read:'Không coi bố cục cung là phép dự báo kết quả thực tế khi thiếu câu hỏi và chứng cứ.'},
 'phong-thuy':{input:'Xác định tọa–hướng, phép đo và hệ quy chiếu phương vị.',method:'Phân biệt độ số la kinh, hướng nhà, trường phái và bảng sao đang được sử dụng.',read:'Đọc như phân tích truyền thống; các quyết định xây dựng vẫn cần khảo sát thực tế.'},
 'ha-lac':{input:'Ghi xuất xứ dữ liệu số, Can Chi, mệnh quái và ngữ cảnh thời điểm.',method:'Đối chiếu Hà Đồ, Lạc Thư, quy tắc số học và quẻ được khởi.',read:'Giữ ranh giới giữa bất biến số học và diễn giải tượng số theo trường phái.'},
 'thiet-ban':{input:'Ghi phiên bản nguồn, thời điểm và chứng bản cho từng điều văn.',method:'Kiểm quy tắc khảo khắc trước khi đối chiếu dị bản hoặc gộp điều.',read:'Một đoạn trùng khớp không xác nhận giờ sinh; mục chưa có nguồn phải để nghiên cứu.'},
 'dich-hoc':{input:'Ghi phương pháp khởi quẻ và thứ tự sáu hào từ dưới lên.',method:'Đối chiếu tên quẻ, quái, hào, đổi quẻ và hào từ theo tài liệu nguồn.',read:'Giải thích biểu tượng nên gắn với quẻ đang hiển thị thay vì lời phán chung chung.'},
 'thai-at':{input:'Ghi năm, lịch pháp, tích niên và quy ước cục số.',method:'Đối chiếu Dương/Âm cục, Chủ–Khách, Thiên/Địa Mục với nguồn dùng.',read:'Khi khác truyền bản, ghi phương pháp thay vì lấp bằng kết luận suy đoán.'},
 'dai-luc-nham':{input:'Ghi ngày giờ, nguyệt tướng và các giả định lịch pháp.',method:'Theo dõi Tứ Khóa, Tam Truyền, Thiên/Địa bàn và Thập Nhị Thiên Tướng.',read:'Chỉ diễn giải các quan hệ có chứng cứ trong bàn được lập, nêu rõ chỗ thiếu.'},
};
/** Context-specific reading checklist; never changes charts or fakes interpretive output. */
export function DisciplineMethodGuide({variant}:{variant:School}){
 const item=guides[variant];
 return <details className={css.guide}><summary>Hướng dẫn đọc sâu và kiểm chứng dữ kiện</summary>
  <ol><li><strong>Đầu vào:</strong> {item.input}</li><li><strong>Đối chiếu phương pháp:</strong> {item.method}</li><li><strong>Giới hạn luận giải:</strong> {item.read}</li></ol>
  <nav><Link href="/research/development">Phạm vi và nguồn nghiên cứu ↗</Link><Link href="/study">Mở Thư phòng lưu hồ sơ ↗</Link></nav>
 </details>;
}
