# R58 — Truy vết thư viện lịch và kiểm toán hành vi múi giờ trong nguồn Tử Vi

**Ngày kiểm toán:** 13/11/2026 · **Nguồn cố định:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`.

## Cơ sở từ R57

R57 đã đối chiếu 30 ca nguồn thực, ghi nhận 18 trường hợp quanh 14–16/08/1989 sai khác ngày âm. Với ca nam 15/08/1989 00:00, nguồn tính 14/07 âm còn Thiên Đồ tính 15/07; khi Thiên Đồ nhận ngày âm nguồn, vị trí Tử Vi và Liêm Trinh khớp nguồn mà không đổi công thức. Đây là **sự nhạy của đầu vào**, chưa khẳng định thư viện lịch nào đúng hơn.

## Cấu trúc nguồn đã kiểm tra

Tại commit ghim, `generateChart` gọi **hai đường thư viện lịch khác nhau**:

1. `resolveEffectiveLunarDate` và `getLunarInfo` dùng `Solar.fromYmd(year, month, day).getLunar()` của **lunar-javascript**; `getLunarInfo` ghi dữ liệu âm lịch báo cáo.
2. Trường hợp sinh thường, không phải chuyển quy tắc tháng nhuận, lá số chính sử dụng **`astro.bySolar` của iztro**, rồi lấy Tử Vi, Cục, 14 chính tinh và cung Mệnh từ `astrolabe`. Nguồn có thể chứa hai kết quả chuyển đổi lịch có cách triển khai khác nhau.
3. Khi cần xử lý tùy chọn tháng nhuận, code có nhánh `astro.byLunar`. R58 giới hạn vào các ca thường và tháng 8/1989, không đánh đồng chính sách tháng nhuận với múi giờ.

Phiên bản khóa trong `package-lock.json`: `lunar-javascript@1.7.7`, `iztro@2.6.1`, `lunar-typescript@1.8.6` (phụ thuộc thư viện riêng của nguồn). R58 từ chối các phiên bản không khớp.

## Thiết kế phép thử R58

Trên **một checkout nguồn thật** và cùng bộ thư viện đã ghim, chạy **ba tiến trình Node riêng** với các biến môi trường `TZ=UTC`, `TZ=Asia/Ho_Chi_Minh`, `TZ=Asia/Shanghai`. Mỗi tiến trình chạy:

- 30 ca kiểm soát R33: 15/08/1988; 14–16/08/1989; 15/08/1990, mỗi ngày gồm hai giới tính và các giờ 00, 08, 22.
- Hai ca ngày bắt đầu tháng âm có liên quan mốc sóc NASA 01–02/08/1989, nam giờ 00.
- Với mỗi ca, thu **ngày âm gốc lunar-javascript**, **ngày âm hiệu dụng từ nguồn**, **getLunarInfo**, **dữ liệu ngày âm iztro có thể đọc được**, cùng **vị trí Tử Vi, Liêm Trinh, Mệnh và Cục của generateChart**.
- Lưu 3 tệp JSON nguồn và báo cáo 32 hàng so sánh; kiểm chứng đường UTC với 30 quan sát engine nguồn R33 chạy riêng; chặn trùng, thiếu trường, thay phiên bản, đổi ngày/giờ/giới tính và nâng cờ học thuật.

Phép thử chỉ đếm thay đổi các trường khi chuyển **biến môi trường runtime TZ**, không gán rằng thư viện mặc định là lịch Trung Quốc UTC+8 hay lịch Việt Nam UTC+7. Nếu kết quả ổn định qua cả ba môi trường, điều đó **không chứng minh** thư viện dùng UTC, UTC+8 hay UTC+7; chỉ chứng minh đầu ra không phụ thuộc biến môi trường TZ trong các ca đã chạy. Nếu có khác biệt, cần truy sâu vào nội bộ hàm và nguồn thiên văn trước khi đề xuất quy tắc mới.

NASA GSFC ghi thời điểm sóc 01/08/1989 lúc 16:06 UTC, ứng với ngày 01/08 tại UTC+7 và 02/08 tại UTC+8. Đây là ranh giới thiên văn tương thích với sai lệch lịch R33/R57, không phải bằng chứng mã nguồn sử dụng một trong hai múi giờ.

## Kết quả đã chạy trên mã nguồn thực

Workflow R33/R58, run [43340255093](https://github.com/adolfcsix/thien_donew/actions/runs/43340255093), **9/9 kiểm thử PASS**, xuất 3 JSON nguồn và 1 ma trận kiểm toán. Cả ba đường lịch `lunar-javascript`, `getLunarInfo` và `iztro.bySolar` đều đã được chạy bằng cùng checkout và phiên bản khóa. Trong **32/32 ca tại mỗi môi trường**, các ngày âm do `lunar-javascript` và `iztro.rawDates.lunarDate` trả về **trùng nhau**.

| So sánh với tiến trình UTC | Ngày âm lunar-javascript | Ngày âm nguồn | Ngày âm iztro | Tử Vi/Mệnh/Cục và Liêm Trinh |
| --- | ---: | ---: | ---: | ---: |
| Asia/Ho_Chi_Minh | 0/32 khác | 0/32 khác | 0/32 khác | 0/32 khác |
| Asia/Shanghai | 0/32 khác | 0/32 khác | 0/32 khác | 0/32 khác |

Ở chính nguồn ghim, ngày dương 01/08/1989 được quy thành **30/06 âm**, còn ngày 02/08/1989 được quy thành **01/07 âm** trên cả hai thư viện; ngày 15/08/1989 thành **14/07 âm**, không phụ thuộc biến môi trường `TZ`. Đây là dữ liệu thực nghiệm cụ thể, không phải đoán.

**Phân biệt kết luận:** hai thư viện cho kết quả giống nhau ở bộ mẫu này, và thay múi giờ tiến trình không thay đổi đầu ra; do đó giả thuyết sai lệch chỉ bởi `process.env.TZ` của máy chạy đã không đứng vững. Tuy nhiên, phép thử **chưa chứng minh** vì sao nội bộ hai thư viện chọn ranh giới ngày bắt đầu tháng 7 như vậy, quy tắc lịch thiên văn hay trường phái được dùng là gì, hoặc lịch nào nên áp dụng cho người dùng Việt Nam. Cần kiểm tra tiếp thuật toán nội bộ lịch Trung Quốc/Việt Nam, thông số vị trí địa lý và đối chiếu thêm nhiều mốc sóc độc lập. Không được tự động thêm tùy chọn lịch trường phái ở bước này.

## Các điều kiện cấm tự động

- Không sửa `packages/astrology-engine/src/tuvi.js` hoặc `lunar.js` để khớp nguồn.
- Không thêm công tắc đổi chế độ lịch/giờ cho người dùng, không đổi mặc định.
- Không đồng nhất các cách cục Không Vong nguồn với Tuần/Triệt nội bộ, không tự mở các cách cục còn thiếu bằng chứng.
- Các cờ `sourceCalendarTimeZoneInferred`, `mayChangeChartRules`, `mayEnableCalendarSchoolMode`, `rootCauseVerified`, `semanticEquivalenceVerified`, `sourceSchoolParityVerified` đều giữ `false`.
- **Mốc nghiên cứu 31/49** giữ nguyên.

## Mã nguồn và nghiệm thu

Chỉ thêm hai script R58 (TS probe và JS evaluator), mở rộng bài test R33 có sẵn, thêm bước thu artifact vào **workflow R33 đang có**, cùng tài liệu này. Không thêm workflow trùng, không đụng UI, AI, API, SQL, phân quyền hay dữ liệu tài khoản.

Chỉ gộp R58 sau khi **R33 genuine + R58; Source Integrity; Full Stack; Production Acceptance 5/5** đều PASS ở đúng HEAD SHA. Sau squash, kiểm tra lại CI trên `main`.
