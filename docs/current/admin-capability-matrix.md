# A66 — V11.164.93 / NO-GO

A66 không sửa endpoint, capability, vai trò, MFA hoặc migration. Bảng quyền phía dưới được kế thừa từ nguồn A65; chỉ các bài thực sự chạy lại được tính là bằng chứng A66, xem báo cáo hiện hành. Sửa theme storage thuộc shell chung và không tạo đường bỏ qua quyền.


Lượt này sửa trình bày/font/chuyển động; quyền quản trị và API không đổi. Đối chiếu byte API/engine/migration/asset cũ/lockfile đạt 750 tệp. Browser quản trị/nội dung theo phạm vi suite hiện hành trong báo cáo, không coi font/UI là phép nghiệm thu quyền mới.

## Ma trận quyền kế thừa A64

# Kiểm kê A64 — V11.164.91 / NO-GO

Nguồn A63 + bảo vệ bản nháp Văn Khố từ checkpoint A62 độc lập. 36 migration giữ nguyên. Các mục và số liệu của phiên bản cũ bên dưới là lịch sử; không thay thế kết quả A64.

| Phạm vi | Trạng thái A64 | Bằng chứng |
|---|---|---|
| Cài đặt/build/typecheck Linux | Đã kiểm | npm ci 375; build production cách ly; typecheck PASS |
| Node regression | Đã kiểm | 3110/3110, 353 tệp |
| DB/service/upgrade | Đã kiểm trong PGlite | 118 ca; không chứng nhận PostgreSQL native |
| Văn Khố bản nháp | Đã khôi phục và kiểm | 14 ca browser, 390/1440 |
| Thu hồi thiết bị MFA | Đã sửa và kiểm service/SQL | assurance trusted_device bị xóa; TOTP giữ lại |
| Danh hiệu, chat/theme, UI | Kết quả browser ghi trong báo cáo | Chromium production, không chứng nhận thiết bị thật |
| Provider/staging/thiết bị thật/pháp lý | Chưa đủ đầu vào | Giữ 11 gate OPEN |

## Nội dung kiểm kê kế thừa

# Quyền & chức năng quản trị — V11.164.87 / A60

**NO-GO production.** Owner là vai trò cao nhất của schema hiện hành; không có vai trò ẩn cao hơn. `effectiveCapabilities` cấp toàn bộ 20 capability cho Owner. Admin có thể được giao đủ 20 hoặc một tập con, nhưng các thao tác yêu cầu Owner vẫn kiểm vai trò riêng tại backend. Admin cũ có capability null/undefined giữ chính sách kế thừa hiện hành; tập rỗng không biến thành toàn quyền. Đây là phạm vi chức năng đã có và thay đổi A51, không phải cam kết “100% mọi ý tưởng đã hoàn thiện”.

| Phân hệ | Mở từ menu admin | Quyền xem/thao tác | Owner / giới hạn quan trọng |
|---|---|---|---|
| Bàn điều hành | `/admin` | overview.read cho số liệu tổng quan; dữ kiện từng domain vẫn scope riêng | Số liệu DB thật; chưa bật tracking thì báo chưa có dữ liệu, không giả số lượt truy cập |
| Quyền & chức năng | `/admin/authority` | Phiên quản trị đã MFA; đọc capability thật | 10 phân hệ, đường thao tác; Owner thấy quyền phân công đội ngũ |
| Thành viên | `/admin/members` | members.read; members.write cho Chuyên gia | Owner khóa/mở khóa, thu hồi phiên; không xóa user/dữ liệu tùy tiện |
| Đội ngũ | `/admin/team` | Chỉ Owner | Giao/thu hồi role Admin và scope, lý do, revision conflict, thu hồi phiên cũ; bảo vệ tự thay quyền/Owner |
| Tạp Chí | `/admin/articles` | content.read/write/publish/delete tách riêng | Soạn/sửa, xuất bản/gỡ, thùng rác/khôi phục, lịch sử/rollback; bản đang công khai cần quyền xuất bản |
| Sách | `/admin/books` | library.read/write; một số thao tác nhạy cảm chỉ Owner | CRUD/tệp/phạm vi, duyệt sách Chuyên gia, xuất bản/ẩn theo quy trình |
| Văn Khố | `/admin/van-kho` | library.read/write | Tài liệu, revision/duyệt/xuất bản, tệp riêng và chính sách truy cập |
| Cộng đồng | `/admin/forum`, `/admin/community` | community.read/write | Kiểm duyệt, xử lý báo cáo; chỉ tin nhắn bị báo cáo được mở cho kiểm duyệt |
| Cảnh giới/Tinh Văn | `/admin/tinh-canh` | ranks.read/write | Cấp/thu hồi 18 cảnh giới, xét minh chứng; không tự cấp, không bịa điểm |
| Tài chính | `/admin/finance` | finance.read/write và role/policy theo thao tác | QR, đối soát, hoàn tiền với người duyệt độc lập; không sửa trạng thái đã trả tiền bằng nút |
| Gói/đơn/Pro | `/admin?panel=plans`, `?panel=orders` | finance.read; sửa gói/thu hồi Pro yêu cầu Owner | Tặng Pro có requestId chống lặp; quyền thanh toán và hỗ trợ có lịch sử, không thay giá đơn cũ |
| Nội dung khóa | `/admin/access` | finance.read/write | Chính sách Pro cho phạm vi chuyên sâu được hỗ trợ; không khóa tùy tiện mọi môn chưa có kiểm API |
| Tư vấn | `/admin?panel=consultations` | finance.read/write và chính sách theo thao tác | Phạm vi gói, người xử lý/trạng thái; không tự hoàn tiền trái quy trình |
| AI người dùng | `/admin/huyen-giai` | ai.read/write | Mô hình/ngân sách/cấu hình hiện hành; provider thật cần key/môi trường hợp lệ |
| Trợ lý điều hành | `/admin/tro-ly` | overview.read + scope dữ kiện liên quan | SQL facts allowlist/evidence; không SQL tùy ý, không cho AI tự làm thao tác quản trị |
| Hướng dẫn/chính sách | `/admin/huong-dan` | portal.read/write + quy trình duyệt | Không tự ký duyệt pháp lý thay chủ thể phụ trách |
| Audit | `/admin/audit` | audit.read | Tra cứu/phân trang, thời gian Việt Nam; không sửa/xóa nhật ký |
| Hồ sơ quản trị | `/admin/profile` | Phiên quản trị/MFA; tự sửa preference | Huy hiệu quản trị riêng ba mẫu/chuyển động, Owner có vương miện; cấp nghiên cứu độc lập |
| Hộp thư | `/admin/messages` | Phiên admin; quyền người tham gia qua API chat | Liên hệ thành viên; không quyền đọc toàn bộ hội thoại riêng của người khác |

## Hồ sơ vận hành mới trong A51

`GET /api/admin/console/members/:id` → AdminConsoleService.member → PostgreSQL, được nối bằng MemberDossier tại Quản lý thành viên.

- Mọi yêu cầu cần membership hợp lệ, MFA và members.read; kiểm UUID, tồn tại tài khoản. Không trả password/salt, token, MFA secret, nội dung lá số/ngày sinh hoặc chat riêng.
- Thông tin tài khoản/Chuyên gia: theo members.read. Pro: chỉ query khi có finance.read. Quyết định cảnh giới: ranks.read. Audit: audit.read. Scope bị thiếu trả null và danh sách restricted, không biến thành số 0 giả.
- Pro: aggregate toàn bộ quyền đang hiệu lực, hiển thị 20 quyền gần nhất. Cảnh giới: 10 quyết định cấp tay gần nhất, không coi đó là tổng điểm học tập. Audit: 10 sự kiện có target trực tiếp là UUID tài khoản; các sự kiện target quyền Pro/đơn/bài riêng vẫn tra ở nhật ký chung.
- Kiểm lại MFA/capability sau khi đọc, trước khi trả; thu hồi scope trong lúc chạy sẽ từ chối kết quả. UI hủy đọc khi đổi thành viên/unmount, không giữ dữ liệu thành viên trước làm hồ sơ người mới.
- Cấp/thu hồi Chuyên gia, tặng Pro, thu hồi một quyền Pro và cấp cảnh giới dùng API đã có, giữ điều kiện MFA, Owner/domain, lý do và audit. Cấp Pro chưa tới/hết hạn không được mô tả nhầm là đang hiệu lực.

## Bằng chứng và giới hạn

- `tests/a51-admin-workspace.test.cjs`: resolver panel/menu/quyền; không chỉ regex mã nguồn.
- `tests/a51-admin-member-sql.test.mjs`: service thực/PGlite, quyền Owner/admin hẹp, không query domain bị cấm, aggregate23/hiển thị20, không lộ secret, thu hồi quyền giữa lượt đọc, MFA/UUID/404. Guard stub trong suite này; không thay bằng chứng HTTP.
- `tests/helpers-admin-authority-browser.cjs` trong candidate: HTTP/UI Owner/member/admin hẹp; cấp Chuyên gia/Pro/thu hồi/cảnh giới, paired click/DB/audit, 10 tổ hợp viewport/theme của trang quyền và hộp thư riêng ngữ cảnh.
- `tests/system.browser.cjs`: hồi quy các phân hệ quản trị và quyền hiện có. `tests/account.browser.cjs`: luồng tài khoản/MFA. Các số lượt cuối nằm trong báo cáo hiện tại; không cộng lần chạy lỗi/lặp vào kết quả.
- PostgreSQL native, Windows Chrome/Edge và Safari iPhone thật, provider thật, staging/TLS/backup restore và pháp lý chưa được nghiệm thu. Không mở GO/V12 từ ma trận này.


## Bổ sung A52 — bộ huy hiệu trưng bày

Admin/Owner đã xác minh MFA có thể chọn bộ 0–18 mẫu từ 18 huy hiệu theo thứ tự riêng tại hồ sơ quản trị. API profile vẫn kiểm admin/MFA gần đây, xác minh từng số nguyên1–18, không trùng, tối đa18; ghi transaction/audit vào bảng mới của migration034. Client cũ bỏ qua trường showcaseLevels sẽ giữ bộ hiện tại; mảng rỗng chủ động xóa bộ trưng bày. Tính năng không cấp vai trò Owner, Chuyên gia, Pro, điểm hay sửa lịch sử cảnh giới. Hộp thư dùng bố cục mới nhưng quyền người tham gia/chặn/báo cáo giữ nguyên.


A53 giữ nguyên20 capability/10 domain/MFA/API của A52. Mỹ thuật hộp thư dùng chung, không mở quyền đọc chat người khác; kết quả mới xem báo cáo hiện hành.
