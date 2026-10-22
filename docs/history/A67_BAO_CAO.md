# THIÊN ĐỒ — V11.164.94 / A67 — BÁO CÁO RÀ SOÁT KỸ THUẬT

**Trạng thái: NO-GO.** Đây là lượt sửa mã nguồn thật trên bản A66 được người dùng cung cấp, **không** phải xác nhận hoàn thành dự án, chứng nhận V12 hoặc nghiệm thu thiết bị thực. Mọi **11/11 cổng phát hành vẫn OPEN**. Không push lên GitHub, không thực hiện migration hay thao tác với database thật.

## 1. Nguồn vào và nguyên tắc bảo toàn

- ZIP nguồn A66: `THIEN_DO_V11_164_93_A66_INTERACTION_SOURCE_NO_GO(1).zip`; SHA-256 `4b8102f6b9bc8ecd80ee6cd0b1ec96bf3c358bb64d2116b780d47511b915ee81`.
- Bản gốc có 2.370 mục ZIP, bao gồm thư mục source, hồ sơ evidence và manifest; frontend `535` tệp, backend `92` tệp, thư mục tests gồm khoảng `488` tệp (đếm ngay ở thư mục tests).
- Đối chiếu SHA-256 sau sửa xác nhận **775/775 tệp được bảo vệ không đổi byte**: API, public assets, `packages`, migrations, `package-lock.json`, package web. Không sửa thuật toán Tử Vi, Natal, Tarot, giá, thanh toán, AI, MFA, cơ sở dữ liệu hoặc giấy phép.
- Giữ bằng chứng A66 dưới dạng lịch sử: `docs/history/A66_BAO_CAO.md` và thư mục `verification/` kèm theo. Không nhận kết quả chạy A66 là kết quả chạy A67.

## 2. Các sửa đổi thực tế (3 điểm)

| ID | Mức | Khu vực / vấn đề | Biện pháp | Phạm vi kiểm chứng |
| --- | --- | --- | --- | --- |
| A67-AUTH-01 | P1 UX | POST đăng nhập thành công nhưng kiểm tra `/api/billing/access` thất bại gây báo lỗi đăng nhập giả / không điều hướng | Bắt lỗi riêng ở `completeLogin`, hướng `/chart` an toàn; **không cấp admin/owner** khi chưa có receipt từ API. Giữ lại logic phiên, cookie, TOTP và generation guard. | Test chống mở redirect ngoài, dữ liệu quyền sai, receipt admin hợp lệ và fallback trong source. Chưa có browser E2E sau build. |
| A67-THEME-01 | P2 Performance/UX | Đổi một trong 5 giao diện Phương Tây làm chạy lại hiệu ứng atomic light/dark và ghi localStorage dù độ sáng không đổi | Tách `useLayoutEffect` brightness và world artwork; chỉ thay dữ liệu `westernWorld` khi đổi chuyên mục, không tái dựng lớp fence. Giữ đồng bộ giao diện account trên `<html>`. | Test phân tích TypeScript AST xác nhận mảng dependency tách biệt; chưa đo FPS/INP mới. |
| A67-NAV-01 | P2 Performance | Bubbled `mouseover` qua icon/chữ của một nút đang hover đặt lại object tooltip giống hệt, kích hoạt re-render `Layout` | Dùng functional state, giữ nguyên object khi nhãn/tọa độ không đổi; vẫn cập nhật khi vị trí/nhãn đổi, ẩn khi cuộn hoặc rời rail. | Static regression + TypeScript syntax parse. Chưa đo CPU trên thiết bị. |

Không có thay đổi mức bảo mật API; fallback login chỉ vào trang thành viên, API vẫn là nơi quyết định quyền. Nếu role API lỗi thì việc xác minh Admin vẫn cần phục hồi trước khi vào quản trị.

## 3. Kiểm thử mới trên đúng source A67

| Hạng mục | Kết quả | Diễn giải |
| --- | --- | --- |
| Test tập trung: `tests/a67-theme-auth-resilience.test.cjs` và 4 bộ suite liên quan | **32/32 PASS** | 4 regression A67 + 28 existing tests. Không phải browser. |
| Test rộng `node --test --test-concurrency=4 tests/*.test.cjs` | **2.560 PASS, 46 FAIL / 2.606** | CHƯA ĐẠT. Chủ yếu lỗi missing `pg`, `@nestjs/common`, `astronomy-engine` và các dependency không có; test launcher bị chặn vì cổng 8080 đang được dùng. Không coi 46 lỗi là code defect được xác thực. |
| `npm ci --offline --ignore-scripts --no-audit --no-fund` | **BLOCKED** | Thiếu tarball cache `yoctocolors-cjs@2.1.3`. Lần thử online không hoàn thành nên đã dừng. Không xóa hoặc chỉnh lockfile để qua lỗi. |
| `node infrastructure/scripts/check-source.mjs` | **PARTIAL** | TS/TSX 382/382 parse được, JS syntax 878; 8 tham chiếu test tới `apps/api/dist` không tồn tại khi chưa build. |
| `audit-architecture.cjs` | PASS | 566 files, 2.189 imports, 0 architecture violations. |
| `check-migration-chain.mjs` | PASS | 36 migration liên tục và kiểm tra hash; không có native DB kết nối. |
| `audit-json-datasets.mjs` | PASS | 159 JSON, 0 invalid. |
| `audit-runtime-guards.mjs` | PASS | 14 probe về runtime/loopback, không là E2E xác thực. |
| `audit-css-baseline.cjs` | PASS | 28 stylesheet hashes, không là kiểm tra ảnh chụp giao diện. |
| `v11164-secret-scan.mjs` | PASS | 1.541 source/config/docs theo heuristic, không thay kiểm toán secret chuyên dụng. |

Các lệnh và log đã chạy được giữ trong `verification/a67/`. Việc local port 8080 bận **không** cho phép test launcher đạt; không tự động giết tiến trình khác để giải phóng cổng. Tệp `node_modules` sinh trong lần thử cài không được đóng gói.

## 4. Điều kiện nghiệm thu còn thiếu và ưu tiên vòng kế

**P0:** chạy `npm ci` nguyên lockfile trên Windows/Linux, `npm run typecheck`, `npm test`, build production/standalone, native PostgreSQL clean/upgrade/concurrency & backup/restore, MFA/Owner/permissions E2E, PayOS/Gemini sandbox credentials riêng, kiểm soát secret và quyền xuất bản. Không dùng PGlite để tuyên bố tương đương native PostgreSQL.

**P1:** build đúng A67 rồi chạy ít nhất Chrome/Edge Windows, Safari iPhone, responsive 320–1920 px, browser keyboard/pointer, menu compact, modal avatar, login/logout, 5 thế giới Tây phương light/dark, bài Tarot 78 hình offline và Natal/Tử Vi 3D với dữ liệu thật; đo lại EventTiming, LCP, CLS và long tasks theo protocol A66, so trước/sau và xác minh nguyên nhân trước khi tối ưu tiếp. Không kết luận thay đổi A67 đã giảm INP khi chưa có phép đo.

**Dữ liệu A66 chỉ để làm baseline:** 9/18 quan sát EventTiming >200 ms, lớn nhất 480 ms; chưa chứng nhận hiệu năng thiết bị thật. Kết quả A66 3110/3110 Node, browser và build không chuyển thành nghiệm thu A67. Các quyền pháp lý/Tarot license và 8 bản thảo chính sách chưa được ký duyệt.

## 5. Bàn giao

- Bản zip A67 là **source đầy đủ**, có test regression và báo cáo này, giữ nguyên package version nội bộ `11.164.0`, nhãn bàn giao `V11.164.94`.
- Mục đích bàn giao: tiếp tục kiểm thử/build trên môi trường đủ dependency, không triển khai internet. Giữ `.env`, database volume, private library, MFA secret của máy bạn nguyên vẹn khi nâng cấp.
- Các con số PASS chỉ gắn với chính phép thử được mô tả; không được gộp 32 test mục tiêu với 2.606 test rộng hoặc A66 3.110 test thành chứng cứ phê duyệt release.
