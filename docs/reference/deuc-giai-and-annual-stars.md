# THIÊN ĐỒ V11.16 — Sao Đức/Giải và sao lưu năm xem

> **Nội bộ phát triển.** Định dạng dữ liệu này không có mục trích dẫn kỹ thuật trên giao diện người sử dụng. Các phép an dựa theo **một bộ quy tắc được chọn**, có thể có dị bản. Chưa xác nhận tính đúng đắn với bộ lá số chuẩn do chuyên gia thẩm định.

## Thực hiện trong phiên bản

- Bốn sao gốc mới: **Thiên Đức**, **Nguyệt Đức**, **Thiên Giải**, **Địa Giải**.
- Bốn sao lưu mới theo năm âm lịch được chọn: **Lưu Tang Môn**, **Lưu Bạch Hổ**, **Lưu Thiên Khốc**, **Lưu Thiên Hư**.
- Cơ sở an sao cũ, 14 chính tinh, Đại hạn/Tiểu hạn, Tuần/Triệt, Tứ Hóa **không thay công thức**.
- Các sao gốc không bị thay đổi khi đổi năm xem. Các sao lưu được tạo riêng trong `annual-layers.js`.
- Bộ kiểm kê V11.15 được mở rộng thành 11 nhóm, nhận diện **93 tên sao gốc/vòng sao**, **12 sao lưu**, **2 dấu án ngữ**. Mỗi tên gốc/vòng sao đã triển khai có hồ sơ giải nghĩa; đây **không** phải tỷ lệ hoàn thiện so với bất kỳ giáo trình/phái nào.
- Backlog còn **11 sao gốc** và **1 sao lưu** trong danh sách ứng viên hiện có, không phải tổng số còn thiếu của toàn ngành.

## Quy tắc an được chọn (chỉ số địa chi Tý=0, Sửu=1, …, Hợi=11)

Định nghĩa `mod12(n) = (n % 12 + 12) % 12`. `chiSinh` là địa chi năm **sinh âm lịch** (0–11), `thangSinh` là tháng âm (1–12), `chiXem` là địa chi **năm âm lịch đang xem** (0–11).

| Sao | Công thức | Ví dụ độc lập |
|---|---|---|
| Thiên Đức | `mod12(9 + chiSinh)` | sinh Tý → Dậu |
| Nguyệt Đức | `mod12(5 + chiSinh)` | sinh Tý → Tỵ |
| Thiên Giải | `mod12(8 + thangSinh − 1)` | tháng Giêng → Thân |
| Địa Giải | `mod12(7 + thangSinh − 1)` | tháng Giêng → Mùi |
| Lưu Tang Môn | `mod12(2 + chiXem)` | xem năm Tý → Dần |
| Lưu Bạch Hổ | `mod12(8 + chiXem)` | xem năm Tý → Thân |
| Lưu Thiên Khốc | `mod12(6 − chiXem)` | xem năm Tý → Ngọ |
| Lưu Thiên Hư | `mod12(6 + chiXem)` | xem năm Tý → Ngọ |

Các hệ quả kiểm thử: Lưu Bạch Hổ luôn đối xung Lưu Tang Môn; sau 12 năm hai sao này về cùng vị trí. Sao Giải Thần (an theo năm và Phượng Các) **không** được đồng nhất với Thiên Giải hoặc Địa Giải. Địa Không **không** được đồng nhất với Thiên Đức. Hạn năm lấy **năm âm lịch** do người dùng chọn, không giả định đổi năm vào ngày 1/1 dương lịch.

## Nguồn tham khảo ngoài giao diện (cần đối chiếu dị bản)

Đây chỉ là tài liệu nghiên cứu thuật toán và phương án quy tắc, không phải chứng nhận chuyên môn hoặc bằng chứng Tử Vi có khả năng dự báo:

- Thiên Đức: https://thienco.vn/sao-thien-duc-trong-tu-vi.html
- Nguyệt Đức: https://thienco.vn/sao-nguyet-duc-trong-tu-vi.html
- Thiên Giải: https://tuvisonkhiem.vn/thu-vien/sao/thien-giai/
- Địa Giải: https://tuvisonkhiem.vn/thu-vien/sao/dia-giai/
- Sao lưu theo năm: https://tuvicaimenh.com/cach-an-sao-la-so-tu-vi
- Đối chiếu quy tắc năm: https://lichngaytot.com/tu-vi/cac-buoc-lap-la-so-tu-vi-304-217457.html

**Rủi ro cần thẩm định:** Thiên Đức/Nguyệt Đức ở một số trường phái có cách phân biệt và an theo lối khác; khởi điểm an sao và thứ tự duyệt 12 chi phải được kiểm tra bằng lá số chuyên gia. Quy tắc an sao truyền thống khác với khẳng định tâm lý, y khoa, tài chính hoặc sự kiện chắc chắn.

## Chỗ sửa và cách kiểm thử

| Nhiệm vụ | File |
|---|---|
| Thay công thức bốn sao gốc | `packages/astrology-engine/src/benefic-stars.js` |
| Thay công thức bốn sao lưu | `packages/astrology-engine/src/annual-extensions.js` |
| Nhập vào địa bàn 12 cung | `packages/astrology-engine/src/tuvi.js` |
| Nhập vào lớp năm xem | `packages/astrology-engine/src/annual-layers.js` |
| Kiểm tra vị trí và bản sao trong 12 cung | `packages/astrology-engine/src/verify.js` |
| Chỉnh lời giải thích cho người dùng | `packages/knowledge/src/star-symbols.json` |
| Tra cứu, đọc cung, CSV/SVG | `apps/web/src/features/chart/`, `packages/chart-export/` |
| Kiểm kê đủ/thiếu, tách các nhóm | `packages/star-audit/` |
| Kiểm thử vòng 12 chi, tháng 1–12 và bảo vệ dữ liệu | `tests/v1116-benefic-annual.test.cjs` |

Chạy `npm test`, `npm run check:release:source`, `npm run audit:stars`. Tài liệu `docs/validation/V11_16_*` lưu kết quả kiểm kê. Tệp `V11_15_*` vẫn được tạo để giữ khả năng tương thích với các bài kiểm thử/đường dẫn nội bộ cũ, không phải số liệu V11.15 khi mở từ gói V11.16.

### Phạm vi chưa xác minh

- Chưa thực hiện build Next.js/NestJS với đủ dependency trong môi trường hiện tại; chưa chạy PostgreSQL E2E.
- 22 lá số baseline cũ là dữ liệu của **chính engine**, không phải lá số được thẩm định ngoài.
- Vẫn thiếu nhiều sao gốc và sao lưu ngoài các ứng viên liệt kê. Chưa có lớp lưu nguyệt/ngày/giờ hoàn chỉnh.
- Giao diện HTML preview là bản **độc lập từ dữ liệu engine** dùng để kiểm tra bố cục và tương tác, không phải một phiên website Next.js hoạt động đầy đủ.
