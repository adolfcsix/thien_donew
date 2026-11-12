# R56 — Truy vết phản chứng từng điều kiện Tử Vi từ engine nguồn

**Ngày:** 12/11/2026 · **Nguồn ghim:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`; `iztro@2.6.1`.

## Kết quả kiểm toán R55 đã có

Artifact thật của R55 trên CI (R32 workflow run `43239278730`) có **938 so sánh (67 lá số, 804 bối cảnh đại hạn)**, chọn **10 ca đối chiếu thuộc 4 lá số khác nhau** với quy tắc chọn xác định. Trong 10 ca được chọn, có **một trường hợp detector nguồn và proxy nội bộ đối nghịch**: `dinh-ban-01` / `stem-1989-nam-h0` (nam, 15/08/1989, giờ 00:00). Đây không phải tỷ lệ bất đồng của toàn bộ 938 so sánh.

Ở ca đó, **Mệnh cả hai engine nằm ở nhánh 8**, `Liêm Trinh` nguồn ở nhánh 11, Thiên Đồ ở nhánh 8; bốn nhãn Không Vong nguồn nằm trên các nhánh 11/10/9/8, hợp của các nhánh khớp proxy Thiên Đồ. Engine nguồn **không kích hoạt** `生不逢时` vì Liêm Trinh không ở Mệnh, còn proxy nội bộ báo `met`. Riêng Hóa Lộc của ca này cũng có nhánh nguồn/nội bộ khác nhau (3/0), nhưng **không phải yếu tố trực tiếp của điều kiện `dinh-ban-01`**. Cả hai chênh lệch là **dấu hiệu**, chưa xác định được nguyên nhân sâu xa, không tự sửa thuật toán.

## Thao tác R56

- Đọc báo cáo R32/R53/R54/R55 **được tạo bởi cùng workflow chạy thực tế ở checkout nguồn ghim**, kiểm tra lại schema, commit, số trường hợp, cờ bảo vệ, cả hai ca kiểm soát R30; tự tái tạo hàng đợi R55 từ R54 để chống thay thế dữ liệu mẫu bằng tay.
- Theo từng ca tuyển chọn, nối ID và nguồn R29/R30, ngày–giờ–giới tính, Mệnh nguồn/local, địa chi từng sao liên quan, vị trí nhãn `旬空`, `副旬`, `截空`, `副截`, so sánh tổng hợp Không Vong; mọi đầu mối có dữ liệu đầu vào truy nguyên được.
- **`dinh-ban-01`:** tái lập điều kiện nguồn `Liêm Trinh tại Mệnh ∧ có Không Vong nguồn tại Mệnh`.
- **`dinh-ban-02`:** tái lập `(Lộc Tồn hoặc Hóa Lộc) tại Mệnh ∧ Không Vong nguồn tại Mệnh ∧ Địa Không tại Mệnh ∧ Địa Kiếp tại Mệnh`.
- **`dinh-tap-03`:** tái lập `Thất Sát ở tam phương tứ chính của đại hạn ∧ Lộc Tồn nằm tại cung có Không Vong nguồn ∧ Thiên Mã nằm tại cung có Không Vong nguồn`, kèm nhánh và tuổi bắt đầu/kết thúc của đại hạn.
- So giá trị tái lập với nguồn detector thật, proxy và R54; không khớp phải FAIL, không được im lặng chuyển thành kết quả “đã xác minh”.
- Xuất hai artifact `.r56-pinned-source-predicate-traces.json` và `.r56-pinned-source-predicate-traces.md` để người nghiên cứu kiểm tra tay mà không đọc lại toàn bộ 938 đơn vị.

## Điều kiện chưa đủ để sửa thuật toán / tăng ánh xạ

1. Chứng minh có cùng ngữ nghĩa năm/tháng/ngày âm lịch và dữ liệu giờ của nguồn với local trong từng ca. Khi nguồn chưa cung cấp thiên can năm ở mức báo cáo R32, đánh dấu **thiếu bằng chứng**, không suy đoán từ ngày dương.
2. Đối chiếu bảng an Liêm Trinh, Hóa Lộc, Địa Không/Địa Kiếp theo **cùng trường phái có căn cứ**; trường hợp 1989 cần tách chênh do phép an sao khỏi phép so cặp địa chi Không Vong.
3. Với `dinh-tap-03`, đối chiếu đại hạn cùng trình tự/giới tính/tuổi, Thất Sát theo tam phương và thời điểm áp dụng Lộc Tồn/Thiên Mã.
4. Có tài liệu độc lập hoặc thẩm định chuyên môn trước khi đổi `sourceSchoolParityVerified`, `semanticEquivalenceVerified`, `rootCauseVerified`, `readyForMapping`, `mayIncreaseMapping` thành true.

## Kỷ luật kỹ thuật

R56 chỉ thêm một báo cáo đọc dữ liệu nguồn, kiểm thử trong bộ R32 có sẵn, artifact CI và tài liệu. **Không** đổi engine an sao, quy tắc dự đoán, UI, AI, SQL, quản lý, bảo mật hay quyền. Đầu vào bị giả, trường hợp hiếm bị xóa, sai vị trí Liêm Trinh hoặc detector và proxy không đồng nhất phải khiến kiểm thử FAIL.

**Điều kiện nghiệm thu:** R32 nguồn thật + R56, Source Integrity, Full Stack và Production Acceptance 5/5 đều PASS trên cùng SHA. Trước và sau nghiệm thu giữ **31/49 (mốc ánh xạ nghiên cứu)**, chưa kết luận học thuật.
