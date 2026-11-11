# R38 — giao diện so sánh hai quy ước giờ Tý

**Phạm vi:** giao diện nghiên cứu tùy chọn trong `/chart`; không đổi thuật toán mặc định, API lập lá số, hợp đồng lưu, trang quản trị hoặc giấy phép.

## Luồng sử dụng

1. Người dùng lập một lá số bằng ngày sinh dương hoặc âm (được engine chuyển thành ngày dương chính thức). Nếu giờ sinh là **23:00–23:59**, tại các nút của lá số sẽ xuất hiện **So sánh quy ước giờ Tý**.
2. Trạng thái ban đầu luôn **đóng**. Chỉ khi nhấn mở, React tải component chuyên biệt và lập thêm một lá số giả định bằng **ngày dân sự kế tiếp** với cùng giờ/phút/giới tính. Mọi chức năng **Lưu lá số**, PNG, In/PDF, JSON vẫn tham chiếu lá số gốc.
3. Hai bảng 12 địa chi A (đang dùng) và B (giả định) so bằng cung, Thân và 14 chính tinh. Cung khác nhau có nhãn **Có thay đổi**; sao đổi vị trí được in nổi và gạch chân. Nhấn cùng địa chi ở bên A/B sẽ cập nhật phần đọc chi tiết hai phương án.
4. Tùy chọn **Chỉ xem địa chi thay đổi** chỉ lọc hiển thị; không làm mất dữ liệu. Bảng tổng hợp sáu chỉ số đối chiếu ngày âm, Mệnh, Thân, Cục, Tử Vi và Thiên Phủ.
5. Khi nhập giờ ngoài 23:00–23:59 không hiện điều khiển. Ngày 31/12/2100 không tạo kịch bản B ngoài phạm vi engine mà hiển thị lý do. Thay đổi thông tin đầu vào xóa lá số hiện có theo luồng sẵn có và đóng lại bảng so sánh.

## Kỹ thuật

- `apps/web/src/features/chart/lib/late-zi-compare-model.cjs`: lớp so sánh hai kết quả engine 12 cung/14 sao, từ chối dữ liệu thiếu, trùng sao, khác giới tính/giờ hoặc không phải hai ngày liên tiếp.
- `apps/web/src/features/chart/components/late-zi-compare-panel.tsx`: giao diện `useMemo`, chỉ tính kịch bản B khi được mở; không có submit, POST, mutate hay chọn phương án B để lưu.
- `apps/web/src/features/chart/components/late-zi-compare-panel.module.css`: ngà/xanh ngọc/vàng nhạt theo biến theme; hai bảng trên màn hình rộng, mỗi bảng 12 địa chi bố trí đúng vòng **4×4 (Tỵ–Ngọ–Mùi–Thân ở hàng trên, Dần–Sửu–Tý–Hợi ở hàng dưới)** bao quanh trung tâm, không ép 12 thẻ vào lưới 3 cột thiếu ngữ cảnh. Tablet xếp từng bảng dọc; màn hình 390px chuyển thành hai cột thẻ để không giảm cỡ chữ và ẩn tâm vòng; text/viền đánh dấu khác biệt, giảm chuyển động.
- `apps/web/src/features/chart/components/chart-result.tsx`: lazy import, chỉ hiện nút cho `result.hour===23`.
- `tests/v111681-tuvi-r38-compare-ui-model.test.cjs`: kiểm 16 cặp lá số như R37, toàn bộ sao, ngày nhuận/Tết, trường thay đổi, đóng dấu chỉ nghiên cứu, bất biến đầu vào, từ chối dữ liệu lạ.
- `tests/helpers-late-zi-compare-browser.cjs`: kiểm hành trình thực 390px/1440px trong quy trình `account.browser.cjs`, so ngày B, bộ lọc, nhóm cung, aria-pressed đồng bộ, không tràn chiều rộng, không sửa ngày sinh, không hiện nút với giờ 22.
- Workflow `tuvi-late-zi-ui-r38.yml`: chạy kiểm tra model/typecheck riêng. Toàn bộ CI chung vẫn phải PASS **Source Integrity, Full Stack, Production Acceptance 5/5** trước khi gộp.

## An toàn học thuật và nghiệp vụ

Hiện Thiên Đồ **giữ ngày dân sự đã nhập** tại 23 giờ. Kịch bản B chỉ giải thích hậu quả đổi ngày khi an sao trong cùng engine; **không xác nhận chính sách nào đúng**. Chưa kiểm chứng giờ mặt trời thực, lịch sử múi giờ, địa lý nơi sinh, việc ngày âm đầu năm được xử lý theo trường phái nào. Không được dùng R38 làm cớ tự tăng số điều kiện ánh xạ **31/49**.

**Nghiệm thu:** kiểm R38 độc lập PASS, kiểm tra phone/desktop thật trên Playwright ở Production Acceptance PASS và 3 cổng chung còn lại PASS trên cùng HEAD SHA. Chỉ khi đủ điều kiện mới gộp `main`.
