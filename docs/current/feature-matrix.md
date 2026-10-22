# Ma trận A66 — V11.164.93 / NO-GO

Phạm vi mới A66 nằm ở bảng dưới; các mục A29–A65 phía sau là hồ sơ lịch sử và không tự trở thành kiểm chứng lại A66. Báo cáo hiện tại là nguồn kết luận nghiệm thu.

| UI / chức năng | API → service → DB | Quyền | Trạng thái / kiểm chứng |
|---|---|---|---|
| Ánh sáng Tử Vi khi rê/hủy/touch/blur | Lớp trang trí client; không thay engine hoặc dữ liệu | Không cấp quyền mới | FIXED; browser production 7 nhóm pointer PASS, đọc DOM20→1 trong burst20 sự kiện |
| Bật/tắt chiều sâu, chuyển route SPA | Listener/rAF thuộc vòng đời component | Không thay quyền | FIXED; 3 vòng toggle không tăng listener; SPA unmount còn0 subscriber |
| Theme và storage tạm lỗi | Preference client; không gửi dữ liệu private | Áp dụng cùng shell user/admin | FIXED; 2 viewport giữ theme trong RAM và đồng bộ lại sau phục hồi |
| Tài khoản/chat/quyền quản trị | Giữ nguyên API/service/schema A65 | Giữ participant-only/capability/MFA | Candidate A66 PASS trong scope suite; không thay nghiệm thu backend/native/provider đầy đủ |
| Hiệu năng đổi theme | Collector production riêng | Không áp dụng | OPEN; không suy giảm DOM read thành cải thiện INP/LCP |


| Phạm vi | Kết quả hiện hành |
|---|---|
| Font local và token dùng chung | 104 glyph/dấu tiếng Việt, 114 chữ Hán trong phạm vi literal: không thiếu glyph trong các font được chọn |
| Font/nội dung/palette/scene | 96 mẫu trang/theme/viewport đạt; kiểm browser riêng lỗi font request |
| Vòng trang trí Tây phương | Trục vòng trong độc lập; pause/reduced-motion/reduced-effects được kiểm |
| Ánh sáng Tử Vi | Hủy callback chờ khi pointerleave, ca cùng frame đạt |
| Khung chuyên sâu 5 môn | Palette sáng/tối và tương phản ô nhập đã kiểm |
| Hiệu năng | 11/18 mẫu >200ms; LCP max4852ms; giảm byte font không phải nghiệm thu tốc độ |
| Windows/iPhone/provider/PostgreSQL native | Chưa nghiệm thu; xem 11 gate OPEN trong báo cáo |

## Ma trận A64 kế thừa — kết quả lịch sử

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

# Ma trận hiện tại — V11.164.87 / A60

A60 sửa phản hồi upload HTTP403/413/502 dạng HTML và khôi phục editor sau GET danh sách thành công. A59 tiếp tục A58 đã xác minh SHA/CRC: thêm contract cho chat/receipt và Expert book, cập nhật metadata tên độc lập nội dung tin, bảo vệ draft/file chưa lưu ở tác giả/admin. Các engine/quyền nghiệp vụ hiện hành được giữ và hồi quy. Kết quả A58/A53 phía dưới là lịch sử; không dùng thay bằng chứng A60.

A58 tái triển khai từ A53 đã xác minh byte/CRC/SHA256. Chat/theme có thay đổi thật; các chức năng sản phẩm còn lại được kế thừa và hồi quy, không viết lại engine. Ma trận bên dưới là kiểm kê đường nối UI→API→service→DB→quyền/test, không phải xác nhận mọi nhánh đã được kiểm. Kết quả A58 nằm trong báo cáo hiện hành; mọi số A49–A53 bên dưới là lịch sử. Native PostgreSQL/provider/thiết bị/staging/pháp lý vẫn BLOCKED hoặc chờ duyệt.

**NO-GO production.** A52 bổ sung chat/showcase quản trị và tra cứu sao/góc hợp; migration034 là thay đổi cộng thêm, giữ nguyên001–033. Kết quả A49/A50/A51 phía dưới là lịch sử, không cộng vào lượt A52. A51 bổ sung trung tâm quyền/chức năng và hồ sơ vận hành thành viên theo scope. [Ma trận quản trị](admin-capability-matrix.md) ghi rõ Owner/Admin và bằng chứng. Các kết quả A49/A50 phía dưới là lịch sử, không cộng vào lượt A51. A50 chỉnh ô tên mới để trống và chuyển mặc định thành viên sang `/chart`; giữ điểm đến công cụ, phân quyền/MFA và dữ liệu đã lưu. Kết quả A49 bên dưới là bằng chứng lịch sử, không được cộng thành kiểm thử mới A50. Trạng thái theo phạm vi kiểm, không đồng nhất “có route” với “đã nghiệm thu”. Chi tiết endpoint nằm trong [CSV](endpoint-matrix.csv), 225 route / 17 tệp controller; đây là tham chiếu tĩnh, các bảng SQL và test là gợi ý ở mức module, không bảo đảm bao phủ từng nhánh.

## Phạm vi V12 cốt lõi

Một web/API instance sau reverse proxy cùng origin, PostgreSQL 16 theo Compose, tài khoản/MFA, lưu hồ sơ theo chủ sở hữu, nội dung/CMS/cộng đồng, thư viện có quyền, 18 cảnh giới, Pro/thanh toán, AI tùy cấu hình và các công cụ hiện có. Tính năng nghiên cứu giữ nhãn/giới hạn hiện hành. Không buộc toàn bộ ý tưởng dài hạn thành engine đầy đủ để đổi nhãn V12. Không đưa nhiều API replica vào phạm vi hỗ trợ hiện tại khi hạn mức chiêm tinh chưa đồng bộ.

## User → API → service → DB → quyền → bằng chứng

| Phân hệ | UI / API / service | DB và chính sách | Kết luận kiểm kê |
|---|---|---|---|
| Đăng ký/đăng nhập | `/login`, AuthProvider → `/api/auth/*` → auth | users/sessions; username/email, khóa, hết hạn/thu hồi | Có luồng thật; kiểm lại account + SQL + logout; email/OAuth thật cần cấu hình |
| Owner/Admin/MFA | `/admin` → auth/mfa, console/session → AdminMfaService | membership hợp lệ + credential + assurance + capability; write kiểm lại trong transaction | Có workspace riêng, không bỏ MFA; null/undefined chỉ kế thừa cho role hợp lệ |
| Hồ sơ/avatar | account-settings, crop → auth/profile/avatar → ProfileService | bytea và metadata user; MIME/kích thước/owner | Có cắt ảnh/lưu/đồng bộ; browser account kiểm trên Chromium |
| Lá số/hồ sơ sinh | `/chart`, `/study` → charts/study/birth-profiles | charts/study_entries/birth_profiles; snapshot canonical + owner | Có lưu/mở/xuất; kiểm hồi quy, không đổi phép tính |
| Đăng xuất | AuthProvider/session-exit → auth/logout/logout-all | thu hồi sessions + giao diện mới `/` + liên tab | Có chống phản hồi cũ; kiểm logout và delayed calculation |
| Diễn đàn | forum/new/detail/member → forum | threads/comments/media/reports/notifications; email verified, moderation | Có quyền thành viên, tên/avatar/huy hiệu; không phải chỉ Admin đăng |
| Chat | messages/member profile → community-hub | conversation/message/block/report; chỉ participants, chặn hai chiều | Có polling, phân trang/bản nháp; không quảng cáo push khi đóng app |
| Sách | books/contribute, admin/books → books | library_books + assets riêng, chuyên gia/admin duyệt + Free/Login/Pro | Có CRUD/duyệt/tệp riêng; quyền xuất bản phải được duyệt |
| Văn Khố | van-kho, admin/van-kho → VanKhoService | documents/revisions/media + permission | Có vòng đời nội dung; kiểm lỗi quyền/network/preview qua system |
| Tạp Chí | articles/admin/articles → billing/admin-console | content_posts/versions; content.read/write/publish/delete | Có nháp/xuất bản/khôi phục/xóa, revision và audit |
| 18 cảnh giới | tinh-canh/admin/tinh-canh → rank service | ledgers/manual grants; ranks.read/write, audit | Có hình/motion/điểm/cấp; giữ nguyên quy tắc |
| Chuyên gia/Pro | member detail/admin access → community-hub/finance | expert grants/pro_entitlements/section policy | Có cấp/thu hồi và kiểm API; không tự đồng nhất Pro với Expert |
| Quản lý thành viên/đội ngũ | admin/members/team → console | permissions/revision/session revoke/audit | Có phân quyền; Owner giữ quyền cao nhất, không hạ Owner qua UI |
| Dashboard/trợ lý | admin, admin/tro-ly → admin-insights | fixed SQL, timezone VN, từng domain | **Sửa lỗi P1**: chặn fact ngoài quyền trước truy vấn và sau chờ AI; không dùng 0 cho dữ liệu bị ẩn |
| AI người dùng | huyen-giai → HuyenGiaiService | chart owner + conversation + ai_usage/config | Có provider/quota/consent/history; kiểm local/controlled errors, Gemini thật BLOCKED |
| AI quản trị | FloatingAdminAssistant → insights/ask | dữ kiện allowlist + evidenceIds; không SQL/hành động tùy ý | Có kéo/thu gọn/đóng/keyboard; provider thật BLOCKED |
| Tài chính/tư vấn | membership/tu-van/admin/finance → billing/finance | signed webhook/orders/events/entitlements + audit | Có giá backend/idempotency/reconciliation; PayOS thật BLOCKED |
| Portal/audit | admin/huong-dan/audit → portal/console | document revisions, admin_audit; portal/audit scopes | Có quản lý, revision/preview; chính sách vẫn legal draft |
| Natal/quan hệ | western-astrology/relationship → secure-calculations | phiên thật; canonical input, no-store, budget per-process | Có server boundary và parity A43; giữ tọa độ/độ nhạy/định dạng |
| Tarot | tarot → client engine + study history | 78 ID, spread/directions/context | Có đầy đủ engine hiện hành, **đã bổ sung 156 ảnh gốc local và 156 thumb**; logic vẫn client |
| Tử Vi/Bát Tự/Mai Hoa/Lục Hào/Kỳ Môn | route tương ứng, packages/engine/knowledge | method/version/fixture/snapshot, giới hạn trường phái | Có engine theo phạm vi đã công bố; chạy lại hồi quy, không tự đổi phương pháp |
| 11 sao/4 dị danh | research/star-audit + scholarly fixtures | chưa đủ đối chứng/trường phái để an tự động | **NGHIÊN CỨU**, không gộp/an cho đủ số |
| Transit/Progression | phương hướng chuyên môn | chưa có engine đầy đủ được nghiệm thu | **CHƯA HOÀN THIỆN**, ngoài V12 cốt lõi ban đầu |
| Hà Lạc/Thiết Bản/lịch pháp cổ | các module/ledger tương ứng | có một phần quy tắc; source gap theo từng nhánh | **NGHIÊN CỨU/TỪNG PHẦN**, không gọi mọi nhánh là sản phẩm đầy đủ |
| Sáng/tối/5 theme/motion | shell, tokens, Western worlds, chart/cloth/badges | UI chung, reduced motion; A46 chuyển màu khung đọc; A48 thẻ home/dashboard có reveal nhẹ | Kiểm Chromium/viewport, chưa phải WCAG toàn site hay thiết bị thật |
| Mã nguồn/tri thức | build audit, Next proxy, nginx template | 6 private modules/JSON tách khỏi web; 445 reachable modules | Giữ A43; Tarot/Tử Vi/các môn khác còn trên client; muốn chuyển phải parity từng nhóm |
| Cài đặt/triển khai/backup | scripts Windows/Docker/production | env/private storage/secrets/checksum, restore drill | Có công cụ, chưa nghiệm thu Windows/native DB/image/TLS/restore thực |

## Phạm vi A48

A48 chỉ nâng cấp chuyển động trang mở đầu và dashboard dữ liệu thật. Không chuyển engine, sửa nội dung huyền học hoặc mở quyền mới. Bộ hiệu ứng mới bỏ qua khi thiếu IntersectionObserver/Web Animations, reduced motion/contrast, Save Data/bộ nhớ thấp; hủy khi focus/tab ẩn/unmount. Không nhúng video hoặc thêm dependency. API, gói engine/tri thức/xuất, tài nguyên ảnh, lockfile và 33 migration byte-identical A47.

Toàn app hiện vẫn cần JavaScript để hoàn tất màn hình loading/streaming Next.js. SSR chứa trang mở đầu nhưng không nghiệm thu hiển thị đầy đủ khi tắt toàn bộ JS. Đây là giới hạn khác với tắt riêng chuyển động.

## Lỗi, nâng cấp và blocker có bằng chứng

| ID / mức | Hiện trạng và bằng chứng | Tác động / sửa / tiêu chí |
|---|---|---|
| A48-MOTION-01 / nâng cấp | **ĐÃ KIỂM CỤC BỘ**: reveal thẻ home/dashboard dữ liệu thật; 280ms/10px, tối đa 3 thẻ. `lib/scroll-reveal.ts`, `components/scroll-reveal.tsx`, trang home/dashboard. | 7 unit mới; browser 320–1920px sáng/tối/focus/fallback/refresh; không tăng CLS, JS thêm 924/942 byte. Chưa chứng nhận thiết bị/GPU thật; gate hiệu năng vẫn mở. |
| A48-UI-02 / P2 | **CÓ SẴN, OPEN**: no-JS dừng ở Next loading/streaming dù SSR có home; tái hiện A47 và A48. | Toàn app vẫn cần JS; không nhầm với tắt riêng animation. Chưa sửa kiến trúc streaming. |
| A44-SEC-01 / P1 | **FIXED**. `/api/admin/insights/ask`/dashboard trước đây chỉ qua overview.read. SQL fixture tái hiện trên service A43; bản mới có scope checks và dashboard per-domain. | Admin giới hạn có thể thấy dữ kiện tài chính. Đạt khi overview-only nhận 403 trước business query/provider, dashboard không tải/không trả trường riêng; Owner vẫn đầy đủ. Kiểm 5 SQL + browser thật MFA. |
| A44-SEC-02 / P2 | **HARDENED**, không kết luận exploit. effectiveCapabilities trước đây xử lý null trước khi kiểm role; DB CHECK và MFA đã chặn role ngoài admin/owner. | Nay invalid role luôn bị từ chối, vẫn giữ Admin legacy null/undefined. Hai hồi quy unit có nhánh giả mạo role. |
| A44-ASSET-01 / P1 phát hành | **IMPLEMENTED**. Hai cờ false, không có ảnh offline trong A43. A44 có đủ originals, thumb, hash/ID và guard build. | Không tải được ảnh khi mất mạng. Đạt kỹ thuật khi 312 ảnh gốc/thumb decode trên production và bộ bài không đổi ID, có fallback. Phê duyệt quyền xuất bản vẫn OPEN. |
| A44-PERF-01 / P2 | **OPTIMIZED**, danh mục từng dùng full originals; 82.465.781 byte / 156 ảnh so với 5.970.932 byte thumbnails. | Giảm 92,76% tổng payload ảnh danh mục nếu đọc cả hai bộ; không phải số LCP đo trước/sau. Ảnh lá rút vẫn gốc. Kiểm byte/dimensions/offline/fallback. |
| A44-PERF-02 / P1 nghiệm thu | **OPEN**. 18 quan sát lab, cold/warm dùng chung cache; LCP chiêm tinh desktop cao nhất 3.468ms và EventTiming theme tới 1.048ms trên Chromium tắt GPU. | Cần profile/cold load/INP và GPU trên host/thiết bị thật; median không thay bằng chứng mọi mẫu đạt, EventTiming không phải field INP. |
| A44-DB-01 / P0 nghiệm thu | **BLOCKED**. initdb native từ chối root; namespace UID/GID chỉ 0, setpriv không chuyển được; không Docker. | Cần runner Docker/PostgreSQL 16 riêng, không dữ liệu thật; chạy DB trống/nâng cấp/concurrency/restore. Không dùng PGlite để đóng gate native. |
| A44-EXT-01 / P0 nghiệm thu | **BLOCKED**. Không có key/cấu hình Google, email, Gemini, PayOS thử thật. | Cần account test, domain/webhook/quota hợp lệ. Không ghi key vào báo cáo. Mock/controlled responses chỉ kiểm nhánh lỗi, không đóng provider gate. |
| A44-OPS-01 / P0 nghiệm thu | **BLOCKED**. Không Docker daemon, staging host/domain/TLS/kho backup đã cấu hình. | Cần môi trường cách ly kiểm compose/nginx trong image, HTTPS, cookie, alert, backup assets+DB và rollback. |
| A44-DEVICE-01 / P1 nghiệm thu | **BLOCKED**. Chỉ Chromium Linux; chưa Windows/Chrome/Edge và Safari iPhone thật. | Cần thiết bị/runner tương ứng. Viewport 320–1920 không thay nghiệm thu thiết bị. |
| A44-LEGAL-01 / P0 nghiệm thu | **AWAITING OPERATOR**. 8 legal drafts, attribution hiện có; CC metadata không tự là phê duyệt phát hành. | Chủ thể phụ trách duyệt pháp lý/quyền xuất bản; AI không ký thay. |
| A44-SCALE-01 / P2 ngoài core 1 instance | **NOT IMPLEMENTED**. Hạn mức Natal/quan hệ theo tài khoản/tiến trình. | Trước khi nhiều replica cần shared atomic budget/TTL và kiểm đồng thời native; không scale ngang theo chỉ một biến replicas. |

## Checklist nghiệm thu

- [ ] Windows/Linux cài sạch, đúng lockfile; lưu Node/npm/OS/exit code.
- [ ] Build/typecheck/Node/browser hiện hành của đúng source được bên phát hành chấp nhận; bằng chứng cục bộ tham chiếu báo cáo.
- [ ] PostgreSQL 16 native mới/nâng cấp, ownership/MFA/CRUD/upload, dữ liệu tài chính và hồi phục đã kiểm.
- [ ] Provider thật, OAuth/email, Gemini budgets, signed PayOS sandbox và đối soát.
- [ ] Staging image/HTTPS/cookie/proxy/storage/health/monitoring; backup/restore/rollback.
- [ ] Windows browsers + iPhone Safari thật; focus/keyboard/contrast/zoom/touch theo phạm vi.
- [ ] Performance field/lab có ngân sách và môi trường rõ; không suy GPU hay INP từ một số liệu khác.
- [ ] Tarot assets/bản quyền được người có thẩm quyền nghiệm thu; kiểm offline không chỉ cờ ready.
- [ ] Không P0/P1 chặn vận hành và mọi gate bắt buộc có bằng chứng hợp lệ trước GO.

Các ô chưa đánh không có nghĩa code tương ứng chưa tồn tại; chúng là điều kiện nghiệm thu chưa đủ bằng chứng/duyệt.

## Kế thừa và lượt A49

A45 tối ưu lossless ảnh RWS; A46 có start:local và đổi màu khung đọc đồng bộ; A47 sửa origin có slash; A48 có motion home/dashboard giới hạn. Đây là lịch sử, không cộng PASS cũ vào lượt A49. Hướng dẫn chạy chỉ còn HUONG_DAN.md.

A49 sửa bốn lỗi đã tái hiện: phản hồi hồ sơ A patch UI B (P1, DB B không đổi); mất nháp/receipt theo hội thoại (P2); gửi tin làm co lịch sử (P2); API ORDER BY alias text làm sai thứ tự/cursor qua 9/10, 99/100 (P1). Đường dẫn, tái hiện và proof trước/sau ở báo cáo hiện tại và issues.csv. Lọc 12 binding/storage không đọc, giữ hợp đồng DI và toàn bộ thuật toán/tri thức/ảnh/migration/lockfile.

Lượt cuối: 3.029 Node/343 tệp, 82 SQL/HTTP/service PGlite, 334 ca/nhóm nghiệp vụ trong bảy suite browser; sweep thêm 72 route tĩnh. Chín route động kê riêng; một phần kiểm bằng nghiệp vụ, không chứng nhận mọi slug/record. Build/typecheck/noUnusedLocals PASS. Không có nghiệm thu thiết bị thật, native PostgreSQL, provider hoặc production mới; 11 gate vẫn OPEN.


## Lượt bổ sung A50

Ô tên mới trống/placeholder; thành viên mặc định vào `/chart`, giữ điểm đến công cụ và quyền/MFA admin. Build/typecheck và 3030 Node PASS; 134 nhóm browser trên Linux/Chromium/PGlite PASS, 0 uncaught page error. Chi tiết phạm vi và chẩn đoán trong báo cáo hiện tại. Các số kiểm thử A49 phía trên là lịch sử.


## Lượt A51 — Quản trị

Build/typecheck PASS; 3033 Node/344 tệp, 88 SQL và 296 nhóm browser (candidate24/system183/account89) PASS trên Linux/Chromium/PGlite, 0 uncaught page error. 8 nhóm browser, 6 SQL và 3 unit mới. Ma trận quản trị ghi rõ Owner/Admin, endpoint mới, từng scope và giới hạn. Không cộng lại các lượt A49/A50.


## Lượt A52

Chat/showcase tự chọn18 mẫu/Tử Vi tìm sao/Natal đối chiếu góc hợp đã nối UI–API–DB theo phạm vi. Migration034 cộng thêm,001–033 giữ nguyên. Build/typecheck,3036 Node/345 tệp,103 SQL và348 nhóm browser/7 suite PASS trên Linux/Chromium/PGlite,0 uncaught page error. Artifact lifetime còn probe chưa đủ chứng nhận; xem báo cáo hiện tại. Các kết quả A49–A51 phía trên là lịch sử.


## A53 — kết quả lịch sử

Tranh chat/Natal, ma trận/tọa độ và hồ sơ Tử Vi đã nối dữ liệu thật. Không đổi schema/engine/API. Đang kiểm lại sau khi khôi phục nguồn; không cộng kết quả A52 làm A53. Trạng thái mới nhất trong báo cáo hiện hành.


Kết quả A53 mới: npm ci/build/typecheck;3036 Node/345 tệp;103 SQL;356 nhóm browser/8 suite PASS trên Linux/Chromium/PGlite,0 page error.18 quan sát trang đầu và8 khi đã tính không thay thiết bị thật.648 tệp lõi giữ nguyên byte. NO-GO,11 gate vẫn OPEN; xem báo cáo hiện hành.
