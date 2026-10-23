# THIÊN ĐỒ — Hướng dẫn hiện hành

Áp dụng cho V11.164.103 / A83. Đây là hướng dẫn duy nhất để cài đặt, nâng cấp, dùng quản trị, sửa code và vận hành. Kết quả kiểm tra của bản bàn giao nằm trong [báo cáo hiện tại](docs/BAO_CAO_HIEN_TAI.md). Các hồ sơ nghiên cứu và giấy phép trong `docs/` là tài liệu chuyên môn riêng, không phải các bản hướng dẫn khởi chạy cũ.

## Vào trang Admin và sử dụng Authenticator trong A61

1. Mở `http://localhost:3000/admin` **sau khi API và database đã khởi chạy**. Đăng nhập đúng tài khoản đã được cấp membership Admin/Owner trên **database của ZIP đang dùng**. Gói Pro không cấp quyền Admin.
2. Nếu máy chủ báo chưa cấu hình mã hóa MFA, trên máy local (không dùng DB production) theo hướng dẫn cấu hình `.env` và chạy `npm.cmd run admin:mfa:init`, khởi động lại API. **Không đổi khóa mã hóa nếu database đã có thông tin MFA**, vì sẽ mất khả năng xác minh khóa cũ.
3. Nếu là lần đầu, ở **Bước 1** bấm gửi mã email và nhập mã nhận trong hộp thư. Đã xác minh thì hệ thống sẽ hiển thị trạng thái. Nếu gửi mã email lỗi, phải cấu hình mail/test email hoặc sử dụng quy trình xác nhận Owner local có kiểm soát ở phần bảo mật phía dưới, không sửa database production thủ công.
4. Sau khi email verified, ở **Bước 2** nhập **mật khẩu tài khoản hiện tại**, bấm `Thiết lập MFA`. Website hiển thị một khóa bí mật chỉ một lần. Mở Google Authenticator/Microsoft Authenticator → thêm tài khoản bằng khóa thiết lập → điền khóa trên **thiết bị của bạn**. Không dán khóa vào chat/tài liệu.
5. Nhập **mã TOTP 6 chữ số trong ứng dụng Authenticator**, không phải mã email, ở **Bước 3**, bấm `Xác nhận thiết lập`. Lần đăng nhập Admin sau, nếu MFA đã bật chỉ cần nhập TOTP và bấm `Xác minh và vào Bàn điều hành`. Nếu thao tác nhạy cảm yêu cầu lại OTP, hoàn thành lần xác minh mới theo thông báo.
6. Nếu vẫn dừng tại sảnh, ghi lại thông báo lỗi, HTTP status và đường API (`/api/billing/access`, `/api/auth/mfa/status`, `/api/admin/console/session`), **che cookie/secret/OTP**. Lỗi 403 quyền không sửa bằng tắt MFA. Kiểm lại DB, migration, email_verified_at, membership, thời gian đồng hồ thiết bị/server và trạng thái phiên.

## Chạy local bằng bản đã build, tránh chờ biên dịch từng trang

`npm run dev` dành cho sửa code, có watcher và biên dịch trang lần đầu; không dùng tốc độ của chế độ này làm kết quả nghiệm thu. Khi chỉ muốn dùng/kiểm tra web trên máy, sau bước cấu hình `.env`, Docker/PostgreSQL và migration hiện có:

1. Dừng cửa sổ đang chạy `npm run dev` bằng **Ctrl+C** để giải phóng cổng 3000/8080.
2. Tại thư mục gốc `thien-do`, chạy:

```powershell
npm.cmd run build
npm.cmd run start:local
```

Chờ API và WEB báo sẵn sàng, rồi mở `http://localhost:3000` (hoặc đúng WEB_ORIGIN local đã cấu hình). Lần khởi động sau chỉ cần `npm.cmd run start:local`; sau khi sửa code hoặc đổi cấu hình proxy phải build lại. Build vẫn mất thời gian một lần; script không làm biên dịch tức thời nhanh hơn.

Lệnh này chạy API đã biên dịch và web standalone đã đóng gói, bind loopback, không chạy watcher. Cần `DATABASE_URL` trỏ PostgreSQL localhost/127.0.0.1/::1, `WEB_ORIGIN=http://localhost:3000`, `COOKIE_SECURE=false`, API cổng 8080 và proxy build `http://127.0.0.1:8080`. Không dùng `.env` production/DB từ xa. Nếu báo thiếu build hãy chạy lại build; nếu báo cổng bận hãy dừng cửa sổ cũ, không xóa dữ liệu hoặc diệt tiến trình không rõ nguồn. Ctrl+C dừng cả hai tiến trình do script tạo. Lệnh không tạo Owner, không tắt MFA, không đổi schema hoặc migration; Docker/DB vẫn phải chạy riêng.

Chế độ API local giữ cấu hình cookie HTTP dành cho phát triển; web dùng bản tối ưu production. Đây không phải quy trình triển khai public/HTTPS. Quy trình production phía dưới vẫn giữ kiểm tra bảo mật riêng. Nếu bản đã build vẫn chậm, cần xác định trang/thao tác và đo trên máy đó; không mặc định lỗi do chế độ dev.

## Build trong thư mục đồng bộ: tránh artifact cũ và ENOTEMPTY

Nếu workspace đang được công cụ đồng bộ tệp liên tục và build gặp `.next/.rsync-tmp`, không chạy nhiều build hoặc build đè artifact đang được kiểm thử/phục vụ. Chạy `npm.cmd run build:isolated` tại nguồn gốc. Script chụp nguồn vào thư mục tạm mới ngoài workspace, loại build/cache/QA/secret, kiểm hash từng tệp, cài **npm ci thật từ lockfile** và build tại đó; không symlink dependencies, không sao chép DB/volume/.env, không chép artifact ngược vào thư mục đang đồng bộ. Cần thêm dung lượng và mạng/cache npm. Các stream stdout/stderr hoàn chỉnh của npm ci và build được giữ riêng trong snapshot (`isolated-ci.stdout.log`, `isolated-ci.stderr.log`, `isolated-compile.stdout.log`, `isolated-compile.stderr.log`) trước khi in ra ngoài. Log cuối in `ISOLATED_BUILD_ROOT=...` và bằng chứng lệnh/exit code nằm tại `isolated-build-evidence.json` trong thư mục đó. Bản build thành công được giữ lại để kiểm và khởi chạy; không sửa/build tiếp chính snapshot đang dùng.

Trên Windows, đặt biến `$thienDoBuild = 'đường dẫn ISOLATED_BUILD_ROOT vừa in'`, sau đó khởi chạy bằng Node với env gốc: `node --env-file=.env "$thienDoBuild/infrastructure/scripts/start-local-built.mjs"`. Lệnh không tự tạo Owner, xóa DB hoặc bỏ MFA. Sau khi dừng toàn bộ tiến trình, chỉ xóa đúng thư mục tạm đã in nếu không còn cần; giữ nguồn gốc và dữ liệu riêng.

Đây là đường build cách ly cho thư mục có writer bên ngoài; không phải bằng chứng mọi Windows/CI đã hết lỗi. Build tiêu chuẩn vẫn dành cho checkout riêng không có tiến trình sửa artifact đồng thời. Không dùng một lần retry thành công để đóng gate vòng đời artifact.

## Hồ sơ sách chưa lưu và xác nhận tải tệp

Ở Không gian tác giả và quản trị Tàng Thư Các, đổi sách hoặc tạo hồ sơ khác sẽ hỏi trước khi bỏ nội dung/file chưa lưu. Hủy câu hỏi giữ nguyên biểu mẫu. Khi tác giả đã sửa metadata, hãy bấm **Lưu hồ sơ sách** trước khi tải tệp hoặc gửi duyệt; file đã chọn phải tải lên xong mới gửi duyệt. Nếu biên nhận không hợp lệ, dữ liệu nhập/file vẫn được giữ. Bấm **Kiểm tra danh sách sách** để đối chiếu dữ liệu server trước khi gửi lại khi kết quả không rõ.

Khi server xác nhận đã nhận hồ sơ chờ duyệt, biểu mẫu bị khóa ngay cả khi tải lại danh sách lỗi. Không gửi lại để thử sửa hồ sơ chờ duyệt; liên hệ quản trị theo quy trình hiện hành. Cảnh báo rời toàn trang không phải cơ chế autosave/backup và không bao phủ mọi thao tác điều hướng client. Đăng xuất/xóa phiên bắt buộc vẫn ưu tiên xóa dữ liệu riêng và về trang chung; guard bản nháp không cản quá trình này.

## Chuyển động trang mở đầu và quản trị

Trang mở đầu có hiệu ứng thẻ xuất hiện khi cuộn trên trang mở đầu; các thẻ chỉ số và biểu đồ quản trị xuất hiện theo lớp khi dữ liệu thật tải xong. Cảnh Thiên Môn/tiêu đề không chờ hiệu ứng. Không cần cài thêm thư viện hoặc video. Bộ hiệu ứng không thêm CSS ẩn nội dung; khi trình duyệt thiếu API hiệu ứng, các thẻ vẫn hiện. Toàn ứng dụng hiện cần JavaScript để hoàn tất luồng loading/streaming của Next.js; đây chưa phải chế độ chạy không JavaScript.

Bật **Giảm chuyển động / Reduce motion** trong cài đặt trợ năng hệ điều hành để tắt hiệu ứng mới. Chế độ giảm hiệu ứng của web trên máy ít bộ nhớ/Save Data cũng bỏ qua. Dùng Tab đưa focus đến thẻ sẽ dừng hiệu ứng ngay; chuyển tab nền dừng và giải phóng hiệu ứng. Mã nằm tại `apps/web/src/lib/scroll-reveal.ts` và `apps/web/src/components/scroll-reveal.tsx`; các thẻ áp dụng có thuộc tính `data-scroll-reveal`. Không thay đổi thông số dữ liệu/thuật toán để sửa chuyển động.

## Mục lục

- [Cài đặt và chạy lần đầu](#cai-dat)
- [Nâng cấp bản đang dùng](#nang-cap)
- [Đăng nhập, Owner và MFA](#admin-mfa)
- [Các chức năng quản trị và người dùng](#su-dung)
- [Xử lý lỗi thường gặp](#xu-ly-loi)
- [Sửa code ở đâu](#sua-code)
- [Chạy kiểm tra](#kiem-thu)
- [Triển khai, sao lưu và khôi phục](#van-hanh)
- [Phạm vi và điều kiện phát hành](#pham-vi)

<a id="cai-dat"></a>
## 1. Cài đặt và chạy lần đầu

Cần Node.js từ 22.13 trở lên, npm và Docker Desktop dùng Linux containers. Giải nén gói mới, mở PowerShell trong thư mục `thien-do`, nơi có `package.json`.

```powershell
node --version
npm.cmd --version
npm.cmd ci
```

Nếu chưa có `.env`, sao chép một lần:

```powershell
Copy-Item .env.example .env
```

Nếu `.env` đã có, giữ nguyên và đối chiếu cấu hình; không sao chép đè. Giữ `package-lock.json`; không xóa lockfile hoặc chạy `npm audit fix --force` để né lỗi cài đặt.

Cấu hình local theo đúng PostgreSQL đang dùng. Compose đi kèm dùng `localhost:5432/thiendo`, user `thiendo`, mật khẩu phát triển `thiendo_dev`; giá trị `DATABASE_URL` trong `.env` phải khớp. Nếu cổng 5432 đang phục vụ dự án khác, kiểm tra trước và chọn cổng riêng cho Thiên Đồ, cập nhật đồng thời Compose và `DATABASE_URL`.

Các giá trị web local: `WEB_ORIGIN=http://localhost:3000`, `API_INTERNAL_URL=http://127.0.0.1:8080`, `API_HOST=127.0.0.1`, `API_PORT=8080`, `COOKIE_SECURE=false`. Production HTTPS dùng `COOKIE_SECURE=true` và origin HTTPS thật.

Mở Docker Desktop, đợi sẵn sàng, rồi chạy:

```powershell
docker compose -f infrastructure/compose.yaml up -d
docker compose -f infrastructure/compose.yaml ps
npm.cmd run audit:migration-chain
npm.cmd run db:migrate
npm.cmd run check:auth:register
npm.cmd run dev
```

Website: http://localhost:3000. API nội bộ: http://127.0.0.1:8080. Health: `/api/health`; readiness: `/api/health/ready`. Hai tiến trình Next và Nest đều phải chạy. Lần sau dùng `START_THIEN_DO_WINDOWS.bat` sau khi cấu hình đã đủ. Dừng bằng Ctrl+C.

Hệ thống cần đủ **37 migration, từ 001 đến 037**. Không sửa SQL cũ hoặc checksum. Compose giữ dữ liệu trong volume `thiendo_pg`; không xóa volume để sửa lỗi đăng nhập/đăng ký.

Trên Linux/macOS, dùng `npm` thay `npm.cmd`, `cp -n .env.example .env` để tránh ghi đè cấu hình; các lệnh Node/Docker tương tự.

<a id="nang-cap"></a>
## 2. Nâng cấp bản đang dùng

1. Dừng web/API cũ. Sao lưu database, `.env`, khóa MFA và kho tệp riêng tư.
2. Giải nén bản mới vào thư mục mới; chuyển cấu hình và chỉ định lại đúng đường dẫn kho tệp đang dùng. Không tạo lại Owner hoặc đổi khóa MFA.
3. Chạy `npm.cmd ci`, kiểm tra đúng `DATABASE_URL`, chạy `npm.cmd run db:migrate`, rồi `npm.cmd run dev`.
4. Kiểm tra đăng nhập thành viên, Admin + MFA, một lá số đã lưu, bài viết và một tệp sách cũ.

A52 đã thêm migration034 cho bộ huy hiệu trưng bày quản trị. A53, A58, A59 và A60 không thêm schema; nâng từ trước A52 vẫn cần chạy đủ034. Gói cũ là điểm quay lại mã nguồn; quay lại code không tự quay lại schema/database. Không dùng dữ liệu thật cho các bài E2E có thao tác tạo/xóa.

Để tải sách và ảnh, cấu hình đường dẫn tuyệt đối ngoài thư mục `public` trong `.env`, ví dụ:

```text
BOOK_PRIVATE_STORAGE_DIR=C:/thien-do-private/books
VAN_KHO_PRIVATE_MEDIA_DIR=C:/thien-do-private/van-kho-media
```

Giữ nguyên kho cũ nếu đã có sách. Tài khoản chạy backend phải có quyền đọc/ghi. Khởi động lại backend sau khi đổi cấu hình. Sách cần được kiểm tra quyền ở API, không chuyển kho sách vào `apps/web/public`.

<a id="admin-mfa"></a>
## 3. Đăng nhập, Owner và MFA

**Owner** là chủ hệ thống. **Admin** là quản trị viên được giao phạm vi. Hai vai trò dùng tài khoản đăng nhập chung với website, nhưng có khu quản trị riêng và xác minh MFA. Thành viên/Pro/Chuyên gia không tự có quyền quản trị. Gói mã nguồn không chứa tài khoản hoặc mật khẩu Admin dùng chung.

### Tạo Owner đầu tiên trên máy local

Nếu database chưa có Owner và bạn chưa đăng ký tài khoản đó, chạy `TAO_OWNER_LOCAL_WINDOWS.bat`. Công cụ hỏi email thật, tạo username `thiendo_owner` và mật khẩu ngẫu nhiên, chỉ hiển thị sau khi ghi thành công. Lưu mật khẩu vào nơi riêng tư. Công cụ từ chối nếu đã có Owner; không dùng nó để lấy lại mật khẩu.

Nếu đã đăng ký tài khoản cần làm Owner và database chưa có Owner, người vận hành có thể dùng:

```powershell
node --env-file=.env infrastructure/scripts/bootstrap-owner.mjs --email EMAIL_DA_DANG_KY
```

Thay `EMAIL_DA_DANG_KY` bằng email thật. Lệnh thay đổi quyền, chỉ dùng để khởi tạo hệ thống của mình; không thay Owner đang có.

### Vào trang quản trị

1. Mở http://localhost:3000/admin, chọn Đăng nhập quản trị, nhập username/email và mật khẩu đúng.
2. Lần đầu, xác minh email ở màn hình quản trị hoặc Hồ sơ → Bảo mật. Mã email cần `RESEND_API_KEY` và `AUTH_EMAIL_FROM` được cấu hình.
3. Nhập mật khẩu hiện tại, chọn Thiết lập MFA. Website hiển thị khóa liên kết riêng của bạn.
4. Mở Google/Microsoft Authenticator trên điện thoại → thêm tài khoản bằng khóa thiết lập → nhập khóa website vừa hiển thị, chọn mã theo thời gian (TOTP).
5. Nhập mã 6 chữ số đang hiện trên ứng dụng vào website để hoàn tất.

Những lần sau dùng mã mới từ Authenticator đã liên kết. Mỗi mã chỉ dùng một lần. Nếu vừa dùng, đợi mã mới; bật đồng bộ giờ tự động trên điện thoại. Mã xác minh email và mã Authenticator là hai loại khác nhau.

### Máy chủ báo thiếu khóa MFA

`ADMIN_MFA_ENCRYPTION_KEY` là khóa mã hóa của backend, khác với mã 6 chữ số. Nếu chỉ chạy local và đây là lần thiết lập đầu:

```powershell
npm.cmd run admin:mfa:init
```

Dừng backend trước khi chạy và khởi động lại sau đó. Script giữ khóa hợp lệ đang có; chỉ tạo khi thật sự thiếu và database chưa có liên kết MFA. Không in khóa ra Terminal.

Nếu chỉ kiểm tra local, chưa có dịch vụ email, người vận hành có thể xác nhận email của **Owner đã tồn tại**:

```powershell
npm.cmd run admin:mfa:init -- --trust-local-owner-email EMAIL_OWNER_CUA_BAN
```

Thay email thật và nhập lại email khi công cụ hỏi. Chỉ dùng database local; công cụ từ chối production/CI, không tạo Owner, không đổi mật khẩu, không cấp Admin cho thành viên và vẫn yêu cầu Authenticator.

Nếu database đã có MFA mà mất khóa mã hóa, phục hồi đúng khóa cũ từ backup. Không tạo khóa mới để thử đăng nhập; khóa mới không giải mã được liên kết cũ. Khi mất điện thoại/khóa, người vận hành phải xác minh chủ tài khoản và làm quy trình khôi phục đã phê duyệt; không xóa bảng MFA hoặc mở endpoint bỏ qua xác thực.

Chẩn đoán chỉ đọc:

```powershell
node --env-file=.env infrastructure/scripts/diagnose-admin.mjs --email EMAIL_CAN_KIEM_TRA
```

Kiểm tra `accountExists`, `ownerExists`, `role`, `emailVerified`, `blocked`, `mfaKeyConfigured`, `mfaEnabled`. `activeSession=true` chỉ cho biết có phiên chưa hết hạn, không chứng minh trình duyệt hiện tại có đúng cookie. Khóa cấu hình hợp lệ về dạng chưa chứng minh đó là khóa đã dùng để mã hóa trước đây. Không gửi `.env`, cookie, mật khẩu, khóa liên kết hoặc OTP qua chat.

<a id="su-dung"></a>
## 4. Các chức năng quản trị và người dùng

Đăng nhập Admin/Owner đưa tới `/admin`, tiếp tục qua MFA; thành viên tới `/chart` (Lập lá số); nếu đang đăng nhập để dùng một công cụ cụ thể thì trở lại công cụ đó. API kiểm quyền trên từng thao tác. Quản trị viên chỉ thấy các phạm vi được cấp, Owner có toàn bộ phạm vi quản trị.

| Việc cần làm | Đường dẫn |
|---|---|
| Bàn điều hành, số liệu và trợ lý quản trị | `/admin` |
| Viết/sửa/xuất bản, lịch sử, thùng rác Tạp Chí | `/admin/articles` |
| Tra thành viên, khóa tài khoản, tặng Pro, cấp/thu hồi Chuyên gia, chat | `/admin/members` → chi tiết |
| Cấp phạm vi cho quản trị viên | `/admin/team` |
| Cấp/thu hồi huy hiệu 18 cảnh giới | `/admin/tinh-canh` |
| Hồ sơ và huy hiệu riêng Admin/Owner | `/admin/profile` |
| Duyệt/xuất bản sách Chuyên gia | `/admin/books` |
| Chính sách khóa các không gian Pro | `/admin/access` |
| Hộp thư cá nhân quản trị | `/admin/messages` |
| Xem và xử lý đúng tin nhắn đã bị báo cáo | `/admin/community` |
| Nhật ký thao tác quản trị | `/admin/audit` |
| Đăng Luận Đàn cho mọi thành viên đã xác minh email | `/forum/new` |
| Hồ sơ, huy hiệu, mở chat với thành viên | `/forum/members/<id>` |
| Hộp thư thành viên | `/messages` |
| Chuyên gia soạn sách và gửi duyệt | `/books/contribute` |

**Đăng xuất:** khi server xác nhận, website đóng hộp thoại, xóa màn hình/dữ liệu phiên đang mở và tải mới trang mở đầu `/`. Các tab cùng trình duyệt cũng về trang mở đầu; có cơ chế storage khi trình duyệt không hỗ trợ BroadcastChannel. Đăng xuất mọi thiết bị thu hồi các phiên khác; thiết bị khác cập nhật khi kiểm tra phiên hoặc hoạt động trở lại. Trang khôi phục từ lịch sử phải kiểm tra lại, không dùng nguyên màn hình riêng tư đã giữ trong bộ nhớ.

Nếu phản hồi đăng xuất bị mất sau khi server đã xử lý, website đọc lại trạng thái phiên để xác nhận; không tự gửi lặp thao tác. Nếu chưa xác nhận được, hộp thoại báo lỗi để thử lại, không báo đã đăng xuất thành công. Đăng xuất giữ các hồ sơ đã lưu trên server và lựa chọn giao diện; đăng nhập tài khoản khác bắt đầu với dữ liệu đúng tài khoản đó.

**Tạp Chí và Luận Đàn:** Tạp Chí dành cho ban quản trị xuất bản; Luận Đàn cho thành viên đã xác minh email. Tài khoản quản trị có liên kết soạn Tạp Chí ngay ở `/articles`.

**Chat:** mở hồ sơ người khác → Trò chuyện riêng. Chặn ngăn gửi hai chiều; lịch sử vẫn giữ. Báo cáo chỉ chuyển tin bị báo cáo tới quản trị. Nội dung bình thường chỉ hai người tham gia được đọc. Hộp thư cập nhật khoảng 8 giây khi trang mở, kể cả chưa chọn cuộc trò chuyện; trở lại tab sẽ kiểm tra lại danh sách, giữ luồng đang chọn và bản nháp; chọn cuộc trò chuyện khác cập nhật URL, tải lại giữ đúng cặp. Chưa có push khi đóng trình duyệt.

**Sách:** quản trị cấp Chuyên gia kèm chuyên môn/lý do; người nhận lưu hồ sơ, tải PDF/EPUB/bìa và gửi duyệt. Hồ sơ chờ duyệt hoặc đang xuất bản được khóa sửa phía tác giả. Quản trị chọn Hàng sách → Chuyên gia chờ duyệt, kiểm tra quyền sử dụng, rồi xuất bản. Danh sách quản trị tải tối đa 200 sách, ưu tiên chờ duyệt, tìm được tên/tác giả/đường dẫn trong phần đã tải. Thu hồi Chuyên gia chặn gửi/sửa ngay, không xóa sách đã duyệt. Mua Pro không tự thành Chuyên gia.

**Pro:** tặng Pro cần phạm vi tài chính và MFA, hiệu lực từ hiện tại, không cộng dồn thời hạn cũ. Khóa được kiểm tra ở API và cập nhật khi đổi trang, trở lại tab, định kỳ hoặc kiểm tra lại. Hết hạn bị khóa lại. Chuyên gia không tự có Pro; Admin/Owner dùng quản trị sách trực tiếp.

**Lá số:** giấy ngà/ngọc bích là vật liệu hiển thị; đổi vật liệu không đổi dữ liệu. Tắt chiều sâu/giảm chuyển động nếu cần. Trên màn hình hẹp có Danh sách, phóng to cung và sổ tay; PNG/SVG/PDF giữ phụ lục sao. Với chiêm tinh, đường nối dùng kinh độ thật còn nhãn có thể dàn ra để đọc. Chọn điểm/loại góc để giảm đường chồng; Composite chọn cả 10 thiên thể để bỏ lọc.

**Ảnh đại diện:** Hồ sơ → chọn/cắt ảnh → lưu; kiểm tra lại ở hồ sơ và bài diễn đàn. Dùng đúng định dạng và giới hạn được form thông báo; không chèn đường dẫn tệp tùy ý vào database.

**AI và dịch vụ ngoài:** Google cần `GOOGLE_CLIENT_ID` và cấu hình OAuth/email đúng; Gemini dùng `GEMINI_API_KEY` phía server cùng hạn mức; payOS cần đủ khóa server và webhook đúng domain. Dữ liệu truy cập phụ thuộc cấu hình opt-in `WEB_ANALYTICS_ENABLED`. Thiếu tracking/provider thì số liệu hoặc tính năng tương ứng có thể chưa sẵn sàng, không dùng dữ liệu mẫu như số liệu thật.

<a id="xu-ly-loi"></a>
## 5. Xử lý lỗi thường gặp

| Biểu hiện | Kiểm tra và xử lý |
|---|---|
| `npm ci` thiếu gói/lỗi mạng | Kiểm tra Node/npm, mạng npm registry và log; giữ lockfile. Cache thiếu tarball thì chế độ offline không tự tải được gói. |
| Docker mở nhưng đăng ký lỗi | `docker compose ... ps`, `DATABASE_URL`, quyền schema, migration; chạy `npm.cmd run check:auth:register`. |
| Trang web có nhưng API `ECONNREFUSED :8080` | Đọc cửa sổ Nest, kiểm tra lỗi biên dịch/dependency/cổng. Chạy typecheck, `npm.cmd run check:environment`. |
| Không giữ đăng nhập | Kiểm tra `/api` cùng origin với frontend, `WEB_ORIGIN`, proxy, HTTPS và `COOKIE_SECURE`; dùng đúng localhost hoặc domain nhất quán. |
| Đăng nhập được nhưng không vào Admin | Kiểm tra đúng tài khoản, role, email và MFA theo mục 3. Pro/Chuyên gia không phải Admin. |
| Thiếu khóa mã hóa MFA | Thực hiện mục 3, giữ nguyên khóa cũ nếu đã có credential. |
| Không gửi được mã email | Kiểm tra cấu hình gửi email và địa chỉ người gửi; local Owner có quy trình riêng ở mục 3. |
| Không tải/đọc sách | Kiểm tra đường dẫn kho riêng, quyền hệ điều hành, định dạng/dung lượng, quyền đọc sách và giấy phép. |
| Cổng đã dùng cho dự án khác | Xác định tiến trình/cổng trước, đổi cổng và cấu hình liên quan đồng thời. Không xóa volume dự án khác. |

Các lệnh chẩn đoán:

```powershell
npm.cmd run check:environment
npm.cmd run check:runtime:local
npm.cmd run check:auth:register
npm.cmd run diagnose:build
```

Các tệp `.bat` ở gốc là công cụ chạy các tác vụ riêng, không phải các bản hướng dẫn cũ. Dùng `CHECK_THIEN_DO_WINDOWS.bat` để kiểm tra source, `CHECK_THIEN_DO_DANG_KY_WINDOWS.bat` cho đăng ký, `TEST_THIEN_DO_OFFLINE_WINDOWS.bat` khi cần kiểm tra source chưa đủ dependency. Không gửi file bí mật khi chia sẻ log.

<a id="sua-code"></a>
## 6. Sửa code ở đâu

| Phần cần sửa | Vị trí |
|---|---|
| Trang và đường dẫn frontend | `apps/web/src/app/` |
| Menu, theme, đăng nhập, avatar | `apps/web/src/components/`, `apps/web/src/lib/navigation.ts` |
| Khung và phân hệ quản trị | `apps/web/src/features/admin-console/`, `admin-dashboard/`, `membership/` |
| Lá số, cung, tương tác, hoa văn | `apps/web/src/features/chart/` |
| Chiêm tinh, Tarot và biểu đồ đôi | `apps/web/src/features/western/`, `tarot/`, `relationship/` |
| Chat, huy hiệu Chuyên gia và khóa Pro | `apps/web/src/features/community-hub/` |
| API, xác thực và quyền | `apps/api/src/modules/`, `apps/api/src/common/` |
| Thuật toán, dữ liệu và diễn giải | `packages/astrology-engine/`, `knowledge/`, `interpretation/` |
| Logo Thiên Môn 天 và tài nguyên | `apps/web/public/brand/`, `apps/web/public/theme/` |
| Database | `infrastructure/db/` |
| Docker, triển khai, sao lưu | `infrastructure/`, `infrastructure/production/` |
| Kiểm thử và dữ liệu đối chứng | `tests/`, `tests/fixtures/`, `tests/compat/` |

Giữ logo chữ **天**, dùng token màu và motion chung, kiểm tra tương phản trên nền thực, bàn phím/focus, giảm chuyển động, sáng/tối và màn hình hẹp. Không dùng bản CSS/engine khác chỉ vì tên nó trông mới hơn; import và định danh snapshot quyết định tệp còn hiệu lực.

Các tệp có số phiên bản trong thuật toán, fixture và bộ kiểm thử có thể giữ quy tắc đọc hồ sơ cũ. Không xóa hoặc đổi checksum tùy ý. `tests/compat` chỉ là đối chứng tương thích; bốn module giống nguồn chính được dùng chung, ba module lịch sử riêng vẫn giữ để đọc quy tắc cũ. Không import mã thử vào runtime.

Khi sửa: tạo mốc khôi phục; cập nhật import/API/script/test cùng lúc; không đổi thuật toán để ép kết quả khớp lời luận; không xóa test để đạt PASS. Không đưa `.env`, dữ liệu SQLite, sách riêng hoặc output build vào source. Output preview được tạo khi cần, không giữ các bản HTML theo phiên bản trong gói mới.

<a id="kiem-thu"></a>
## 7. Chạy kiểm tra

Sau `npm.cmd ci`:

```powershell
npm.cmd run audit:distribution
npm.cmd run audit:handover
npm.cmd run check:lockfile
npm.cmd run audit:migration-chain
npm.cmd run check:source
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Mã nguồn và báo cáo kiểm thử phải cùng bản. Chạy build xong rồi mới chạy browser QA; không thay build khi harness đang dùng nó. Lỗi/chưa đủ môi trường phải ghi đúng, không đổi thành PASS.

### SQL WASM và trình duyệt local

Cài công cụ QA ngoài workspace để giữ nguyên lockfile ứng dụng:

```powershell
npm.cmd install --prefix ..\thiendo-qa @electric-sql/pglite playwright
node ..\thiendo-qa\node_modules\playwright\cli.js install chromium
$env:THIENDO_SQL_TEST_MODULE=(Resolve-Path ..\thiendo-qa\node_modules\@electric-sql\pglite\dist\index.js).Path
$env:THIENDO_PLAYWRIGHT_MODULE=(Resolve-Path ..\thiendo-qa\node_modules\playwright).Path
```

Dừng dev server để cổng 8080 và 3614 rảnh, rồi chạy từng harness với thư mục kết quả riêng:

```powershell
$env:THIENDO_BROWSER_REPORT_DIR=Join-Path (Get-Location) 'reports/account'
node tests/account.browser.cjs
$env:THIENDO_BROWSER_REPORT_DIR=Join-Path (Get-Location) 'reports/system'
node tests/system.browser.cjs
$env:THIENDO_BROWSER_REPORT_DIR=Join-Path (Get-Location) 'reports/chart'
node tests/chart.browser.cjs
$env:THIENDO_BROWSER_REPORT_DIR=Join-Path (Get-Location) 'reports/visual'
node tests/visual.browser.cjs
$env:THIENDO_BROWSER_REPORT_DIR=Join-Path (Get-Location) 'reports/logout'
node tests/logout.browser.cjs
```

Có thể chỉ định Chromium đã có bằng đường dẫn tuyệt đối trong `THIENDO_CHROMIUM_PATH`. Các harness dùng Next/Nest đã build và SQL PGlite WASM riêng; email được capture, không gửi thật. Đây không phải PostgreSQL server native hoặc nghiệm thu các provider thật.

Kiểm tra migration nâng cấp bằng SQL WASM:

```powershell
node tests/a36-upgrade.test.mjs
npm.cmd run test:account:sql
```

### PostgreSQL test riêng

```powershell
docker compose -f infrastructure/compose.test.yaml up -d
```

Chỉ sao chép `.env.e2e.example` thành `.env.e2e` nếu chưa có; kiểm tra đích là database thử `thiendo_test` ở localhost:5433 và các guard trước khi chạy:

```powershell
npm.cmd run check:release:full:testdb
```

Bộ E2E có thay đổi dữ liệu thử. Không trỏ vào database phát triển cần giữ hoặc production. Các kiểm tra source offline (`npm.cmd run test:source:offline`) không thay npm ci, build, SQL native hoặc browser QA. Kết quả sinh trong `docs/reports/` và `reports/`, tách khỏi gói mã nguồn sạch.

<a id="van-hanh"></a>
## 8. Triển khai, sao lưu và khôi phục

Dùng cấu hình `infrastructure/production/compose.production.yaml`, Dockerfile, entrypoint, nginx/Caddy và các script đi kèm. Đọc các biến trong `.env.example` và các mẫu cấu hình `*.env.example` trong `infrastructure/production/` trước khi dùng.

- Cấu hình domain/origin HTTPS, reverse proxy cùng origin, cookie Secure, bí mật server và khóa MFA riêng; không đưa khóa lên frontend hoặc Git.
- Chạy `npm.cmd run check:production:config` theo môi trường đích; kiểm thử các provider thật trước khi mở dịch vụ.
- Sao lưu database và kho tệp riêng cùng metadata bằng `backup.sh`/`file-bundle.mjs`; cấu hình theo `backup.env.example` và bảo vệ khóa mã hóa.
- Dùng `restore-drill.sh` trên môi trường phục hồi riêng để xác nhận đọc được dữ liệu và tệp, không chỉ kiểm tra có file backup.
- Dùng `ops-check.mjs`, mẫu monitor/alerts và timer/service đi kèm để giám sát; không báo đã gửi cảnh báo khi chưa cấu hình dịch vụ.
- Thực hiện `deploy.sh`, `rollback.sh`, `maintenance.sh` theo đúng môi trường và backup đã kiểm chứng. Rollback code không tự rollback database.

Các công cụ production yêu cầu người vận hành hiểu cấu hình đích. Không chạy lệnh phá hủy dữ liệu để sửa UI. Gói hiện tại chưa tự triển khai hay thay đổi server/máy của bạn.

<a id="pham-vi"></a>
## 9. Phạm vi và điều kiện phát hành

Trạng thái bàn giao vẫn **NO-GO production / chưa nghiệm thu V12.0**. Các điều kiện cần được xác minh trên bản triển khai thật gồm: cài đặt Windows/Linux; build và test hiện hành; PostgreSQL native/tài khoản/MFA; OAuth/email/Gemini/payOS; cấu hình HTTPS; sao lưu/phục hồi; giấy phép/pháp lý; browser/thiết bị; hiệu năng; tài nguyên Tarot.

Trạng thái máy đọc được nằm trong `infrastructure/release/current.json`; lệnh `npm.cmd run audit:handover` kiểm tính nhất quán của hướng dẫn, liên kết, migration và điều kiện còn mở. Kiểm tra tài liệu không tự phê duyệt phát hành.

Các kết quả Chromium Linux/PGlite trong báo cáo chỉ chứng minh những luồng đã nêu ở môi trường đó; không thay Chrome/Edge Windows, Safari/iOS, tải đồng thời, restore native hoặc giao dịch/provider thật. Chưa có chứng nhận WCAG toàn site hoặc số đo hiệu năng thực địa.

Giữ giấy phép và ghi công tại [Tarot RWS](docs/TAROT_78_ANH_BAI_GOC_1909.md), [bộ hình hiện đại](docs/TAROT_DECKS_MODERN_LICENSES.md), cùng thông báo `ASTRONOMY_ENGINE_NOTICE.txt`. Các phương pháp huyền học còn giới hạn nguồn/trường phái giữ nguyên giới hạn; sửa hình thức không phải thẩm định chuyên môn mới.

## Luồng tài khoản và quản trị hiện hành

Dùng chung màn hình đăng nhập. Tạo tài khoản mới hoặc đăng nhập tài khoản thành viên sẽ mở công cụ người dùng. Tài khoản đã được cấp Admin/Owner tự vào /admin, sau đó xác minh Authenticator. Owner là Chủ hệ thống có quyền cao nhất; Admin khác được phân công quyền riêng tại Đội ngũ & phân quyền. Không chọn vai trò bằng tên đăng nhập và không tự cấp quyền khi đăng ký.

Trong quản trị: mở Thành viên, tìm tài khoản, Mở chi tiết để trò chuyện, tặng Pro hoặc cấp Chuyên gia; chọn Quản lý huy hiệu để sửa cấp nghiên cứu. Phân công quản trị dùng Đội ngũ & phân quyền. Tạp chí & bài viết quản lý bản nháp, xuất bản, lịch sử và thùng rác. Hướng dẫn nằm cuối menu quản trị.

## Thiên bàn và bàn Tarot

Trong Natal hoặc Quan hệ: dùng bộ lọc góc hợp, chọn/rê vào thiên thể để xem liên hệ, bật nhãn độ nếu cần. Nút +/− phóng 100–225%; khi phóng to, cuộn trong khung để đọc. Vừa khung đưa về 100%. Xuất SVG đang xem giữ bản đồ và bộ lọc hiện tại; JSON đầy đủ vẫn ở chức năng xuất hồ sơ của từng trang. ℞ là nghịch hành; bảng số liệu dưới bản đồ có tọa độ và orb chi tiết.

Bàn Tarot tự đổi chất liệu theo sáng/tối. Hoa văn mắt–bàn tay là trang trí; cách rút, mã lá, chiều lá và nội dung đã lưu giữ nguyên. Trên điện thoại, trải bài chuyển thành danh sách số để dễ đọc. Nếu ảnh hiện “Ảnh chưa khả dụng”, kiểm tra mạng hoặc cài bộ ảnh theo phần tài nguyên; hoa văn nền có sẵn trong website và không cần tải ảnh từ ngoài.

Vị trí chỉnh hình thức: `apps/web/src/features/tarot/tarot-cloth.tsx` và `tarot-cloth.module.css` chứa hoa văn/chất liệu bàn Tarot; `apps/web/src/features/western/celestial-frame.tsx` và `celestial-frame.module.css` chứa vòng chia độ, viền, trục và thu phóng. Hai trang Natal/Quan hệ dùng chung thiên bàn này. Đổi màu trong stylesheet; giữ nguyên kinh độ và thông số tính toán trong engine.


## Bảo vệ mã nguồn — phạm vi hiện hành

Natal, luận Natal và Synastry/Composite tính qua `/api/calculations/western/`; API yêu cầu phiên đăng nhập đang hoạt động. Trình duyệt giữ phần nhập liệu, bộ lọc, vẽ đồ họa và xuất kết quả đã nhận. Các thuật toán dựng chiêm tinh và hai bảng tri thức đầy đủ của nhóm này không nằm trong JavaScript công khai. Thư viện tri thức tải từng mục khi chọn; nội dung đã hiển thị vẫn có thể được sao chép.

Chiêm tinh cần backend đang chạy. Khi API lỗi, trang giữ đầu vào để thử lại; không có bản engine dự phòng gửi xuống trình duyệt. Bản sao Natal/Quan hệ và xuất luận giữ định dạng cũ. Không đổi phương pháp, checksum tri thức hoặc kết quả để ép kiểm thử đạt.

Giới hạn mặc định trên mỗi tài khoản, dùng chung các phiên trong cùng một tiến trình API: 120 đơn vị/phút; Natal 2, quan hệ 6, mục tri thức 1. Giới hạn này không phải hạn mức đồng bộ nhiều máy chủ. Proxy production vẫn áp dụng giới hạn IP/tổng tải; khi mở rộng nhiều replica cần kho hạn mức dùng chung. Dữ liệu sinh và kết quả không lưu trong bộ đếm.

`npm run build` tự chạy kiểm tra ranh giới import và tài nguyên JavaScript trước khi đóng gói web. Có thể kiểm riêng:

```powershell
node infrastructure/scripts/audit-source-protection.mjs
node infrastructure/scripts/audit-source-protection.mjs --build
```

Lệnh `--build` yêu cầu đã có bản build production. Nếu phát hiện mã chiêm tinh riêng bị import lại, dấu vết phép tính trong static hoặc source map công khai, quá trình đóng gói phải dừng. Không bỏ qua kiểm tra để phát hành. Next Proxy và mẫu nginx từ chối đường dẫn cấu hình, source, archive và debug map; chỉ đưa artifact triển khai vào webroot, giữ ZIP nguồn và backup bên ngoài thư mục công khai.

**Phạm vi chưa chuyển:** Tarot, Tử Vi và các bộ môn khác vẫn có phần logic/tri thức chạy trên trình duyệt. Giao diện, ảnh, font và nội dung được hiển thị không thể giấu hoàn toàn. Đây là lớp bảo vệ đầu tiên, không phải chứng nhận chống sao chép toàn website.

Kho Git chứa nguồn riêng cần đặt private, cấp quyền tối thiểu và bật xác thực hai bước; người đã tải source trước đó vẫn có thể giữ bản sao. Không đặt khóa API, `.env`, database, sách riêng hoặc ZIP nguồn trong public. Lượt này không thay đổi trạng thái repository GitHub hoặc triển khai server thực tế.

Vị trí mã: `apps/api/src/modules/secure-calculations/` là API được bảo vệ; `apps/web/src/features/western/secure-api.ts` chỉ gọi API; `western-input.cjs` và `relationship-input.cjs` chỉ chuẩn hóa đầu vào/định dạng; `western-presentation.cjs` chỉ phục vụ nhãn/xuất kết quả. Mã tính vẫn ở các module engine gốc. `apps/web/src/proxy.ts` và `source-exposure.cjs` chặn tệp nhạy cảm. Bảo toàn lệnh kiểm và bộ hồi quy khi sửa các phần này.


## Kiểm toán ứng viên A44 và quyền dữ liệu

A44 có hai bộ Tarot đủ ảnh local: 78 RWS và 78 Gearberry, cùng thumbnail cho danh mục. Lá rút vẫn dùng ảnh gốc. Nếu danh mục thiếu thumb, ứng dụng thử đúng ảnh gốc cùng bộ; không trộn bộ bài. Chạy `node infrastructure/scripts/audit-tarot-assets.mjs` để kiểm manifest/hash/ID. Build tự kiểm và từ chối thiếu/hỏng ảnh. Công cụ tải vẫn dùng được khi cần phục hồi; không tự bật cờ ready nếu chưa đủ tệp. Kiểm kỹ thuật không thay duyệt quyền xuất bản.

Quản trị có overview.read chỉ đọc dữ liệu tổng quan/truy cập. Muốn hỏi hoặc xem số liệu thành viên, cộng đồng, cấp bậc, thư viện, AI hay tài chính phải có quyền đọc tương ứng; câu hỏi gộp chủ đề không được cấp bị từ chối toàn bộ trước truy vấn. Dashboard chỉ tải số liệu có quyền; không có quyền không có nghĩa số lượng bằng 0. Owner giữ toàn bộ quyền. Admin cũ chưa có permission set tiếp tục chính sách toàn quyền trước đây; Owner nên rà lại và cấp phạm vi rõ qua Đội ngũ.

Ma trận chức năng, endpoint và checklist V12 nằm trong `docs/current/feature-matrix.md`, `docs/current/endpoint-matrix.csv`. Bảng endpoint là tham chiếu tĩnh, không thay bằng chứng chạy thật. Khi vận hành hiện tại dùng một API instance. Chưa mở nhiều replica nếu chưa bổ sung kho hạn mức nguyên tử/TTL dùng chung và kiểm thử đồng thời.

Để cấu hình dịch vụ thật, chỉ sửa `.env` server và khởi động lại API: Resend cần tên miền gửi đã xác minh + AUTH_EMAIL_FROM; Google OAuth tạo Web client cho đúng origin, đặt GOOGLE_CLIENT_ID; Gemini đặt GEMINI_API_KEY rồi Owner mở Huyền Giải AI để chọn model/ngân sách; PayOS đặt ba khóa và webhook HTTPS `/api/billing/webhook/payos` theo controller hiện hành (kiểm route trong ma trận trước khi cấu hình dashboard nhà cung cấp). Không dán key vào frontend, screenshot hay báo cáo. Thiếu cấu hình phải hiện chưa sẵn sàng. Dùng tài khoản/giao dịch thử và xác minh với nhà cung cấp trước khi mở thật.

Mua domain ở nhà đăng ký có quyền kiểm soát DNS (có thể dùng nhà cung cấp .vn hoặc quốc tế). Trỏ A/AAAA về IP máy chủ; chỉ tạo AAAA khi máy chủ thực sự hỗ trợ IPv6. Cấu hình domain/origin đúng mẫu production, mở cổng HTTPS, kiểm DNS/TLS, cookie và callback trên domain thử. Không đổi link localhost rồi coi website đã triển khai. Caddy quản lý chứng chỉ khi DNS/cổng đã đúng; nginx và API không công khai trực tiếp. Đọc và kiểm preflight của cấu hình thực trước khi chạy deploy; không chạy lên máy khác chỉ vì đã có Docker.

Email/OTP cũng yêu cầu `AUTH_OTP_SECRET` riêng, tối thiểu 32 ký tự. Với local mới, `npm.cmd run admin:mfa:init` sinh giá trị thiếu an toàn (cùng khóa MFA) và giữ khóa hiện có sau khi kiểm DB. Production dùng công cụ tạo secrets trong `infrastructure/production/init-secrets.mjs` theo mẫu compose, không sao chép secret local hay dùng mật khẩu mẫu. Khôi phục hệ thống cũ luôn giữ khóa gốc từ backup.

Kiểm mới sau build, với các biến QA đã cấu hình ở mục 7: chạy `node tests/candidate.browser.cjs` cho quyền dữ kiện, 312 ảnh offline và chuyển động home/dashboard (focus, fallback, sáng/tối 320–1920px); `node tests/performance.browser.cjs` cho 18 mẫu lab. Đặt THIENDO_BROWSER_REPORT_DIR khác nhau cho từng lần. Chạy tuần tự khi máy yếu; giữ deadline/assert, không đổi giả lập viewport thành chứng nhận điện thoại thật. Danh sách lỗi có ID/mức/đường dẫn ở `docs/current/issues.csv`.

## Dung lượng gói nguồn A45

Gói nguồn gồm hai bộ Tarot offline, không phải dung lượng tải mỗi lần mở trang. A45 nén lại 78 JPEG RWS bằng jpegtran (giữ toàn bộ metadata), giảm 4.064.725 byte, giữ nguyên từng pixel RGB và độ phân giải so với A44. Danh mục vẫn dùng thumbnail; lá rút dùng ảnh đầy đủ. Không cần tải lại ảnh sau giải nén. Script tải ảnh chỉ dùng khi cần phục hồi và phải kiểm tra lại manifest sau phục hồi. Không xóa tài liệu nghiên cứu, giấy phép hoặc migration vì tên có phiên bản. Không suy ra tốc độ web từ dung lượng ZIP; các giới hạn đo hiệu năng và gate V12 vẫn được ghi trong báo cáo hiện hành.

## Kiểm tra lại A47

WEB_ORIGIN local có thể có một dấu `/` cuối giống API, ví dụ `http://localhost:3000/`. Launcher chuẩn hóa cùng origin cho API/web, vẫn chặn host lạ, đường dẫn, query, fragment và credential. Điều kiện DB local, cookie, MFA, cổng và proxy build giữ nguyên. Kết quả mới trong docs/BAO_CAO_HIEN_TAI.md; không coi kiểm Linux/PGlite là nghiệm thu Windows/PostgreSQL native.

Đo bổ sung: đặt `THIENDO_MOTION_LAB=profile` rồi chạy candidate để ghi 12 mẫu home/admin ở 390/1440px. Xóa biến này khi chạy nghiệm thu mặc định; profile không thay thế bộ kiểm chức năng. Dùng thư mục THIENDO_BROWSER_REPORT_DIR riêng và dừng các suite/build khác khi đo. Các số đo localhost/Chromium GPU tắt không chứng nhận mạng internet, điện thoại thật hoặc field INP.

## Ghi chú sửa lỗi A49

Nháp chat được giữ riêng theo hội thoại **trong lần mở hộp thư hiện tại**, không ghi vào localStorage/sessionStorage. Tải lại trang, rời hộp thư hoặc đăng xuất sẽ bỏ nháp chưa gửi; không coi đây là dịch vụ lưu nháp trên server. Khi báo lỗi gửi có thể đã lưu, dùng nút gửi lại cùng nội dung trong hộp thư để giữ mã chống gửi trùng; đổi người nhận rồi quay lại vẫn giữ mã đó. Lịch sử đã mở không bị co về 50 tin khi gửi mới. Không cần migration mới cho sửa thứ tự tin nhắn.

Bộ kiểm bổ sung: `tests/chat-state.test.cjs` (9 ca); `tests/a49-message-order.test.mjs` (2 ca SQL cần THIENDO_SQL_TEST_MODULE và API đã build); candidate mặc định có ca hồ sơ đến muộn và chat. Đặt `THIENDO_A49_SWEEP=1` để kiểm 72 route tĩnh, lưu THIENDO_BROWSER_REPORT_DIR riêng; xóa biến này khi chạy candidate nghiệp vụ mặc định. Đây là harness dùng dữ liệu tổng hợp/PGlite, không trỏ vào DB thật. Kiểm native/provider/thiết bị thật vẫn theo checklist.

## Bắt đầu sau đăng nhập và tên lá số

Trang đầu vẫn là phần giới thiệu công khai. Đăng nhập/đăng ký thành viên thông thường mở thẳng Lập lá số, không thêm màn giới thiệu chờ chuyển động. Link công cụ cần đăng nhập giữ điểm đến hợp lệ; Admin/Owner vẫn vào quản trị và xác thực MFA. Đăng xuất về trang mở đầu.

Tên lá số mới để trống; dòng mờ “Nhập họ và tên” là gợi ý, không được lưu thành tên. Nhập tên trước khi bấm Tính lá số. Hồ sơ sinh đã lưu chỉ nạp tên khi bạn chủ động chọn dùng hồ sơ; lá số cũ vẫn giữ tên cũ khi mở lại.

## Quản trị: Owner và các phạm vi công việc

Owner (Chủ hệ thống) là vai trò cao nhất. Admin có thể được giao nhiều hoặc ít phạm vi; chọn mẫu “Quản trị đầy đủ” vẫn không biến thành Owner. Sau đăng nhập bằng tài khoản Owner đã được tạo trên đúng DB, hoàn tất MFA rồi mở **Quyền & chức năng** ở menu quản trị. Trang này lấy vai trò/phạm vi thực từ máy chủ và dẫn tới từng nơi thao tác; không phải bảng quyền giả đặt bằng tên đăng nhập.

- **Thành viên:** tìm email/username/tên → Mở chi tiết. Hồ sơ vận hành đọc trạng thái, số phiên, Chuyên gia; dữ liệu Pro/cảnh giới/nhật ký chỉ xuất hiện nếu có quyền tương ứng. Không đọc mật khẩu, khóa MFA, lá số riêng hay toàn bộ chat riêng của người khác.
- **Tặng/thu hồi Pro:** trong hồ sơ vận hành, ghi lý do rồi tặng số ngày. Danh sách 20 quyền gần nhất tự tải lại; tổng quyền đang hiệu lực tính từ toàn bộ quyền của tài khoản. Owner ghi lý do riêng rồi chọn “Thu hồi quyền Pro này” để thu hồi một quyền cụ thể. Tặng mới có hiệu lực từ lúc cấp, không tự kéo dài/cộng dồn gói cũ. Không biến đơn chưa trả tiền thành đã trả tiền.
- **Chuyên gia:** ghi chuyên môn/lý do, cấp hoặc thu hồi; người được cấp có đường gửi sách theo quy trình hiện có. Đây không phải quyền quản trị.
- **Cảnh giới:** trong hồ sơ vận hành chọn “Cấp / thu hồi cảnh giới” để mở công cụ có sẵn UUID đúng người; chọn 1–18 và ghi lý do. Điểm Tinh Văn không tự tăng theo quyết định cấp tay.
- **Đội ngũ:** chỉ Owner cấp/thu hồi vai trò quản trị và từng quyền, có kiểm xung đột phiên bản; thay đổi thu hồi phiên cũ. Không tự hạ quyền Owner qua màn hình này.
- **Các mục còn lại:** Tạp Chí/bài viết và lịch sử/thùng rác; Sách/Văn Khố; kiểm duyệt cộng đồng/báo cáo tin nhắn; tài chính/QR/đối soát/gói/đơn/quyền Pro/tư vấn; cấu hình AI/trợ lý điều hành; hướng dẫn/chính sách; nhật ký; hồ sơ/huy hiệu quản trị và hộp thư liên hệ thành viên. Tính năng cần provider thật chỉ hoạt động khi cấu hình hợp lệ.

Menu quản trị và tiêu đề nhận diện riêng Gói Pro, Đơn hàng & quyền Pro, Tư vấn riêng, dù chúng dùng các panel trên cùng đường `/admin`. Không phải menu bộ môn của người dùng. MFA, phê duyệt độc lập khi hoàn tiền và duyệt pháp lý vẫn áp dụng cho Owner. Nhật ký không có nút xóa/sửa. Xem phạm vi quyền chi tiết tại [ma trận quản trị](docs/current/admin-capability-matrix.md).

## Nâng cấp A52: chat, huy hiệu và bản đồ

Nếu nâng từ A51 hoặc cũ hơn: sao lưu DB/kho tệp và giữ `.env`/khóa MFA hiện có, dừng dev hoặc tiến trình web/API cũ. Tại gốc dự án chạy `npm.cmd run db:migrate`, rồi `npm.cmd run build` và `npm.cmd run start:local` theo cấu hình local ở trên. Migration **034_admin_badge_showcase.sql** chỉ thêm bảng huy hiệu trưng bày; 001–033 không bị sửa. Không xóa PostgreSQL volume, tài khoản hay khóa MFA. Các script chẩn đoán, ledger và restore đã cập nhật danh sách 34 migration. Đây không phải bằng chứng đã chạy Windows/PostgreSQL native thật.

Build web mặc định nay dọn `apps/web/.next` trước khi biên dịch để tránh giữ HTML/RSC/chunk giao diện cũ; không dọn source, DB, lockfile hoặc `.env`. Dừng tiến trình dev trước khi build. Không đánh giá tốc độ internet từ thời gian biên dịch.

**Huy hiệu:** vào Admin → Hồ sơ quản trị → Bộ huy hiệu trưng bày. Chọn bất kỳ mẫu nào trong 18, bấm lại để bỏ; thứ tự chọn là thứ tự hiển thị. Lưu hồ sơ để ghi lên server. Có thể bỏ toàn bộ. Huy hiệu này hiển thị cạnh vai trò quản trị trên hồ sơ công khai; ở dòng danh tính nhỏ chỉ hiện tối đa hai mẫu và số còn lại. Vai trò Admin/Owner, danh hiệu Chuyên gia, cảnh giới được cấp và điểm Tinh Văn vẫn độc lập. Ba kiểu huy hiệu quản trị và sắc thái cũ vẫn dùng được.

**Chat:** tìm theo tên trong các hội thoại đã tải; muốn lấy thêm bấm “Thêm cuộc trò chuyện”. Lọc không xóa nháp; nháp vẫn chỉ lưu trong RAM của hộp thư/tài khoản hiện hành, rời trang hoặc đăng xuất sẽ mất. Tin nhắn có thời gian Việt Nam, cập nhật định kỳ khi trang mở; không hứa thông báo đẩy hay “đã đọc” khi chưa có bằng chứng.

**Tử Vi:** ô Tìm sao trong cung chấp nhận tên có/không dấu; bộ lọc chỉ tìm sao thật tại cung đang chọn. Đổi cung sẽ xóa bộ lọc. Hồ sơ sao hiển thị thêm trọng tâm/khả năng đối chiếu từ chuyên khảo đã có, không tự bổ sung sao chưa an.

**Natal:** mở “Bảng đối chiếu … góc hợp đang hiển thị” dưới bản đồ. Danh sách theo bộ lọc và orb thực; bấm một cặp để làm rõ đúng đường nối, bấm lại để bỏ chọn. Kinh độ, nhà, độ nhạy giờ sinh, phương pháp và dữ liệu xuất giữ nguyên.


## Hoa văn và bảng tra cứu A53

Hộp thư dùng tranh vector sơn thủy/Bát Quái gốc tĩnh. Hoa văn không nhận chuột/cảm ứng. Logo dùng TianMonMark SVG để không phụ thuộc font chữ Hán. Sửa tranh tại `apps/web/src/components/engraved-backdrop.tsx`, màu/chất liệu tại `apps/web/src/app/community-and-chart-refinement.css`.

Natal có khung mắt–bàn tay–tinh tú trang trí riêng, không mô phỏng các thiên thể đang chạy thời gian thực. Nút **Chuyển động hoa văn · Bật/Tắt** chỉ điều khiển trang trí. Reduced motion/reduced effects, tab ẩn và ngoài viewport tự dừng; tọa độ khoa học và các nét aspect vẫn nguyên vị trí. Bảng/ma trận ở `features/western/natal-data-atlas.tsx`; mỗi dòng thiên thể chọn đúng đối tượng trên vòng. Ma trận đọc nửa dưới đường chéo, ký hiệu có tên/góc/orb. Nhấn chọn một cặp làm rõ một đường, nhấn lần nữa bỏ chọn. Bộ lọc áp dụng cho vòng, ma trận và ledger; bảng rộng có vùng cuộn riêng và hỗ trợ bàn phím. Không lấy các nét hoa văn làm tọa độ tính toán.

Tử Vi có tên người nhập giữa địa bàn và **Hồ sơ đối chiếu** dưới khung. Hai lớp Tứ Hóa năm sinh/năm xem giữ tách biệt; có thể thu gọn. Dữ liệu từ kết quả hiện hành, không tự thêm chủ mệnh/chủ thân/lai nhân/cách cục hoặc an các tên sao chưa có căn cứ. Long–phụng/ánh sáng giữ cho giấy ngà và ngọc bích; dừng ngoài viewport và khi giảm chuyển động. Lưu/xuất và các quyền hiện hành giữ nguyên.

## Khi tải sách gặp HTTP403/413/502

403 nghĩa là yêu cầu bị từ chối: kiểm tra đúng tài khoản, email đã xác minh, huy hiệu Chuyên gia còn hiệu lực; quản trị cần capability và MFA. Khi reverse proxy trả HTML, ứng dụng vẫn hiện HTTP status và giữ file chọn, không tự gửi lại. Không bỏ guard hoặc cấp Owner để né lỗi.413 cần kiểm tra kích thước tệp và giới hạn body tại proxy/API; vẫn giữ giới hạn24MiB của ứng dụng.502 hoặc timeout có thể chưa rõ kết quả lưu: dùng Kiểm tra danh sách sách trước khi tải lại thủ công. Sau GET danh sách thành công, thông báo lỗi tải cũ được xóa nhưng nội dung form chưa lưu vẫn giữ.

Lỗi403 khi ChatGPT lưu gói nguồn là lỗi kênh lưu bên ngoài, không phải HTTP403 của website. Không sửa .env, CORS, MFA hoặc quyền Thiên Đồ để xử lý lỗi lưu đó. Tải ZIP và SHA256 về máy khi chưa có xác nhận lưu bền vững.


## A62 — Tài khoản chung, thiết bị tin cậy và bảo vệ quyền quản trị

1. **Người dùng thường**: đăng nhập bằng username/email + mật khẩu trên trang đăng nhập chung, hệ thống đọc quyền thực tế từ `/api/billing/access` và chuyển tới `/chart`. Không chuyển người dùng thường vào `/admin` dù URL `next` yêu cầu.
2. **Tài khoản Admin/Owner phải được cấp quyền từ máy chủ**: đăng ký thông thường không bao giờ tự tạo vai trò Admin. Owner được khởi tạo qua quy trình vận hành có kiểm soát. Owner cấp/thu hồi Admin và capability tại `Đội ngũ & phân quyền`; thay đổi quyền thu hồi phiên cũ và các trình duyệt tin cậy.
3. **Lần đầu truy cập `/admin`**: đăng nhập với tài khoản Admin/Owner đã được cấp quyền, xác minh email, liên kết Authenticator bằng mật khẩu và mã TOTP sáu số. Nếu không hiện ô mã, kiểm tra từng bước và `ADMIN_MFA_ENCRYPTION_KEY`, **không tắt MFA**.
4. **Ghi nhớ trình duyệt tin cậy (tùy chọn, không mặc định)**: trong lúc xác nhận mã TOTP, đánh dấu `Ghi nhớ trình duyệt tin cậy trong 30 ngày`. Chỉ nên sử dụng trên máy riêng có khóa màn hình. Server tạo token ngẫu nhiên 256-bit và chỉ lưu SHA-256 trong `admin_trusted_devices`; token gửi qua cookie HttpOnly/SameSite=Strict, `Secure` trong production. Đăng xuất bình thường vẫn giữ việc ghi nhớ browser; xóa cookie hoặc hết 30 ngày sẽ phải nhập lại Authenticator.
5. **Lần đăng nhập sau trên trình duyệt đã ghi nhớ**: backend xác minh user, phiên còn hạn, role, MFA đã kích hoạt, cookie và bản ghi thiết bị, rồi cho xem trang quản trị mà không cần TOTP. Nếu đăng nhập trình duyệt mới, TOTP vẫn bắt buộc. **Những lần sửa dữ liệu/quyền/tiền vẫn cần TOTP mới trong vòng 10 phút**; nút `Xác minh MFA` ở header Admin hoặc Hồ sơ quản trị kích hoạt bước này.
6. **Thu hồi tin cậy**: vào `/admin/profile` → `Bảo mật quản trị` → `Thu hồi thiết bị tin cậy` (cần mã TOTP mới) để xóa toàn bộ browser tin cậy của mình. `Đăng xuất khỏi tất cả thiết bị`, đổi/khôi phục mật khẩu, bị khóa hoặc bị đổi quyền cũng thu hồi mọi token tin cậy. Cookie riêng tại máy cũ sẽ không còn dùng được dù chưa hết 30 ngày.
7. **Migration**: A62 thêm `035_admin_trusted_devices.sql` (cột `admin_session_assurance.method` và bảng token tin cậy). Mọi migration 001–034 bất biến. Sao lưu trước khi nâng cấp; chạy `npm.cmd run db:migrate` lên cơ sở dữ liệu đúng sau khi dừng dịch vụ. Không mở API A62 trên database chưa chạy migration 035. Quay lại mã cũ sau khi đã áp dụng 035 cần đánh giá tương thích schema bằng DB snapshot riêng; tuyệt đối không xóa migration/volume.
8. **Giới hạn kiểm chứng**: mã nguồn A62 được kiểm tra tĩnh và hồi quy Node chọn lọc. Chưa thử đăng nhập Owner/thiết bị nhớ qua PostgreSQL native, Safari iPhone hoặc HTTPS production; chưa đủ điều kiện GO.

## A62 — Chat Luận Đàn, theme và hiệu ứng

Từ hồ sơ thành viên Luận Đàn, chọn `Trò chuyện riêng` để gọi API tạo/tìm cuộc hội thoại và chuyển tới `/messages?conversation=...`. Ở mobile, khi chọn một hội thoại, danh sách người sẽ thu gọn, khung tin nhắn mở rộng toàn khu vực; nút `← Danh sách hội thoại` đưa về danh sách mà không tải lại trang. Hiển thị tên/huy hiệu theo hàng mềm, không bao khung viên thuốc quanh huy hiệu. Chat không có push notifications nếu hệ thống còn polling.

Ba cảnh Chiêm tinh, Tarot, Thần số học được tăng thêm lớp phối cảnh/quỹ đạo/khối 3D CSS không làm thay đổi engine tính toán. Không tuyên bố đây là WebGL hoặc mô phỏng vũ trụ vật lý. Chuyển động sẽ dừng khi cảnh không hiện trong viewport và tuân theo chế độ giảm chuyển động.


## A63 — Huy hiệu chuyên môn và cảnh chuyển động

Bản A63 bổ sung `036_specialty_badges.sql`. **Sao lưu DB/PostgreSQL và kho tệp riêng trước khi chạy `npm.cmd run db:migrate`**; không xóa hoặc chỉnh sửa migrations 001–035. Nếu cập nhật từ A61 trở về trước, cần áp dụng cả 035 và 036 theo đúng thứ tự. Không chia sẻ `.env`, mật khẩu, OTP, key MFA hoặc cookie.

Trong trang `/admin/tinh-canh`, tài khoản Owner hoặc Admin có quyền `ranks.write` và **TOTP mới xác minh** mở phần **Danh hiệu chuyên môn đặc biệt**. Chọn đúng UUID thành viên, danh hiệu trong danh mục 8 loại, nhập lý do tối thiểu 12 ký tự rồi xác nhận. Không thể tự cấp cho mình, không thể cấp cùng danh hiệu hai lần đang hiệu lực. Thu hồi nhập lý do và giữ lịch sử. Người được cấp sẽ thấy huy hiệu ở hồ sơ Tinh Cảnh và cạnh tên trong Luận Đàn (khi hồ sơ cảnh giới công khai). Huy hiệu **không** nâng cảnh giới, không tăng Tinh Văn và không tự cấp quyền Admin/Chuyên gia/Pro.

Đăng nhập thành viên thông thường vẫn điều hướng về `/chart` (trang Lập lá số). Đăng nhập Owner/Admin dựa theo quyền phía API, đi đến `/admin` và qua cơ chế Authenticator/thiết bị tin cậy của A62. Không đổi vai trò thông qua F12 hoặc session phía trình duyệt.

Các cảnh CSS 3D ở 12 trang Đông phương, bên cạnh cảnh Tây phương A61/A62, chỉ là minh họa; không thay đổi kết quả tính toán. Chế độ `prefers-reduced-motion` và thiết lập giảm hiệu ứng sẽ tắt/tạm dừng chuyển động; khi ra khỏi vùng nhìn hiệu ứng cũng được tạm dừng. 10 hướng dẫn đọc sâu theo môn có phần kiểm đầu vào, kiểm phương pháp, ranh giới diễn giải; có thể mở/thu gọn. Nếu hiệu năng thấp trên thiết bị thật, hãy ghi lại thiết bị, trình duyệt, kích thước viewport và trace trước khi tinh chỉnh tiếp.

**Chưa đủ điều kiện public:** A64 đã chạy lại clean build/typecheck Linux và các kiểm tra được liệt kê trong báo cáo hiện hành. PostgreSQL native, Safari iPhone/Chrome Edge Windows, pháp lý và PayOS/Gemini staging vẫn cần nghiệm thu độc lập. `NO-GO` vẫn hiệu lực.


## A62: nội dung Văn Khố chưa lưu

Trong Quản lý Văn Khố, đổi tài liệu hoặc Tạo mới sẽ hỏi trước khi bỏ nội dung/ảnh chưa lưu. Hủy giữ biểu mẫu và ảnh. Xem nội dung lịch sử hỏi trước khi thay phần Markdown; tiêu đề, các trường khác và ảnh đã chọn vẫn được giữ. Tài khoản chỉ được đọc không bị cảnh báo bản nháp giả.

Lưu bản nháp trước khi gửi duyệt, duyệt hoặc xuất bản tài liệu đang sửa. Với ảnh đã chọn, tải ảnh rồi lưu bài để ghi mã Markdown; hoặc dùng **Bỏ ảnh chưa tải** để chỉ bỏ lựa chọn ảnh và chú thích/giấy phép đang nhập. Nếu máy chủ đã xác nhận lưu nhưng đọc danh sách/lịch sử lỗi, ID và revision đã lưu vẫn được giữ; thông báo lỗi đọc không có nghĩa thao tác lưu bị hoàn tác. Nếu khôi phục đã ghi server nhưng nạp lại lỗi, chọn lại tài liệu để nạp bản hiện hành trước khi sửa tiếp.

Cảnh báo rời toàn trang không phải tự động lưu hoặc bảo vệ mọi điều hướng SPA; đăng xuất bắt buộc vẫn dọn dữ liệu. Không coi bản nháp trong trình duyệt là bản sao lưu. Để kiểm nhóm này trên DB QA tổng hợp, đặt `THIENDO_DOCUMENT_DRAFT_PROBE=1` cùng biến SQL/Playwright và chạy `node tests/candidate.browser.cjs`; bỏ biến khi chạy suite mặc định.


## Hợp nhất A64 — bảo toàn dữ liệu khi chuyển bản

Nền A64 kết hợp nguồn A63 với bảo vệ bản nháp Văn Khố từ checkpoint A62 riêng. Không đồng nhất checkpoint A62 này với mọi thay đổi mang nhãn A62 trong lịch sử A63. Giữ **36 migration**, không chạy lại hoặc sửa checksum migration cũ.

Giải nén vào thư mục mới, sao lưu DB và tệp riêng trước nâng cấp, chuyển cấu hình an toàn và giữ nguyên khóa mã hóa MFA đang dùng. Không chép node_modules hoặc .next từ bản cũ. Chạy npm ci rồi quy trình build production ở trên. Không rebuild artifact đang dùng để phục vụ hoặc kiểm thử.

Văn Khố sẽ yêu cầu xác nhận khi đổi tài liệu hoặc tạo mới lúc còn bản nháp. Hủy xác nhận giữ nội dung và tệp chưa tải. Lưu thành công nhưng tải lại danh sách thất bại không có nghĩa là lưu thất bại; thử tải lại trước khi gửi lặp.

Danh hiệu chuyên môn là huy hiệu trang trí, không cấp quyền Admin/Expert/Pro hoặc Tinh Văn. Khi danh sách lỗi, dùng “Tải lại danh hiệu”. Thao tác đã xác nhận thành công vẫn được thông báo nếu bước đọc lại gặp lỗi.

Thu hồi thiết bị tin cậy cũng thu hồi ngay quyền đọc quản trị của các phiên phục hồi bằng thiết bị đó. Phiên đã xác minh bằng TOTP thực sự vẫn theo chính sách hiện hành; không tắt MFA để xử lý 403.


## A65 — font, nội dung và chuyển động

Font chính được phục vụ từ `apps/web/public/fonts/`, không gọi dịch vụ font bên ngoài. Lớp `apps/web/src/app/local-fonts.css` định nghĩa font local và các token `--font-ui`, `--font-display`, `--font-han`, `--font-body`, `--font-serif`. Giữ bản quyền/OFL và manifest trong `docs/licenses/`. Không sửa các stylesheet nền đã khóa checksum; thêm hoặc chỉnh lớp hiện hành rồi kiểm hồi quy.

70 tệp font subset có tổng 1.826.704 byte trong nguồn; trình duyệt tải theo ký tự, kiểu và độ đậm thực sự dùng. Số byte được truyền được đo riêng trong báo cáo, không suy ra từ dung lượng ZIP. Khi tải font lỗi, trình duyệt dùng font hệ thống; kiểm lại đường `/fonts/` và cấu hình static trước khi sửa quyền đăng nhập.

Các cảnh Tây/Đông là lớp minh họa CSS 3D/SVG, không thay số liệu hoặc xoay tọa độ lá số. Hiệu ứng tôn trọng reduced-motion, giảm hiệu ứng và ngoài viewport. Lá số Tử Vi vẫn có điều khiển bật/tắt chiều sâu; Natal giữ điều khiển pause riêng. Không xem một lần chạy Chromium giả lập là nghiệm thu độ mượt trên iPhone/Windows thật.

Màu khung chuyên sâu Mai Hoa, Lục Hào, Kỳ Môn, Đại Lục Nhâm và Thái Ất được chỉnh tại CSS module của từng môn. Trang Kỳ Môn chuyên sâu là `/ky-mon/depth`. Không thay phương pháp, nội dung luận hoặc engine khi chỉ chỉnh font/palette.

Font A65 ưu tiên subset tiếng Việt khi trùng phạm vi Latin mở rộng để tránh tải file thừa. Giữ cả bộ Latin-ext cho tên/nội dung khác; không xóa font hoặc giấy phép dựa riêng vào một lần đo cache. Hiệu năng vẫn phải xem báo cáo hiện hành, chưa được nghiệm thu chỉ vì font hiển thị đúng.


## A66 — chuột, cảm ứng lai và phục hồi theme

Ánh sáng trang trí Tử Vi đọc hình học tối đa một lần cho các pointermove trong cùng frame, lấy tọa độ cuối. Rời vùng, hủy pointer, thao tác touch, đổi sang con trỏ thô hoặc mất focus cửa sổ đều xóa ánh sáng tạm; không ảnh hưởng tọa độ/sao/xuất lá số.

Nếu trình duyệt tạm chặn đọc preference khi tab trở lại, hệ thống giữ theme đang dùng trong RAM. Khi storage hoạt động lại, sự kiện từ tab khác vẫn đồng bộ bình thường. Đây không phải lưu bền vững preference qua lần đóng trình duyệt khi storage đã bị chặn.


### Cập nhật quyền Pro vĩnh viễn

Chạy `npm run db:migrate` để thêm migration 037 trước khi khởi động mã mới. Không sửa 001–036. Migration 037 cho phép quyền hỗ trợ không hết hạn; gói mua vẫn có thời hạn.

Trong Bàn điều hành → Đơn & quyền, chọn tài khoản, thời hạn “Vĩnh viễn · đến khi thu hồi” và lý do ít nhất 8 ký tự. Admin cần quyền `finance.write`, quyền đọc thành viên để chọn tài khoản và MFA mới. Cũng có thể thao tác trong hồ sơ vận hành thành viên. Thu hồi giữ nguyên lịch sử và đóng quyền ở API. Owner vẫn giữ các quyền riêng như cấu hình giá, phân quyền đội ngũ và quy trình hoàn tiền.

Cơ bản giữ công cụ và kết quả chính; Chuyên sâu mở bảng phân tích và đối chiếu. Báo cáo nghiên cứu và Xưởng phương pháp có khóa Pro do API kiểm tra. Admin được miễn yêu cầu mua gói; các yêu cầu MFA quản trị vẫn áp dụng.
