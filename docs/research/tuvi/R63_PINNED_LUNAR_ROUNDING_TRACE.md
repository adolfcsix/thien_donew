# R63 — Truy vết phép làm tròn ngày sóc trong thư viện nguồn ghim

Ngày 15/11/2026. Nền triển khai: R62 đã squash merge qua PR #84 tại `6b799855a9b39d668f65d1fefb8ebd5b4a183292`.
Nguồn giữ nguyên `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`,
`lunar-javascript@1.7.7`, `lunar-typescript@1.8.6`, `iztro@2.6.1`.

## Khoảng trống cần bổ sung

R59 đã ghi ngày đầu tháng âm và hằng số `ONE_THIRD`, nhưng chưa ghi các lời gọi thực sự nối phép tính sóc với ngày được làm tròn. R63 bổ sung dấu vết đó trên đúng năm tháng kiểm soát của R59. Không đổi thuật toán lịch, phép an sao hoặc cách kết luận cách cục của Thiên Đồ.

## Cách đo và kiểm soát

Probe chạy trong checkout nguồn bất biến, kiểm tra cả phiên bản cài đặt và lockfile. Mỗi tháng lấy ngày đầu từ `LunarMonth.fromYm`, gọi trực tiếp `calcShuo` với ngày đó trừ epoch J2000, rồi ghi đầu vào, đầu ra và độ sâu lời gọi của `calcShuo`, `shuoHigh`, `msaLonT2`, `msaLonT`, `dtT`.

Wrapper chỉ chuyển tiếp tới phương thức gốc, không thay tham số hay kết quả; mọi phương thức được phục hồi trong `finally`. Đây là phép đo trực tiếp phương thức tính sóc cho tháng đã chọn, không phải dấu vết toàn bộ quá trình dựng `LunarYear` hoặc mọi nhánh lịch lịch sử.

Evaluator tái sử dụng `auditR59` và bằng chứng R58. Nó kiểm tra hash `calcShuo`/`shuoHigh` khớp R59, đối số pha, đối số hiệu chỉnh thời gian, nhánh tính nhanh/tinh chỉnh, phép cộng hằng số và `floor(value + 0.5)`. Thiếu, trùng, đảo thứ tự hoặc sửa số liệu đều làm kiểm toán thất bại. Kiểm thử số học giả lập chỉ kiểm tra validator; không được công nhận là nguồn chạy thật.

Từ kết quả `shuoHigh`, bỏ phần dịch `1/3` ngày để có **giá trị Julian chưa cộng phần dịch của thư viện**, rồi thử riêng hai phép làm tròn cộng 7 và 8 giờ. Không gọi giá trị đó là thời điểm UTC đã được thiên văn độc lập xác nhận. Ngày đầu tháng Thiên Đồ được lấy từ API hiện có `lunarToSolar(year, month, 1, false)`; không chép hay sửa công thức engine.

## Kết quả đo local trên nguồn ghim

Cả hai thư viện cho cùng kết quả trong bảng. Mỗi dòng dưới tương ứng hai dấu vết, tổng cộng **10**.

| Tháng âm | Ngày đầu theo nguồn | Số học cộng 7 giờ | Số học cộng 8 giờ | Ngày đầu theo Thiên Đồ |
|---|---|---|---|---|
| 07/1988 | 12/08/1988 | 12/08/1988 | 12/08/1988 | 12/08/1988 |
| 06/1989 | 03/07/1989 | 03/07/1989 | 03/07/1989 | 03/07/1989 |
| **07/1989** | **02/08/1989** | **01/08/1989** | **02/08/1989** | **01/08/1989** |
| 08/1989 | 31/08/1989 | 31/08/1989 | 31/08/1989 | 31/08/1989 |
| 07/1990 | 20/08/1990 | 20/08/1990 | 20/08/1990 | 20/08/1990 |

Ở tháng 07/1989, giá trị Julian chưa cộng phần dịch đo được là `2447740.1705425666`. Phép làm tròn cộng 7 giờ cho `2447740`, cộng 8 giờ cho `2447741`. Cả mười phép cộng 8 giờ tái tạo ngày nguồn; cả mười phép cộng 7 giờ khớp ngày đầu tháng Thiên Đồ trong mẫu. Chỉ tháng 07/1989 đổi ngày giữa hai phép thử.

Chạy lại nguồn R33/R58/R59/R61 và kiểm thử R33+R62+R63 local đạt **17/17 PASS, không bỏ qua bài nào** với `THIENDO_R33_REQUIRE_GENUINE=1`. Đây là kết quả local; trạng thái CI của HEAD phải kiểm tra riêng. Artifacts mới: `.r63-source-lunar-rounding-trace.json` và `.r63-lunar-rounding-audit.json`, lưu trong workflow R33 hiện có.

## Kết luận được phép

Đã nối được chuỗi số học từ phương thức pha/hiệu chỉnh thời gian đến phần dịch tám giờ và bước làm tròn ngày của nguồn **trong mẫu đã chọn**. Với tháng 07/1989, thay riêng phần cộng giờ trong phép tính kiểm toán là đủ tạo hai ngày đầu tháng đang quan sát. Đây là bằng chứng cụ thể hơn việc chỉ thấy hằng số tám giờ trong mã nguồn.

Chưa kiểm chứng ephemeris độc lập, toàn bộ chính sách lịch, tháng nhuận, giờ Tý, các niên đại khác hoặc tương đương trường phái. Không dùng hai thư viện này làm hai xác nhận thiên văn độc lập. Không suy ra engine Thiên Đồ sai, không đổi mặc định lịch, không tự đồng nhất Không Vong với Tuần/Triệt.

Mốc **31/49** giữ nguyên. Các cờ `mayChangeChartRules`, `mayEnableCalendarSchoolMode`, `mayIncreaseMapping`, `semanticEquivalenceVerified`, `sourceSchoolParityVerified`, `expertReviewed` vẫn `false`.

## Nghiệm thu và bước kế tiếp

R33 nguồn thật có R63, Source Integrity, Full Stack và Production Acceptance 5/5 phải PASS cùng HEAD trước khi gộp. Sau gộp kiểm tra lại CI `main`. Chỉ bổ sung hai script kiểm toán, một test, tài liệu này và các bước trong workflow R33; không thêm workflow trùng.

Bước nghiên cứu sau R63 là đối chứng thiên văn độc lập và kiểm toán chính sách lịch trên nhiều ranh giới tháng, sau đó mới đối chiếu từng nhãn Không Vong và predicate nguồn/local theo cùng chuẩn dữ liệu sinh. R63 chưa cấp quyền nâng bất kỳ mục chờ nào.
