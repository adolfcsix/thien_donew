# Kỳ Môn — Thời chi Mã Tinh và Lục Nghi Kích Hình (V11.105)

**Trạng thái:** `research-only`; đây là lớp tín hiệu giải thích từ Kỳ Môn Chai Bổ/Chuyển Bàn V11.76–78, không phải dự đoán, không dùng cho Phi Bàn, không thay engine chung.

## Bảng đối chiếu

Mã Tinh (驛馬, *theo chi giờ*) dùng nhóm Tam Hợp đối xung: **Thân–Tý–Thìn → Dần (Cấn 8); Dần–Ngọ–Tuất → Thân (Khôn 2); Tỵ–Dậu–Sửu → Hợi (Càn 6); Hợi–Mão–Mùi → Tỵ (Tốn 4)**. Chi ngày cũng tra được bảng ấy nhưng **không trộn vai trò với chi giờ**. Nguồn: https://www.guoxuezhijia.com/gxbk/21942.html (mục 5.6), https://lexcn.net/guides/qimen-horse.

Lục Nghi Kích Hình (六儀擊刑), **đối chiếu Thiên bàn**, không lấy từ một Can địa bàn trùng vị trí: Giáp Tý Mậu→Chấn 3 (Tý/Mão); Giáp Tuất Kỷ→Khôn 2 (Tuất/Mùi); Giáp Thân Canh→Cấn 8 (Thân/Dần); Giáp Ngọ Tân→Ly 9 (Ngọ tự hình); Giáp Thìn Nhâm→Tốn 4 (Thìn tự hình); Giáp Dần Quý→Tốn 4 (Dần/Tỵ). Nguồn: https://www.sohu.com/a/389192627_120339516 ; tham khảo phân biệt vị trí/cách cục: https://www.wentj.net/qimen-rumu-jixing-menpo.html.

## Phạm vi thuật toán

- `horseFromBranch`: chỉ nhận 12 chi hợp lệ; trả về nhóm Tam Hợp, chi Mã Tinh và cung Lạc Thư; không lấy ngày/giờ dân dụng tự chuyển.
- `positionMatches`: kiểm tra vị trí **Thiên Can thời bàn** đối với sáu cặp quy tắc, tuyệt đối không nhận trùng **Địa Can** là đủ.
- `analyzeHourSignals`: xây lại địa bàn và thời bàn từ đầu vào hợp lệ trước khi trả kết quả, ngăn dữ liệu bàn giả/lệch; trả `hourHorse` (chính), `dayHorse` (đối chiếu), `striking` và `byPalace`. Mất giờ thì không tính.
- Mã Tinh là lớp cấu trúc, Kích Hình ở đây là **trùng vị trí**, **không đủ** để suy tốt/xấu, ứng kỳ, dụng thần; chưa xét Phi Bàn, Môn Bách, nhập mộ và các dị bản.

## Bộ kiểm toán

Có kiểm thử từng chi trong 12 chi, bảng sáu Lục Nghi, nhận diện Thiên bàn so với Địa bàn, 64 quẻ/9 cục và các điểm giao dữ kiện; cùng hồi quy những lớp Kỳ Môn trước. Mọi sai khác trường phái phải bổ sung nguồn và fixture đối chiếu trước khi kết luận.
