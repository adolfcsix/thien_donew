# Bản sửa tương thích iPhone / cảm ứng — 06/11/2026

Nguồn: repository adolfcsix/thien_donew, commit nền 92d8e0eae7902ed77ee31d4a70315696b824c05f. Bản này bao gồm các sửa đăng ký/đăng nhập và chạy LAN trong README_AUTH_FIX.md.

## Các thay đổi

- Dùng hàm tạo UUID chung: ưu tiên API native, dự phòng bằng crypto.getRandomValues. Các thao tác gửi tin, theo dõi lượt xem, cấp gói, thanh toán và khôi phục hồ sơ không còn gọi trực tiếp randomUUID. Không dùng Math.random.
- Khôi phục Thư phòng có SHA-256 dự phòng khi trình duyệt không cung cấp SubtleCrypto trên HTTP LAN. Giữ nguyên dấu vân tay và cơ chế chống nhập trùng. Đây chỉ là dấu vân tay tệp, không phải hàm băm mật khẩu.
- Hộp tài khoản theo visualViewport khi bàn phím thay đổi vùng nhìn; hỗ trợ cuộn nội dung, trường nhập 16px trên màn hình nhỏ, nút đóng 44px; vẫn giữ khả năng phóng to. Dọn listener và khôi phục cuộn khi đóng.
- Bổ sung kiểm thử cảm ứng Chromium và bước kiểm thử WebKit trong CI. Báo cáo trình duyệt ghi rõ engine và không coi mô phỏng là thiết bị vật lý.

## Kiểm chứng và giới hạn

Đã chạy build web, TypeScript, kiểm thử DOM và sáu luồng Chromium cảm ứng 390×844: bố cục khi bàn phím giả lập mở, đóng hộp thoại, đăng ký thật, đăng nhập bằng tên tài khoản, gửi tin qua API/SQL, nhập bản sao lưu qua API/SQL. Kiểm thử cố tình tắt randomUUID và SubtleCrypto để tái hiện hạn chế HTTP LAN.

Chưa nghiệm thu trên iPhone vật lý. WebKit cục bộ chưa chạy được do thiếu thư viện hệ thống; bước CI WebKit được bổ sung nhưng chưa có kết quả từ GitHub. Bàn phím iOS thật, tải tệp vào Files, in/chia sẻ, ảnh HEIC và tương tác 3D vẫn cần kiểm tra trên thiết bị. Bản này không chứng nhận toàn bộ chức năng iOS đã hoàn tất.

Chạy cùng Wi-Fi từ Windows: dùng START_THIEN_DO_LAN_WINDOWS.bat, rồi mở địa chỉ LAN được in ra trên iPhone. Không mở localhost trên điện thoại. Môi trường triển khai chính thức cần cấu hình HTTPS, cookie, origin và email theo hướng dẫn gốc; không giảm yêu cầu bảo mật production.

## Bổ sung trải nghiệm đa thiết bị — 07/11/2026

Bảng dữ liệu dùng cơ chế dự phòng khi trình duyệt nhúng thiếu ResizeObserver, đồng thời đo lại khi kích thước cửa sổ thay đổi và dọn listener khi rời trang. Admin dùng trường nhập 16px và nút cao ít nhất 44px trên thiết bị có con trỏ chạm, bao gồm tablet nằm ngang; hàng phân quyền và phân trang được điều chỉnh cho màn hình hẹp. Không giới hạn khả năng zoom, không đổi điều kiện cấp quyền.

Kiểm thử DOM bổ sung kiểm tra trường hợp thiếu ResizeObserver, thay đổi kích thước và dọn tài nguyên. Đây chưa phải kiểm chứng mọi trình duyệt, thiết bị hoặc mọi chức năng bằng thao tác thật.
