# R55 — Hàng đợi phản chứng có bằng chứng, tuyển mẫu xác định

**Ngày:** 12/11/2026 · **Nguồn ghim:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, `iztro@2.6.1`.

## Đích nghiên cứu

R54 phân loại các dấu hiệu chênh lệch kỹ thuật giữa engine nguồn và proxy Thiên Đồ trên 67 lá số + 804 đại hạn, nhưng không chứng minh nguyên nhân gốc. R55 xây dựng **hàng đợi các ca có thể kiểm tra thủ công từng quy tắc** thay vì suy diễn từ tỷ lệ trùng nhau hoặc tăng số cách cục đã ánh xạ.

## Quy trình

- Chạy lại các detector thật trong **checkout nguồn ghim** qua R29/R30, so 67 ca trong R32, kiểm toán từng nhãn sao R53 và R54; *chỉ đọc* kết quả R54 hoàn chỉnh từ chính CI đó.
- Từ 938 đơn vị so sánh (= 67 + 67 + 804), sắp theo ID tiêu chí, ID lá số và nhánh đại hạn để luôn chọn cùng một phản chứng dù thứ tự JSON thay đổi.
- Mỗi tiêu chí chọn một mẫu đầu tiên cho từng **nhóm kết quả** thực sự xuất hiện, từng **dấu hiệu chênh lệch** thực sự quan sát được; giữ thêm ít nhất một mẫu của **cả hai ca R30 dương/âm**. Đây là **tuyển mẫu ưu tiên kiểm tra**, không phải mẫu thống kê đại diện quần thể.
- Ghi nguyên bản ID ca, nguồn R29/R30, địa chi Mệnh nguồn/local, đại hạn nếu có, bốn/trong sáu nhãn nguồn tại Mệnh–Lộc Tồn–Thiên Mã, detector nguồn, proxy local và lý do ca được chọn. Lưu riêng thống kê **toàn bộ 938 so sánh** để tránh nhầm mẫu tuyển chọn với tổng quát.
- Từ chối dữ liệu thiếu/nhân đôi ca, thiếu 12 đại hạn, không đúng ghim nguồn, sai tổng theo tiêu chí, hoặc bất kỳ cờ xác minh học thuật nào tự bị nâng.

## Thứ tự chuyên môn sau R55

1. Với `dinh-ban-01`, kiểm tra Liêm Trinh tại Mệnh và chính xác nhãn Không Vong nguồn gây điều kiện, so với dấu Tuần/Triệt nhưng chưa đồng nhất ngữ nghĩa.
2. Với `dinh-ban-02`, kiểm tra cụ thể Lộc, Hóa Lộc, Địa Không, Địa Kiếp và hai ca R30; cần phân biệt thiếu tên sao, khác phép an và trường phái.
3. Với `dinh-tap-03`, kiểm tra Thất Sát ở tam phương từng đại hạn và cung Lộc Tồn/Thiên Mã thực sự có Không Vong nguồn, trước khi nghĩ tới mở khóa điều kiện.

## Không tự kết luận

Tất cả cờ `rootCauseVerified`, `semanticEquivalenceVerified`, `sourceSchoolParityVerified`, `expertReviewed`, `sourceCriterionVerifiedForLocalChart`, `readyForMapping` đều **false**. Việc một ca được đưa vào hàng đợi không có nghĩa phát hiện lỗi thuật toán, công nhận học thuật hay được phép trả kết quả cách cục cho người dùng.

**Phạm vi thay đổi:** thêm một script `infrastructure/scripts/tuvi-r32-r55-counterexample-review-queue.cjs`, mở rộng test R32 và workflow R32 sẵn có, thêm tài liệu này; lưu `.r55-pinned-counterexample-review-queue.json` cùng bằng chứng nguồn. Không đổi API, runtime, luật an sao, luận giải, UI, AI, SQL, quyền hoặc dữ liệu cá nhân.

**Gate gộp:** kiểm thử R32 genuine (bao gồm R55), Source Integrity, Full Stack và Production Acceptance 5/5 đều PASS tại cùng HEAD SHA; sau squash xác minh lại main. **Mốc nghiên cứu vẫn 31/49**.
