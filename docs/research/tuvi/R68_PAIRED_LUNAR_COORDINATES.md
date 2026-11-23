# R68 — Đối chiếu 14 chính tinh khi hai bộ tính nhận cùng ngày âm

R67 chỉ đổi ngày âm đầu vào của Thiên Đồ để lập lại vị trí Tử Vi, Liêm Trinh, Thất Sát và Hóa Lộc quan sát ở nguồn. R68 chạy cả hai bộ tính với từng ngày âm đã ghi nhận, kiểm tra toàn bộ 14 chính tinh và ghi cả tên sao mang Hóa Lộc.

## Phép đối chứng

- Dùng lại 30 ca giả lập của R67. Mỗi ca chạy theo ngày dương ban đầu để ghi nhận đầu vào âm lịch thực tế của từng bộ tính.
- Với từng ca, chạy cả hai bộ tính theo ngày âm nguồn và ngày âm Thiên Đồ. Hai giá trị giống nhau được chạy một lần. Có 18 ca với hai ngày âm và 12 ca với một ngày âm, tổng cộng 48 phép so sánh.
- Nguồn được ghim tại `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, dùng `iztro@2.6.1`. Đường ngày dương gọi `generateChart` của nguồn. Đường ngày âm gọi `astro.byLunar` với cấu hình mặc định đã được mã nguồn ghim áp dụng. Đầu ra phải trả lại đúng năm, tháng, ngày âm và cờ nhuận được yêu cầu.
- Kiểm tra đủ 14 chính tinh duy nhất, Cục, Can năm, cung Mệnh, sao mang Hóa Lộc và địa chi của sao đó. Mỗi bộ tính cũng được chạy lại theo ngày âm của chính nó để đối chiếu với lá số lập từ ngày dương.

## Kết quả

| Phép so sánh | Kết quả cục bộ |
| --- | --- |
| Cùng ngày dương ban đầu | 18/30 ca lệch ngày âm và lệch cả 14 chính tinh. Mười hai ca đối chứng khớp. |
| Cùng ngày âm đầu vào | 672/672 cặp tọa độ của 14 chính tinh khớp trên 48 phép so. |
| Sao mang Hóa Lộc và địa chi | Khớp cả tên lẫn địa chi ở 48/48 phép so cùng ngày âm. |
| Mỗi bộ tính chạy lại ngày âm của chính mình | Khớp lá số dương lịch tương ứng ở 60/60 lượt. |

Ca nam 00:00 ngày 15/08/1989 có Hóa Lộc trên Vũ Khúc ở cả hai bộ tính. Với ngày âm 14/7, Vũ Khúc nằm tại Mão. Với ngày âm 15/7, Vũ Khúc nằm tại Tý. Sai khác ở tọa độ Hóa Lộc của ca này đi cùng sự đổi cung của Vũ Khúc.

## Phạm vi và tái lập

Mẫu gồm các tháng âm thường và ba giờ sinh 00:00, 08:00, 22:00 trong bộ ca R67. Kết quả áp dụng cho tọa độ chính tinh và Hóa Lộc trong mẫu đó. Quy tắc lịch, lập lá số và mốc nghiên cứu 31/49 giữ nguyên.

Workflow `tuvi-cross-engine-evidence.yml` chạy probe R68 sau R67 và giữ hai tệp JSON về lần chạy nguồn và kết quả đối chiếu từng ca. Nghiệm thu theo cùng HEAD SHA cần R32 có R66–R68, Source Integrity, Full Stack và Production Acceptance đạt 5/5.
