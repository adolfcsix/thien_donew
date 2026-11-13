# R60 — Kiểm toán số liệu nghiên cứu 31/49 và lộ trình thẩm định tăng mốc

**Ngày:** 13/11/2026 · **Nguồn ghim:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`.

## 1. Phân biệt số lượng và chất lượng

Các hạng mục Tử Vi trước đây dùng cụm “31/49 đã ánh xạ”. R60 kiểm tra lại từ các mô-đun thực tế thay vì nhập thủ công số 31:

| Trạng thái nghiên cứu | Số mục | Phạm vi |
| --- | ---: | --- |
| Đã ánh xạ **điều kiện** nghiên cứu bản mệnh | 28 | Các báo cáo `classical-pattern-research.cjs`; điều kiện khớp cấu trúc không đồng nghĩa khẳng định cách cục |
| Đã ánh xạ điều kiện **đại hạn** | 3 | Các ID `dinh-tap-01`, `dinh-tap-02`, `dinh-tap-08` trong `classical-dingza-source-bridge.cjs`, vẫn `sourceCriterionVerified=false` |
| Còn có thể nghiên cứu nhưng **chưa được ánh xạ** | 3 | `dinh-ban-01`, `dinh-ban-02`, `dinh-tap-03` |
| Quy tắc nguồn còn tranh luận | 9 | Không tự công nhận |
| Nguồn chưa đủ dữ liệu để suy ra | 6 | Không tự công nhận |
| **Tổng** | **49** | **31 ánh xạ điều kiện + 18 chưa ánh xạ** |

**Số cách cục được xác nhận học thuật độc lập trong bộ kiểm toán hiện tại: 0.** Giá trị này không phủ định các phép tính nội bộ đã có; nó chỉ nhấn mạnh rằng chưa có hồ sơ phê duyệt học thuật/trường phái độc lập. Không thay đổi mốc thành 32/49 chỉ để tăng tiến độ.

## 2. Ba nhóm có khả năng nâng mốc

### `dinh-ban-01` — 生不逢时 / Sinh bất phùng thời
- Chứng minh Liêm Trinh đúng Mệnh và lịch/ngày sinh có đối chiếu với nguồn, đặc biệt ranh giới lịch như ca R57–R59.
- Chứng minh nghĩa và phép an **từng nhãn Không Vong** nguồn có thể sử dụng trong Thiên Đồ mà không đánh đồng sáu sao với Tuần/Triệt.
- Có cặp thử nghiệm dương/âm ở cùng quy tắc và cùng chuẩn dữ liệu. Còn thiếu bất kỳ điều kiện nào thì giữ `pending`.

### `dinh-ban-02` — 禄逢两杀 / Lộc phùng lưỡng sát
- Đối chiếu Lộc Tồn/Hóa Lộc nguyên cục và đồng cung Địa Không–Địa Kiếp.
- Đối chiếu độc lập các nhãn Không Vong nguồn; không dùng proxy hình học thay ngữ nghĩa.
- Kiểm soát tối thiểu hai ca hiếm R30 dương/âm, thêm các biến thể Can năm và Tứ Hóa.

### `dinh-tap-03` — 禄衰马困 / Lộc suy Mã khốn
- Chỉ xét theo **từng đại hạn**, dùng chi cung và tam phương tứ chính có Thất Sát.
- Cần chứng minh cả Lộc Tồn và Thiên Mã chịu Không Vong nguồn; không đánh đồng Tuần/Triệt.
- Phải có ca dương/âm và phản chứng đủ 12 đại hạn trong bối cảnh nguồn/local tương ứng.

## 3. Nghiệm thu tự động R60

Thêm `classical-research-milestone.cjs` và `.d.cts` để tính số liệu từ báo cáo đã có; không được đưa vào danh sách 31 bằng cách truyền ID không hợp lệ, sửa nhãn “đã thẩm định”, thay nguồn, thêm mục có tranh luận hoặc thiếu bằng chứng. `tests/v111678-tuvi-research-milestone.test.cjs` kiểm tra mốc với lá số do engine Thiên Đồ sinh ra, dữ liệu bị sửa, trùng ID, giả danh thẩm định, tăng 31→32 chưa có chứng cứ, và không đột biến lá số. Trên giao diện chỉ sửa văn bản tóm tắt ở bảng nghiên cứu hiện hành: **31/49 là đã ánh xạ điều kiện, không phải 31 cách cục đúng**. Không tạo dashboard/tab/nút riêng.

Trong phiên này R59 được nghiệm thu **4/4 nhóm CI + Production Acceptance 5/5** và đã gộp vào `main` tại `837528570d7b0cf037aa521dd1340be614055566`. R60 phải tiếp tục vượt Source Integrity, Full Stack, Production Acceptance **5/5** trên cùng SHA trước khi gộp.

## 4. Tiêu chuẩn cho mốc nghiên cứu tiếp theo

Mốc 32/49 chỉ được chấp nhận khi một trong ba mục chờ có: (a) điều kiện quy tắc chuẩn hóa, (b) đối chiếu sao và lịch theo cùng chuẩn, (c) phản chứng dương/âm từ engine nguồn thật, (d) kiểm thử nội bộ fail-closed cùng cờ ngữ nghĩa đúng, và (e) rà soát trường phái/phạm vi sử dụng, không phải tự động phát kết luận đến người dùng. **Không đổi thuật toán an sao hoặc lịch của người dùng khi chưa có căn cứ.**
