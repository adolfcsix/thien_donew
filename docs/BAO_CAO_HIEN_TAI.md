# THIÊN ĐỒ — V11.164.103 / A83 — ĐỒNG BỘ XUẤT TỆP TỪ NHIỀU PHÂN HỆ

**A83 (phạm vi có kiểm chứng):** đã thay 18 vị trí xuất tệp dùng blob URL riêng lẻ bằng `downloadBlobFile()`, gồm Tarot, Tử Vi, Kỳ Môn, Mai Hoa, Lục Hào, Đại Lục Nhâm, Thái Ất, Thiết Bản, chiêm tinh quan hệ, báo cáo Tây phương, Markdown nghiên cứu và SVG. Giữ nguyên dữ liệu, tên tệp, định dạng MIME. Các phép thử tĩnh và helper đạt; chưa có bằng chứng tải xuống trên Safari/Chrome thật hoặc full build. Giữ 11 cổng OPEN, NO-GO và chưa push GitHub.

**A82 (phạm vi có kiểm chứng):** bốn vị trí xuất JSON/CSV (Thần số học, Natal, Trạch Nhật, Bộ sưu tập) đã dùng `downloadBlobFile` để trì hoãn thu hồi blob URL sau click thay vì thu hồi ngay. Natal xóa `report` cũ khi đầu vào thay đổi hoặc nạp hồ sơ mới, chặn hiển thị luận giải sai lệch. Phản hồi lỗi khi mở hồ sơ Natal và Thần số học phải khớp phiên chỉnh sửa. Đã kiểm thử tập trung; KHÔNG phải bằng chứng trình duyệt/E2E, vẫn NO-GO. GitHub đích `adolfcsix/thien_donew` được xác minh Private, có quyền push nhưng chưa push mã trước khi đạt cổng kiểm thử theo thỏa thuận.

**A81 (phạm vi có kiểm chứng):** `check:source` trước đây sai 8 import sinh ra từ API build trong các bài test tích hợp, dù TS gốc tồn tại. Đã giới hạn ngoại lệ chỉ cho test `.test.mjs` cấp gốc, bắt buộc source `.ts` tương ứng phải tồn tại; ứng dụng và đường dẫn không hợp lệ vẫn báo lỗi. Đã thêm `check:source` vào cổng GitHub source preflight. KHÔNG phải là bằng chứng API/Web build, PostgreSQL, Playwright hay production hoạt động. GitHub kết nối: `thiendo_demo` và `thiendo_demoo` đều public vào thời điểm kiểm tra; CHƯA đẩy mã nguồn cần bảo vệ.

**A80 (phạm vi có kiểm chứng):** đồng bộ nhãn nguồn V11.164.100 / A80 tại manifest, README, hướng dẫn và script kiểm toán; chỉnh quy tắc hover trong thanh menu thu gọn để không dịch chuyển icon theo trục Y, bổ sung focus-visible. Không sửa thuật toán, dữ liệu người dùng hoặc cổng phát hành. Bố cục đẹp/mượt vẫn CHƯA KIỂM CHỨNG trên Chrome/Edge/Safari. Xem `verification/a80/report.md`.


**TRẠNG THÁI: NO-GO — 11/11 cổng phát hành OPEN.** Bản gốc: A71 / V11.164.98. Không commit/push, không đưa production, không đổi thuật toán huyền học, các migration, kho ảnh, PayOS, khóa, hoặc lockfile.

## 1. Sửa lỗi thực tế có kiểm chứng

- **AUTH-A72-01 (chặn thao tác hết hiệu lực):** `apps/web/src/components/auth-provider.tsx` kiểm tra `operation.signal.aborted` sau từng request trong các luồng đăng nhập, Google bắt đầu/xác minh, yêu cầu và gửi lại mã đặt mật khẩu, xác nhận đặt lại mật khẩu, đăng xuất, xóa tài khoản. Handler đã bị loại bỏ không được ghi state hoặc chuyển hướng tài khoản hiện tại. Lỗi xảy ra khi đóng/mở lại hộp thoại, chuyển tài khoản, đăng xuất chéo tab trong thời gian request cũ đang chạy; cơ chế `usePendingOperation` sẵn có hủy controller ở lúc unmount, và bản vá bắt buộc các handler tôn trọng tín hiệu đó.
- **PROFILE-A72-02 (dọn vòng đời):** `account-settings.tsx` không cập nhật thông báo hoặc setState sau khi editor bị hủy trong khoảng chờ `reload()`. Khi đang lưu và editor bị unmount, release khóa thao tác lên hộp thoại cha để account mới không nhận `profileWorking=true` vô hạn.
- **SECURITY-A72-03 (dọn vòng đời):** `account-security-extras.tsx` giải phóng khóa thao tác của hộp thoại cha khi panel đang thực hiện request và bị unmount; giữ kiểm tra generation trước khi nhận dữ liệu và không hiển thị phản hồi cũ.
- **TEST-A72-04:** 11 test mới thực thi handler TSX được trích bằng TypeScript compiler cho tình huống async resolve/reject sau hủy; sửa 2 assertion cũ chỉ khớp nguyên văn cú pháp của mã trước đó, giữ nguyên yêu cầu nghiệp vụ thực tế. Không hạ expected, không skip.

## 2. Phạm vi bằng chứng và giới hạn

| Phép kiểm | Kết quả | Ý nghĩa |
|---|---|---|
| 11 test A72 mới | **11/11 PASS** | Trích/xử lý hàm bất đồng bộ; 8 trường hợp abort và các kiểm tra vòng đời |
| Hồi quy tập trung 10 tệp | **63/63 PASS** | Auth, profile, cross-tab, bảo mật, launcher |
| Node `.cjs` chạy trực tiếp gộp (khác bộ runner A71) | **2.418/2.471 PASS; 53 FAIL** | 53 lỗi đều báo `MODULE_NOT_FOUND` (có cả tên alias workspace); không đánh dấu PASS |
| `npm test` runner chuẩn | **BLOCKED/INCOMPLETE** | Dừng khi mới chạy 111/359 tệp; chỉ 753/762 phép đã xuất summary. Các tệp chưa chạy KHÔNG ĐƯỢC coi đã PASS; do giới hạn thời gian phiên kiểm tra, không phải lỗi build đã được loại trừ |
| Npm registry `curl` | **BLOCKED** | `Could not resolve host: registry.npmjs.org`; npm cache trống |
| Native PostgreSQL, Nest/Next build, 3D/browser E2E, providers | **NOT VERIFIED** | Chưa có dependency, DB và môi trường hoạt động thật |

**Quan trọng về thống kê:** A71 dùng cơ chế test-file runner và ghi nhận 2.585/2.629 PASS với 44 lỗi import. Lần chạy gộp A72 có khác cách nạp module, phạm vi được thực thi và số bài nên **53 FAIL không thể so trực tiếp với 44 FAIL** hoặc kết luận đã phát sinh 9 lỗi nghiệp vụ. Các lỗi còn lại phụ thuộc module thật chưa thể thực thi thuật toán; sau `npm ci` cần chạy lại runner chuẩn để biết có lỗi mới hay không. File `verification/a72/node-combined-final.log` và `npm-shards-interrupted.log` giữ nguyên dữ liệu.

## 3. Biện pháp nghiệm thu bắt buộc

1. Trên máy có npm registry tin cậy, `npm ci --no-audit --no-fund`, `npm run check:dependencies`, `npm run typecheck`, `npm run build` và `npm test`; thu toàn bộ log. Không mock/loại bỏ dependency để đạt xanh giả.
2. Phân biệt lỗi import với lỗi test hành vi sau khi có thư viện thật; kiểm trực tiếp dữ liệu chiêm tinh/timezone, quyền backend/PostgreSQL, huy hiệu React. Sau khi sửa lỗi thực chạy lại các nhóm liên đới.
3. Xác minh các luồng auth và logout đa tab bằng E2E trên Chrome/Edge/Safari, đặc biệt khi mạng chậm và phản hồi trả về sai thứ tự.
4. Nghiệm thu 11 gate còn mở trước khi GO. Không đổi thành V12 khi chưa có bằng chứng Windows/native PostgreSQL/browser/PayOS/Gemini và pháp lý.
