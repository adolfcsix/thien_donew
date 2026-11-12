# R57 — Phép đối chứng ngày âm cho sai khác Liêm Trinh 1989

**Ngày:** 12/11/2026 · **Nguồn chuẩn để tái lập:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` và `iztro@2.6.1`.

## Câu hỏi kỹ thuật

R56 đã tìm được trường hợp `stem-1989-nam-h0` (nam, 15/08/1989 00:00) có cung Mệnh trùng (nhánh 8), nhưng vị trí Liêm Trinh **nguồn ở nhánh 11**, Thiên Đồ **nhánh 8**. Detector nguồn không kích hoạt `生不逢时` trong khi proxy Thiên Đồ báo `met`. Đây là chênh lệch cần giải thích, **không phải bằng chứng lỗi an sao của bất kỳ engine nào**.

R33 đã kiểm tra 30 ca thật với ngày `1988-08-15`, `1989-08-14/15/16`, `1990-08-15`, ba giờ (00, 08, 22) và hai giới tính. R33 cho thấy các ca 1989 có thể lệch một ngày âm, phù hợp thời điểm sóc 01/08/1989 lúc 16:06 UTC mà NASA GSFC cung cấp: tại UTC+7 là 23:06 ngày 01/08; tại UTC+8 là 00:06 ngày 02/08. Đây là **sự tương thích về mốc lịch**, chưa chứng minh chính sách lịch chính xác của hai phần mềm.

## R57 thực hiện

1. Bắt buộc dùng **đúng 30 kết quả do engine nguồn ghim thật sự tạo ra** trong workflow R33 đang có. Trước khi tính, kiểm tra commit, phiên bản iztro, 30 ID, ngày, giờ, giới tính, dữ liệu nguồn; tái chạy đối chiếu R33.
2. Tính lá số Thiên Đồ ban đầu bằng `Engine.calculate({calendar:'solar'})` và xác nhận không đổi dữ liệu hoặc quy tắc gốc.
3. Dùng chính ngày âm (năm, tháng, ngày, nhuận) nguồn ghi trong mỗi ca, tính **một lá số Thiên Đồ giả định mới** bằng `Engine.calculate({calendar:'lunar'})`, giữ nguyên giờ/giới tính. Đây là thí nghiệm **thay đầu vào ngày âm**, không phải cùng một thời điểm sinh dương lịch.
4. Đối chiếu Mệnh, Cục, vị trí Tử Vi, Liêm Trinh với nguồn thật; xác nhận công thức Liêm Trinh nội bộ: nhánh `(vị trí Tử Vi − 8) mod 12`. Đánh dấu ca không thể tính hoặc ca có ngữ cảnh khác, không ép trùng kết quả.
5. Riêng ca 15/08/1989 nam 00:00, phân loại rõ phép thay ngày âm có tái tạo **cả Tử Vi và Liêm Trinh** hay không; không được suy luận nguyên nhân học thuật chỉ từ việc tọa độ trùng.

## Điều kiện kết luận

- Khi một phép đối chứng tái tạo tọa độ sao nguồn trong model Thiên Đồ chưa thay đổi: **chỉ xác nhận tính nhạy của đầu vào ngày âm**. Chưa chứng minh cách đổi ngày của nguồn hay trường phái đúng hơn.
- Khi tọa độ chưa trùng hoặc không thể tính: giữ nguyên `counterfactual-unavailable`, `context-or-calendar-not-isolated` hoặc `source-lunar-input-does-not-reproduce-both-branches`; không sửa engine để làm đẹp số liệu.
- Mọi cờ `rootCauseVerified`, `sourceSchoolParityVerified`, `semanticEquivalenceVerified`, `mayChangeChartRules`, `mayIncreaseMapping` phải giữ **false**.
- Chưa được đổi quy tắc an sao, lịch/giờ, phát kết luận cách cục ra UI, hoặc tăng mốc nghiên cứu **31/49**.

## Giới hạn mã nguồn

Chỉ bổ sung script audit `infrastructure/scripts/tuvi-r33-r57-lunar-day-counterfactual.cjs`, kiểm thử mới ở `tests/v111676-tuvi-1989-root-cause-diagnostics.test.cjs`, mở rộng workflow R33 đang có để lưu `.r57-source-lunar-day-counterfactual.json`, và tài liệu này. Không thêm pipeline mới, không đụng `tuvi.js`, module giờ sinh, API, SQL, AI, phân quyền, CSS hoặc các trang Tử Vi.

**Nghiệm thu:** R33 nguồn ghim thực + R57, Source Integrity, Full Stack, Production Acceptance 5/5 trên cùng HEAD SHA; chỉ gộp khi tất cả PASS. Sau gộp kiểm tra tiếp CI `main`.
