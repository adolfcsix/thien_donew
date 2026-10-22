# V11.88 — Điều kiện kỹ thuật phải đóng trước production

Nguồn được kiểm thử offline không đồng nghĩa ứng dụng có thể vận hành public. Các mục sau vẫn **chưa xác minh** hoặc **BLOCKED**.

| Hạng mục | Tình trạng / cách giải |
|---|---|
| Lockfile npm chuẩn | Chưa có từ V11.87; tạo bằng máy truy cập npm registry rồi commit. KHÔNG tự chế lockfile hoặc tắt xác minh. |
| Dependency install | Sau khi có lockfile chạy `npm ci --no-audit --no-fund`; kiểm tra mã lỗi và log. |
| TypeScript | `npm run typecheck` sau `npm ci` — chưa thể suy từ kiểm tra parser TS. |
| Next.js / NestJS | `npm run build` sau typecheck, rồi chạy smoke HTTP thật. |
| PostgreSQL | Tạo database E2E riêng, xác nhận rỗng, chạy migration, repeatability, kiểm thử HTTP. KHÔNG chạy xóa/reset database chứa dữ liệu thật. |
| Browser E2E | Kiểm tra desktop/mobile, bàn phím, trạng thái lỗi API và dữ liệu cá nhân. |
| Source/static gate | `npm run check:release:source` (không cần DB). |
| Phase 2 algorithm gate | `npm run audit:phase2` kiểm 14 bộ môn, 12 phương pháp, 144 bàn, tài liệu riêng và ràng buộc an toàn. |

Trên PowerShell tại thư mục dự án, chạy `npm.cmd run check:readiness`. Khi registry truy cập được, tạo lockfile ở môi trường có quyền ghi rồi thực hiện `npm.cmd ci`. Việc tạo file khóa không thay thế kiểm tra production. Ghi cụ thể phiên bản Node/NPM, hệ điều hành và checksum trước khi phát hành.
