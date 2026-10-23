# Cơ bản, Chuyên sâu và quyền Pro — 24/10/2026

## Điểm tiếp tục đã xác minh

GitHub trước đợt sửa này dừng ở `a2566f7241d025b13a506b77ef0c532a4b0bf4f6` (tab và tra cứu). Phần Pro vĩnh viễn còn nằm trong working tree, chưa có trên GitHub. Bản sửa hiện tại tiếp tục từ đúng working tree đó, không thay thế bằng gói A83 cũ.

## Phạm vi đã thực hiện

- Cơ bản: giữ công cụ/kết quả chính; chuyển xưởng 3D và các bộ đọc sâu Natal, Tarot, Thần số học sang Chuyên sâu. Chu kỳ/chỉ số nâng cao Thần số học cũng nằm trong Chuyên sâu. Các bảng này chỉ mount khi mở lần đầu, sau đó giữ trạng thái qua chuyển chế độ. Các bộ môn Đông phương kế thừa cơ chế Cơ bản/Chuyên sâu hiện có.
- Chuyên sâu miễn phí vẫn hoạt động. Hai không gian có khóa Pro: `/pro/research` (báo cáo một/nhiều lá số của chính người dùng) và `/research/advanced` (xưởng phương pháp). Chế độ giao diện không thay thế kiểm quyền API.
- Admin có `finance.write`, MFA mới và quyền đọc danh sách thành viên có thể cấp gói có hạn hoặc vĩnh viễn trong Bàn điều hành → Đơn & quyền. Hồ sơ vận hành thành viên cũng có cấp/thu hồi. Owner vẫn có toàn bộ quyền, kể cả cấu hình giá và đội ngũ.
- Gói vĩnh viễn dùng `expires_at = NULL`, có hiệu lực đến khi thu hồi. Không giả lập bằng ngày hết hạn xa. Chỉ quyền hỗ trợ thủ công được để trống hạn; quyền từ đơn thanh toán vẫn phải có hạn.
- API chống cấp trùng khi gửi lại, ràng buộc mã yêu cầu với tài khoản/thời hạn/người thao tác/lý do. Thu hồi giữ bản ghi lịch sử và đóng API nội dung.
- Đồng bộ quyền vĩnh viễn tại billing, sách Pro, quota AI, thống kê, hồ sơ vận hành và trang thành viên. Admin miễn yêu cầu mua gói; MFA vẫn bảo vệ các thao tác quản trị và báo cáo quản trị.
- Thêm migration 037 và baseline riêng; giữ checksum 001–036. Health, kiểm tra chuỗi migration và quy trình restore đều nhận đủ 37 migration.
- Đưa hồi quy SQL và trình duyệt Pro vĩnh viễn vào CI.

## Kiểm chứng tại môi trường hiện tại

| Kiểm tra | Kết quả |
|---|---|
| Toàn bộ Node regression | 3.212/3.212 qua, 371 tệp |
| SQL/service PGlite | 101/101 qua, 16 tệp; gồm 10 ca quyền Pro mới |
| React DOM | 55/55 qua; gồm mở theo nhu cầu và giữ trạng thái Chuyên sâu |
| Chuỗi migration | 13/13 ca qua; gồm từ chối sửa 037 và chấp nhận migration tương lai 038 |
| Chromium → Next → Nest → PGlite | 4 nhóm ca qua: khóa API/Admin miễn mua; cấp vĩnh viễn bằng Admin UI; hiển thị/thu hồi; ba trang Tây phương Cơ bản/Chuyên sâu |
| Build API và web; typecheck API và web | Qua |
| Source preflight | Lockfile, 37 migration, quét bí mật heuristic, kiến trúc, source-integrity qua |
| Tài liệu bàn giao và cú pháp restore | Qua |

Browser QA tạo Admin/MFA trong cơ sở dữ liệu dùng một lần, không tạo tài khoản quản trị production. Email được bắt trong bộ nhớ; không có giao dịch payOS, email hay Gemini thật. Chromium thử khu vực Đơn & quyền tại 390 và 1440 px. Đây chưa phải chứng nhận mọi màn hình/mọi trình duyệt.

## Công việc chưa được nghiệm thu

- Nội dung chuyên sâu từng môn vẫn cần tiếp tục biên tập và đối chứng. Không đánh đồng việc có tab hoặc mở quyền Pro với nội dung đã đầy đủ nhất. Xưởng phương pháp hiện có bốn bài hướng dẫn ngắn; chưa phải khóa học đầy đủ.
- Chưa nghiệm thu PostgreSQL native/Windows, Safari/iPhone, nhà cung cấp thanh toán/email/AI thật, vận hành production, đo hiệu năng thực tế hoặc các điều kiện pháp lý/bản quyền còn mở.
- Admin có các phân hệ tổng quan, thành viên, nội dung, thư viện, cộng đồng, cảnh giới, tài chính, AI, portal và audit. Đợt này kiểm chứng luồng Pro và phạm vi hồi quy nêu trên; không tuyên bố mọi thao tác Admin đã được kiểm chứng tuyệt đối.

**NO-GO production vẫn giữ nguyên.** Khi nâng cấp DB đang có dữ liệu: sao lưu, chạy `npm run db:migrate` trước khi khởi động mã mới; không sửa migration cũ hoặc khóa mã hóa MFA.
