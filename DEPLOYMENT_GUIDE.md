# Hướng dẫn vận hành — chỉ mục hiện hành

Giữ NO_GO: không triển khai public từ gói này khi build/package hoặc release gates còn FAIL. Hướng dẫn chi tiết duy nhất vẫn là [HUONG_DAN.md](HUONG_DAN.md); tệp này là chỉ mục và ghi chú kiểm toán, tránh chép thêm một bản hướng dẫn dài.

| Nhu cầu | Nơi đọc / công cụ hiện có |
|---|---|
| Cài Node >=22.13, npm ci, tạo .env an toàn, Docker/PostgreSQL, migration, chạy API/web | HUONG_DAN.md mục 1–2; infrastructure/compose.yaml; .env.example |
| Tạo Owner local, xác minh email, MFA/Authenticator | HUONG_DAN.md mục 3; TAO_OWNER_LOCAL_WINDOWS.bat; npm run admin:mfa:init |
| Chẩn đoán đăng ký/API/proxy/cổng | HUONG_DAN.md mục 5; npm run check:auth:register; npm run check:runtime:local |
| Sửa giao diện, API, dữ liệu và chạy test | HUONG_DAN.md mục 6–7; FUNCTION_INVENTORY.md; TEST_MATRIX.md |
| Mail, OAuth, AI và PayOS | Cấu hình riêng theo .env.example và hướng dẫn; không chia sẻ key, không tự tạo giao dịch thật |
| Domain/HTTPS, production compose, monitoring, backup và rollback | HUONG_DAN.md mục 8; infrastructure/production/ |

Các lệnh dưới đây đã đối chiếu với package.json, không có nghĩa đã chạy thành công trên Windows:

```powershell
npm.cmd ci
npm.cmd run check:lockfile
npm.cmd run audit:migration-chain
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Đã hiệu chỉnh manifest Tarot sau đối chiếu nguồn; cổng build vẫn phải dừng nếu có ảnh sai checksum ở tương lai. Không xóa audit-tarot-assets, không sửa manifest khi chưa có hồ sơ nguồn. Chỉ chạy npm run start:local sau khi build/package thật sự thành công và PostgreSQL/.env đã sẵn sàng.

Lưu riêng .env, khóa MFA đang dùng, database và kho tệp riêng trước nâng cấp. Không ghi đè .env hoặc tạo tài khoản Owner dùng chung. Chỉ chạy backup/restore/migration trên môi trường đã xác định đúng; chưa có chứng nhận backup/restore trong vòng này.

## Kiểm chứng chuyên sâu vòng 2

Cài PGlite, jsdom và Playwright ở thư mục QA ngoài repository để giữ nguyên lockfile ứng dụng. Phiên bản QA đã dùng ghi tại verification/deep-audit/qa-dependencies.json. Đặt THIENDO_SQL_TEST_MODULE tới PGlite dist/index.js và THIENDO_DOM_TEST_MODULE tới jsdom lib/api.js rồi chạy các script sau sau khi build API:

```powershell
npm.cmd run test:sql:isolated
npm.cmd run test:session:dom
npm.cmd run test:stack:isolated
```

HTTP harness cần web standalone đã build và cổng 8080/3117 rảnh; nó tạo database PGlite riêng, capture mail và kiểm soát Gemini, không sử dụng DATABASE_URL của máy. Nếu cổng đã phục vụ ứng dụng khác, dừng đúng tiến trình của bạn; không tự diệt tiến trình không rõ nguồn. Không dùng kết quả này để nhận PostgreSQL native đã PASS.

Browser harness account.browser.cjs và v1116413-ai-insights.browser.cjs cần THIENDO_PLAYWRIGHT_MODULE và browser phù hợp. Có thể chỉ định THIENDO_CHROMIUM_PATH/THIENDO_CHROMIUM_ARGS_JSON. Helper từ chối single-process và vô hiệu hóa web security vì chúng làm sai nghiệm thu đa tài khoản. Chromium Linux/SwiftShader trong vòng này không thay thế Safari/iPhone hoặc GPU thật.
