# Thiên Đồ — A80: đồng bộ hồ sơ & menu thu gọn

Nguồn: A79. Đây là bản vá **phạm vi hẹp**, không phải kết quả nghiệm thu trực quan toàn website.

## Đã sửa
- Cập nhật nhãn nguồn `V11.164.100 / A80` trong manifest, kiểm toán bàn giao và tài liệu hiện hành; bảo toàn `packageVersion` và lockfile.
- Thanh menu thu gọn: giữ biểu tượng cố định khi hover (`transform:none`) và thêm viền `focus-visible` rõ ràng.
- Thêm 3 hồi quy xác nhận nhãn, NO-GO và CSS compact focus/hover.

## Kiểm tra thực tế
- 18/18 bài kiểm thử tập trung: PASS.
- `audit:handover`: PASS — 15 mục, 36 migration, 11/11 cổng OPEN.
- Kiến trúc: PASS — 566 tệp, 2190 import, 0 vi phạm.
- Migration chain: PASS — 36/36 SHA-256 không đổi.
- Lockfile cấu trúc: PASS.
- GitHub source preflight: PASS — không xác nhận build/CI/E2E.
- `check:source`: FAIL/BLOCKED — cần `apps/api/dist` (8 import; chưa build API); toàn bộ TS/TSX 382/382 parse được.
- Build, typecheck và browser screenshot: NOT RUN vì dependencies chưa được khôi phục trong môi trường này.
- Không thay đổi backend, engine, thư viện nghiệp vụ, Tarot artwork, migration hoặc lockfile.

## Danh sách thay đổi
Existing: 7; added: 1; removed: 0.

- `HUONG_DAN.md`
- `README.md`
- `apps/web/src/app/global-visual-harmony-v11164182.css`
- `docs/BAO_CAO_HIEN_TAI.md`
- `infrastructure/release/current.json`
- `infrastructure/scripts/audit-handover.mjs`
- `tests/a63-specialty-eastern-security.test.cjs`
- `tests/a80-layout-release-integrity.test.cjs`

Trạng thái phát hành: **NO-GO**; không commit/push GitHub.
