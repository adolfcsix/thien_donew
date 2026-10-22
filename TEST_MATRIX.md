# Ma trận kiểm thử — A83 / vòng 2

Ngày 23/10/2026. Linux, Node v24.19.0/npm 11.9.0, Next 16.4.2. QA độc lập: PGlite 0.5.11, jsdom 30.1.3, Playwright 1.62.1, Chromium 153.0.8010.0. Không thêm dependency QA vào lockfile ứng dụng.

| Phép kiểm / lệnh | Kết quả | Phạm vi và bằng chứng |
|---|---|---|
| npm test (lượt trước khi thêm guard cấu hình browser) | PASS 3.175/3.175 | 364 file .test.cjs; node-regression.log |
| npm test — lượt bàn giao | PASS 3.179/3.179; 365 file; 0 skipped | verification/deep-audit/node-final-results.json |
| npm run test:sql:isolated | PASS 60/60 | 12 file, 0 skipped; sql-final/results.json; migration/service thật với PGlite |
| npm run test:ai:sql | PASS 11/11 | ai-sql-final.log; phiên bị thu hồi/hết hạn/khóa, xóa nguồn/cuộc, ownership, provider lỗi và 165 lượt history |
| npm run test:session:dom | PASS 26/26 | dom-final.log; 5 AuthProvider/API, 5 phân trang và 16 luồng login/admin/Pro/consultation |
| npm run test:stack:isolated | PASS 5/5 | http-final.log/http-results.json; 30 request qua 16 endpoint, Next standalone → Nest → PGlite |
| account.browser.cjs | PASS 89 nhóm | account-browser-delivery.log/account-browser-results.json; pageErrors=[] |
| v1116413-ai-insights.browser.cjs | PASS 22 nhóm | ai-browser.log/ai-browser-results.json; pageErrors=[]; có 167 lượt history và logout khi Gemini đang chờ |
| npm run typecheck | PASS | API/web; typecheck-confirmed.log, confirmed-commands.json |
| npm run build | PASS | root-build-confirmed.log, confirmed-commands.json; API/web/standalone/Tarot/source-protection |
| npm run check:source | PASS | source-confirmed.log; cú pháp/import, không thay runtime |
| npm run check:lockfile | PASS | lockfile-confirmed.log; lockfile không đổi so với vòng 1 |
| npm run audit:migration-chain | PASS tệp | migration-confirmed.log; 36 migration/checksum; SQL thực thi ở PGlite tách riêng |
| tests/browser-launch-isolation.test.cjs | PASS 4/4 | browser-launch-unit.log; từ chối single-process/tắt web security trong QA nhiều tài khoản |

Các log/JSON nêu trên nằm ở verification/deep-audit, trừ artifact .browser raw được sao chép kết quả JSON vào đó. Kết quả browser là nhóm assertion của harness, không đồng nhất một nhóm với một nút hay một test Node. Không cộng 111 nhóm browser, 60 SQL, 26 DOM và 5 HTTP thành số lượng test độc lập bao phủ toàn sản phẩm.

## Hành vi đầu–cuối đã kiểm tra

- Đăng ký/cookie, đăng nhập, khôi phục mật khẩu, MFA setup/confirm, chặn thiếu quyền/thiếu MFA; ngăn POST trùng ở các form đã thử.
- Chủ sở hữu mới mở được lá số và history. Owner xác minh email/TOTP qua API/UI; Admin overview.read không lấy được members/finance qua console/chat.
- Gemini có phản hồi có kiểm soát: lưu và mở lịch sử, follow-up cùng snapshot, xuất Markdown, citation sai bị từ chối, lỗi provider giữ số liệu SQL quản trị, quota/budget ngăn gọi tiếp.
- Logout/hết hạn/khóa/xóa nguồn trong lúc provider đang chờ: không thêm message; khóa reservation được chốt thất bại. Browser nhận 401 gỡ nội dung riêng và về trang đầu.
- Lịch sử 165 lượt kiểm SQL; 167 lượt kiểm UI: mở 80 mới nhất, nhấn trùng chỉ một lần đọc, tải đủ các lượt cũ; đổi cuộc/reset/error/late response kiểm React DOM.
- Một số trang/theme/khung đăng nhập ở 320,390,768,1024,1440,1920 px; form thấp 480 px; avatar tròn, huy hiệu, bàn phím/menu theo các case trong account JSON.

## Những lần lỗi được giữ làm bằng chứng

AI session trước sửa FAIL 5/8; lịch sử dài trước sửa trả Question 1 thay Question 86. Harness DOM cũ không import/mount đúng kiến trúc hiện hành. Browser ban đầu dùng single-process tái hiện fetch sai cookie ngay trên HTTP server tối thiểu ngoài Thiên Đồ; renderer tách biệt trả đúng cookie. Các lượt đó không được nghiệm thu. Contract browser cũ còn đợi cảnh báo sau đăng nhập khi access-service lỗi, trong khi A67 đã có fallback /chart; đã cập nhật để kiểm chặt đăng nhập thành công và không đoán quyền Admin. Không xóa test thất bại hoặc thay policy để xanh.

## Chưa được chứng minh

PostgreSQL native/concurrency/backup; Windows; Safari/iPhone/Edge/Firefox/Android; toàn bộ 82 route/2.006 control và mọi trạng thái; WCAG 2.2 AA toàn site; provider email/Gemini/OAuth/PayOS thật; legal approval; staging/TLS/monitoring/rollback; hiệu năng thực địa/GPU thiết bị. Chromium headless và SwiftShader không đại diện các môi trường đó.

Gemini là transport kiểm soát và email capture, không có cuộc gọi provider hay giao dịch thật. Browser harness dùng Next production mode custom server, HTTP harness riêng dùng artifact standalone. Cả hai dùng Nest/service/SQL PGlite thật, không phải PostgreSQL server native.
