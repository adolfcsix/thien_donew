# THIÊN ĐỒ V11.13 — Kho sao truyền thống: an sao và nội dung độc lập

## Phạm vi phát hành

Bổ sung **11 sao an tại vị trí cụ thể** trong dữ liệu sinh: Long Trì, Phượng Các, Giải Thần, Cô Thần, Quả Tú, Thiên Quan, Thiên Phúc, Ân Quang, Thiên Quý, Thái Phụ, Phong Cáo. Đây là **một bước mở rộng có giới hạn**, không phải thông báo đã an đủ mọi sao Tử Vi. Bản này không thay đổi 14 chính tinh, 9 phụ tinh nguyên thủy, 5 sao chi năm cũ, 7 sao bổ sung, 4 sát tinh, Tuần/Triệt, ba vòng sao, Tứ Hóa hoặc cách tính Đại hạn/Tiểu hạn.

11 sao được trả về trong `chart.traditionalStars` và `house.traditionalStars`/`house.traditionalStarDetails`. Không trộn vào `additionalStars` để giữ khả năng kiểm thử hồi quy từng nhóm. `chart.coverage.traditionalRuleBasedStars = 11` ghi rõ phạm vi đã bao phủ. `chart.traditionalStarRuleSet = traditional-eleven-natal-v11.13.0` ghi quy tắc tính phiên bản. Bản offline UMD cũ thiếu module mới sẽ cố ý không tự bịa vị trí sao; chỉ chương trình có nạp `traditional-stars.js` mới có đủ lớp V11.13.

### Bảng quy tắc được chọn, địa chi Tý = 0 … Hợi = 11

| Sao | Phụ thuộc | Quy tắc đã cài |
|---|---|---|
| Long Trì | Địa chi năm sinh | Tý khởi Thìn; mỗi chi năm tiến 1 cung thuận. |
| Phượng Các, Giải Thần | Địa chi năm sinh | Tý khởi Tuất; mỗi chi năm lùi 1 cung; Giải Thần đồng cung Phượng Các. |
| Cô Thần, Quả Tú | Tam hội địa chi năm sinh | Hợi/Tý/Sửu: Dần/Tuất; Dần/Mão/Thìn: Tỵ/Sửu; Tỵ/Ngọ/Mùi: Thân/Thìn; Thân/Dậu/Tuất: Hợi/Mùi. |
| Thiên Quan/Thiên Phúc | Thiên can năm sinh | Bảng 10 thiên can theo quy ước cố định trong `STEM_QUAN`, `STEM_PHUC`. |
| Ân Quang | Văn Xương + ngày âm | Văn Xương khởi mùng 1, đếm thuận, lùi 1 cung. |
| Thiên Quý | Văn Khúc + ngày âm | **Dị bản Việt:** Văn Khúc khởi mùng 1, đếm nghịch, lùi 1 cung theo chiều ngược lại. |
| Thái Phụ/Phong Cáo | Văn Khúc | Hai cung kề Văn Khúc (+1 và -1); mốc Văn Khúc tính là cung thứ nhất. |

### Dị bản quan trọng

- **Thiên Quan:** Một số bảng khác năm Ất/Bính với bảng được chọn. Không tự hòa trộn các bảng giữa các lá số.
- **Thiên Quý:** Có dị bản sách Hoa dùng chiều đếm khác. Bản V11.13 chọn công thức ngày âm trên; nếu muốn hỗ trợ nhiều phái, phải thêm `schoolId`/`ruleSet` rõ ràng, kiểm thử và xuất cùng dữ liệu.
- **Thái Phụ/Phong Cáo:** Tài liệu diễn đạt “cung thứ hai” theo cách đếm gồm cung Văn Khúc là cung đầu tiên. Cần đối chiếu ví dụ lá số chuyên môn trước khi coi là chuẩn toàn hệ.
- Các công thức khác của Tử Vi V11.12 (Hỏa/Linh, Tứ Hóa, Tiểu hạn, tháng nhuận…) vẫn còn dị bản chưa được thẩm định.

Nguồn đối chiếu **chỉ lưu tài liệu phát triển nội bộ**:

- https://nhatnguyet.org/kien-thuc/bai-viet/thien-quan-thien-phuc-an-theo-can-nam-sinh-c58edd
- https://nhatnguyet.org/kien-thuc/bai-viet/an-quang-thien-quy-an-the-nao-va-vi-sao-goi-la-sao-quy-nhan-b49624
- https://thuvien.kabala.vn/ebook/Huyen-Hoc-Dong-Phuong/Tu-Vi/Lap-va-giai-tu-vi.pdf
- https://thienmenhdo.com/tu-vi-toan-thu/sao-long-tri
- https://tuvithienco.vn/2026/04/25/luan-sao-giai-than-trong-tu-vi/
- https://chonngaylanh.com/blog/co-than-qua-tu

Không đưa URL nguồn, rule ID, đường dẫn tệp hoặc chi tiết kiểm thử ra giao diện luận giải cho khách hàng. Ở giao diện, chỉ đưa tên, vị trí, ý nghĩa biên soạn mới, cảnh báo phù hợp. **Nguồn vẫn cần được giữ trong hồ sơ kỹ thuật, không xóa dấu vết kiểm chứng.**

## Cấu trúc dành cho đội phát triển

| Chức năng | File / thư mục |
|---|---|
| Công thức an 11 sao | `packages/astrology-engine/src/traditional-stars.js` |
| Kết nối lá số và trường dữ liệu | `packages/astrology-engine/src/tuvi.js` |
| Dữ liệu chú giải các sao | `packages/knowledge/src/star-symbols.json` |
| Metadata biên tập, phiên bản, trạng thái thẩm định | `packages/knowledge/src/traditional-star-catalogue.json` |
| Đọc 12 cung, liên cung, cách cục | `packages/interpretation/src/` |
| Giao diện ô cung / phòng đọc / bảng tra | `apps/web/src/features/chart/` |
| Xuất ảnh SVG đọc và in | `packages/chart-export/src/index.cjs` |
| Kiểm thử bảng vị trí, dữ liệu, nguồn đọc | `tests/v1113-traditional-stars.test.cjs` |
| Hợp đồng TypeScript | `tests/types/v1113-traditional-contract.ts`, `tsconfig.v1113-check.json` |
| Bản xem trước kiểm tra | `previews/v1113-traditional-stars.html` |

Để thêm một sao, cần xác định cách an và cơ sở trước; tạo trường dữ liệu mới tại lớp engine có bài kiểm thử vị trí; khai báo type; lập hồ sơ kiến thức trong JSON; kiểm thử xuất, tra cứu, tính toàn vẹn và thay đổi hồi quy. **Không sửa câu văn hay chỉnh UI để làm sai phép an sao.**

## Kiểm chứng và giới hạn

- 13 bài mới kiểm tra 11 sao, bảng Can/Chi, 12 chi, 12-day periodicity, input, đối chiếu engine, bài đọc và xuất.
- Các kiểm thử này là đối chứng theo **quy tắc đã lựa chọn**. Không phải là thẩm định chuyên môn độc lập. Toàn bộ 11 hồ sơ metadata mang `expertReviewed:false`.
- Source gate, Node regression, TypeScript module; HTML Chromium 320–1600 px. **Chưa xác nhận build Next/Nest thật, PostgreSQL E2E hoặc vận hành production** do bản nguồn hiện thiếu lockfile và dependency.
- Các sao khác còn thiếu cần ưu tiên theo nhu cầu, như Quốc Ấn, Kiếp Sát, Phá Toái, các nhóm Lưu niên, Lưu nguyệt, Lưu nhật, Lưu thời. Không bổ sung bừa quy tắc chưa có ví dụ chuẩn.
- Thuật số là hệ diễn giải truyền thống, không phải khoa học có năng lực dự đoán đã được chứng minh.
