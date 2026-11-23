# R69 — Truy vết quy tắc an sao trong tháng nhuận

R35 kiểm tra lúc bắt đầu tháng nhuận. R68 đối chiếu chính tinh khi hai bộ tính nhận cùng ngày âm trong tháng thường. R69 mở rộng sang ngày 15–16 và cuối tháng nhuận, nơi ngày âm ghi trên lá số có thể khác ngày bộ tính dùng để an sao.

## Mẫu và cách đối chiếu

- Dùng tháng Sáu nhuận 2017, tháng Tư nhuận 2020 và tháng Hai nhuận 2023. Mẫu gồm 25 ngày dương, ba giờ 00:00, 08:00 và 22:00, cùng hai giới tính giả lập. Kiểm tra cả ngày liền trước và ngày liền sau mỗi tháng nhuận.
- Chạy bốn chính sách của nguồn `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` với `iztro@2.6.1`. Lưu riêng ngày âm dân sự, ngày âm hiệu lực mà nguồn báo và ngày âm trả về từ đường tính đã tái lập. Xác nhận đường tính cho cùng cung Mệnh, Cục, vị trí Tử Vi, Tả Phụ và Hữu Bật với `generateChart` trước khi so với Thiên Đồ.
- Đọc tháng dùng để an Mệnh, Tả Phụ và Hữu Bật từ ba tọa độ quan sát. Dùng Cục quan sát và lần lượt hai giá trị ngày âm để kiểm tra công thức đặt Tử Vi của Thiên Đồ có tái tạo vị trí nguồn hay không. Giữ lỗi chuyển đổi có đối chứng trong báo cáo và để lỗi ngoài phạm vi làm dừng kiểm thử.

## Kết quả cục bộ

Ngày âm dân sự và cờ nhuận khớp ở **150/150** đầu vào. Với chính sách chia đôi, địa chi quan sát cho thấy Mệnh, Tả Phụ và Hữu Bật chuyển sang tháng sau từ ngày 16 trong cả ba cửa sổ. Thiên Đồ tiếp tục dùng số tháng nhuận gốc cho ba vị trí này.

| Chính sách nguồn | Lập được lá số | Cả năm mục đo trùng Thiên Đồ |
| --- | ---: | ---: |
| Chia đôi (`split`) | 150/150 | 90/150 |
| Quy về tháng thường cùng số (`prev-month`) | 150/150 | 144/150 |
| Quy về tháng sau (`next-month`) | 150/150 | 36/150 |
| Giữ ngày và tháng nhuận (`origin-month`) | 144/150 | 144/144 lá số đã lập |

Trong sáu ca ngày 21/08/2017, lịch âm dân sự là ngày 30 tháng Sáu nhuận. Chế độ chia đôi báo ngày 29 tháng Bảy vì tháng Bảy chỉ có 29 ngày. Nguồn vẫn an Mệnh và hai sao phụ theo số tháng Bảy, còn vị trí Tử Vi được tái tạo bằng **ngày 30** ở Cục quan sát. Thay bằng ngày 29 ở cùng Cục cho tọa độ khác ở cả sáu ca.

Chế độ giữ tháng nhuận của nguồn từ chối sáu ca này. Trong `lunar-lite@0.2.8`, hàm `lunar2solar` tạo ngày trong tháng thường trước khi chuyển sang tháng nhuận. Lệnh đó gặp tháng Sáu thường 29 ngày và dừng ở ngày 30. Đối chứng bằng trực tiếp `Lunar.fromYmd(2017, -6, 30)` của `lunar-typescript@1.8.6` trả về 21/08/2017. Thiên Đồ lập được lá số từ ngày dương cũng như ngày âm có cờ nhuận và hai cách nhập cho cùng cung Mệnh, vị trí Tử Vi trong bài kiểm thử.

## Tái lập và giới hạn

Workflow `tuvi-lunar-transitions-r35.yml` bổ sung các lượt thử R69 và lưu kế hoạch, quan sát nguồn cùng báo cáo đối chiếu. Phạm vi kết luận là các vị trí đo được trong ba tháng nhuận đã chọn. Quy tắc lịch, lập lá số và mốc nghiên cứu 31/49 được giữ nguyên.
