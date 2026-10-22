# Các vấn đề còn mở — A83 / vòng 2

| ID | Trạng thái | Việc còn thiếu |
|---|---|---|
| DB-NATIVE | BLOCKED | 60 test SQL PGlite đã có bằng chứng; PostgreSQL native, nâng cấp môi trường thật, concurrency/locking đa kết nối và backup/restore chưa chứng minh |
| BROWSER-COMPAT | PARTIAL | Chromium Linux đã chạy có chọn lọc. Safari/iPhone, Firefox, Edge, Android và thiết bị yếu chưa thử; viewport Chromium không thay Safari thật |
| UX-COVERAGE | NOT TESTED toàn bộ | Chưa nghiệm thu đủ 20 tiêu chí cho 2.006 vị trí tương tác/82 route. Các nhóm có test xem TEST_MATRIX; không coi geometry PASS là thao tác toàn trang PASS |
| PROVIDER | BLOCKED | Gemini/email trong test là transport kiểm soát/capture; chưa provider thật, Google OAuth, PayOS sandbox và đối soát thực |
| DOMAIN | NOT TESTED vòng này | Chưa đối chứng mới mọi thuật toán; 11 tên sao và 4 dị danh vẫn ở hồ sơ nghiên cứu; không tự an sao theo suy đoán |
| LEGAL | BLOCKED | Chưa duyệt chính sách và quyền xuất bản tài nguyên; hash/ảnh giải mã được không phải giấy phép |
| PRODUCTION | BLOCKED | Chưa staging/TLS/monitoring, diễn tập backup/restore/rollback và vận hành Windows |
| PERFORMANCE | NOT TESTED | Chưa LCP/INP/CLS và tải CPU/GPU/RAM trên bản này bằng thiết bị thật; SwiftShader không đo được GPU di động |
| LINT | NOT TESTED | Chưa có lint script/rule set độc lập; parser/typecheck không thay thế lint |

AI-SESSION, AI-CONTEXT, AUTH-DISPLAY và AI-HISTORY đã được sửa trong vòng 2, có test hồi quy; xem PROJECT_AUDIT.md. Các khóa đọc transaction mới cần đối chứng concurrency PostgreSQL native trước khi chấp nhận production.

Lịch sử phân trang dùng cursor message ID: cursor đã bị xóa trả 404 và yêu cầu mở lại cuộc trò chuyện; không cố suy đoán mốc thời gian. Chi phí provider đã gọi nhưng bị từ chối hoàn tất vẫn giữ chi phí dự phòng theo chính sách sẵn có, không tự coi là miễn phí.

Cấu hình QA --single-process/--disable-web-security không được dùng để chứng nhận nhiều tài khoản: đã tái hiện cookie fetch sai ngoài ứng dụng và chặn bằng helper. Những lượt chạy ban đầu với cấu hình đó không phải kết quả nghiệm thu sản phẩm.
