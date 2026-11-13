# R59 — Truy vết ngày đầu tháng âm và hằng số thời gian trong thư viện nguồn

**Ngày:** 13/11/2026. **Repository nguồn ghim:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`.

## Bằng chứng nền

R57: dùng cùng ngày sinh 15/08/1989 (nam, 00:00), engine nguồn trả ngày âm 14/07; Thiên Đồ trả ngày 15/07. Khi chỉ đổi đầu vào Thiên Đồ sang ngày âm nguồn, vị trí Tử Vi và Liêm Trinh khớp nguồn, nhưng đó là lá số giả định khác đầu vào chứ không chứng minh ngày nào đúng.

R58: hai đường thư viện nguồn `lunar-javascript@1.7.7` và `lunar-typescript@1.8.6` (thông qua `iztro@2.6.1`) khớp trong 32 ca; ba tiến trình TZ=UTC, Asia/Ho_Chi_Minh, Asia/Shanghai đều cho cùng kết quả. Ngày đầu tháng 07/1989 theo nguồn là **02/08/1989 dương**.

## R59 xác định rõ điều gì

R58 mới quan sát đầu ra; R59 truy sâu **cấu trúc tính tháng âm** qua các API thực sự có trong hai bộ thư viện đã khóa:

- `LunarMonth.fromYm(year, month).getFirstJulianDay()` và `Solar.fromJulianDay(...)`: đọc trực tiếp ngày Julian và ngày dương đầu tháng âm, đồng thời xác nhận ngày đó là mùng 1 trong **chính thư viện**.
- Ghi 5 tháng đối chiếu riêng trong hai thư viện: tháng 07/1988, tháng 06–08/1989, tháng 07/1990. Mục tiêu là cô lập ranh giới 07/1989 và những tháng kế cận.
- `ShouXingUtil.ONE_THIRD`: đọc hằng số thời gian toán học ngay từ runtime `lunar-javascript` và `lunar-typescript`; đối chiếu hằng số `1/3` ngày = 8 giờ. Lưu SHA-256 của phương thức `shuoHigh`, `shuoLow`, `calcShuo` tại runtime để truy xuất đúng gói đã ghim thay vì chép mã thư viện hoặc dựa trên master mới hơn.
- Đọc 01/08, 02/08, 15/08/1989 từ **cả hai thư viện** và kiểm tra chính xác với artifact R58 genuine trước đó. Chặn sai commit, sai phiên bản lockfile, mất/thừa ca, thay giả Julian Day, ngày âm hoặc hằng số.

Dòng nguồn dự kiến: `Solar` → `LunarYear/LunarMonth` → `ShouXingUtil` (tính sóc và tiết khí). Đường chi tiết ở phiên bản ghim chỉ được công nhận sau khi chính runtime và phương thức tương ứng đã chạy trong CI; tên hàm ở nhánh mới nhất không thay cho mã 1.7.7/1.8.6.

## Phân biệt kết luận kỹ thuật và học thuật

Nếu hai thư viện cùng ghi `1989-08-02` là ngày đầu tháng 07 âm và đều chứa hằng số tám giờ, R59 sẽ xác nhận **dữ liệu ranh giới và hằng số tính toán của hai dependency nguồn tại phiên bản khóa**. Điều đó có ý nghĩa làm cơ sở cho nghiên cứu tiếp: có một thành phần dịch tám giờ trong thuật toán thiên văn của thư viện nguồn.

Tuy nhiên **không được nhầm hằng số 8 giờ với chứng minh toàn bộ phép lịch nguồn dùng UTC+8**, càng không tự suy ra người sinh tại Việt Nam phải chuyển sang lịch Trung Quốc. Để kết luận chính sách lịch còn cần chứng minh thuật toán cụ thể áp dụng hằng số như thế nào với sóc 1989 và đối chứng nguồn thiên văn độc lập qua nhiều tháng. Không tự thêm UI chuyển trường phái hoặc đổi lịch mặc định.

Toàn bộ cờ `sourceNewMoonTimeConventionFullyVerified`, `alternativeVietnamCalendarVerified`, `localChartCalendarErrorVerified`, `rootCauseVerified`, `expertReviewed`, `semanticEquivalenceVerified`, `sourceSchoolParityVerified`, `mayChangeChartRules`, `mayEnableCalendarSchoolMode` đều **false**. Tiến độ nghiên cứu giữ **31/49**.

## Thay đổi mã và cổng nghiệm thu

Chỉ thêm hai script R59 (một probe TS chạy trong checkout nguồn bất biến, một evaluator JS), một tài liệu và mở rộng test/workflow R33 đang có. Không thay engine, lá số, UI, API, SQL, AI, phân quyền hoặc dữ liệu thật.

Cổng gộp: **R33 genuine có R57/R58/R59**, Source Integrity, Full Stack, Production Acceptance **5/5** đều PASS trên cùng SHA; không cho phép dùng artifact đã thay thế bằng fixture giả. Sau gộp kiểm tra lại `main`.
