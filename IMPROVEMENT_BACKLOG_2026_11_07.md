# Bổ sung sau lượt kiểm toán — 07/11/2026

## Đã triển khai: hỗ trợ quản trị trong hộp thư

Người dùng mới và hiện có thấy kênh hỗ trợ ghim sẵn khi mở /messages. POST /api/community/support-conversation đảm bảo hội thoại được tạo idempotent, không buộc khâu đăng ký phụ thuộc vào tạo chat. Mặc định chọn Owner hoạt động trước rồi Admin, sắp xếp ổn định; có thể cấu hình SUPPORT_ADMIN_USER_ID để chỉ định người nhận (UUID thuộc tài khoản quản trị thật). Không giả lập admin hoặc tự tạo quyền. Nếu người nhận bị khóa, không tồn tại hoặc đôi bên chặn nhau thì báo không khả dụng; không tự bỏ chặn. Gửi tin tiếp tục dùng quyền tham gia, xác minh email và giới hạn hiện có. Chưa có nhân sự hỗ trợ thì không thể cung cấp một người nhận thật.

Hội thoại là chat hai người theo mô hình hiện có, không phải hộp thư tập thể để mọi admin cùng đọc. Không chèn tin chào giả làm lời admin. Giao diện ghi rõ trả lời không tức thì và không gửi mật khẩu/OTP. Trang /ho-tro có đường dẫn tới kênh chat. Không thay đổi schema hay migration.

Kiểm thử SQL với PGlite và service thật: không có admin, ưu tiên Owner, chỉ định Admin, không tạo trùng, chặn/khóa và phiên bị thu hồi. DOM: tài khoản chưa xác minh email, hộp thư chưa có hội thoại, kênh hỗ trợ vẫn xuất hiện. Đây không phải nghiệm thu PostgreSQL đồng thời hoặc Safari thật.

## Các bước cải tiến tiếp theo

| Ưu tiên | Trang/luồng | Việc cần làm và tiêu chí nghiệm thu |
|---|---|---|
| P1 | Hỗ trợ / admin messages | Thiết kế hộp thư hỗ trợ chung có người phụ trách, trạng thái mới/đang xử lý/đã xong, số chưa trả lời, chuyển giao khi admin nghỉ; kiểm soát quyền và audit. Hiện tại chỉ người nhận tham gia chat được đọc. |
| P1 | Đăng nhập/đăng ký | Kiểm thử nhiều tài khoản chung IP; điều chỉnh hạn mức Nginx theo tải đo được; không bỏ lớp chống thử mật khẩu. |
| P1 | Toàn hệ thống | PostgreSQL thật, tải tăng dần, độ trễ p95/p99 và phục hồi sau quá tải; không lấy test 1.000 thao tác giả lập làm số người dùng chịu được. |
| P1 | Tin nhắn | Giảm tải danh sách lặp, chỉ ghi đã đọc khi mốc thay đổi, backoff/jitter khi lỗi; thử mất mạng, gửi lại và nhiều tab. |
| P1 | Thanh toán / thành viên | Kiểm chứng sandbox/provider thật, webhook lặp, mất phản hồi, hủy/hoàn tiền và quyền Pro chỉ cấp một lần. Không mở bán dựa trên test giả lập. |
| P2 | Menu và các trang nặng | Đo chuyển trang lần đầu, tải trước có chọn lọc, skeleton theo nhóm trang, giữ bản nháp khi chuyển tab và cảnh báo rời dữ liệu chưa lưu. |
| P2 | Lập lá số / đồ họa | Đo tác vụ trên main thread, Worker khi cần; thử xoay màn hình, pinch zoom, máy yếu và reduced-motion; không đánh đổi khả năng đọc lấy hiệu ứng. |
| P2 | Nội dung cơ bản/chuyên sâu | Kiểm riêng từng bộ môn: cơ bản gọn đủ ý, chuyên sâu đủ phương pháp/nguồn/giới hạn/ví dụ; kiểm thử quyền nội dung khóa cả API và UI, Pro vĩnh viễn và admin. Chưa đủ bằng chứng xác nhận mọi bài đã hoàn chỉnh. |
| P2 | Thư viện / hướng dẫn | Kiểm link, tìm kiếm, dấu trang/tiến độ đọc và tiếp tục đọc; đánh dấu phiên bản, nguồn và quyền xuất bản. Chỉ bổ sung tính năng còn thiếu sau kiểm kê từng trang để tránh trùng. |
| P2 | AI | Hủy, timeout, phản hồi sai, hạn mức, chi phí và lịch sử; giữ nguồn dữ kiện và giải thích giới hạn, không dùng câu trả lời AI làm bằng chứng thuật toán đúng. |
| P2 | Hồ sơ / tài khoản | Kiểm ảnh HEIC/crop, huy hiệu, đổi mật khẩu, thu hồi phiên và xóa dữ liệu; thử tải lên/tải xuống trên thiết bị thật. |
| P3 | Dashboard vận hành | Thêm số liệu độ trễ, lỗi, pool DB, hàng chờ, hỗ trợ chưa trả lời và cảnh báo theo ngưỡng; số liệu từ server, không dữ liệu minh họa. |

Danh sách này là backlog có tiêu chí, không khẳng định mọi tính năng nêu trên đều đang thiếu. Những điểm chưa kiểm kê/kiểm thử được vẫn để mở. Ưu tiên ổn định và nội dung hữu ích trước khi mở rộng thuật toán hoặc thêm hiệu ứng.
