# Tử Vi R37 — kiểm toán hai kịch bản giờ Tý cuối

Trạng thái: **research-only**; không làm thay đổi quy ước mặc định của Thiên Đồ.

## Tại sao cần làm

R36 chạy 288 tình huống trên nguồn `Renhuai123/ziwei-doushu` để kiểm tra các hàm xử lý giờ mặt trời thực và Tý cuối. Thiên Đồ hiện giữ **ngày dân sự được nhập** khi lập lá số ở 23:00–23:59 và hiển thị cảnh báo rằng có nhiều quy ước. Để hiểu rủi ro trước khi quyết định chính sách, R37 tạo hai lá số **độc lập** cho cùng người/cùng giờ nhưng khác ngày dùng lập lá số.

## Hai kịch bản nghiên cứu

| Kịch bản | Ngày dùng lập lá số | Trạng thái |
| --- | --- | --- |
| A — Giữ ngày | Ngày dương đã nhập | Chính sách sản xuất hiện hành, không thay đổi |
| B — Sang ngày sau | Ngày dương + 1, giữ nguyên chi Tý (giờ 23) | Chỉ dùng phân tích, không tự động áp dụng |

Trình kiểm toán `packages/astrology-engine/src/tuvi-zi-scenario-audit.cjs` là module CommonJS read-only, không gắn vào form đăng ký hay API lập lá số. Nó dùng chính engine Thiên Đồ cho hai kịch bản và so sánh **năm/tháng/ngày âm, cờ nhuận, Can Chi năm, Mệnh, Thân, Cục, Tử Vi, Thiên Phủ và tọa chi của cả 14 chính tinh**.

Không truyền vào múi giờ, kinh độ hoặc giờ mặt trời thực. Đây là kiểm tra hậu quả của chọn *ngày dân sự*, chưa kiểm tra quy tắc chuyển ngày trong bối cảnh địa điểm sinh và giờ địa phương lịch sử.

## Ranh giới dữ liệu

- Chỉ nhận ngày dương `YYYY-MM-DD` hợp lệ trong năm 1900–2100, giờ 0–23, phút 0–59, Nam/Nữ.
- Chỉ trả kịch bản B cho giờ 23:00–23:59; với 00:00–22:59 vẫn trả một lá số giữ ngày.
- Nếu ngày tiếp theo vượt 31/12/2100, không tạo lá số ngoài phạm vi engine.
- Báo cáo luôn để `selectedPolicy='current-day'`, `productionPolicyUnchanged=true`, `sourceSchoolEquivalenceVerified=false` và `astroTimezoneVerified=false`.
- Không có thao tác cập nhật database, sao, cách cục, UI, quyền Pro, AI hoặc luật thanh toán.

## Kiểm chứng hồi quy

`tests/v111680-tuvi-r37-zi-scenario.test.cjs` xác nhận đầu vào sai bị từ chối, ngày Tết/tháng nhuận, 23:00/23:59, ngày qua năm, các trường thay đổi, cả 14 chính tinh, vùng không đủ điều kiện, giới hạn năm 2100, kết quả bất biến khi gọi lặp. Các mẫu là ngày giả lập, không dùng dữ liệu sinh cá nhân.

Workflow riêng `.github/workflows/tuvi-zi-scenario-r37.yml` bắt buộc kiểm tra cú pháp/source, rồi chạy toàn bộ bài test. PR chỉ được gộp khi **Source Integrity, Full Stack, Production Acceptance 5/5 và workflow R37** đều PASS trên cùng HEAD.

Không tăng điều kiện ánh xạ 31/49 và không coi khác biệt lá số là chứng cứ chọn trường phái nào đúng. Sau R37, có thể cân nhắc chức năng giao diện cho người dùng *xem so sánh* sau khi xác minh thêm UX/giải thích, nhưng không tự chọn hoặc tự thay ngày sinh.
