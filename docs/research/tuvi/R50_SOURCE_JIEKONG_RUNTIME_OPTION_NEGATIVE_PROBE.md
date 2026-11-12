# R50 — Kiểm chứng động đường nhận biến thể Jiekong ở engine nguồn

**Ngày:** 12/11/2026 · **Nguồn khóa:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` · **iztro:** `2.6.1`.

## Câu hỏi cần giải quyết

R49 xác nhận nguồn có bảng và cấu hình `single | double | zhanyan`, nhưng `generateChart(birthInfo, opts)` chỉ khai báo `opts.leapMonth`; `applySchoolJiekong(palaces, lunarInfo.yearStem)` không nhận lựa chọn trường phái. Cần kiểm chứng bằng **engine thật** rằng việc nhét thêm tham số `jiekongSchool` vào lời gọi không vô tình kích hoạt các trường phái ngoài mặc định.

## Phép thử R50

Dùng **cùng checkout nguồn R27**, **cùng khóa phụ thuộc**, **cùng 65 ca tổng**; lấy riêng 10 ca tổng hợp công khai: nam, giờ 00:00, ngày 15/08 của các năm 1984–1993, đủ 10 thiên can năm âm lịch do chính engine nguồn trả về.

Với mỗi ca:
1. Dùng kết quả `generateChart(birthInfo)` thật từ R27 làm mốc.
2. Gọi `generateChart(birthInfo, { jiekongSchool: mode })` bằng ép kiểu **cố ý vượt chữ ký TypeScript**, lần lượt với `single`, `double`, `zhanyan`. Đây **không phải** thao tác chọn cấu hình qua UI/ứng dụng nguồn.
3. So sánh chính xác tọa độ bốn tên nguồn `旬空`, `副旬`, `截空`, `副截` trong 12 cung giữa kết quả mốc và cả ba lời gọi thêm tham số.
4. Ghi bộ bằng chứng có `unsupportedOptionInjectionOnly: true`, `alternateModeRuntimeVerified: false`. Kiểm thử độc lập chặn mất mẫu, đổi commit, thay ID, đổi thiên can, đổi vị trí hay biến dạng kết quả. Nếu đường thực thi nguồn thay đổi, yêu cầu xem xét lại thay vì tự diễn giải là trường phái đã được xác nhận.

**Giới hạn:** Kết quả khớp chứng minh *tham số không được hỗ trợ khi cố tình chèn vào lời gọi không làm đổi bốn vị trí trong 10 ca đã chạy*. Không chứng minh toàn bộ UI nguồn không có cơ chế chọn phái riêng; không chứng minh `single` hoặc `zhanyan` đã thực thi. Không đồng nhất Không Vong với Tuần/Triệt, không kết luận điều kiện cách cục, không lấy mẫu tổng hợp thay cho chứng cứ học thuật.

## Phạm vi thay đổi và nghiệm thu

Chỉ mở rộng `infrastructure/scripts/tuvi-r27-source-iztro-probe.ts.template`, kiểm thử `tests/v111670-tuvi-source-iztro-parity.test.cjs` và thông tin trong **workflow R27 hiện có**. Không bổ sung engine runtime Thiên Đồ, không chỉnh UI, API, SQL, AI hay quyền. Bộ 65 ca R27 giữ nguyên; R50 tạo thêm 10×3 phép gọi nguồn độc lập để kiểm tra đường tham số không được hỗ trợ. Chỉ duyệt khi R27 genuine, Source Integrity, Full Stack và Production Acceptance 5/5 đều PASS **trên cùng HEAD SHA**, sau đó xác minh lại main. Tiến độ ánh xạ cách cục **31/49**, chưa tăng.
