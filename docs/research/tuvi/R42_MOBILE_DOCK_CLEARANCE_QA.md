# R42 — Nghiệm thu thanh điều hướng cố định trên điện thoại

## Vấn đề

Ảnh chụp toàn trang 390px từ R38–R41 đôi khi hiển thị thanh điều hướng cố định chồng lên một đoạn của ảnh. Ảnh chụp trang dài không đủ chứng minh người dùng thực sự không thể cuộn hoặc bấm nội dung. Trong mã hiện tại, `responsive.css`, `experience.css`, `interface-quality.css` và `portal-v11163.css` đã có các quy tắc tạo vùng đệm cuối trang, kể cả `safe-area-inset-bottom`.

R42 **đo trước khi sửa CSS**, tránh sửa bừa toàn bộ UI/UX đã nghiệm thu.

## Hành trình kiểm tra

Trong browser Production sau khi đã đăng nhập thành viên:
1. Mở `/chart` trên 320px, 390px, 680px, 1440px (chiều cao 844px).
2. Xác nhận `nav[aria-label="Điều hướng điện thoại"]` chỉ hiện trên các khung hẹp.
3. Cuộn tới hết trang và kiểm tra liên kết cuối cùng “Liên hệ & hỗ trợ” trong footer.
4. Đo tọa độ thực của liên kết và mép trên thanh điều hướng: liên kết phải nằm trên thanh tối thiểu 6px.
5. Kiểm tra `document.elementFromPoint` tại tâm liên kết thật sự trả về liên kết, không phải thanh nổi hoặc lớp phủ khác.
6. Kiểm tra chiều ngang không vượt viewport; lưu ảnh viewport ở 390px để đối chiếu bằng chứng.

Bài test mới `tests/helpers-mobile-dock-clearance-browser.cjs` chạy trong luồng `tests/account.browser.cjs` mặc định, không skip browser hoặc giảm kiểm tra để lấy PASS. Workflow riêng `tuvi-r42-mobile-dock.yml` kiểm tra cú pháp và typecheck.

**Nguyên tắc:** chỉ sửa lớp CSS toàn cục nếu R42 chứng minh có lỗi tương tác thật. Nếu PASS, vấn đề được phân loại là hiệu ứng chụp ảnh toàn trang với thành phần `position:fixed`, không phải lỗi che nội dung người dùng. Vẫn phải lưu bằng chứng và nghiệm thu Production 5/5 trước khi gộp.

Không thay đổi công thức an sao, thuật toán Tử Vi, ngày sinh, API, DB, quyền, giao diện 12 cung hoặc ánh xạ **31/49**.
