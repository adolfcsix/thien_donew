# Thiên Đồ — Hiến chương thiết kế đa bộ môn (V11.72)

## Nguyên tắc

Thiên Đồ không sao chép giao diện, menu hoặc nội dung website mẫu. Mỗi bộ môn là một không gian được thiết kế dựa trên lịch sử, hệ khái niệm, dữ liệu đầu vào và mô hình tương tác riêng; dùng chung một nền tảng điều hướng, quyền riêng tư, khả năng tiếp cận và kiểm thử.

| Nhóm | Hướng mỹ thuật | Mô-típ dữ liệu chính | Trạng thái |
| --- | --- | --- | --- |
| Tử Vi Đẩu Số | Đông Á, lụa/mực son, đồng cổ, bố cục địa bàn 12 cung | Cung–sao–vận | Engine hiện có, tiếp tục thẩm định |
| Mai Hoa Dịch Số | Thư phòng Đông Á, giấy trúc/mực | Quái–hào–Thể/Dụng–quẻ hỗ/biến | Hai quy ước khởi quẻ theo âm lịch/hai số, chưa xử lý dị bản |
| Lục Hào | Giấy khảo chứng, mực ấn, bảng từng hào | Hào 6–9 → chuyển hào; về sau Nạp Giáp | Bàn sáu hào, chưa Nạp Giáp |
| Kỳ Môn Độn Giáp | Bản đồ cửu cung, mực lam ngọc/đồng, đồ hình phương vị | Cửu cung Lạc Thư; về sau tiết khí–khởi cục | Địa bàn nền, chưa khởi cục |
| Phong thủy | La kinh, vòng phương vị, xanh ngọc | Độ 360° → 24 sơn → tọa/hướng | Công cụ 24 sơn, chưa Phi Tinh/Bát Trạch |
| Chiêm tinh phương Tây (tương lai) | Bản đồ sao tinh hệ, đen xanh thiên văn, quỹ đạo | Hành tinh, kinh độ, nhà, góc hợp | Chưa triển khai; cần thiên văn/ephemeris |
| Thần số học phương Tây (tương lai) | Chữ số và lưới hình học tối giản, typographic hiện đại | Bảng chuyển tên/ngày theo phương pháp cụ thể | Chưa triển khai |

## Hợp đồng của mỗi công cụ

1. Công khai phương pháp và phiên bản; nêu rõ dữ liệu nào nhập thủ công, dữ liệu nào tính tự động.
2. Engine thuần, không phụ thuộc giao diện; kiểm thử quy tắc và ranh giới riêng.
3. Không gán nhãn kết quả đã tính nếu chưa có thuật toán, bộ quy tắc và kiểm chứng chéo.
4. Chỉ hiển thị giải thích dựa trên dữ liệu hiện có; không tạo lời luận đoán để lấp chỗ trống.
5. UI responsive, keyboard/focus states; màu không phải tín hiệu duy nhất, không giấu lỗi sau hiệu ứng.
6. Tử Vi/Eastern và Western dùng chủ đề khác nhau nhưng không phân đôi luồng tài khoản, quyền riêng tư hay API bảo trì.

## Thứ tự phát triển tiếp sau V11.72

- Mai Hoa: xác minh dị bản tháng nhuận, phương pháp gia số/số bất chợt, lời giải quẻ hỗ, nguyên tắc Thể/Dụng theo cách luận cụ thể.
- Lục Hào: biên soạn bảng 8 cung 64 quẻ + Nạp Giáp từng hào có nguồn và bộ ví dụ kiểm toán; khi xác thực xong mới tiến tới Thế/Ứng, Lục thân, Lục thú, Nguyệt kiến và Nhật thần.
- Kỳ Môn: chốt một trường phái trước khi xây engine; chuẩn hóa tiết khí, âm/dương độn, tam nguyên/cục số và phi/chuyển bàn, rồi kiểm thử các mốc chuyển tiết khí.
- Phong thủy: phân tách Bát Trạch, Huyền Không Phi Tinh và khảo sát hình thế thành module khác nhau; chỉ tính phi tinh khi có quy tắc trường phái, năm xây và hướng đo đáng tin cậy.

## Nguồn tham khảo dành cho đội ngũ (không bắt buộc hiện trong giao diện người dùng)

- Mai Hoa Tiên Thiên 8 số và phép khởi theo năm chi, tháng/ngày âm, giờ chi: https://huyenco.vn/kien-thuc/kinh-dich/mai-hoa-dich-so-va-luc-hao ; đối chiếu https://cohoc.net/mai-hoa.html
- La bàn 24 sơn, độ khởi và điểm biên: https://chinesemetasoft.net/Table/Mountains và https://baguame.com/kb/reference/tables/
- Các bảng và mô hình trong repo chỉ là công cụ nghiên cứu, không được suy ra sự đúng đắn thực nghiệm của các khẳng định huyền học.
