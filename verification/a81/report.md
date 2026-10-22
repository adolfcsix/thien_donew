# THIÊN ĐỒ A81 — V11.164.101: xử lý cổng source trước build CI

**Nguồn:** A80 — V11.164.100. **Trạng thái:** NO-GO; 11/11 cổng OPEN. Không tuyên bố website hoàn thiện hoặc đủ điều kiện phát hành.

## Lỗi thực tế được tái hiện và sửa

- Trước sửa: `npm run check:source` **FAIL** với 8 import `../apps/api/dist/modules/…` từ harness SQL; đây là mã sinh ra sau build nhưng workflow `ci.yml` chạy `check:source` **trước** build, nên clean checkout bị chặn ở cổng source mặc dù có TS gốc.
- Sau sửa: `deferredSqlTestSource()` chỉ nhận trực tiếp `tests/*.test.mjs` ở cấp gốc, import tương đối `../apps/api/dist/modules/<safe segments>.js`, **và** `check-source.mjs` bắt buộc source `apps/api/src/modules/<same>.ts` thực sự tồn tại. Từ chối import từ app, đường dẫn `..`, và định dạng lạ. Không nới lỏng kiểm tra source thiếu trong runtime.
- `check:github:source` nay gọi cả `check-source.mjs` để source syntax/import lỗi có thể chặn ngay từ preflight, thay vì chỉ kiểm migration/lock/secret/architecture.
- Metadata được đồng bộ thành `V11.164.101 / A81`, package/lock version giữ nguyên.

## Bằng chứng kiểm thử

- **Trước:** `npm run check:source` FAIL (8 import API dist), log `/mnt/data/a81_src_before.log`.
- **Sau:** `npm run check:source` PASS, TS/TSX parse 382/382, JS syntax 889, 2.261 relative imports, 1.834 direct dependency imports; 13 deferred build API imports (bao gồm import đã có ngoại lệ từ các vòng cũ).
- Hồi quy nhóm A63/A69/A70/A71/A72/A80/A81: **47/47 PASS** (log `verification/a81/focused.tap`).
- GitHub source preflight: **PASS** (lockfile, 36 migration, secret scan, 2.190 import kiến trúc, source-integrity, gitignore, NO-GO).
- Audit handover: **PASS**, 15 tài liệu/mục cần có, 36 migration, đủ 11 cổng OPEN.
- Git staging mô phỏng: 2.331 tệp, không có đường dẫn cấu hình bí mật phổ biến/`node_modules`/`.next`/`dist` trong staged list. Đây không thay thế scan secrets toàn diện.
- Đối chiếu với A80: 9 tệp hiện có thay đổi, 1 tệp mới; **không thay đổi** backend, packages, migration, assets web; không xóa tệp.

## Các khối vẫn chưa vượt qua

- `npm ci`, typecheck NestJS/NextJS, build, PostgreSQL native, tích hợp PayOS/Gemini, E2E desktop/mobile: **NOT VERIFIED**; registry.npmjs.org DNS `EAI_AGAIN` từ môi trường kiểm toán. Không tuyên bố 44 module failures cũ đã được sửa.
- Kiểm tra qua GitHub kết nối cho thấy `adolfcsix/thiendo_demo` và `adolfcsix/thiendo_demoo` đều là **public**; không upload source thuật toán vào hai repo này, theo yêu cầu bảo mật. Chỉ tiếp tục sau khi có repo **private** được xác nhận và build/CI đủ điều kiện theo ngưỡng đã thống nhất.
- Không commit/push/triển khai production, không chuyển V12, không tự đóng cổng nghiệm thu.

## Danh sách tệp thay đổi (9 hiện có + 1 mới)

- `HUONG_DAN.md`
- `README.md`
- `docs/BAO_CAO_HIEN_TAI.md`
- `infrastructure/release/current.json`
- `infrastructure/scripts/audit-handover.mjs`
- `infrastructure/scripts/check-github-readiness.mjs`
- `infrastructure/scripts/source-import-policy.mjs`
- `tests/a63-specialty-eastern-security.test.cjs`
- `tests/a80-layout-release-integrity.test.cjs`
- `tests/a81-build-source-import-policy.test.cjs`
