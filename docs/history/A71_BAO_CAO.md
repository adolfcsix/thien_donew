# THIÊN ĐỒ — V11.164.98 / A71 — ĐIỀU TRA 45 LỖI KIỂM THỬ TỒN ĐỌNG

**Quyết định nghiệm thu: NO-GO; giữ đủ 11/11 cổng phát hành OPEN.** A71 kế thừa toàn bộ A70, sửa và xác minh riêng quy trình khởi động local, không thay đổi thuật toán huyền học, backend, migration, thiết kế Tarot, tài nguyên, secret hay lockfile. Chưa push GitHub, chưa công khai website, chưa chuyển V12.

## 1. Phân loại từng nhóm trong 45 thất bại A70

Đã phân tích log TAP gốc `verification/a70/node-suite-final.log`: 2.625 tests, 2.580 pass, 45 fail. Các thông báo `Cannot find module` trong những nhánh lỗi ghi nhận chính xác:

| Gói bị thiếu khi thực thi | Lượt lỗi import | Trạng thái A71 |
|---|---:|---|
| `astronomy-engine` | 35 | **BLOCKED** — thiếu dependency thật; chưa thực thi được phép kiểm chiêm tinh/Tử Vi phụ thuộc thư viện |
| `@nestjs/common` | 6 | **BLOCKED** — chưa nạp được kiểm thử NestJS |
| `pg` | 1 | **BLOCKED** — chưa chạy được test cần thư viện PostgreSQL |
| `moment-timezone` | 1 | **BLOCKED** — chưa chạy được kiểm thử múi giờ |
| `react` | 1 | **BLOCKED** — chưa dựng được huy hiệu bằng React |
| **Tổng lỗi import** | **44** | **Chưa được xem là PASS** |
| Bài thử launcher cổng 8080 bị chiếm | 1 | **FIXED** — tách kiểm thử vòng đời tiến trình khỏi preflight cổng, giữ preflight bắt buộc ở CLI thật |

Tất cả 5 gói trên có khai báo trong `package-lock.json` nhưng không tồn tại ở workspace trong môi trường này. Việc thiếu gói không chứng minh source code đúng hoặc sai khi chạy với thư viện thực. Trong môi trường kiểm tra, npm registry DNS không resolve và npm cache thiếu gói, nên chưa chạy `npm ci`, Next/Nest build hoặc E2E.

## 2. Những sửa đổi được chứng thực

### A71-RUN-01 — Loại trừ xung đột cổng khỏi bài kiểm thử tiến trình

Bài `tests/a46-local-built.test.cjs` trước đó khởi động CLI thật trên 8080/3000 ngay cả khi chỉ muốn kiểm tra một tiến trình con thoát thì tiến trình còn lại phải dừng. Vì cổng 8080 đang được sử dụng, bài thử báo thất bại ngay tại preflight trước khi chạm vòng đời tiến trình. Tách `startLocalBuiltChildren(plan)` thành hàm gọi được trực tiếp để kiểm tra child lifecycle bằng script giả lập không mở cổng mạng. **`main()` vẫn bắt buộc kiểm tra `localBuiltPlan` và `assertLocalPortFree(8080/3000)` trước khi khởi chạy.** Bài test cổng bận vẫn được giữ nguyên.

### A71-RUN-02 — Dừng cưỡng bức đối với tiến trình không chịu SIGTERM

Mã cũ đã gọi `child.kill('SIGTERM')` và dùng `!child.killed` làm điều kiện gửi `SIGKILL` sau grace period. `child.killed` chỉ cho biết yêu cầu gửi tín hiệu đã được thực hiện, không đảm bảo tiến trình đã thực sự kết thúc; do vậy tiến trình bỏ qua SIGTERM có thể không bao giờ bị cưỡng bức dừng. Điều kiện mới kiểm tra `exitCode === null && signalCode === null`; luôn lên lịch fallback `SIGKILL` nếu tiến trình vẫn sống. Có kiểm thử động child script bỏ qua `SIGTERM`, xác nhận bị kết thúc bằng `SIGKILL`.

### A71-DIAG-03 — Phân loại thất bại TAP đọc-only

Thêm `infrastructure/scripts/classify-node-test-failures.mjs` để tóm tắt số bài chạy, thất bại, số lỗi import theo tên dependency và đối chiếu sự hiện diện của gói trong lockfile/workspace. Script **không thay đổi tests, không mock/bỏ qua dependency, không ghi lại pass**, không giảm yêu cầu nghiệm thu. Ví dụ:

```bash
node infrastructure/scripts/classify-node-test-failures.mjs verification/a71/node-suite-final.log
```

Thêm ba bài test kiểm tra tính nhất quán thống kê, nhận diện TAP thiếu và năm dependency có trong lockfile.

## 3. Kết quả kiểm tra A71

| Kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| Test launcher riêng | **6/6 PASS** | 5 test cũ + 1 test trường hợp SIGTERM bị bỏ qua; không chiếm cổng dịch vụ |
| Test bộ phân loại mới | **3/3 PASS** | Cả 3 test chạy bằng Node thuần |
| Node `.cjs` diện rộng | **2.585/2.629 PASS; 44 FAIL** | **CHƯA ĐẠT**. 44 lỗi `Cannot find module` tiếp tục tồn tại |
| Kiểm tra 5 dependency trong lockfile | **5/5 LOCKED; 0/5 INSTALLED** | Cấu hình gói hiện có, chưa thể dùng runtime |
| npm ci / typecheck / build | **BLOCKED** | Không có kết nối npm registry và cây thư viện cài đặt; riêng `check-source` báo thiếu 8 import tương ứng `apps/api/dist` chưa build |
| Audit kiến trúc | **PASS** | 566 source files, 2.190 imports, 0 vi phạm |
| Migration chain | **PASS** | 36 migration SQL không đổi byte/hash |
| Launcher chạy lặp | **8/8 PASS** | Mỗi vòng thực thi 6 test launcher gồm stop/force-kill và kiểm tra cổng |
| Windows/PostgreSQL native/PayOS/Gemini/bộ trình duyệt/3D FPS | **NOT RUN** | Chưa có bằng chứng E2E/thiết bị/môi trường thực tế |

Log máy gốc A70 được giữ ở `verification/a70`, log A71 ở `verification/a71`, mã nguồn đã đối chiếu bản gốc. Không được đồng nhất `44 BLOCKED` với `44 PASS` hoặc khẳng định 44 trường hợp tự hết sau khi chạy `npm ci`.

## 4. Hướng đi bắt buộc trước khi giải quyết 44 lỗi còn lại

1. Trên Windows/CI/Linux có registry, chạy `npm ci --no-audit --no-fund` tại gốc source và kiểm tra `npm run check:dependencies` bằng lockfile giữ nguyên. Nếu fail: lưu log npm + nguyên nhân thực, không sửa lockfile để cho qua.
2. Chạy test **với cùng bộ dependency đã cài**, sau đó phân loại lại lỗi bằng script A71. Nếu lỗi logic xuất hiện phía sau bước import, cần sửa theo từng nhóm domain (astronomy/timezone, Nest, Postgres, React) và chạy lại bài kiểm chứng chuẩn, không sửa số liệu expected khi thiếu bằng chứng.
3. Tiếp tục `npm run typecheck`, `npm run build`, `npm test`, `npm run check:release:full:testdb` trên database test tách biệt theo hướng dẫn; lưu logs.
4. Thử local trên Windows khi cổng 8080/3000 có ứng dụng khác: hệ thống phải báo cổng bận, không tự kill app của người dùng; khi cổng trống và có build thì child process phải khởi động/dừng đúng.
5. Nghiệm thu riêng Chrome/Edge/Safari, responsive, avatar, menu 3D, 18 huy hiệu, Tarot, Natal và 5 theme Tây phương; chưa đủ chứng cứ thì luôn **NO-GO**.
