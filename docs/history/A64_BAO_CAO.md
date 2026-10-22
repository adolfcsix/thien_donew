# THIÊN ĐỒ — V11.164.91 / A64

**NO-GO.** Bản hợp nhất có thay đổi code thật; giữ 11 gate bắt buộc OPEN. Không chứng nhận vận hành production hoặc không còn lỗi.

## Nguồn và cách hợp nhất

- Nền: THIEN_DO_V11_164_90_A63_SOURCE_NO_GO(1).zip, 96.276.664 byte, SHA256 `43d11856121752662c46f5779393c0b1d70dd4050f80926d039d53ebfa104a1c`.
- Nhánh bổ sung: THIEN_DO_A62_RECOVERED_CHECKPOINT_NO_GO.zip, 96.270.507 byte, SHA256 `81d402eb224a8345428a5327fa3b97dfaa4137285ac0d4af2b6f4ea432bde38c`.
- Hai ZIP được so sánh trong lượt trước khi thư mục làm việc mất: 2.124 file giống nhau; A62 có bảo vệ bản nháp Văn Khố riêng, A63 có các tính năng và migration mới hơn. Những số so sánh này là thông tin chuyển tiếp, không phải phép so sánh mới ở lượt khôi phục.
- Checkpoint hợp nhất đã lưu được tải lại trong lượt hiện hành, 96.298.982 byte, SHA256 `22262cb85eac7bde05c029780e404d42928a4ee2839173b12f53f6cbe1d89859`; SHA256 và toàn bộ CRC ZIP PASS. Không dùng A43/A60 làm nền thay thế.

A63 được giữ làm nền, bổ sung editor-state, hook editor, trang admin Văn Khố và test bảo vệ draft từ checkpoint A62. Giữ tính năng danh hiệu chuyên môn, thiết bị tin cậy, cảnh trang trí Đông/Tây, mobile chat, artwork và engine của A63. Nhãn A62 trong hai nhánh không được coi là cùng một trạng thái nguồn.

## Sửa đổi trọng tâm

1. Văn Khố: xác nhận khi rời draft, hủy vẫn giữ nội dung/tệp, chặn workflow khi còn thay đổi chưa lưu, giữ acknowledgement lưu trước GET phụ, bảo vệ khôi phục revision.
2. MFA: thu hồi thiết bị tin cậy trước đây chỉ xóa token, còn assurance đọc quản trị của phiên đã phục hồi. Nay xóa cả assurance `trusted_device` trong transaction có kiểm quyền/audit; giữ assurance TOTP thật.
3. Danh hiệu: GET có abort/latest-request, tải lại khi lỗi; không hiện trạng thái rỗng giả, khóa ghi khi chưa tải được; POST thành công không bị đánh đồng với GET đọc lại thất bại.
4. Chuyển động huy hiệu: dùng observer hiện có để pause khi ngoài viewport/tab ẩn và giữ reduced-motion.
5. Fixture: đồng bộ mô hình trusted devices và danh mục huy hiệu với runtime, không bỏ assertion nghiệp vụ. Bộ chọn browser được giới hạn đúng vùng quản trị, dùng đúng nhãn nút hiện hành.

Chi tiết đường dẫn và tiêu chí nằm trong `docs/current/issues.csv`. Bảng endpoint là tham chiếu tĩnh UI/API/service/DB/quyền/test, không chứng minh từng nhánh đã được kiểm.

## Kiểm chứng hiện hành

Linux, Node 24.19.0, npm 11.9.0; npm ci từ lockfile giữ nguyên: 375 package. Build production trong thư mục cách ly, cài dependency riêng, không dùng symlink. Chromium headless/GPU disabled, PGlite WASM; không có provider thật.

- Cài sạch, typecheck FE/BE, production build: PASS.
- Node: 3.110/3.110 trong 353 tệp, exit 0.
- SQL/service/HTTP/upgrade: 118/118, exit 0, bao gồm 4 ca A64.
- 36 migration liên tục và checksum đóng băng: PASS, không sửa 001–036.
- Architecture: 566 file, 2.188 import, 0 vi phạm. Distribution audit PASS.
- Browser và hiệu năng: kết quả trong bảng hiện hành dưới đây.

Các kết quả A53–A63 và lượt A64 trước khi mất workspace không được cộng vào số kiểm thử mới. Lần thất bại đầu của browser danh hiệu sau khôi phục do test đọc danh sách trước khi GET xong; bổ sung chờ bản ghi rồi giữ nguyên assertion. Lưu log lần thất bại và kết quả chạy lại riêng.

## Phạm vi chưa nghiệm thu

PostgreSQL native clean/upgrade/concurrency/backup/restore; Windows Chrome/Edge và Safari iPhone thật; bàn phím mobile thật; email/OAuth/Gemini/PayOS thật; staging domain/TLS/cookie/CORS/proxy/readiness/load/alert; topology nhiều replica; quyền xuất bản và pháp lý vẫn cần đầu vào hoặc duyệt độc lập. Không tắt MFA để vượt 403.

HTTP 403 khi lưu tệp ở môi trường làm việc và HTTP 403 phân quyền trong ứng dụng là hai phạm vi khác nhau. Checkpoint A64 đã lưu và tải lại thành công ở lượt này; điều đó không chứng minh mọi nguyên nhân 403 đã hết. Không thay guard backend bằng cho phép truy cập để né lỗi.

Giữ ranh giới server hiện có cho Natal/luận Natal/Synastry/Composite. Tử Vi/Tarot và môn khác vẫn có logic/tri thức client; không hứa chống sao chép tuyệt đối. Không mở rộng engine nghiên cứu hoặc gộp dị danh chưa có căn cứ.

## Dùng bản bàn giao

Giải nén vào thư mục mới và đọc `HUONG_DAN.md`. Sao lưu DB/tệp riêng, giữ khóa MFA hiện hành, dùng env an toàn, cài bằng npm ci, chạy migration theo hướng dẫn và build production. Không chép cache/build/dependency từ bản cũ. Source ZIP không có node_modules/.next/dist/QA DB/secret. Evidence chỉ gồm log và số liệu kiểm thử tổng hợp; không đính kèm ảnh riêng tư.

## Kết quả browser hiện hành

| Suite | Nhóm ghi nhận | Exit code |
|---|---:|---:|
| documents | 14 | 0 |
| specialty-final | 4 | 0 |
| chat | 22 | 0 |
| inbox | 8 | 0 |
| theme | 2 | 0 |
| system-final | 183 | 0 |
| candidate | 28 | 0 |
| visual | 23 | 0 |
| account | 89 | 0 |
| performance | 2 | 0 |

Các nhóm là số lần thực thi ghi nhận, không phải tổng ca độc lập: suite chat cũng chứa kịch bản inbox, và inbox chạy riêng để kiểm lại. Các suite system/specialty lần đầu thất bại do bộ chọn/điểm chờ nằm riêng trong evidence; không tính chúng là PASS. Không sửa ngưỡng hoặc bỏ assertion nghiệp vụ.

## Hiệu năng lab

18 quan sát theo protocol 3 lượt × 2 viewport × 3 route, mỗi quan sát đổi theme 3 lần cách nhau 1 giây; chạy sau các tác vụ nặng. LCP 80.0–580.0ms; CLS tối đa 0.00787; 6/18 quan sát có EventTiming >200ms. Event lớn nhất và phân pha: `{"duration": 296, "interactionId": 6211, "inputDelayMs": 0.5, "processingMs": 1.1999999999534339, "presentationMs": 294.30000000004657}`. Có 8 quan sát 60-frame trên Tử Vi/Natal đã tính, normal/reduced motion, 2 viewport.

Collector hoàn tất không đồng nghĩa mọi ngân sách đạt. Không dùng số này làm field INP, percentile production, chứng nhận GPU/thiết bị hoặc kết luận không rò bộ nhớ. Không có baseline A63 cùng môi trường trong lượt khôi phục, nên không tuyên bố mức tăng tốc trước/sau. Không ship override tắt artwork/hiệu ứng chỉ để làm đẹp số.

## Toàn vẹn bàn giao

Kiểm tra lại 655 tệp package/artwork/migration/lockfile so với checkpoint A64: không lệch byte. Runtime apps/packages/config/lock của nguồn bàn giao đối chiếu với artifact build đã test; thay đổi sau build là tài liệu, metadata và helper/bộ chọn kiểm thử. `verification/browser/source-integrity/build-parity.json` liệt kê cụ thể. Source và evidence có manifest SHA256 từng file; ZIP kiểm CRC toàn bộ. Log không chứa credential/DB QA hoặc screenshot riêng tư.
