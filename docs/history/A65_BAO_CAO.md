# THIÊN ĐỒ — V11.164.92 / A65

**NO-GO.** Lượt này ổn định font, nội dung hiển thị, palette đọc chuyên sâu và vòng đời chuyển động; chưa thể gọi toàn bộ 3D “hoàn hảo” trên mọi thiết bị. Giữ 36 migration bất biến và 11 gate OPEN.

## Nguồn và sự cố môi trường

Nền là A64 đã lưu: `THIEN_DO_V11_164_91_A64_MERGED_SOURCE_NO_GO.zip`, 96.482.191 byte, SHA256 `b1ee6b2f9c295fc0ba8b62656024fea5c665fff2e571b5b82678535a99a60866`. Sau khi workspace mất, đã tải lại và xác minh SHA256, CRC cùng toàn bộ manifest trước tái áp dụng sửa đổi. Không chuyển xuống A43/A60. Các log/quan sát A65 trước lần mất workspace không được dùng làm PASS hiện hành. Báo cáo A64 được giữ riêng trong `docs/history/A64_BAO_CAO.md`, là lịch sử.

Checkpoint A65 đã lưu thành công trước các bài kiểm tra dài và cập nhật phiên bản lưu 1; gói cuối có kết quả mới trong phần dưới. Các lần kiểm sai đường route/bộ chọn, lần hủy phép đo và snapshot trước sửa cuối không được cộng thành PASS của bản cuối.

## Sửa đổi đã thực hiện

- Định nghĩa `--font-serif` và `--font-body`, dùng font local Be Vietnam Pro/Noto Serif và subset Noto Sans SC có giấy phép OFL gốc. Font có fallback hệ thống; không gọi dịch vụ font ngoài. Giữ nguyên stylesheet nền đã khóa và thêm lớp `local-fonts.css` sau chúng. Không sửa hash/expected để bỏ qua hồi quy.
- Kiểm dữ liệu font: 104 ký tự/dấu tiếng Việt trong mỗi họ Latin và 114 chữ Hán literal hiện hành không thiếu glyph trong font được chọn. Có 70 file subset, tổng 1.826.704 byte nguồn; trình duyệt tải theo chữ/weight thực sự dùng. Ký hiệu Dịch U+4DC0 thuộc khối biểu tượng, có fallback DejaVu Sans trên Linux kiểm thử; đây không phải chứng nhận mọi chữ người dùng có thể nhập trên mọi máy. Giữ giấy phép và SHA256 tại `docs/licenses/`.
- Khung chuyên sâu Mai Hoa, Lục Hào, Kỳ Môn, Đại Lục Nhâm, Thái Ất theo palette sáng khi đổi theme. Chữ/ô nhập không còn giữ cặp màu tối cố định. Giữ dấu chọn sau khi lập khóa; kiểm ca cổ điển Đại Lục Nhâm để xác nhận Cửu Tông Môn đang chọn vẫn khác ô thường.
- Tối ưu tải font: ưu tiên subset tiếng Việt khi range trùng Latin-ext, sau khi đối chiếu metric các glyph giao nhau ở 10 cặp weight/style. Không đổi binary/glyph, không bỏ font fallback. So sánh byte ResourceTiming trong evidence trước/sau; không coi việc giảm byte là cam kết giảm mọi độ trễ.
- Hai liên kết quay lại của Thái Ất/Đại Lục Nhâm dùng token accent chung để đọc được trên nền sáng.
- Vòng trong Tây phương có keyframe Y-axis riêng, thay vì mất trục do dùng chung animation vòng ngoài.
- Tử Vi hủy rAF chờ khi pointerleave; thao tác pointermove→pointerleave trong cùng frame không phục hồi vệt sáng cũ. Chữ Hán/caption trang trí dùng font thích hợp.

Chi tiết ID/P1/P2 và đường dẫn nằm trong `docs/current/issues.csv`. Thay đổi palette được rà cả trạng thái active để tránh làm mất ý nghĩa hiển thị.

## Font, nội dung và hình ảnh

Quét 430 tệp web TS/TSX/CSS/JSON theo các mẫu ký tự replacement/mojibake: không phát hiện chuỗi nghi vấn trong phạm vi kiểm. Browser kiểm chữ hiển thị, font local khi chặn origin ngoài và tình huống font request bị chặn để kiểm fallback. Đã xem ảnh mobile sáng/tối của các trang đại diện; không đưa screenshot QA riêng tư vào gói bàn giao.

Đây là kiểm nội dung UI/encoding và bảo toàn dữ liệu. Không tuyên bố đã thẩm định học thuật toàn bộ lời luận trong kho kiến thức. Không thêm/gộp sao hay thuật toán chưa có nguồn. 750 file API/engine/package/migration/asset cũ/lockfile khớp byte A64. Nội dung và tọa độ tính toán được giữ nguyên; các cảnh CSS 3D/SVG chỉ là minh họa.

## Kiểm chứng hiện hành

Linux, Node 24.19.0, npm 11.9.0; Chromium153 headless/GPU disabled, Playwright1.58.2, PGlite0.5.10, dữ liệu QA tổng hợp. Không provider thật.

- npm ci: 375 package từ lockfile giữ nguyên, PASS.
- Typecheck FE/BE của nguồn cuối và production build sạch cách ly: PASS. Build có npm ci riêng, không symlink dependency.
- Node: 3.110/3.110 trong 353 file, PASS. Suite đầy đủ chạy trên lõi A65 trước các chỉnh sửa hiển thị cuối (hai màu link, active gate và ưu tiên subset font); build cuối, kiểm CSS/font và browser mục tiêu kiểm các chỉnh sửa này. Không coi kết quả SQL118 của A64 là phép thử DB mới A65.
- CSS/font source tests trên nguồn cuối: PASS; 36 migration giữ checksum đóng băng.

| Suite | Nhóm thực thi | Exit code |
|---|---:|---:|
| audit | 3 | 0 |
| account | 89 | 0 |
| candidate | 28 | 0 |
| final-targeted | 3 | 0 |
| final-visual | 23 | 0 |
| final-performance | 2 | 0 |

Audit rộng có 96 tổ hợp (24 route × 2 theme × 2 viewport 390/1440). Audit mục tiêu cuối có 20 tổ hợp, kiểm lại font ưu tiên tiếng Việt, trục vòng trong, phục hồi motion, hai link và highlight sau tính. Số nhóm không phải số ca độc lập duy nhất. Visual có đối chiếu tọa độ Natal/aspect với output thực và kiểm pause; account có bố cục 320–1920, 18 huy hiệu và chữ ký chuyển động cấp cao theo scope test.

Các suite rộng chạy trên artifact lõi A65 trước các chỉnh sửa hiển thị cuối. So sánh nguồn và build ghi cụ thể trong evidence; các module khác giữ byte. Artifact cuối được build sạch riêng, chạy lại mục tiêu chịu tác động và đo hiệu năng riêng. Không rebuild đè artifact đang được suite sử dụng.

## Chuyển động 3D đã đạt đến đâu

Đã kiểm cảnh Đông/Tây chạy, pause ngoài viewport, reduced-motion/reduced-effects và chạy lại sau khôi phục; Tử Vi không kẹt ánh sáng sau rời con trỏ; Natal giữ pause thủ công và tọa độ thật; huy hiệu giữ các hình/chữ ký chuyển động hiện hành. Không thêm thư viện 3D nặng hoặc tắt artwork để làm đẹp số.

Chưa có bằng chứng trên Windows Chrome/Edge, Safari iPhone, GPU thật, bàn phím cảm ứng thật, pin/nhiệt hoặc nhiều thiết bị yếu. Một đoạn 60-frame không chứng minh không rò bộ nhớ. “Hoàn hảo/đẹp nhất” không phải kết luận có thể rút ra từ các bài kiểm này.

## Hiệu năng bản cuối

18 quan sát production theo protocol 3 lượt × 2 viewport × 3 route; mỗi quan sát đổi theme 3 lần cách nhau 1 giây. LCP 112.0–4852.0ms; CLS tối đa 0.00796; 11/18 quan sát có EventTiming >200ms. Event lớn nhất: `{"duration": 1400, "interactionId": 6169, "inputDelayMs": 31.899999999906868, "processingMs": 0.20000000018626451, "presentationMs": 1367.8999999999069}`. Có 8 quan sát 60-frame trên Tử Vi/Natal đã tính, normal/reduced motion. Byte font truyền đo được mỗi quan sát: 0–280228 byte; mẫu sau có cache, xem từng resource trong raw JSON. Không đồng nhất 1,83MB font nguồn với initial download.

Collector hoàn tất không có nghĩa toàn bộ ngân sách đạt. Không suy thành field INP, production percentile hoặc cam kết nhanh hơn A64: không có baseline A64 cùng lượt/môi trường sau phục hồi. Giữ nguyên mục tiêu LCP2500ms/CLS0.1/tương tác200ms và ghi số vượt ngưỡng.

## Phần còn mở và bàn giao

Giữ 11 gate OPEN. PostgreSQL native, backup/restore/staging/load, provider email/OAuth/Gemini/PayOS, thiết bị thật và duyệt pháp lý cần môi trường/đầu vào độc lập. Chưa duyệt V12/GO. Ranh giới server Natal/luận Natal/Synastry/Composite giữ nguyên; Tử Vi/Tarot còn logic client.

Đọc `HUONG_DAN.md` để cài mới/nâng cấp và tìm vị trí font/theme. ZIP đầy đủ chứa source và evidence JSON/log, không chứa node_modules/.next/dist/cache/QA DB/secret hay screenshot riêng tư. Manifest từng file và CRC được kiểm khi đóng gói; SHA256 ZIP nằm trong kết quả bàn giao.

## Đối chiếu tối ưu tải font và giới hạn hiệu năng

Lượt cold đầu theo cùng collector: font giảm từ 515.216 xuống 280.228 byte (khoảng 45,6%), từ 22 xuống 16 request; không còn 6 request Latin-ext trùng với phạm vi tiếng Việt ở ca này. Binary font và metric advance của các glyph giao nhau giữ nguyên. Xem `verification/font-payload-comparison.json` và `font-overlap-metrics.json`.

Độ trễ không cải thiện ổn định: trước thay thứ tự subset ghi LCP tối đa 3.104ms/EventTiming616ms; lượt cuối ghi 4.852ms/1.400ms, cả hai còn 11/18 quan sát >200ms. Không diễn giải việc giảm byte là tăng tốc toàn website hoặc che kết quả xấu hơn. Trace riêng vẫn có chi phí style/raster lớn; duration worker có thể chồng lấp và không được cộng thành thời gian tường. Cần đối chứng tiếp trong môi trường đồ họa/thiết bị thực phù hợp; gate hiệu năng vẫn OPEN.
