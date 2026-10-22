# V11.111 — Cách cục Can theo Diễn Nghĩa

Quyết định ngày 13/10/2026, ghi trước thuật toán. Giữ Thời gia Chai Bổ – Chuyển Bàn. Đợt này chỉ nhận diện hai điều kiện Can: Thanh Long Hồi Thủ và Phi Điểu Điệt Huyệt; chưa triển khai vượng suy, ứng kỳ hoặc kết luận sự kiện.

Nguồn chính đã đọc: [Độn Giáp Diễn Nghĩa, bản cố định 2082234](https://zh.wikisource.org/w/index.php?title=遁甲演義&oldid=2082234), mục 青龙回首 và 飞鸟跌穴. Mục Phi Điểu nói rõ Thiên Bính gia Giáp tuần đầu của giờ; mục Thanh Long nêu Giáp gia Bính và ví dụ Giáp Tý Mậu. Áp dụng Giáp của tuần giờ cho cả hai là **quy ước nghiên cứu được chọn**, không phải xác nhận mọi trường phái hoặc mọi ví dụ trong bản chép. Bản chép có ví dụ/cách diễn đạt cần thẩm định thêm; chưa kiểm chứng ảnh bản in.

Bảo Giám Ngự Định, mục 凡例, nhắc hai cách cục và nhấn mạnh phải xét thêm điều kiện, gồm Canh làm Trực Phù. Chỉ dùng làm ngữ cảnh giới hạn, không dùng để xác nhận ma trận sáu tuần. Không lấy tên cách cục làm kết luận cát/hung.

## Bảng đối chiếu độc lập

| Tuần giờ | Can ẩn Giáp | Thanh Long: Thiên / Địa | Phi Điểu: Thiên / Địa |
|---|---|---|---|
| Giáp Tý | Mậu | Mậu / Bính | Bính / Mậu |
| Giáp Tuất | Kỷ | Kỷ / Bính | Bính / Kỷ |
| Giáp Thân | Canh | Canh / Bính | Bính / Canh |
| Giáp Ngọ | Tân | Tân / Bính | Bính / Tân |
| Giáp Thìn | Nhâm | Nhâm / Bính | Bính / Nhâm |
| Giáp Dần | Quý | Quý / Bính | Bính / Quý |

Fixture nhập tay trước thuật toán tại `tests/fixtures/qimen-v11111-patterns-independent.json`. Bảng là kiểm chứng kỹ thuật của quy ước đã chọn; không phải phản biện chuyên gia độc lập.

Đọc Thiên Can đang biểu diễn và Địa Can tại cùng cung; tuyệt đối không đảo chiều, không cố định Giáp thành Mậu ở cả sáu tuần. Trung 5 không có Thiên Can riêng: ghi quy ước Trung 5. Nếu Thiên Bính hoặc Can ẩn Giáp nằm ở Trung 5 và chưa biểu diễn Can ký, kết quả toàn cách cục là chưa biểu diễn, không phải không có. Không có giờ: chưa tính. Thiếu/sai/giả bàn: từ chối qua kiểm định tái dựng hiện có.

Giao diện chuyên sâu hiển thị cặp Can, tuần giờ, trạng thái và nguồn. Không cộng hai dấu này vào chứng cứ thuận của lớp đọc câu hỏi V11.110. Vượng suy phải có hợp đồng mùa/nguyệt lệnh và dị bản riêng trước khi triển khai.
