# Kiểm sâu vòng 1: phiên đăng nhập và phản hồi về muộn

## Phát hiện và sửa

Transport API phát sự kiện hết phiên khi nhận 401 từ API riêng tư. Trước đây không phân biệt yêu cầu được gửi trước hay sau lần đăng nhập mới. Trình tự tái hiện: yêu cầu lá số đang chờ → đăng nhập thành công tạo phiên mới → yêu cầu cũ trả 401 → AuthProvider xóa phiên mới và rời trang.

Đã thêm thế hệ phiên trong transport, tăng sau phản hồi đăng nhập/đăng ký/Google verify có user hợp lệ đã qua kiểm tra hợp đồng. Chỉ 401 của thế hệ hiện tại và yêu cầu chưa hủy mới được phát sự kiện hết phiên. Lỗi 401 cũ vẫn trả về caller; không chuyển thành thành công. Thông tin này không dùng để cấp quyền; API máy chủ tiếp tục quyết định quyền truy cập.

Kiểm thử mới điều khiển chính xác thứ tự phản hồi, dùng transport API và AuthProvider thật trong React/jsdom: giữ yêu cầu cũ, hoàn tất login, trả 401 cũ, kiểm tra giao diện không đăng xuất; sau đó trả 401 từ yêu cầu mới, kiểm tra giao diện riêng tư bị gỡ và điều hướng đăng xuất vẫn hoạt động.

## Phạm vi đọc sâu

Đã lần theo AuthProvider reload/revalidate/completeLogin, xử lý 401 và kiểm tra hợp đồng của transport, khâu thiết lập session sau scrypt và kiểm tra lại mật khẩu trong transaction, kiểm tra session tại ranh giới transaction, wrapper ghi admin và cơ chế đọc tài nguyên admin. Các cơ chế khóa/kiểm tra lại phía backend đã hiện diện; không suy ra chúng hoàn toàn đúng chỉ từ việc đọc mã.

## Giới hạn

Đây là vòng kiểm sâu đầu tiên, không phải kiểm sâu hoàn tất mọi module. Chưa kiểm chứng nhiều tab cùng đổi cookie, HTTP response bị đảo thứ tự Set-Cookie, PostgreSQL production, Safari thiết bị thật, nhà cung cấp thanh toán/email/AI hoặc sức chứa hạ tầng. Các phần đó chưa được coi là đạt nghiệm thu.
