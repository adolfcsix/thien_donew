# R67 — Đối chứng ngày âm cho sáu lá số lệch tọa độ

R66 tìm thấy sáu lá số lệch ở Liêm Trinh, Thất Sát và Hóa Lộc, đều cùng ngày dương 15/08/1989. R57 đã thử đưa ngày âm nguồn vào Thiên Đồ để đối chiếu Tử Vi và Liêm Trinh. R67 nối danh sách R66 với kết quả R33 theo ngày dương, giờ và giới tính, rồi mở phép đối chứng sang Thất Sát và Hóa Lộc.

## Cách kiểm chứng

1. Trong workflow R32, thực thi R29/R30 và R33 trên cùng checkout nguồn `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, dùng `iztro@2.6.1`.
2. Tính lại R66 và R33 từ các kết quả gốc. Xác thực 18 đầu vào chung, gồm trọn sáu ca trong hàng đợi R66. Từ chối bản ghi trùng đầu vào hoặc có tọa độ Mệnh hay ba sao mâu thuẫn giữa hai báo cáo.
3. Với mỗi ca R33, giữ năm âm, tháng âm, cờ nhuận, giờ và giới tính của Thiên Đồ. Chỉ nhập giá trị ngày âm do nguồn quan sát. Phép tính phải giữ nguyên Can năm, cung Mệnh và Cục. Ngày dương quy đổi ngược từ đầu vào thử nghiệm có thể khác ngày sinh giả lập ban đầu.
4. Đối chiếu bốn vị trí sau khi chạy lại và đo riêng độ lệch địa chi từ Tử Vi đến Liêm Trinh theo modulo 12. Các quan sát có khác ngữ cảnh hoặc còn lệch tọa độ được ghi lại để điều tra.

## Kết quả trên nguồn ghim

| Ngày dương | Số ca | Kết quả |
| --- | ---: | --- |
| 15/08/1988 và 15/08/1990 | 12 | Ngày âm và bốn tọa độ khớp từ đầu |
| 14/08 và 16/08/1989 | 12 | Đổi một ngày âm tái tạo cả bốn tọa độ nguồn |
| 15/08/1989 | 6 | Tái tạo cả bốn tọa độ ở toàn bộ hàng đợi R66 |

Ba giờ 00:00, 08:00 và 22:00 đều được kiểm tra cho cả nam và nữ trên mỗi ngày. Trong cả 30 ca, khoảng cách Liêm Trinh so với Tử Vi ở hai bộ tính đều là `−8 ≡ 4 (mod 12)`. Mốc sóc của R33/R64 giải thích vì sao hai quy ước ngày dân sự có thể cho ngày đầu tháng khác nhau. Kết quả chỉ xác nhận rằng thay giá trị ngày âm đủ để tái tạo các tọa độ đã đo trong mẫu này.

Ca nam 00:00, 15/08/1989, có Mệnh tại Thân (8), Can Kỷ và Kim Tứ Cục ở cả hai bộ tính. Địa chi được đánh số từ Tý (0).

| Hạng mục | Nguồn ghim | Thiên Đồ từ ngày dương | Thiên Đồ chạy với ngày âm nguồn |
| --- | ---: | ---: | ---: |
| Ngày âm tháng 7 | 14 | 15 | 14 |
| Tử Vi | 7 | 4 | 7 |
| Liêm Trinh | 11 | 8 | 11 |
| Thất Sát | 3 | 6 | 3 |
| Hóa Lộc | 3 | 0 | 3 |

## Tái lập và nghiệm thu

Workflow `tuvi-cross-engine-evidence.yml` tạo cùng lúc báo cáo R32 và quan sát R33 rồi chạy kiểm thử R67 với `THIENDO_R32_REQUIRE_GENUINE=1`. Artifact có báo cáo `.r67-lunar-day-star-replay.json` ghi từng đầu vào, tọa độ gốc và tọa độ đối chứng.

Nghiệm thu trên cùng HEAD SHA cần R32 có R66/R67, Source Integrity, Full Stack và Production Acceptance đạt 5/5. Phạm vi nghiên cứu giữ mốc 31/49. Các cờ về thẩm định trường phái, tương đương ngữ nghĩa và quyền thay đổi quy tắc đều ở trạng thái chưa xác minh.
