# Sửa luồng vào quản trị — 06/11/2026

Bản này tiếp nối bản sửa đăng nhập và tương thích cảm ứng, lấy repository adolfcsix/thien_donew làm nguồn nền.

## Lỗi đã sửa

1. Màn hình MFA bị hủy và dựng lại khi cửa sổ nhận focus hoặc trang hiện trở lại. Trên điện thoại, chuyển sang Mail/Authenticator rồi quay về có thể làm mất challenge email, khóa liên kết hoặc mã đang nhập. Giờ chỉ tự kiểm tra lại khi không gian quản trị đã được mở sau xác thực; bước MFA đang làm được giữ trong bộ nhớ của màn hình. Không lưu khóa hay OTP vào localStorage.
2. Lỗi tạm thời của endpoint khôi phục trình duyệt tin cậy trước đây chặn toàn bộ luồng vào admin. Giờ lỗi đó cho phép tiếp tục xác minh bằng Authenticator. HTTP 401/403 vẫn chặn; nội dung quản trị chỉ mở sau khi máy chủ xác nhận MFA và quyền.
3. Thêm nút kiểm tra lại trạng thái MFA khi đã xác minh ở nơi khác. Đây là thao tác kiểm tra lại có chủ đích và có thể làm mới bước đang thực hiện.

## Kiểm chứng

- 22 kiểm thử DOM luồng đăng nhập/quản trị, gồm 4 ca mới tái hiện chuyển ứng dụng, lỗi khôi phục trình duyệt tin cậy, từ chối quyền và thu hồi quyền khi quay lại trang.
- Kiểm thử dùng component React thật, transport giả lập; không thay thế Safari trên iPhone hoặc máy chủ đang chạy của người dùng.
- Không bỏ MFA, không tự cấp Owner/Admin, không thay đổi cookie hoặc yêu cầu phân quyền backend.

## Nếu vẫn không vào được

Luồng đúng: đăng nhập tài khoản được cấp quyền → xác minh email nếu thiết lập lần đầu → liên kết Authenticator → nhập mã 6 chữ số. Mã email khác mã Authenticator. Mã đã dùng phải chờ chu kỳ tiếp theo; đồng hồ điện thoại và máy chủ cần chính xác.

Nếu trang báo thiếu ADMIN_MFA_ENCRYPTION_KEY, xem HUONG_DAN.md và chạy công cụ admin:mfa:init theo hướng dẫn. Máy chủ đã có MFA phải giữ nguyên khóa cũ; không tạo lại để vượt bước xác thực. Tài khoản thường và tài khoản Pro không tự có quyền quản trị.

Chưa truy cập được môi trường triển khai của người dùng và chưa nghiệm thu trên iPhone vật lý. Vì vậy bản này xác nhận sửa lỗi có bằng chứng trong mã, không xác nhận mọi nguyên nhân đăng nhập trên máy chủ thực tế đã được loại trừ.
