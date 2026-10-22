# THIÊN ĐỒ V11.14 — Kiểm kê sao theo Can/Chi

## Mục tiêu
Bổ sung ba sao V11.13 chưa có: Quốc Ấn, Kiếp Sát, Phá Toái. Mỗi sao được quản lý ở `natal-extensions.js` độc lập khỏi nhóm 11 sao trước, có bảng vị trí, dữ liệu giải nghĩa và kiểm thử theo Can/Chi. Không sửa phép an 14 chính tinh, Đại hạn, Tiểu hạn, Lưu niên.

## Quy tắc đã chọn (cần thẩm định chuyên gia)
* **Quốc Ấn:** Theo Lộc Tồn của thiên can năm sinh, lấy Lộc Tồn là cung thứ nhất, đếm thuận tới cung thứ chín. Các vị trí theo Can Giáp→Quý: Tuất, Hợi, Sửu, Dần, Sửu, Dần, Thìn, Tỵ, Mùi, Thân.
* **Kiếp Sát:** Dần/Ngọ/Tuất→Hợi; Thân/Tý/Thìn→Tỵ; Tỵ/Dậu/Sửu→Dần; Hợi/Mão/Mùi→Thân.
* **Phá Toái:** Tý/Ngọ/Mão/Dậu→Tỵ; Dần/Thân/Tỵ/Hợi→Dậu; Thìn/Tuất/Sửu/Mùi→Sửu.

## Tài liệu tham khảo **nội bộ — không đưa lên giao diện người dùng**
- Quốc Ấn và Lộc Tồn: https://thienco.vn/sao-quoc-an-trong-tu-vi.html ; https://xemtuvi.vn/kien-thuc/sao-quoc-an-trong-tu-vi-y-nghia-va-anh-huong-cua-quoc-an-tai-12-cung.html
- Kiếp Sát: https://thayungkhiem.vn/sao-kiep-sat ; https://thansohoconline.com/sao-kiep-sat.html
- Phá Toái: https://tuvisonkhiem.vn/thu-vien/sao/pha-toai/ ; https://khoahoctuvi.vn/post/sao-pha-toai-trong-tu-vi

Các nguồn web này được dùng **để xác định công thức của một lựa chọn trường phái**; chưa có đối chiếu độc lập với thư tịch gốc hoặc chuyên gia. Trạng thái `expertReviewed=false`. Không dùng nội dung nguồn làm văn bản luận giải sao chép.

## Vị trí sửa
- Công thức: `packages/astrology-engine/src/natal-extensions.js`
- API engine và đặt sao vào cung: `packages/astrology-engine/src/tuvi.js`
- Kiểm chứng lớp mới: `packages/astrology-engine/src/verify.js`
- Hồ sơ sao: `packages/knowledge/src/natal-extension-catalogue.json`, `star-symbols.json`
- Lời giải nghĩa ngữ cảnh: `packages/interpretation/src/index.cjs`
- Địa bàn/Phòng đọc/Bảng đối chiếu/Ảnh xuất: `apps/web/src/features/chart`, `packages/chart-export`
- Kiểm thử: `tests/v1114-natal-extensions.test.cjs`

## Giới hạn
Hệ thống còn nhiều phụ tinh, sao lưu, cách cục và các dị bản chưa triển khai. Unit tests và tính nhất quán nội bộ không chứng minh quy tắc an sao đúng trong mọi trường phái. Chưa xác minh build Next.js/NestJS hoặc PostgreSQL E2E.
