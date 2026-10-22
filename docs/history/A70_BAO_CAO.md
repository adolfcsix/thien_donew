# THIÊN ĐỒ — V11.164.97 / A70 — HỒI QUY BẢO MẬT VÀ PHIÊN THIẾT BỊ

**Quyết định: NO-GO; 11/11 cổng phát hành giữ OPEN.** Bản A70 tiếp tục từ A69, không thay đổi migration, backend, engine, tài nguyên, lockfile hay thông tin xác thực. Chưa được triển khai production, push GitHub hoặc gọi là V12.

## 1. Các vấn đề đã sửa có bằng chứng mã nguồn

| Mã | Rủi ro gốc | Sửa đổi A70 | Bằng chứng |
| --- | --- | --- | --- |
| **A70-SEC-01 / P1** | Dữ liệu danh sách thiết bị/email/sự kiện bảo mật được tải từ 3 GET trên mount; nếu phản hồi cũ đến sau POST revoke/verify và GET mới, dữ liệu cũ có thể ghi đè danh sách mới. | Dùng `readGeneration` (latest-wins), tăng thế hệ trước POST; không áp dụng response cũ; loại hiệu lực khi unmount; không hiển thị lỗi từ request đã bị thay thế. | 4 bài thử động thực thi callback TS được transpile với phản hồi giả lập đảo thứ tự. |
| **A70-AUTH-02 / P1** | Nhấn “Đăng xuất phiên này” tại phần Bảo mật gọi `window.location.reload()` trên đường dẫn có bảo vệ, thay vì về trang mở đầu và gửi tín hiệu đồng bộ tab. | Khi API xác nhận `currentSession`, phát `publishLogout()` và `replaceWithOpening()`; không phát GET `/sessions` sau khi tự thu hồi. | Bài thử động `revoke` kiểm tra thứ tự phát sự kiện và điều hướng. |
| **A70-AUTH-03 / P1** | Lúc `profileWorking`, lệnh đăng xuất/xóa bằng mật khẩu đã có guard nhưng luồng bắt đầu Google delete challenge vẫn có thể chạy; biểu mẫu xóa vẫn còn khả năng click. | Thêm guard `profileWorking` ở `onGoogleCredential` và thuộc tính disabled cho ô mật khẩu/nút xóa, Google delete. | Bài regression kiểm tra điều kiện và control; cần browser E2E để chứng nhận UX. |

Tệp nghiệp vụ đã thay đổi: `apps/web/src/components/account-security-extras.tsx`, `apps/web/src/components/auth-provider.tsx`. Không thay đổi biểu đồ, thuật toán huyền học, phương pháp luận giải, thanh toán hoặc asset Tarot.

## 2. Kiểm thử

| Hạng mục | Kết quả | Giới hạn |
| --- | --- | --- |
| Tập trung A68/A69/A70 | **18/18 PASS** | Có 6 bài A70 (5 dynamic/simulation, 1 structural); không phải E2E trên trình duyệt. |
| Node `.cjs` toàn bộ | **2.580 PASS / 2.625; 45 FAIL** | CHƯA ĐẠT. Lưu nguyên log `verification/a70/node-suite-final.log`. |
| Dependency install | **BLOCKED** | npm cache = 0; registry.npmjs.org không thể resolve DNS; không tải thêm thư viện hoặc sửa lockfile. |
| Typecheck + Next/Nest build | **BLOCKED** | Chưa có cây dependency đầy đủ. |
| PostgreSQL native, MFA/Owner E2E, PayOS/Gemini | **NOT RUN** | Thiếu dịch vụ/credentials/môi trường kiểm thử phù hợp. |
| Chrome, Edge, Safari, iPhone, 3D FPS/INP/LCP/CLS | **NOT RUN** | Không thể xác nhận hiệu năng, tương thích hay chất lượng hiển thị thực tế. |

**Lỗi tồn đọng:** 44 lỗi thuộc nhóm thiếu `astronomy-engine`, `moment-timezone`, `pg`, `react`, API dist hoặc dependency phụ trợ; 1 bài thử launcher 8080 không hoàn tất trong môi trường chạy có cổng bận. Đây là chẩn đoán của môi trường hiện tại, không có nghĩa source sẽ tự động PASS sau khi cài thư viện. Log thất bại được giữ nguyên. Khả năng xác minh full stack chỉ có sau `npm ci`, `typecheck`, build, E2E DB và browser run.

## 3. Hướng nghiệm thu tiếp

1. Chạy `npm ci` từ lockfile trên môi trường có registry, **không dùng `npm install` phá lockfile**, sau đó `npm run typecheck && npm run build && npm test` và tách lỗi dependency khỏi logic.
2. Dùng cơ sở dữ liệu PostgreSQL test tách biệt để thử register/login/logout/revoke/MFA/Owner/permissions và giao dịch đồng thời; không dùng DB production để thử phá dữ liệu.
3. Browser E2E màn hình Bảo mật và hồ sơ: đảo thứ tự response, lỗi mạng, tắt tab, bỏ/thu hồi phiên, xác nhận Google delete; test bằng bàn phím/đọc màn hình và mobile zoom.
4. Kiểm tra các phân hệ Tử Vi, Bát Tự, Tarot, Natal, quản trị, 18 huy hiệu và 5 theme phương Tây; đo đồ họa/3D trực tiếp trên máy có cấu hình thấp lẫn cao.
5. Chỉ khi đủ 11/11 cổng có chứng cứ mới xem xét nâng sang bản chính thức. A70 vẫn là bản **NO-GO**.
