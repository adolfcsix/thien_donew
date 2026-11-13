# R62 — Cặp chứng cứ dương/âm có đối chứng cho ba cách cục Tử Vi đang chờ

**Ngày:** 13/11/2026 · Nguồn ghim: `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, `iztro@2.6.1`.

## Tại sao thực hiện R62

Sau R60, **31/49** hạng mục đã *ánh xạ điều kiện nghiên cứu* (28 bản mệnh, 3 đại hạn), nhưng ba cách cục `dinh-ban-01`, `dinh-ban-02`, `dinh-tap-03` vẫn chưa đủ căn cứ kết luận. Hai nhánh nghiên cứu R61 gần nhất đã có:

- 67 lá số nguồn và 804 ngữ cảnh đại hạn: kiểm toán vai trò Xunkong (`旬空`/`副旬`) và Jiekong (`截空`/`副截`, hai nhãn cũ `截路`/`空亡`) bằng thử bỏ từng họ.
- 960 lá số nguồn thực chạy đúng `DING_PIN_GE / DING_ZA_GE`, đối chứng biểu thức Boolean độc lập: **24** lá số dương tính Sinh bất phùng thời, **4** lá số dương tính Lộc phùng lưỡng sát, **768 lượt đại hạn** dương tính Lộc suy Mã khốn. Từng nhãn sao được lưu theo cung, không tự đồng nhất sáu nhãn thành sáu sao độc lập.

Đây vẫn là bằng chứng **nội bộ nguồn**, không phải kết luận về chính sách an sao của Thiên Đồ. R62 củng cố khả năng phản chứng của cả ba detector bằng **cặp dương–âm xác thực**, không tạo lá số giả rồi gán Boolean như mong muốn.

## Đơn vị quan sát và tiêu chí cặp

Mỗi bộ mẫu 960 gồm **80 nhóm cùng ngày dương + giới tính**, mỗi nhóm đủ 12 giờ sinh theo địa chi. Với mỗi lá số dương tính nguyên cục:

1. Chọn một lá số **âm tính của cùng ngày dương và giới tính**, khác giờ sinh. Ưu tiên khoảng cách giờ địa chi ngắn nhất (tính tuần hoàn 12 chi), sau đó sắp theo chi để quyết định duy nhất.
2. Ghi ID dương/âm, chỉ số giờ, khoảng cách giờ địa chi, bốn phép đối chứng Xunkong/Jiekong, nhãn sao có mặt và kết quả detector đã được audit R61 xác nhận.
3. **Lưu ý nhân quả:** đổi giờ sinh có thể đồng thời thay Mệnh, vị trí sao và điều kiện cách cục; đây là đối chứng **theo hồ sơ ngày/giới**, không phải thử chỉ thay đúng một sao Không Vong.

Với từng **lượt đại hạn dương tính** của `dinh-tap-03`, chọn một lượt **âm tính ngay trong cùng lá số**, khác hạn, cùng thứ tự tuổi từ engine nguồn. Nếu không có hạn âm để so sánh thì **FAIL**, không tự tạo hạn. Mỗi chứng cứ giữ nguyên bốn phép đối chứng họ Không Vong và tên sao nguồn tại Lộc Tồn/Thiên Mã.

Tất cả ca nguồn được kiểm toán qua `auditR61` và liên hệ với R33 (ca 15/08/1989) trước khi xét; dữ liệu không đầy đủ/trùng/chỉnh kết quả detector đều bị từ chối.

## Quy định nâng mốc 31/49

R62 không cấp quyền nâng số liệu chỉ vì tìm đủ ca dương và âm. Mốc **32/49** chỉ được xem xét sau khi có đủ:

- Đối chứng phép chuyển lịch âm/giờ và tọa độ sao **trên cùng một thời điểm sinh và cùng quy tắc** của hai engine (R57–R59 cho thấy tháng 8/1989 là điểm nhạy).
- Chứng minh ánh xạ từng nhãn sao Không Vong nguồn sang thực thể tương ứng của Thiên Đồ (nếu có), **không đánh đồng mặc định Tuần/Triệt** hoặc các biến thể trường phái.
- Kiểm thử predicate bằng cả ca dương/âm theo cùng chuẩn, và kiểm thử đại hạn riêng biệt nơi áp dụng.
- Rà soát phạm vi khoa học/trường phái và tách “khớp điều kiện” khỏi “cách cục đã được thẩm định”.

Kết quả quan sát của R62 chỉ đi vào audit JSON và tài liệu, không thay đổi `tuvi.js`, `lunar.js`, cách phát kết luận cho người dùng, giao diện, API, AI, SQL, phân quyền hoặc dữ liệu thật. Cờ `mayIncreaseMapping`, `semanticEquivalenceVerified`, `sourceSchoolParityVerified` luôn **false**.

## Phạm vi tích hợp và nghiệm thu

Thêm một script JS read-only `tuvi-r33-r62-matched-source-void-controls.cjs`, bộ kiểm thử `tests/v111680-tuvi-r62-matched-source-void-controls.test.cjs`, nối tiếp workflow R33 ghim nguồn đang có, lưu artifact `.r62-source-matched-positive-negative-controls.json`. Không thêm workflow trùng hoặc tạo hệ thống suy đoán riêng.

Gate hợp nhất: R33 genuine/R62, Source Integrity, Full Stack, Production Acceptance 5/5 đều PASS cùng một HEAD SHA; sau squash kiểm tra lại CI `main`. **Không tăng mốc hoặc bật cách cục thiếu chứng cứ**.

*Kết quả thống kê cụ thể và phân loại theo họ sao chỉ được xác nhận từ artifact CI thật; tài liệu không đặt trước số lượng cặp âm tính hay tác động Xunkong/Jiekong khi chưa có kết quả.*
