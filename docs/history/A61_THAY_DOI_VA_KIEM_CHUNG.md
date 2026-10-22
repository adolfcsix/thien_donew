# THIÊN ĐỒ — A61 / V11.164.88 — NO-GO

## Tệp đã sửa

- `apps/web/src/features/western/mystic-scene.tsx` + `.module.css`: diorama CSS perspective/3D 3 nhánh, tự dừng ngoài vùng nhìn.
- `apps/web/src/app/western-astrology/page.tsx`, `western.module.css`: cảnh sao/mắt/bàn tay; không thay engine.
- `apps/web/src/app/numerology/page.tsx`, `numerology.module.css`: cảnh khối số xoay, hover chỉ số.
- `apps/web/src/app/tarot/page.tsx`, `tarot.module.css`: ba lá Tarot động 3D, hover an toàn cho lá ngược.
- `apps/web/src/features/western/celestial-frame.tsx`, `.module.css`: đủ vòng SVG ở zoom100%; cuộn sau chủ động phóng to.
- `apps/web/src/features/community-hub/email-verification.tsx` và `apps/web/src/features/membership/admin-mfa-gate.tsx`: luồng MFA first-run phản hồi trạng thái email.
- `apps/web/src/lib/visible-motion.ts`: bổ sung HTMLElement vào observer hiện hành.
- `tests/a61-mfa-celestial-scene-regression.test.cjs`: sáu test tĩnh mới.
- `README.md`, `HUONG_DAN.md`, `docs/BAO_CAO_HIEN_TAI.md`, `infrastructure/release/current.json`: metadata, hướng dẫn và bằng chứng; giữ NO-GO/11 gate OPEN.

## Lệnh và kết quả

- Lượt Node tập trung: `node --test tests/a61-mfa-celestial-scene-regression.test.cjs tests/v1116454-a27-western-theme-consistency.test.cjs tests/v111647-visible-motion.test.cjs tests/v1116423-motion-safety.test.cjs tests/western-worlds.test.cjs tests/v111642-auth-ux-hardening.test.cjs` → 30/30 PASS, exit 0.
- `node infrastructure/scripts/audit-release-metadata.mjs` → PASS, exit 0.
- TS syntax transpile 7 tệp → parse 7/7; không phải typecheck/bundle.
- Manifest hai bộ bài `ready:true`, kiểm ảnh local 78 + 78; Pillow verify 156/156; giấy phép vẫn OPEN.
- `npm ci --offline --ignore-scripts --no-audit --no-fund` → thất bại ENOTCACHED yoctocolors-cjs@2.1.3. `npm ci` cần registry mạng/cached packages ở runner riêng.
- Full Node thử trong môi trường thiếu deps: 2577 total, 2531 PASS, 46 FAIL. Những lỗi nổi bật MODULE_NOT_FOUND react, astronomy-engine, pg, NestJS; một test launcher đụng cổng 8080. Không coi là 46 lỗi sản phẩm được chứng thực và không dùng làm PASS phát hành.
- Build production, typecheck đầy đủ, Chrome/Safari thiết bị thật, native PG, staging, Gemini/PayOS và hiệu năng field → CHƯA KIỂM CHỨNG.

Không có migration mới, không thay OTP/secret/role/logic tính. Không triển khai và không công khai repository.
