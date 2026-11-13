# R61 — Phân rã vai trò hai họ Không Vong nguồn trong ba cách cục chưa ánh xạ

**Ngày:** 13/11/2026 · **Nguồn cố định:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` · `iztro@2.6.1`.

## Mục tiêu và giới hạn

R60 xác nhận **31/49 chỉ mục đã ánh xạ điều kiện** (28 bản mệnh + 3 đại hạn), không phải 31 cách cục đã được xác nhận. Còn ba mục có thể tiếp tục nghiên cứu: `dinh-ban-01` (生不逢时), `dinh-ban-02` (禄逢两杀) và `dinh-tap-03` (禄衰马困). Cả ba phụ thuộc cách nguồn xác định cung có Không Vong.

Mã nguồn `patterns-dingpin.ts` và `patterns-dingza.ts` của repository ghim dùng danh sách sáu tên gọi: `旬空 / 副旬 / 截路 / 截空 / 空亡 / 副截`. Nhưng `algorithm.ts` chuẩn hóa hai tên cũ `截路 → 截空` và `空亡 → 副截`. Ở chế độ nguồn được kiểm tra, đó là **bốn vị trí sao có tên chuẩn hóa**, không được tự cộng thành sáu vị trí độc lập. Đồng thời cũng không được đồng nhất họ sao nguồn với Tuần/Triệt của Thiên Đồ.

## Phép thử R61

Không phát triển bộ luận đoán mới. Dùng lại 65 lá số R29, một ca dương tính hiếm và một ca âm tính giờ dịch R30, đều do engine **nguồn thật, ghim commit/phiên bản** thực thi trong workflow R32. Kiểm toán R53 có sẵn kiểm tra 67 lá số, 804 đại hạn, ba bộ predicate và tính nhất quán với kết quả detector; R61 chỉ chạy tiếp khi R53 PASS.

Với **mỗi vị trí cần xét** (Mệnh, Lộc Tồn, Thiên Mã), R61 ghi hai cờ độc lập:

- `Xunkong`: có `旬空` hoặc `副旬`.
- `Jiekong`: có một trong hai nhãn chuẩn hóa `截空`/`副截` (sau khi quy đổi tên cũ, nhưng tuyệt đối không đếm hai lần).

Mỗi điều kiện nguồn được tính lại bốn lần mà **không sửa dữ liệu nguồn**: dùng cả hai họ (`both`), chỉ Xunkong (`xun-only`), chỉ Jiekong (`jiekong-only`), hoặc không họ nào (`neither`). Trong hai quy tắc Định bần, điều kiện cố định Liêm Trinh/Lộc/Hóa Lộc và Không–Kiếp được giữ nguyên. Trong `dinh-tap-03`, vị trí Thất Sát trong tam phương tứ chính của **từng đại hạn** và cả hai sao Lộc Tồn–Thiên Mã được giữ nguyên.

Tổng hợp riêng cho mỗi mục: số mẫu xét, số trường hợp dương tính của nguồn, số dương tính nếu chỉ dùng một họ, số mẫu cần một họ nhất định, và số mẫu `onlyTogether` (hai họ khác nhau tại hai vị trí sao cần xét; không họ đơn lẻ nào tạo đủ điều kiện). Đây là bằng chứng **độ nhạy trong logic nguồn**, không phải thẩm định thuật ngữ.

## Điểm cần kiểm chứng trước khi tăng mốc

1. Xác minh phép an, phương pháp chọn tên sao và xử lý **biến thể lịch/trường phái** của hai họ; không dùng trùng vị trí hình học làm kết luận đồng nghĩa.
2. Bắt buộc kiểm tra khác biệt thời gian sinh như ca nam 15/08/1989 trong R57–R59: chênh ngày âm có thể đổi Liêm Trinh, nên không được gán mọi khác biệt vào Không Vong.
3. Bộ điều kiện cho ba mục phải có ca **dương tính và âm tính**, giải thích từng sao/từng cung trên dữ liệu nguồn, đối chiếu với engine Thiên Đồ theo cùng quy ước; với `dinh-tap-03` phải giữ phạm vi đại hạn.
4. Có đánh giá độc lập về quy ước trường phái và phạm vi được phép hiển thị, tách **khớp điều kiện nghiên cứu** khỏi **cách cục được xác nhận**.

Kết quả hiện tại **không** cấp quyền đổi thuật toán an sao, lịch âm, bổ sung chế độ nguồn, thay Tuần/Triệt, hoặc nâng mốc 31 lên 32. Các cờ `semanticEquivalenceVerified`, `sourceSchoolParityVerified`, `sourceCriterionVerifiedForLocalChart`, `mayIncreaseMapping`, `mayDeclarePattern` giữ `false`.

## Phạm vi mã và nghiệm thu

Chỉ thêm `infrastructure/scripts/tuvi-r32-r61-source-void-family-ablation.cjs`, `tests/v111679-tuvi-r61-void-family-ablation.test.cjs`, nối vào workflow R32 đã có để chạy source genuine và lưu artifact, cùng tài liệu này. Không sửa engine, UI, API, SQL, dữ liệu người dùng hoặc phân quyền. Điều kiện gộp: R32 real-source R61, Source Integrity, Full Stack, Production Acceptance 5/5 trên cùng commit.

**Kết luận điều tra R61 phải xuất phát từ artifact thực**; không đặt trước kết quả về tỷ lệ hai họ sao hoặc coi tỷ lệ cao là chứng minh nguyên nhân học thuật.
