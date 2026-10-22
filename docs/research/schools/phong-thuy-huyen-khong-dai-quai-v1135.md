# Hồ sơ phương pháp 玄空大卦 — V11.135

## Khung hệ thống

Nghiên cứu phương pháp vòng 64 quẻ San Nguyên. Không trộn với Hạ quái/Thế quái của Phi Tinh, không dùng để kiểm chứng nguyên lý thực nghiệm.

## Dữ liệu được nhập và cách kiểm soát

| Hạng mục | Quy tắc V11.135 | Trạng thái |
|---|---|---|
| 64 quẻ | Bắc 0° đến 360°, 5,625° mỗi quẻ, thứ tự bảng Wikibooks | đã đối chiếu bảng công khai; chưa phản ánh mọi dị bản |
| Tọa / hướng | +180° (mod 360) | bất biến kiểm thử đủ 64 cặp |
| Quái khí N | số 1,2,3,4,6,7,8,9 theo bảng | atlas độc lập |
| Quái vận M | số 1,2,3,4,6,7,8,9 theo bảng | atlas độc lập; **không phải vận xây nhà** |
| 384 đoạn | 64 ×6 ô hình học, 0,9375° mỗi ô | tính vị trí, **chưa gán phép trừu hào** |
| Độ đo | khoảng ± sai số xung quanh ranh giới | đánh dấu không xác định thay vì chốt quẻ |
| Quái động/biến | các phép suy theo hào và thời vận riêng trường phái | chưa triển khai |

## Bài toán nguồn

Wikibooks cung cấp một sơ đồ vòng 64 quẻ với CN 01–64, GN Kinh Dịch, Binary, Quái khí N và Quái vận M. Được ghi lại cùng id tham chiếu và giấy phép trong `great-hexagrams.cjs`; dữ liệu cần được chuyên gia so sánh với ít nhất một luopan/ấn bản học thuật khác. Bảng có quy ước độ biên [đầu, cuối), nên góc đúng 180° thuộc quẻ 33 姤, nhưng vẫn hiện **độ không ổn định** nếu có sai số bao trùm ranh giới.

## Chưa được tự động suy diễn

- Không tự làm phép dời cung hoặc dùng thuật toán sao Phi Tinh để tính Quái khí/Quái vận.
- Không đưa ra kết luận cát/hung, khai môn, hướng xây dựng, ngày khởi công khi chưa có hình thế và điều kiện pháp lý/kỹ thuật.
- Không tự gán số hào động từ độ la bàn.
- Không chọn quy ước Thế quái khi đo sát biên, không quyết định theo cảm biến điện thoại chưa được hiệu chuẩn.

## Nguồn

- https://en.wikibooks.org/wiki/Feng_Shui/Xuan_Kong_Da_Gua/Binary_Representation_of_the_64_Hexagrams (CC BY-SA; trang cập nhật 16-08-2026)
- https://www.ancientchineselab.com/feng-shui/flying-stars/
- https://toea.com/flying-star-chart
