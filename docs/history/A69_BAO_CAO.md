# THIÊN ĐỒ — V11.164.96 / A69 — KIỂM TOÁN TRẠNG THÁI TÀI KHOẢN, MODAL VÀ AVATAR

**Quyết định phát hành: NO-GO; 11/11 cổng bắt buộc vẫn OPEN.** A69 kế thừa mã nguồn A68 nguyên trạng ngoài các tệp được liệt kê dưới đây. Không xác nhận đã chạy production/Windows/Safari/PayOS/Gemini/PostgreSQL native; không push repository hoặc deploy công khai.

## 1. Phát hiện và sửa lỗi được chứng minh

| Nhóm | Chẩn đoán từ A68 | Chỉnh sửa A69 | Bằng chứng có thể tái chạy |
| --- | --- | --- | --- |
| **A69-AUTH-01 P1 — race sau cập nhật hồ sơ** | `/me` có thể đang chạy trước khi `PATCH /profile` hoặc upload avatar thành công. Response GET cũ về sau có thể ghi đè tên/ảnh vừa được server xác nhận. | `applyLocalProfile` tăng `generation` trước cập nhật state, huỷ hiệu lực GET cũ; ràng buộc account ID; phản hồi của tài khoản đã rời phiên không làm gián đoạn phiên mới. | `tests/a69-session-ui-race.test.cjs` thực thi callback TS được transpile, khẳng định generation tăng và không patch user sai; giữ validation ở API. |
| **A69-UX-02 P2 — đóng modal khi mutation đang chờ** | `pending` trong AuthDialog chỉ theo dõi hành động login/logout; thao tác `perform` bên hồ sơ và bảo mật có trạng thái riêng. Escape, nút X, backdrop có thể đóng modal giữa lúc lưu và mất thông báo commit. | Đồng bộ cờ busy từ AccountSettings và AccountSecurityExtras; vô hiệu hóa đóng modal/đăng xuất, chuyển tab, nút X khi mutation profile/security đang chạy; giữ hiển thị kết quả khi hoàn tất. | Test regression A69 kiểm tra các đường điều hướng/đóng/đổi tab; chưa chứng nhận browser DOM E2E. |
| **A69-AVATAR-03 P2 — pointer drag đa chạm** | Editor cũ nhận `onPointerMove` miễn đang kéo, chưa buộc pointer nhận sự kiện trùng pointer khởi đầu; cũng chưa thu hồi drag khi trình duyệt mất pointer capture. | Lưu `pointerId` ban đầu, chỉ xử lý primary pointer khớp; dọn drag trên up/cancel/lost capture. Không chặn gesture pan-y cuộn dọc điện thoại. | Test động A69 mô phỏng con trỏ thứ hai bị bỏ qua và clamp offset ±100; test cấu trúc bảo vệ lost capture. |
| **A69-AVATAR-04 P2 — ảnh vượt track** | Ảnh intrinsic có nguy cơ ép kích thước nội dung grid trong vòng avatar, nhất là ảnh tỷ lệ lớn. | Ép track `minmax(0,1fr)` và `min/max-width/height` kèm `object-fit:cover`, bo tròn theo khung. | Test CSS cấu trúc; **không đồng nghĩa** đã nghiệm thu ảnh trên iPhone/Chrome. |

Các mã nguồn ảnh hưởng: `auth-provider.tsx`, `account-settings.tsx`, `account-security-extras.tsx`, `avatar-editor.tsx`, `account-settings.css`. Cập nhật regression cũ do cú pháp mới nhưng không bỏ assert về busy, session, receipt hay bảo mật; bổ sung 6 bài test A69 chạy thực và cấu trúc.

## 2. Kết quả kiểm thử và các giới hạn

| Kiểm toán | Kết quả A69 | Phạm vi / giới hạn |
| --- | --- | --- |
| Test trọng tâm chọn lọc A69/A68/profile/auth | **26/26 PASS** | Bao gồm thực thi callback TS bằng transpilation. Không thay thế browser E2E. |
| Toàn bộ `node --test --test-concurrency=6 tests/*.test.cjs` | **2.574 PASS / 2.619; 45 FAIL** (đã chạy lại trên mã nguồn cuối); log ở `verification/a69/node-suite-final.log` | **CHƯA ĐẠT.** Lỗi chủ yếu thiếu thư viện `astronomy-engine`, `moment-timezone`, `pg`, Nest/React; thiếu API dist và xung đột cổng local. |
| Kiến trúc | **PASS** 566 file, 2.189 imports, 0 vi phạm | Static, không chứng minh runtime. |
| Migration chain + SHA | **PASS** 36 migration | Không chạy PostgreSQL native. |
| Dataset JSON | **PASS** 159 tệp JSON | Chỉ xác thực cấu trúc/định dạng. |
| Runtime guards | **PASS** 14 probes | Chỉ chứng minh rào chắn được kiểm thử. |
| Lockfile | **PASS** cấu trúc | `npm ci` clean install chưa thành công. |
| Typecheck backend | **FAIL / exit 2**: `npm run typecheck` không hoàn tất do thiếu @nestjs/*, Node type declarations và nhiều thư viện | Không xác nhận TS type-safety cho bản build đầy đủ. |
| CSS baseline | **PASS** 28 stylesheet hash + import order | Không phải screenshot hay kiểm tra thị giác trực tiếp. |
| Secret scan | **PASS** 1.546 source/config/document files | Heuristic scan, không thay thế kiểm tra secrets chuyên dụng. |
| Source check | **PARTIAL / exit 1**: 382 TS/TSX parse, 881 JS syntax, còn 8 relative API dist missing | Không được tuyên bố full build/typecheck đạt. |
| Browser/3D/responsive/FPS/INP/Chrome/Edge/Safari | **NOT RUN** | Chưa có môi trường đã build + bộ thiết bị. |
| PayOS/Gemini/Owner/PostgreSQL native/MFA production | **NOT RUN / BLOCKED** | Thiếu environment thực, secrets, cơ sở dữ liệu thử nghiệm tương ứng. |

Không sửa schema DB, migration, thuật toán huyền học, PayOS/Gemini, tài nguyên Tarot, lockfile, mã hóa MFA hoặc credential. Cải thiện UI dựa trên code và kiểm thử Node chưa phải xác nhận cảm giác mượt, hiệu ứng 3D hoàn hảo hay browser compatibility đầy đủ.

## 3. Tồn đọng và trình tự xử lý tiếp

1. Cài lại dependency từ lockfile trên Linux/Windows, `npm ci` → typecheck, build, test; phân loại và sửa tất cả lỗi còn lại mà không bỏ test.
2. Chạy PostgreSQL isolated để E2E đăng ký, login, logout, password reset, Google OTP, MFA/Owner và thay đổi hồ sơ; xác minh cạnh tranh giữa phiên/các tab.
3. Chạy production build trên Chrome desktop/Android và Safari iPhone: profile scroll, avatar crop, modal busy, tab/keyboard, theme sáng-tối, các nhánh Tây phương, Tử Vi, Tarot và 18 huy hiệu.
4. Kiểm thử ngưỡng hiệu năng thiết bị thực, memory/GPU, reduced motion, contrast WCAG, chất lượng ảnh và quyền sử dụng tài sản trước release.
5. Kiểm thử sandbox thanh toán/AI, backup-restore, TLS và phê duyệt pháp lý rồi mới xem xét GO/V12.

Nhật ký kiểm thử được giữ nguyên kể cả lỗi. Đây là bản bàn giao mã nguồn **V11.164.96 — A69 — NO-GO**. Phiên bản npm/lockfile `11.164.0` giữ nguyên chủ ý, không phải nhãn bản bàn giao.
