# R61 — Nguồn thật: sáu nhãn Không Vong và ba phép kiểm tra cách cục còn chờ

**Ngày:** 13/11/2026. **Nguồn khóa:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`; `iztro@2.6.1`.

## Mục đích

R60 đã xác nhận **31/49 chỉ mục có điều kiện nghiên cứu**; 18 chỉ mục còn lại: 3 khả thi nhưng chưa ánh xạ, 9 tranh luận, 6 chưa đủ quy tắc. R61 không sửa luật an sao của Thiên Đồ và không tự tăng chỉ số. Bước này quan sát **đúng tên và tọa độ các sao Không Vong trong engine nguồn**, thay vì nhận diện chung Tuần/Triệt.

## Quy tắc nguồn chính xác

`patterns-dingpin.ts` và `patterns-dingza.ts` ở SHA nguồn ghim dùng **6 nhãn gốc**: `旬空` (Tuần Không), `副旬` (Phó Tuần), `截路` (Tiệt Lộ), `截空` (Tiệt Không), `空亡` (Không Vong), `副截` (Phó Tiệt). **Không mặc định là sáu tên sao hoàn toàn khác phép an trong Thiên Đồ hoặc đã tương đương Tuần/Triệt.** Sự xuất hiện của chúng trong cùng danh mục dò điều kiện của nguồn không chứng minh đồng nghĩa hoặc đúng quy ước trường phái.

- `dinh-ban-01 / 生不逢时`: phải đồng thời có **Liêm Trinh chính tinh ở Mệnh** và ít nhất một nhãn Không Vong nguồn tại Mệnh. Hai vế nằm trong cùng vị trí chi, không dựa trên chỉ số mảng.
- `dinh-ban-02 / 禄逢两杀`: cung Mệnh phải có **Lộc Tồn hoặc Hóa Lộc**, **ít nhất một nhãn Không Vong**, **cả Địa Không lẫn Địa Kiếp đồng cung Mệnh**; nguồn phân biệt bản đọc chặt với bản đọc lỏng, trường hợp hiếm.
- `dinh-tap-03 / 禄衰马困`: là quy tắc **đại hạn**, yêu cầu Thất Sát hội hạn theo tam phương tứ chính và cả **Lộc Tồn lẫn Thiên Mã** cư trú tại cung có một trong sáu nhãn Không Vong nguồn. Không chuyển sang đánh giá bản mệnh.

## Thiết kế thí nghiệm

- Sử dụng workflow R33/R57–R59 hiện có; kiểm tra pinned lockfile, checkout đúng SHA nguồn và chạy mã TypeScript probe *bên trong checkout nguồn*, không sao chép engine.
- Tạo lưới **960 lá số nguồn thật**: 10 năm dương 1984–1993, tháng 2/5/8/11, ngày 15, hai giới tính, 12 giờ sinh theo địa chi. Không coi mẫu có tính đại diện cho mọi ngày sinh hoặc nghiên cứu xác suất dân số.
- Với mỗi lá số: ghi vị trí sáu nhãn riêng biệt, cung Mệnh, Liêm Trinh, Lộc Tồn, Thiên Mã, Thất Sát, các thành phần điều kiện Mệnh, và 12 khoảng đại hạn (tuổi bắt đầu, chi).
- Đối chứng độc lập hai kết quả: (1) chính hàm `DING_PIN_GE / DING_ZA_GE` và `detectDingPin / detectDingZa` của nguồn; (2) công thức Boolean độc lập xây trực tiếp từ các cung và sao nguồn. Đối chiếu đúng từng ca, không ép ra ca dương tính giả nếu mẫu không có.
- Kiểm toán JS `tuvi-r33-r61-audit-source-void-predicates.cjs` bắt buộc **đủ 960 ID**, sáu nhãn nguồn có tên cố định và chỉ số địa chi hợp lệ, không trùng vị trí, không đổi thứ tự kỳ hạn, không sai vị trí 1989 đã khóa tại R33. Phản chứng sửa ngày, sao, tọa độ hoặc thống kê nguồn phải FAIL.
- Lưu artifact JSON nguồn thực và báo cáo thống kê cho cả ba cách cục, gồm số ca dương tính tìm thấy và tỷ lệ xuất hiện từng nhãn. **Không nâng cấp mẫu thành xác nhận học thuật.**

## Giới hạn & cổng nghiệm thu

R61 mới kiểm chứng **tính nhất quán logic của detector nguồn theo các tọa độ nguồn**, không chứng minh phép an của Thiên Đồ tương đương thuật toán nguồn, đặc biệt còn khác ngày âm tháng 7/1989. Đối với `dinh-ban-01`, R57 trước đó cho thấy cùng ngày dương có thể khác tọa độ Liêm Trinh. Cả ba chỉ mục vẫn `pending`.

Không sửa `tuvi.js`, `lunar.js`, luật luận giải, API, SQL, AI, quyền hay UI; mốc nghiên cứu vẫn **31/49**, số phê duyệt học thuật độc lập chưa được tự xác nhận. Chỉ xét nâng lên **32/49** khi phép an sao, múi giờ, ý nghĩa Không Vong và dữ liệu kiểm thử dương/âm nguồn/local được thẩm định.

**Gate trước gộp:** nguồn ghim R33–R61 thực + Source Integrity + Full Stack + Production Acceptance 5/5 cùng HEAD SHA; nghiệm thu `main` sau squash.
