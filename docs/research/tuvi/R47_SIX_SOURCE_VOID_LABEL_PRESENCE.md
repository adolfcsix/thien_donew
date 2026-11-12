# R47 — Kiểm kê sáu nhãn Không Vong nguồn

Nguồn ghim: `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`.

R32 so sánh bốn nhãn chuẩn hóa `旬空, 副旬, 截空, 副截`; R44 còn tiếp nhận hai tên lịch sử `截路, 空亡`. Sáu tên **không nhất thiết có sáu vị trí**. Hai tên lịch sử có thể đã đổi thành `截空, 副截` theo biến thể nguồn.

R47 bổ sung vào chính báo cáo R32, không mở engine mới: cho mỗi tên nguồn ghi vị trí duy nhất hoặc `absent`/`duplicate`; cho hai cặp alias ghi `legacy-only`, `normalized-only`, `both-labels`, `neither`, `ambiguous`. Tổng hợp trên 67 ca nguồn R29/R30 khi chạy workflow R32 có sẵn. Giữ nguyên `void-pair` bốn tên và so sánh local, không suy diễn một vị trí cho tên đã vắng mặt.

Không kết luận tương đương Tuần/Triệt với nguồn, không sửa lịch, UI, engine hoặc quyền truy cập. Mốc nghiên cứu kỹ thuật **31/49** và cờ học thuật `false` giữ nguyên. Yêu cầu Source Integrity, R32 nguồn thật, Full Stack và Production Acceptance **5/5** PASS trên HEAD trước khi gộp.
