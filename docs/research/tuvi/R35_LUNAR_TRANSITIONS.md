# R35 — kiểm toán tháng nhuận, ranh giới năm âm lịch và giờ Tý

Ngày triển khai: 11/11/2026. **Research-only**: chưa chứng minh hai trường phái tương đương và không thay đổi an sao, cách cục hay quyền Pro.

## Tiếp nối chứng cứ R32–R34

R32 cho 67 lá số thực thi từ nguồn, trong đó 6 ca 1989-08-15 lệch một nhóm chính tinh. R33 truy ngược về sai khác một ngày âm; R34 đối chiếu bốn mốc Sóc NASA, 48/48 ca khác ngày âm, Cục/Mệnh vẫn trùng. Những quan sát này không được dùng để sửa công thức an sao khi lịch đầu vào đã khác. R35 chọn **các ranh giới khác** để đo độ bền của quy trình so chứng cứ.

## Bốn mốc ngày dân sự Việt Nam

| Nhóm | Ngày dương lịch tại Việt Nam | Khẳng định lịch Việt Nam | Nguồn công khai |
| --- | --- | --- | --- |
| Tháng tư nhuận 2020 | 23/05/2020 | Mùng 1 tháng 4 nhuận năm Canh Tý | https://lichngaytot.com/xem-ngay-tot-xau-23-05-2020 |
| Tháng hai nhuận 2023 | 22/03/2023 | Mùng 1 tháng 2 nhuận năm Quý Mão | https://lichngaytot.com/xem-ngay-tot-xau-22-03-2023 |
| Tết 2024 | 10/02/2024 | Mùng 1 tháng Giêng năm Giáp Thìn | https://en.baochinhphu.vn/pm-decides-seven-days-off-for-2024-lunar-new-year-holiday-111231104085606548.htm |
| Tết 2025 | 29/01/2025 | Mùng 1 tháng Giêng năm Ất Tỵ | https://www.census.gov/newsroom/stories/lunar-new-year.html |

Các URL nằm trong fixture và là **nguồn ngày đối chiếu**, không phải xác nhận chung về thuật toán của thư viện. Nguồn tham khảo có thể sử dụng quy ước lịch khác. Cần đối chiếu độc lập nếu muốn khẳng định trường hợp nào là lỗi lịch.

## Thiết kế 72 trường hợp nguồn thật

* 4 mốc × ba ngày (-1, 0, +1) × hai giới tính giả lập (Nam/Nữ) × giờ 00:00 / 01:00 / 23:00 = **72 lá số tổng hợp**, không dùng ngày sinh cá nhân.
* Checkout đúng `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, cài đúng `iztro@2.6.1` theo lockfile. Chạy trực tiếp `generateChart` trong thư mục checkout riêng.
* Lưu cả hai giá trị nguồn/Thiên Đồ: năm/tháng/ngày âm, cờ tháng nhuận, Ngũ hành Cục, tọa chi Tử Vi, tọa chi Mệnh; phân loại `same-lunar-date`, `different-lunar-day`, `different-month-or-leap`, `different-lunar-year`.
* Bảng `byAnchor` và `byHour` cho phép phân tích khác biệt theo mốc và đồng hồ; không dùng quy tắc làm tròn hoặc ép hai chart giống nhau.

### Giới hạn đặc biệt của giờ Tý

Nguồn ghim `generateChart` nhận **địa chi giờ**, không nhận timestamp kèm phút và múi giờ. Trên dữ liệu thí nghiệm, **23:00 và 00:00 đều truyền chi Tý (0)**; 01:00 truyền chi Sửu (1). Vì vậy việc hai chart có / không lệch không tự chứng minh quy tắc *Tý đầu / Tý cuối*, đổi ngày vào 23:00, hoặc cách quy đổi ngày theo múi giờ. Giữ `sourceLateZiRolloverVerified=false`, `sourceCalendarTimezoneExplicitlyVerified=false`.

## Cổng kiểm chứng

* `tests/v111678-tuvi-r35-lunar-transition.test.cjs` kiểm ngày chuẩn cố định, đủ 72 ca, ID/giờ/nguồn/SHA không giả, khả năng ghi lại bất đồng hợp lệ mà không đánh lỗi giả, invariant chart, 31/49.
* `.github/workflows/tuvi-lunar-transitions-r35.yml` thực sự chạy nguồn ghim, yêu cầu `THIENDO_R35_REQUIRE_GENUINE=1`, lưu JSON quan sát và báo cáo 14 ngày.
* Mốc **31/49 điều kiện ánh xạ kỹ thuật** giữ nguyên; `semanticEquivalenceVerified`, `sourceSchoolParityVerified`, `localPatternVerdictsVerified`, `sourceLateZiRolloverVerified` đều **false**.
* Chỉ gộp khi Source Integrity PASS, Full Stack PASS, Production Acceptance **5/5 PASS**, và workflow R35 nguồn thật PASS **trên cùng HEAD SHA**. Không bỏ qua WebKit hoặc chấp nhận kết quả không chạy nguồn.

## Việc tiếp theo

Nếu có bất đồng ở bước ngày âm/tháng nhuận, tách lớp chuẩn lịch Việt Nam và lịch nguồn trước khi kiểm Cục/chính tinh. Nếu chỉ sai tại giờ 23:00, cần kiểm tra được cách nguồn chuyển **ngày dân sự** trước khi đề xuất sửa engine. Không tự bổ sung cách cục mới từ tập quan sát này.
