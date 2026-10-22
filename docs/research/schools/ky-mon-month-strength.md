# V11.112 — Hợp đồng vượng suy nguyệt lệnh

Ghi trước thuật toán, 13/10/2026. Phép an bàn giữ **Thời gia Chai Bổ – Chuyển Bàn**. Đây là lớp đối chiếu ngũ hành theo **Chi tháng tiết khí**, không phải bộ luận đoán tổng hợp.

## Nguồn và quyết định

1. [Bảo Giám Ngự Định, bản 2353651](https://zh.wikisource.org/w/index.php?title=奇门宝鉴御定&oldid=2353651), phần chú thích bài ca sau mục phối Cửu Tinh ngũ hành: đồng hành là Tướng, sao sinh hành tháng là Vượng, sao khắc hành tháng là Hưu, tháng khắc sao là Tù, tháng sinh sao là Phế. Dùng riêng cho Cửu Tinh.
2. [Tam Mệnh Thông Hội, quyển II](https://zh.wikisource.org/zh-hant/三命通會/卷二), mục 論五行旺相休囚死並寄生十二宮: bảng ngũ hành thông thường theo mùa. Dùng cho **ngũ hành** của Môn và Can trong cấu hình nghiên cứu này; đây là quyết định áp dụng của Thiên Đồ, không nói tác phẩm này đưa ra thuật toán Kỳ Môn nguyên dạng.
3. [Độn Giáp Diễn Nghĩa, bản 2082234](https://zh.wikisource.org/w/index.php?title=遁甲演義&oldid=2082234), quyển III mục 九星所属: đoạn văn nói sao Vượng ở tháng đồng hành, Tướng ở tháng sao sinh, khác Bảo Giám. Bảng ngay sau đó có tiêu đề/cách căn cột không rõ và nhãn khác đoạn văn. Ghi dị bản, **không trộn** vào phép tính mặc định.
4. [Kỳ Môn Độn Giáp Thống Tông](https://zh.wikisource.org/zh-hant/奇門遁甲統宗), các mục ngũ hành Can/Môn và 旺相休囚: đối chiếu thuộc tính biểu tượng và sự khác biệt bảng sao với ngũ hành thông thường; không coi là xác nhận toàn bộ trường phái.

Nguồn là bản chép số đã đọc; chưa kiểm chứng ảnh bản in/chuyên gia. Không sao chép các đoạn dự báo lịch sử thành lời khuyên hoặc kết quả sự kiện.

## Nguyệt lệnh và ranh tiết

Dùng tháng **tiết khí**: Lập Xuân/Vũ Thủy → Dần; Kinh Trập/Xuân Phân → Mão; Thanh Minh/Cốc Vũ → Thìn; Lập Hạ/Tiểu Mãn → Tỵ; Mang Chủng/Hạ Chí → Ngọ; Tiểu Thử/Đại Thử → Mùi; Lập Thu/Xử Thử → Thân; Bạch Lộ/Thu Phân → Dậu; Hàn Lộ/Sương Giáng → Tuất; Lập Đông/Tiểu Tuyết → Hợi; Đại Tuyết/Đông Chí → Tý; Tiểu Hàn/Đại Hàn → Sửu.

Đây là bảng tháng tiết khí đã chọn cho tầng đối chiếu, không dùng tháng âm lịch, không dùng tháng dương lịch hay tháng tướng đổi ở trung khí. Bàn nhập tay kế thừa tiết khí đã xác nhận; chế độ lịch pháp chỉ lập được bàn khi vượt cổng xác minh V11.77. Lớp này không tự tính thêm giờ giao tiết. Thìn/Tuất/Sửu/Mùi dùng hành Thổ **toàn tháng chi** theo quy ước nghiên cứu; chưa xét Thổ vượng 18 ngày cuối mùa, phân nhật tư lệnh hay tàng Can. Không gọi là chứng minh nguyệt lệnh đúng mọi dị bản.

## Bảng độc lập: hàng là hành biểu tượng, cột là hành tháng

| Ngũ hành Môn/Can | Mộc | Hỏa | Thổ | Kim | Thủy |
|---|---|---|---|---|---|
| Mộc | Vượng | Hưu | Tù | Tử | Tướng |
| Hỏa | Tướng | Vượng | Hưu | Tù | Tử |
| Thổ | Tử | Tướng | Vượng | Hưu | Tù |
| Kim | Tù | Tử | Tướng | Vượng | Hưu |
| Thủy | Hưu | Tù | Tử | Tướng | Vượng |

| Cửu Tinh — Bảo Giám | Mộc | Hỏa | Thổ | Kim | Thủy |
|---|---|---|---|---|---|
| Mộc | Tướng | Vượng | Hưu | Tù | Phế |
| Hỏa | Phế | Tướng | Vượng | Hưu | Tù |
| Thổ | Tù | Phế | Tướng | Vượng | Hưu |
| Kim | Hưu | Tù | Phế | Tướng | Vượng |
| Thủy | Vượng | Hưu | Tù | Phế | Tướng |

`tests/fixtures/qimen-v11112-month-strength-independent.json` nhập tay trước thuật toán; không import dữ liệu sản xuất. Kiểm tra toàn 50 ô, 24 mốc tiết, 12 Chi và bàn thời gian thực. Đây là tính độc lập của bảng kiểm thử, không phải phản biện bởi người thứ hai.

## Ranh giới biểu diễn

Chỉ xét **biểu tượng thời bàn đang có**. Chưa có giờ: chưa tính, không dùng bản vị thay thời bàn. Trung 5: quy ước riêng; không tự ký Can. Thiên Cầm được hiển thị riêng cùng Thiên Nhuế ở cung ký, hành Thổ, không thay thế hoặc nhân đôi sao gốc tại Trung 5. Bát Thần chưa xét. Tử/Phế là thuật ngữ trạng thái khí theo bảng, không phải dự báo tử vong hay vận hạn.

Giữ riêng quan hệ sinh/khắc cung, Môn Bách, Nhập Mộ và cách cục Can. Vượng suy không tự thay đổi dấu cách cục, không gắn điểm, không quyết định dụng thần hoặc kết quả câu hỏi.
