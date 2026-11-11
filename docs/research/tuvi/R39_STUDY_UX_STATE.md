# R39 — tinh chỉnh trạng thái nghiên cứu giờ Tý và khả năng đọc trên điện thoại

Phạm vi: cải thiện trải nghiệm người dùng của chức năng **So sánh quy ước giờ Tý** đã nghiệm thu tại R38. R39 không đổi thuật toán an sao, dữ liệu lá số, bản xuất PNG/PDF, API hoặc cấu hình tài khoản.

## 1. Ngắt trạng thái nghiên cứu khi đổi lá số

Trước R39, `ChartResult` lưu `showZiComparison` theo boolean. Khi thay đổi thông tin rồi lập lại lá số (đặc biệt vẫn ở giờ 23), cùng component React có thể giữ trạng thái bảng so sánh mở. Về UX và an toàn dữ liệu, điều này dễ làm người dùng tưởng đang xem kịch bản B của lá số trước.

R39 thay bằng `ziOpenedFor`, lưu **tham chiếu đối tượng kết quả hiện tại** (chỉ trong state React, không có database/cookie/storage). `isStudyOpenFor(openedFor,result)` chỉ trả true khi `result.hour===23` và **cùng object**. Khi lập lại lá số, object mới dù giá trị ngày giờ trùng nhau vẫn đóng bảng. Nút bấm của lá số mới có `aria-expanded=false`, không tự hiển thị thông tin giả định. Không có đường ghi `ziOpenedFor` ra server.

## 2. Thuyết minh sao đổi vị trí

Bên trên hai địa bàn bổ sung dòng chú giải: chính tinh gạch chân chấm là sao thay đổi địa chi giữa A/B; nhãn “Có thay đổi” còn áp dụng cho thay đổi cung và cung Thân. Cách giải thích này giúp dùng được với người không phân biệt màu và vẫn giữ cấu trúc vòng 4×4 trên màn hình rộng.

## 3. Bảng đối chiếu bốn cột trên mobile

Ở kích thước dưới 620px, bảng bốn cột cần cuộn ngang để giữ khả năng đọc. R39 có dòng **“Vuốt bảng sang trái…”** ngay phía trên vùng cuộn và liên kết `aria-describedby`; vùng bảng tiếp tục nhận focus bằng bàn phím và có viền focus nhìn rõ. Không thu chữ hoặc bóp bảng còn vài chục pixel, không làm mất bất kỳ cột nào.

## 4. Chứng cứ và điều kiện nghiệm thu

- `tests/v111682-tuvi-r39-study-ux.test.cjs`: xác nhận đóng/mở theo đúng lá số, cùng giá trị nhưng object khác phải đóng, giờ 22 không mở, không biến đổi input/output.
- `tests/helpers-late-zi-compare-browser.cjs`: thêm hành trình thay phút sinh 23:00 → 23:59, tính lại, xác nhận bảng so sánh đã tự đóng, sau đó mở lại; kiểm tra thông báo cuộn ngang ở 390px, ẩn trên desktop, `aria-describedby` đúng; tiếp tục kiểm tra 12 cung, 14 chính tinh và không tràn khung như R38.
- `.github/workflows/tuvi-r39-study-state-ux.yml`: chạy kiểm tra mã nguồn, R37/R38/R39 và TypeScript trên cùng commit.
- **Chỉ gộp khi R39 workflow, Source Integrity, Full Stack, Production Acceptance đủ 5/5 PASS trên cùng HEAD**, bao gồm bài trình duyệt 390px/1440px.

Đây là nâng cấp hỗ trợ đọc/lý giải, không phải xác minh quy tắc giờ Tý tối ưu cho mọi trường phái. Ánh xạ nguồn vẫn **31/49**.
