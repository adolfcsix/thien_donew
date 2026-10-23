# THIÊN ĐỒ — V11.164.103 / A83

Kiểm toán hiện hành: [PROJECT_AUDIT.md](PROJECT_AUDIT.md), [TEST_MATRIX.md](TEST_MATRIX.md), [RELEASE_READINESS.md](RELEASE_READINESS.md). Vòng 2 giữ NO_GO; đã sửa luồng phiên và lịch sử AI, bổ sung SQL/HTTP/DOM/Chromium có chọn lọc. Kết quả và giới hạn tại bộ báo cáo hiện hành.
A83 chuẩn hóa thêm 18 luồng tải xuống JSON/CSV/SVG/Markdown sử dụng helper chung, có test giữ nguyên schema, MIME và tên tệp; chưa kiểm thử download trên trình duyệt thực. A82 sửa 4 luồng xuất JSON/CSV dùng chung helper tải tệp, dọn dữ liệu luận giải Natal cũ khi sửa đầu vào và chặn thông báo lỗi không còn hiệu lực; A81 sửa kiểm tra source trước CI build, đưa source-integrity vào GitHub preflight; A80 đồng bộ metadata với mã nguồn hiện hành và giữ biểu tượng menu thu gọn đứng yên khi hover/focus; chưa được kiểm chứng bằng ảnh chụp trình duyệt. A79/A78 cải thiện giới hạn bố cục phương Tây. A72 bổ sung kiểm tra hủy yêu cầu bất đồng bộ cho đăng nhập, Google, khôi phục mật khẩu và xóa tài khoản; xử lý trạng thái khóa editor hồ sơ/bảo mật khi unmount. A71 xử lý riêng bài kiểm tra launcher khi cổng local bị chiếm, bổ sung cơ chế thu hồi tiến trình con bỏ qua SIGTERM và công cụ phân loại 44 lỗi import đang bị thiếu thư viện; kết quả còn NO-GO. A70 sửa các lượt tải Bảo mật trả về sai thứ tự, điều hướng thu hồi chính phiên về trang mở đầu, khóa xóa tài khoản qua Google trong lúc xử lý thao tác khác. A69 vá lỗi race đọc hồ sơ sau cập nhật, ràng buộc bản vá với đúng tài khoản, khóa thao tác thoát/chuyển tab khi mutation còn chạy và sửa kéo/cắt avatar. Có kiểm thử Node, chưa đủ nghiệm thu trình duyệt/production. A67 sửa điều hướng sau đăng nhập thành công khi dịch vụ kiểm tra quyền tạm lỗi, tách chuyển chuyên mục phương Tây khỏi hiệu ứng đổi sáng/tối và chống re-render tooltip trùng lặp. Xem kiểm chứng và giới hạn tại `docs/BAO_CAO_HIEN_TAI.md`.

Trong A71, phân loại nguyên nhân khi full suite còn lỗi bằng `node infrastructure/scripts/classify-node-test-failures.mjs verification/a71/node-suite-final.log` (log có trong ZIP; có thể chạy với đường dẫn tuyệt đối khi giải nén). Không dùng công cụ này thay cho `npm ci`, typecheck hoặc E2E.

A66 tiếp tục sửa vòng đời ánh sáng Tử Vi và giữ lựa chọn theme khi storage tạm lỗi. Kế thừa font local, palette chuyên sâu và chuyển động A65. Kế thừa A64 hợp nhất A63 với checkpoint A62: giữ toàn bộ nội dung, artwork và 36 migration; khôi phục bảo vệ bản nháp Văn Khố, sửa thu hồi phiên thiết bị tin cậy và phục hồi danh sách huy hiệu khi lỗi mạng. Kết quả nghiệm thu xem báo cáo hiện tại.

A61 cập nhật UX thiết lập Admin MFA, tự vừa khung bản đồ Natal và cảnh CSS 3D riêng cho Chiêm tinh, Thần số học, Tarot; chưa có bằng chứng browser production hoàn chỉnh.

A63 tiếp tục A62: thêm 8 huy hiệu chuyên môn có cấp/thu hồi riêng qua API, chuỗi 36 migration, các cảnh 3D Đông phương nhẹ và hướng dẫn kiểm chứng theo từng môn. Vẫn NO-GO. A62 tiếp tục A61: đăng nhập Admin có ghi nhớ thiết bị theo lựa chọn, backend vẫn yêu cầu TOTP mới cho thao tác ghi; sửa chat Luận Đàn, huy hiệu và cảnh 3D. Trạng thái vẫn NO-GO. Website gồm Next.js frontend, NestJS API và các thư viện dùng chung trong `packages/`, với Tử Vi, Bát Tự và các công cụ huyền học hiện có. A60 bổ sung xử lý đúng HTTP403/413/502 khi proxy trả HTML và phục hồi biểu mẫu tác giả sau tải lại thành công. A59 tiếp tục từ A58 đã xác minh: kiểm chặt receipt/window chat, cập nhật tên hội thoại không phụ thuộc tin mới và bảo vệ hồ sơ sách chưa lưu ở tác giả/quản trị. Giữ các sửa race/scroll/theme của A58 và nền mỹ thuật/engine/schema/dependency A53. **A63 cần chạy bổ sung migration 035 và 036 nếu DB cũ chưa có; sao lưu dữ liệu và giữ khóa MFA hiện hữu trước khi nâng cấp.**

- **Cài đặt, nâng cấp, Admin/MFA, sửa code, kiểm thử và vận hành:** [HUONG_DAN.md](HUONG_DAN.md).
- **Thay đổi và kết quả kiểm tra mới nhất:** [báo cáo hiện tại](docs/BAO_CAO_HIEN_TAI.md).

Mở PowerShell trong thư mục này, đọc hướng dẫn trước khi chạy. Nếu đã có hệ thống, giữ `.env`, khóa MFA, kho sách và PostgreSQL volume đang dùng. Không có mật khẩu Admin mặc định.

| Thư mục | Nội dung |
|---|---|
| `apps/web/` | Website và tài nguyên giao diện |
| `apps/api/` | API, tài khoản, phân quyền, quản trị |
| `packages/` | Engine, tri thức, diễn giải và xuất tệp dùng chung |
| `infrastructure/` | 37 migration, Docker, triển khai và công cụ vận hành |
| `tests/` | Hồi quy, trình duyệt, dữ liệu đối chứng và tương thích |
| `docs/` | Báo cáo hiện tại, giấy phép, hồ sơ nghiên cứu và thiết kế |

Kiểm tra nhanh: `npm run audit:distribution`, `npm run audit:handover`, `npm run typecheck`, `npm test`, `npm run build`. Các lệnh chi tiết và điều kiện môi trường nằm trong hướng dẫn.

**NO-GO production / chưa nghiệm thu V12.0.** Phiên bản nội bộ npm vẫn là `11.164.0`; nhãn gói hiện hành V11.164.103 / A83 là mốc bàn giao. Các giấy phép, phương pháp và định danh đọc dữ liệu lịch sử còn hiệu lực được giữ nguyên.

Để dùng local không chờ watcher/biên dịch từng trang: dừng dev, chạy `npm run build` một lần rồi `npm run start:local`. Cấu hình/giới hạn HTTP loopback và cách xử lý cổng bận nằm trong HUONG_DAN.md. A46 giữ chuyển cảnh nền và tối ưu chuyển màu các khung đọc/ô nhập.

