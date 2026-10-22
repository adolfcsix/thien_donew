# Thiên Đồ A83 · V11.164.103 — Chuẩn hóa xuất tệp & ổn định tải xuống

**Nguồn:** A82 / V11.164.102. **Quyết định:** NO-GO; 11/11 cổng phát hành vẫn OPEN. **GitHub đích:** `adolfcsix/thien_donew` (private, có quyền push); chưa commit hoặc push.

## Phạm vi sửa mã

Đã chuyển **18 vị trí** tải tệp độc lập sang `downloadBlobFile()` dùng chung. Trước đó, nhiều vị trí gọi `URL.revokeObjectURL()` ngay tức thì hoặc sau 0–1000 ms và nhấn link không được gắn vào DOM. Hàm chung gắn anchor vào DOM, nhấn, gỡ anchor trong `finally` rồi thu hồi URL sau 2000 ms để giảm rủi ro trình duyệt bỏ qua tải xuống. Các luồng JSON/CSV/Markdown/SVG được giữ nguyên tên tệp, MIME, schema và nội dung xuất; không động chạm engine, back-end hay dữ liệu hệ thống.

Các nhóm áp dụng: Tarot (2), Tử Vi (4), Huyền Giải (1), Kỳ Môn (1), Lục Hào (1), Mai Hoa (1), Đại Lục Nhâm (1), Thái Ất (1), Thư phòng nghiên cứu (1), Tây phương và chiêm tinh quan hệ (3), Thiết Bản (1), khung SVG chiêm tinh (1). Các số lượng chỉ là phân nhóm để kiểm kê, không là số ca E2E.

## Kiểm thử trên chính mã nguồn

- **59/59 kiểm thử trọng tâm đạt**: bao gồm 4 kiểm thử mới A83, A82, kiểm soát release, Tarot, và sổ nghiên cứu 12 cung (xem `verification/a83/focused.tap`).
- **59/61 kiểm thử liên quan đạt trong lần chạy rộng hơn**, 2 tệp thử `v11127-western-depth` và `v11128-relationship` không chạy được do `MODULE_NOT_FOUND: astronomy-engine`. Hai lỗi này không phải PASS; xem `verification/a83/related-with-blockers.tap`.
- `npm run check:source`: **PASS** (382/382 TS/TSX parse, 890 JS syntax, 2.261 relative imports, 1.856 direct dependency imports); đây không phải Next/Nest typecheck.
- `npm run check:github:source`: **PASS** (lockfile, source, quét bí mật nguồn, gitignore, NO_GO).
- Kiến trúc: **566 tệp, 2.212 import, 0 vi phạm**.
- Migration: **36/36 cùng SHA-256**, chưa kết nối PostgreSQL.
- `npm run audit:handover`: PASS, 11 cổng OPEN.
- `npm ping`: **FAILED EAI_AGAIN registry.npmjs.org**. Không có bằng chứng `npm ci`/full typecheck/build/Playwright E2E, Safari/Chrome/Edge thực tế, PayOS/Gemini hay PostgreSQL native.

## Đối chiếu toàn vẹn A82 → A83

- Tệp cũ sửa đổi: **23**.
- Tệp bổ sung: **10** (bao gồm test và hồ sơ kiểm chứng).
- Tệp bị xóa: **0**.
- Khu vực được bảo vệ giữ nguyên byte: **819/819**, gồm apps/api, packages, migrations và public assets.
- `package.json` và `package-lock.json` không đổi; không thay đổi cấp quyền hoặc pháp lý.

## Điều kiện còn chặn

Cần cài dependency từ lockfile trong môi trường có registry, chạy full Node suite/typecheck/build và browser E2E, kiểm tra thực tế tải tệp, phân quyền/Admin/Owner, PostgreSQL, tích hợp bên thứ ba. **KHÔNG chứng nhận GitHub-ready/production-ready; KHÔNG chuyển V12/GO hoặc push GitHub khi chưa có bằng chứng.**
