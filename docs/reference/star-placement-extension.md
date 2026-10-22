# THIÊN ĐỒ V10.8 — Phần mở rộng 7 sao có quy tắc (10/10/2026)

## Phạm vi

Bổ sung **7 sao** chưa có trong bộ 14 chính tinh / 9 phụ tinh / 5 sao chi năm cũ. Bảy sao này được cung cấp qua `packages/astrology-engine/src/additional-stars.js`, **không sửa bảng sao cũ** và không coi việc có thêm sao là bằng chứng đúng về luận đoán. Bộ quy tắc riêng: `supplementary-seven-month-year-day-v1.0`. Tọa độ địa chi tính từ `Tý=0, Sửu=1, … Hợi=11`; `mod(x,12)` luôn cho kết quả 0–11.

| Sao | Dữ kiện và quy tắc an | Ví dụ kiểm tra |
|---|---|---|
| Thiên Hình | Tháng âm 1 ở Dậu (9), mỗi tháng thuận 1 cung; `mod(9+tháng-1,12)` | Tháng 4 → Tý |
| Thiên Riêu | Tháng âm 1 ở Sửu (1), mỗi tháng thuận 1 cung | Tháng 4 → Thìn |
| Thiên Y | Luôn đồng cung Thiên Riêu | Tháng 4 → Thìn |
| Thiên Khốc | Năm Tý khởi Ngọ (6), đếm nghịch theo chi năm; `mod(6-chi năm,12)` | Tuổi Mão → Mão |
| Thiên Hư | Năm Tý khởi Ngọ (6), đếm thuận theo chi năm; `mod(6+chi năm,12)` | Tuổi Mão → Dậu |
| Tam Thai | Tại Tả Phụ coi là mùng 1 âm, theo ngày âm đếm thuận | Tả Phụ tại Thìn, mùng 2 → Tỵ |
| Bát Tọa | Tại Hữu Bật coi là mùng 1 âm, theo ngày âm đếm nghịch | Hữu Bật tại Tuất, mùng 2 → Dậu |

### Đối chiếu nguồn

- Bảng Thiên Hình / Thiên Riêu / Thiên Y theo tháng: [Tử Vi Áo Bí Biện Chứng Học, tr.88, bản PDF](https://www.vietnamvanhien.org/TuViAoBiBienChungHoc.pdf); [Cách an sao — Kiều Oanh Trần](https://www.tuvikieuoanhtran.com/blog/cach-an-cac-sao-phu-tro-van-xuong-khoi-viet-va-bang-tu-hoa); [Thầy Ưng Khiêm — Thiên Riêu](https://thayungkhiem.vn/sao-thien-rieu).
- Bảng đối chiếu 12 chi năm cho Khốc/Hư: [Thiên Khốc — Thầy Ưng Khiêm](https://thayungkhiem.vn/sao-thien-khoc); [Sơn Khiêm — Thiên Khốc](https://tuvisonkhiem.vn/thu-vien/sao/thien-khoc/).
- Công thức Tam Thai/Bát Tọa theo Tả Phụ/Hữu Bật và ngày âm: [Tài liệu an sao (PDF)](https://www.huyenhocvietnam.vn/upload/attach/hhvn2021728112853ko16Iu.pdf).

**Lưu ý nguồn:** Đây là đối chiếu bảng quy tắc truyền thống, không phải xác minh khoa học hiệu lực tiên đoán. Có thể tồn tại dị bản giữa trường phái, kể cả cách xử lý tháng nhuận, ngày/giờ Tý, mốc giao năm. Bản này kế thừa lựa chọn tháng âm, ngày âm và chi năm *của engine hiện hành*, không đổi cách tính giờ địa phương hay quy tắc chuyển ngày.

## Luồng dữ liệu và tương thích

1. `tuvi.js` tính 9 phụ tinh cũ, lấy vị trí Tả Phụ/Hữu Bật để an thêm 7 sao; vị trí không phụ thuộc giới tính.
2. Trường mới trên kết quả: `additionalStars` (đủ 7 đối tượng có `name`, `branch`, `basis`, `ruleSet`), `additionalStarRuleSet` và `coverage.additionalRuleBasedStars`.
3. Mỗi `houses[i]` nhận `additionalStars` và `additionalStarDetails`. Các trường này **tùy chọn** trong TypeScript vì dữ liệu lá số cũ / bản export trước V10.8 không có chúng.
4. Frontend thể hiện sao mới riêng theo nhóm, gắn nhãn dữ kiện an sao trong phần chi tiết và cho phép tìm bằng tên không dấu. Xuất SVG chèn nhóm sao bổ sung mà vẫn escape nội dung.
5. Dữ liệu lưu trữ là *đầu vào sinh lá số*; không đổi database schema hay lịch sử nhập/sao lưu.

## Kiểm thử

- 12 fixture tháng cho Hình/Riêu/Y, 12 fixture chi năm cho Khốc/Hư.
- 4.320 trường hợp Tam Thai/Bát Tọa (12 Tả × 12 Hữu × 30 ngày) kiểm tra cả đếm thuận/nghịch.
- Đầu vào sai/không nguyên, kiểm tổng 7 sao/12 cung, đối chiếu ngày dương và âm tương đương, xuất SVG, tích hợp React tìm kiếm.
- Bộ kiểm thử tự động và các kiểm tra nguồn khác được báo cáo trong `docs/STAR_ATLAS_TEST_REPORT_2026_10_10.md`.

**Giới hạn phát hành:** Không tuyên bố đã có đủ sao Miếu/Vượng/Đắc/Hãm, không tự gán ý nghĩa cát/hung; vẫn cần chạy `typecheck`/`build` có dependencies và E2E với PostgreSQL thật để xác nhận website triển khai được.
