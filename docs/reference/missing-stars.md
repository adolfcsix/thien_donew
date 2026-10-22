# THIÊN ĐỒ V11.19 — bổ sung sao gốc có kiểm toán

Tài liệu **nội bộ dành cho lập trình viên/biên tập viên**. Thông tin nguồn không hiển thị trên lá số và bài giải nghĩa người dùng.

## Phạm vi thực hiện

- Bổ sung lớp `missingStars` tách biệt, bốn tên **Thiên Trù, Lưu Hà, Thiên Không, Đẩu Quân**; có công thức, hồ sơ giải nghĩa và kiểm chứng gắn chính xác vào một cung.
- Tính Thiên Trù/Lưu Hà theo Can năm sinh; Thiên Không liền sau cung Thái Tuế năm sinh, phân biệt với Địa Không; Đẩu Quân từ Thái Tuế năm sinh, đếm nghịch tháng sinh, thuận giờ sinh.
- Kết nối UI 12 cung, phòng đọc, tìm sao, bảng đối chiếu, mô-đun nghiên cứu, SVG và công cụ kiểm kê.
- Backlog nội bộ sau đợt này không còn ứng viên sao gốc thuộc danh sách ưu tiên đã định nghĩa; điều đó **không có nghĩa đã đủ toàn bộ hệ thống sao**.

## Bảng an được chọn

Index chi theo Tý=0, Sửu=1, ... Hợi=11; Can Giáp=0 ... Quý=9.

| Can | Giáp | Ất | Bính | Đinh | Mậu | Kỷ | Canh | Tân | Nhâm | Quý |
|---|---|---|---|---|---|---|---|---|---|---|
| Thiên Trù | Tỵ | Ngọ | Tý | Tỵ | Ngọ | Thân | Dần | Ngọ | Dậu | Tuất |
| Lưu Hà **(bảng đã chọn)** | Dậu | Tuất | Mùi | Thân | Tỵ | Ngọ | Thìn | Mão | Hợi | Dần |

**Dị bản quan trọng:** Một số tài liệu an **Lưu Hà tuổi Mậu tại Tý** (khác bảng Tỵ đang chọn), và có tài liệu đổi chỗ **Canh/Mão – Tân/Thìn**. Không tự hợp nhất những bảng này; chỉ đổi thông qua phiên bản quy tắc mới có kiểm thử và thẩm định.

Thiên Không = `(nămChi + 1) % 12`. Đẩu Quân = `(nămChi - (thángÂm - 1) + giờChi) mod 12`. Tháng nhuận đang dùng số thứ tự tháng âm giống tháng thường; giờ Tý 23:00 giữ cách chốt ngày cũ của engine. Chưa triển khai *lưu Đẩu Quân* theo năm xem hay lưu nguyệt.

### Tài liệu tham khảo công khai để kiểm chứng tiếp

- <https://thayungkhiem.vn/sao-thien-tru> — bảng Thiên Trù theo Can.
- <https://thayungkhiem.vn/sao-luu-ha> — bảng Lưu Hà Tỵ ở Mậu, Thìn ở Canh, Mão ở Tân.
- <https://tracuutuvi.com/sao-luu-ha.html> — dị bản Mậu tại Tý.
- <https://tuvisonkhiem.vn/thu-vien/sao/luu-ha/> — bảng đối chiếu dị bản Canh/Tân/Đinh.
- <https://tuvidonga.com/sao-thi%C3%AAn-khong-ban-chat> — Thiên Không kế sau Thái Tuế.
- <https://nhatnguyet.org/kien-thuc/bai-viet/dau-quan-nguyet-tuong-an-the-nao-va-vi-sao-chi-dung-khi-xem-van-thang-c6412d> — công thức Đẩu Quân và phân biệt vị trí sao gốc, sao lưu.

Các nguồn kể trên giúp chọn quy ước và tìm vấn đề bất đồng; **chưa thay thế việc thẩm định độc lập từ chuyên gia**. Nội dung giải nghĩa viết mới, không sao chép diễn giải từ các trang trên.

## Cấu trúc nguồn

- Công thức: `packages/astrology-engine/src/missing-stars.js`.
- Đầu vào: Can/Chi năm sinh, tháng âm và giờ chi đã tính; không dùng năm đang xem.
- Dữ liệu cung: `chart.missingStars`, `chart.houses[i].missingStars` và bản chi tiết đi kèm.
- Kho mô tả: `packages/knowledge/src/star-symbols.json`.
- Kiểm thử phép an và các trường hợp giả mạo: `tests/v1119-missing-stars.test.cjs`.
- Inventory: `packages/star-audit/src/index.cjs`; tạo báo cáo `npm run audit:stars`.
- Preview độc lập: `infrastructure/scripts/make-v1119-missing-preview.cjs`.

## Trạng thái kiểm chứng

Bộ kiểm thử hồi quy kiểm tra tính đúng theo **bảng đã chọn** và tính nhất quán của engine. 22 lá số baseline dùng engine làm dữ liệu tham chiếu, không phải 22 lá số thẩm định độc lập. Các dị bản Can/Chi chưa hỗ trợ chuyển đổi trong UI. Thiếu `package-lock.json` và dependency cài đồng bộ nên chưa xác minh build Next.js/NestJS và PostgreSQL E2E; không được gọi phiên bản này production-ready.
