# R54 — Phân loại dấu hiệu khác biệt giữa engine nguồn và Thiên Đồ

**Ngày:** 12/11/2026. **Nguồn ghim:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` và `iztro@2.6.1`.

## Tại sao cần bước này

R51 xác định hình học hai cặp chi Không Vong nguồn ↔ Tuần/Triệt trùng trên 65/65 ca tổng hợp chạy engine nguồn thật. R52 đối chiếu 67 lá số nguồn và 804 trường hợp đại hạn theo ba quy tắc. R53 đi đến các nhãn sao nguồn được sử dụng trong từng điều kiện. Tuy nhiên, **trùng hình học hoặc trùng kết quả proxy không xác định được nguyên nhân gốc hay tính tương đương học thuật.** R54 phân loại dấu hiệu một cách minh bạch để chọn những ca cần phân tích kế tiếp.

## Sáu nhóm chẩn đoán

- `different-ming-branch`: Mệnh nguồn và Mệnh Thiên Đồ ở các nhánh khác nhau. Đây là khác biệt quan sát, có thể phát sinh từ dữ liệu lịch/giờ/quy tắc, chưa kết luận nguyên nhân.
- `named-star-branch-different` hoặc `named-star-branch-unknown`: sao liên quan đến tiêu chí có nhánh nguồn và nhánh Thiên Đồ khác hoặc thiếu bằng chứng; áp dụng Liêm Trinh, Lộc Tồn, Hóa Lộc, Địa Không, Địa Kiếp, Thiên Mã, Thất Sát tùy tiêu chí.
- `void-union-geometry-different` hoặc `void-union-geometry-unknown`: khác/thiếu hình học tổng hợp bộ Không Vong nguồn và proxy nội bộ, **không suy ra đồng nhất từng nhãn sao**.
- `source-vs-local-proxy-disagrees`: detector nguồn và proxy cục bộ có kết quả trái nhau; bản thân điều này chưa phải lỗi thuật toán.
- `local-proxy-unknown`: dữ liệu nội bộ chưa đủ căn cứ.
- Những ca có `both-met-proxy-only` hoặc `both-not-met-proxy-only` vẫn được giữ trong mẫu thống kê nhưng tuyệt đối không được xem là xác nhận đồng nhất trường phái hoặc ngữ nghĩa.

## Nguồn dữ liệu và kiểm chứng

Dùng lại **67 ca nguồn thật** R29/R30 (65 ca tổng hợp, một ca dương và một ca âm của quy tắc hiếm), chạy lại bộ đối chiếu R32 và tách atom R53 trước khi phân loại. Tính 67 lần cho `dinh-ban-01`, 67 cho `dinh-ban-02`, 804 (= 67 × 12) cho `dinh-tap-03`. Mỗi dòng có ID ca, provenance, trạng thái kết luận nguồn, proxy, các nhánh sao liên quan, địa chi Không Vong và danh sách dấu hiệu được quan sát.

**Không có công thức tự suy đoán root cause.** Nếu báo cáo thiếu ca, thiếu đại hạn, trùng ID hoặc thay đổi các cờ học thuật, kiểm thử phải thất bại. `rootCauseVerified`, `semanticEquivalenceVerified`, `sourceSchoolParityVerified`, `sourceCriterionVerifiedForLocalChart`, `expertReviewed`, `mayDeclarePattern` và `mayIncreaseMapping` tiếp tục bằng `false`.

## Giới hạn thay đổi

Thêm duy nhất script `infrastructure/scripts/tuvi-r32-r54-diagnostic-disagreement-triage.cjs`, mở rộng test R32, thêm artifact `.r54-source-local-difference-triage.json` vào workflow R32 đã có, và tài liệu này. Không thay engine, phương pháp luận giải, lá số, UI, CSS, API, SQL, AI, quyền, hay dữ liệu cá nhân.

**Điều kiện gộp:** R52 và R53 được nghiệm thu, hợp nhất theo thứ tự sạch trên main; R32 genuine + R54, Source Integrity, Full Stack và Production Acceptance **5/5** đạt trên cùng SHA của PR sạch. Sau gộp kiểm tra lại main. Mốc ánh xạ nghiên cứu vẫn **31/49**, không phải 31 cách cục đã được xác nhận học thuật.
