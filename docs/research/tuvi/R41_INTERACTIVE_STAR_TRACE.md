# R41 — định vị tương tác nguồn/đích của chính tinh trong hai địa bàn

**Phạm vi:** một công cụ nghiên cứu chỉ đọc dựa trên R40; không đổi quy ước ngày sinh, công thức Tử Vi hoặc bất kỳ đường ghi dữ liệu nào.

## Vấn đề và cải tiến

Trong R40, mỗi dòng chính tinh đã ghi rõ vị trí nguồn A và đích giả định B, nhưng để tìm hai vị trí trên 12 cung, người nghiên cứu vẫn phải dò thủ công. R41 cho phép nhấn **tên sao** ở mục Hành trình chính tinh để đánh dấu đúng hai ô địa chi tương ứng.

Khi chọn một sao:
- Mục đang chọn có trạng thái `aria-pressed=true`, có thể thao tác bằng bàn phím.
- Bảng A gắn `data-star-endpoint="source"` trên duy nhất địa chi gốc; bảng B gắn `data-star-endpoint="destination"` trên duy nhất địa chi giả định.
- Hai ô có viền nổi và nhãn chữ **Vị trí A/B của ...**, không phụ thuộc màu sắc.
- Thông báo dưới bảng ghi rõ tên sao, địa chi và tên cung ở cả hai phương án.
- Nhấn lại tên sao sẽ bỏ chọn. Nhấn một địa chi bất kỳ sẽ xóa trạng thái định vị sao, nhường lại trải nghiệm xem cung hiện tại.

Không thêm nút thừa cạnh 12 cung, không tự cuộn hai biểu đồ gây mất định hướng trên điện thoại, không vẽ các đường che tên sao. Trên mobile 390px, hai bảng xếp dọc như R38/R39, dòng thông báo luôn cho biết hai vị trí cùng lúc.

## Ranh giới bảo vệ

`late-zi-star-navigation.cjs` chỉ chấp nhận sao đã nằm trong `movedStars` của mô hình R38, xác thực vị trí A/B tồn tại ở 12 cung, thực sự khác nhau, và mỗi chính tinh có mặt ở cung nguồn/đích và hai danh sách `movedBefore/movedAfter`. Nếu dữ liệu thiếu hoặc mâu thuẫn, từ chối thay vì chỉ sai ô. Không dùng API hay thao tác lưu.

## Kiểm thử

- `tests/v111684-tuvi-r41-star-navigation.test.cjs`: kiểm chứng 16 cặp lá số giả lập (4 ngày × 2 giới tính × 2 mốc phút) và tất cả sao đổi vị trí, không đổi đầu vào, không đánh dấu giả khi không có sao đổi, từ chối tọa độ lỗi.
- `tests/helpers-late-zi-compare-browser.cjs`: trên trình duyệt thực 390px và 1440px, mở R40, chọn sao đầu tiên, yêu cầu chính xác **một nguồn và một đích**, kiểm nhãn trạng thái, chụp màn hình, sau đó bỏ chọn và kiểm cả hai dấu biến mất.
- `.github/workflows/tuvi-r41-star-navigation.yml`: Source check, R37–R41 regression, TypeScript. Production Acceptance toàn hệ thống phải PASS cả 5 job cùng commit trước merge.
- PR R41 cần được gộp lên nhánh main **sau khi R40 đã được nghiệm thu/gộp**, tránh lặp commit do squash merge.

Không khẳng định cách xử lý giờ Tý nào đúng, không thay đổi timezone, ngày sinh lưu trữ, chính sách Pro, AI, quyền hay chỉ tiêu ánh xạ nguồn **31/49**.
