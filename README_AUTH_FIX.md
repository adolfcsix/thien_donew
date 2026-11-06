# Thiên Đồ — bản sửa tài khoản ngày 06/11/2026

Nguồn chuẩn: GitHub adolfcsix/thien_donew, commit 92d8e0eae7902ed77ee31d4a70315696b824c05f. Đây là toàn bộ mã nguồn của bản GitHub đó cộng các sửa dưới đây; không tự ghép bộ nâng cấp Admin 25 tệp chưa có trên GitHub.

## Các sửa đã thực hiện

1. Công cụ chẩn đoán đăng ký đối chiếu tên migration thực tế thay vì kiểm cố định 36. Chuỗi hiện tại có 37 migration; thiếu, trùng hoặc sai tên đều bị phát hiện.
2. Thêm `npm run dev:lan` và `START_THIEN_DO_LAN_WINDOWS.bat`: xác định IP mạng riêng của chính máy, đồng bộ WEB_ORIGIN cho API, dùng `--hostname 0.0.0.0` cho Next.js. Không sửa .env, không tin Host do trình duyệt gửi và không dùng wildcard để bỏ bảo vệ nguồn yêu cầu.
3. Khi nhiều adapter mạng/VPN, yêu cầu chọn IP rõ ràng; từ chối IP công cộng, loopback, IP không thuộc máy và giá trị chèn lệnh. Từ chối HTTP LAN khi NODE_ENV=production hoặc COOKIE_SECURE=true.
4. Phản hồi lỗi nguồn truy cập trong môi trường phát triển chỉ rõ WEB_ORIGIN/dev:lan và có mã hỗ trợ; production giữ thông báo chung.
5. Sửa ngoại lệ kiểm tra nguồn cho đúng helper trình duyệt TOTP khi chưa build: phải có TypeScript nguồn, không miễn kiểm tra module tùy ý.

Không tắt MFA, không tạo Owner/mật khẩu mặc định, không đổi thuật toán, không có migration mới và không chứa .env thật/database người dùng.

## Chạy trên Windows

1. Giải nén, mở PowerShell tại thư mục THIEN_DO_LATEST có package.json.
2. Đọc HUONG_DAN.md. Lần đầu cần Node đúng phiên bản, npm ci, .env riêng và PostgreSQL. Nếu đang nâng cấp, giữ .env/khóa MFA, sao lưu dữ liệu trước khi chạy npm run db:migrate.
3. Chạy npm run check:auth:register để kiểm tra database/schema mà không tạo tài khoản.
4. Chỉ chạy máy hiện tại: npm run dev, mở http://localhost:3000.
5. Chạy cùng Wi-Fi với điện thoại: mở START_THIEN_DO_LAN_WINDOWS.bat hoặc npm run dev:lan. Nếu cần chọn IP: npm run dev:lan -- 192.168.1.242 (thay bằng IP thật hiện tại). Mở đúng URL được in ra trên cả máy và điện thoại; cho phép Node trên mạng riêng trong Windows Firewall.
6. Không dùng --host với Next.js; lệnh mới đã sử dụng --hostname. Không chạy đồng thời nhiều bộ API/web khác phiên bản trên cùng cổng.
7. Nếu dùng cấu hình production, cần HTTPS; không hạ COOKIE_SECURE để chạy HTTP. Không xóa database hoặc bỏ MFA để chữa lỗi đăng nhập.

## Giới hạn nghiệm thu

Các kiểm thử SQL sử dụng PGlite độc lập, email được bắt trong bộ nhớ. Kiểm thử Chromium không thay thế nghiệm thu Windows/PostgreSQL native, Safari/iPhone hoặc Google OAuth/email/payOS/Gemini thật. Không có truy cập database hay cấu hình riêng của máy người dùng. Trạng thái production vẫn NO-GO; đây không phải cam kết hết mọi lỗi triển khai.
