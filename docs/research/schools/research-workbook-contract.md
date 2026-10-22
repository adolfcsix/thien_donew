# V11.113 — Hoàn thiện hồ sơ đối chiếu, không thêm luật luận đoán

Quyết định 13/10/2026. Nền V11.112. Phạm vi: nối các lớp đã có vào hồ sơ giải thích, kiểm định lại đầu vào gốc, đưa các dữ kiện hiện/phục/đa hiện Lục Hào vào **không gian nghiên cứu chuyên sâu có xác nhận**.

## Mai Hoa

Tái dựng kết quả từ đúng profile và đầu vào gốc; từ chối quẻ/hào/Thể/Dụng/hỗ/biến đã bị sửa. Hồ sơ giải thích phép chia dư, vị trí Thể/Dụng, bốn lớp đối chiếu, bất biến và câu hỏi phản kiểm. Nguồn đối chiếu mới mở: Mai Hoa Dịch Số quyển I (khởi quẻ, hào, hỗ) và quyển II (Thể Dụng). Bản chép quyển I có đoạn Càn/Khôn vô hỗ, hỗ theo quẻ biến: giữ rõ dị bản cho quẻ thuần, không tự đổi thuật toán mặc định hoặc gộp hai phép.

## Kỳ Môn

Dùng xác nhận câu hỏi hiện có V11.110. Khi chưa xác nhận/chưa có giờ/chưa định vị Dụng thần, không dựng hồ sơ giả. Khi định vị được: nối nguyệt khí **của đúng biểu tượng**, các lớp tại cung Dụng thần/cung tham chiếu/đối cung, Môn Bách, Nhập Mộ và cặp Can. Bát Thần vẫn ngoài phạm vi nguyệt khí. Bỏ thông báo thiếu bảng nguyệt khí chỉ khi bảng thật đã được tính; giữ thiếu kiểm chứng/luận đoán tổng hợp. Mọi dấu vẫn giữ tên và chiều riêng; không cộng điểm hoặc chọn kết cục.

## Lục Hào

Các văn bản V11.98–99 trước đây giữ module cách ly khỏi sản phẩm. Quyết định đợt này chỉ mở **dữ kiện nghiên cứu** trong chế độ Chuyên sâu, có chọn phạm vi và xác nhận Lục Thân, không mở kết luận luận đoán. Tái sử dụng nguyên bảng V11.97–99 và cổng kiểm định chart/context. Các điểm chưa được chuyên gia thẩm định tiếp tục hiển thị là giới hạn.

Giữ đủ ứng viên hiện/phục, không xếp hạng. Phục Thần không nhận động/tĩnh của Phi Thần. Thiếu lịch giữ UNKNOWN, không chuyển thành ABSENT. Nguyệt Phá chỉ lấy tháng thủ công; lịch trưa gần đúng không tự thành tháng đã nghiệm chuẩn. Mốc UTC tùy chọn chỉ đối chiếu bảng Jie hiện có; nếu ngoài phạm vi, sát giao tiết hoặc mâu thuẫn tháng thì chặn hồ sơ.

## Riêng tư và vòng đời

Đổi quẻ/thời bàn/lịch/phạm vi/câu hỏi hoặc quay A→B→A làm mất hiệu lực xác nhận. Không lưu xác nhận/câu hỏi lên backend hoặc URL. Xuất Markdown chỉ khi người dùng bấm nút; không đưa nội dung câu hỏi Kỳ Môn vào tệp. Không hứa khôi phục phần ghi chú/xác nhận chỉ được giữ trong phiên.

## Định nghĩa chiều sâu

Mỗi lớp phải có dữ kiện thật, căn cứ chọn lớp, giải thích chiều quan hệ, câu hỏi phản kiểm và điều chưa đủ. Nhiều đoạn văn không thay thế dữ liệu hoặc phép kiểm. Nguồn cổ được ghi là bản chép số, không nhận là ảnh bản in hoặc phản biện chuyên gia.

## Nghiệm thu

Kiểm thử profile/biên/đầu vào giả; Mai Hoa đủ 64 quẻ và 6 hào; Kỳ Môn các lớp Dụng thần, Trung 5, Thiên Cầm ký, thiếu giờ/xác nhận; Lục Hào mọi 64 quẻ×5 phạm vi, đa hiện/Phục Thần/lịch thiếu/mâu thuẫn tháng. Trình duyệt thực phải mở/đổi đầu vào/xác nhận/xuất tệp/hủy hiệu lực và không tràn ở 320/390/768/1440px. Không coi kiểm tra nguồn hoặc Chromium ẩn danh là PostgreSQL hay Windows E2E.
