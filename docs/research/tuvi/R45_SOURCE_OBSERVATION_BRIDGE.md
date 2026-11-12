# R45 — Cầu đối chiếu nguồn thực R29 với bộ công thức R44

**Phạm vi:** 65 lá số **giả lập**, được tạo bởi `generateChart` và kiểm tra bằng `detectDingPin`/`detectDingZa` tại `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` qua phiên bản `iztro@2.6.1` trong workflow nguồn R29 hiện có. Không dùng dữ liệu lá số hay tài khoản người dùng.

## Phương pháp

R45 sử dụng tệp quan sát `.r29-source-pattern-oracle-observations.json` do workflow R29 tạo khi chạy engine nguồn, kiểm tra SHA, phiên bản, ma trận 65 ca và đầu ra bộ phát hiện cách cục. Tên sao và địa chi được giữ nguyên; giá trị `siHua=null` trong bản quan sát được bỏ khỏi cấu trúc đầu vào theo hợp đồng R44, còn `siHua='禄'` được giữ nguyên.

R45 so sánh hai cách cục Mệnh (`dinh-ban-01`, `dinh-ban-02`) và tập hợp các địa chi đại hạn thỏa `dinh-tap-03` giữa **bộ dò nguồn đã chạy thật** và bộ công thức nguồn giả lập R44. Bộ đánh giá độc lập R29 cũng phải đồng thuận với bộ dò; kết quả bất đồng, dữ liệu thiếu hoặc sai provenance làm CI **FAIL**. Kết quả được lưu ở `.r45-source-fixture-bridge-report.json` cùng bằng chứng R29. Không tạo workflow chồng chéo: mở rộng trực tiếp workflow oracle R29.

## Ranh giới xác minh

Kết quả đạt chỉ chứng minh **tính nhất quán giữa biểu thức R44 và bộ phát hiện nguồn đã thực thi trên 65 ca giả lập**. Không chứng nhận cách an sao Thiên Đồ giống engine tham khảo, không mặc định Tuần/Triệt tương đương sáu nhãn Không Vong, không chứng minh lịch Việt Nam/Trung Quốc đồng nhất, không phán đoán thực tế và không tăng mốc **31/49**. R45 không thay đổi Tử Vi engine, quyền Pro, AI, dữ liệu người dùng hoặc các trang giao diện.

Nghiệm thu phải có Source Integrity, Full Stack, bộ oracle nguồn gốc R29 với kiểm tra R45 và Production Acceptance **5/5** trên cùng HEAD; kiểm tra lại sau khi gộp.
