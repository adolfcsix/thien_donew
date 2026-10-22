# THIÊN ĐỒ — V11.164.95 / A68 — SỬA LỖI VÀ KIỂM CHỨNG VÒNG TIẾP

**Quyết định: NO-GO (11/11 cổng vẫn OPEN).** Căn cứ là source A67 được người dùng cung cấp, không phải chứng nhận phát hành V12, và không phải nghiệm thu thiết bị/production. Không push repository, không đụng DB thật, không cung cấp credential hoặc xuất bản.

## 1. Thay đổi trên mã nguồn thật

| ID | Mức | Chẩn đoán trên A67 | Bản vá trong A68 | Bằng chứng |
| --- | --- | --- | --- | --- |
| A68-AUTH-01 | P1 | Sau POST login thành công, `completeLogin` còn tuần tự `await /api/auth/me` **trước** việc xác định trang đích. Nếu `/me` treo, người dùng không được điều hướng dù xác thực POST đã thành công. | Revalidate `/me` không chặn điều hướng; xử lý bất đồng bộ với generation guard; role vẫn phải được đọc từ `/api/billing/access`, thất bại chuyển `/chart` (không cấp admin). | Kiểm thử callback **đang thực thi** với `/me` không bao giờ resolve; trang `/chart` được chọn; phản hồi cũ sau logout không thay lại identity; lỗi phân quyền không cấp admin. |
| A68-PROFILE-01 | P2 | `updateProfile` trả tên đã gộp khoảng trắng; trong A67 chỉ patch context mà **không** cập nhật ô nhập và last-saved baseline, nên nút Lưu có thể tiếp tục hiện dù vừa lưu xong. | Trước khi patch provider, cập nhật `name` và `lastSavedName` từ `receipt.displayName` do server xác nhận; giữ chính sách không ghi đè văn bản nhập chưa lưu bởi revalidation khác. | Thực thi handler TSX với server receipt: input/thẻ hồ sơ/dirty baseline bằng nhau; tên không đổi không gọi API. |
| A68-OWNER-01 | P1 | `create-local-owner.mjs` import `pg` tại top-level. Trên máy chưa `npm ci`, script đổ lỗi import **trước khi** kiểm tra URL local-only; chẩn đoán không hữu dụng. | Đưa nạp driver tới **sau** `validateSettings()` và **trước** lời nhắc xác nhận; thiếu `pg` in chỉ dẫn chạy `npm ci` không lộ connection string. Không tự tạo Owner, không bỏ xác nhận tương tác, không đổi policy localhost. | Process Node thực chạy với URL chứa `?host`/`#fragment`: từ chối, không echo secret và không hiện prompt; thiếu driver có thông báo thân thiện. |

Các tệp nguồn chính sửa: `apps/web/src/components/auth-provider.tsx`, `apps/web/src/components/account-settings.tsx`, `infrastructure/scripts/create-local-owner.mjs`. Bổ sung `tests/a68-owner-profile-regression.test.cjs`; cập nhật **hai phép thử cũ phụ thuộc cú pháp chính xác** thành assertions mạnh hơn phù hợp cấu trúc mới, không bỏ qua phép thử hay giảm ràng buộc; thử nghiệm động bổ sung kiểm tra tác dụng thực.

## 2. Kiểm thử ngay trên A68

| Kiểm toán | Kết quả | Giới hạn |
| --- | --- | --- |
| 6 tập test liên quan login/profile/Owner/A67 | **35/35 PASS** | Có kiểm thử logic chạy thực Node/TS transpile; chưa browser render |
| Toàn bộ `tests/*.test.cjs` với `node --test --test-concurrency=6` | **2.568 PASS; 45 FAIL; tổng 2.613** | CHƯA ĐẠT; phần lớn lỗi do thiếu dependency `pg`/Nest/React/astronomy-engine hoặc API dist chưa build; launcher port 8080 vẫn có thể xung đột |
| Architecture | **PASS**, 566 files / 2.189 imports / 0 violations | Không chứng nhận runtime |
| Migration chain/hash | **PASS**, 36 SQL migrations | Chưa chạy native PostgreSQL |
| Dataset JSON | **PASS**, 159 JSON | Không đánh giá nội dung chuyên môn |
| Runtime guards | **PASS**, 14 probes | Không phải live production E2E |
| CSS baseline | **PASS**, 28 stylesheet hashes | Không là screenshot/visual acceptance |
| Owner Node syntax | **PASS** | Bằng chứng syntax, không phải bootstrap trên DB thật |
| `check-source.mjs` | **PARTIAL: TS/TSX 382/382; JS 880 syntax; 8 references to apps/api/dist missing** | Không build backend được khi thiếu npm dependencies |
| Typecheck/build/browser/Windows/Safari/native database/PayOS/Gemini | **NOT RUN / BLOCKED** | Không đủ dependency, provider secrets, hệ thống OS/DB tương ứng |

Test A67 2.560/2.606 (46 fail) là baseline, không so sánh như tập bài cố định khi A68 bổ sung **6 bài test regression trong một suite mới** và các bài cũ đã được nâng để theo dõi hành vi mới. Hai lần chạy broad A68: lần đầu còn 47 fail do test cũ bị ràng buộc vào source syntax; cập nhật assertion và thử lại bản cuối cho kết quả **45 fail**. Log cuối cùng có trong `verification/a68/node-suite-final.log`.

## 3. Bảo toàn, tồn đọng và hạn chế

Không sửa API, thuật toán huyền học, Tarot assets/font, migration, PostgreSQL schema, payment/AI, MFA secrets, công thức rank, source protection hoặc lockfile. Các tệp `verification/a67`, A66 lịch sử vẫn giữ; thêm log A68 và report. 11 release gates vẫn OPEN. Không nhận A68 là vận hành thực tế đã trơn tru/FPS đạt mức mục tiêu chỉ từ source tests.

**Bước tiếp theo P0:** chạy `npm ci` trên Windows và Linux với package-lock gốc; `npm run typecheck`, `npm run build`, `npm test`, native PostgreSQL local isolated và End-to-End login/MFA/Admin/Owner; sandbox PayOS/Gemini, phê duyệt pháp lý/bản quyền trước khi GO.

**Bước tiếp theo P1:** build A68 để đo độ trễ từ POST login thành công tới điều hướng; kiểm tra avatar crop/modal scroll, menu thu gọn, 5 theme và light/dark, Tarot 78 lá, Natal/Tử Vi 3D trong Chromium/Edge/Safari/iPhone 320–1920px, có ảnh chụp/INP/LCP/CLS và reduced-motion. Hiện **chưa** có chứng cứ này.

Không bao gồm `.env`, `node_modules`, database volume, mật khẩu Owner hoặc thông tin bí mật trong ZIP. Bản ZIP đính kèm là toàn bộ source để tiếp tục kỹ thuật, trạng thái **V11.164.95 A68 NO-GO**, package version bên trong vẫn `11.164.0` theo chuỗi sản phẩm hiện có.
