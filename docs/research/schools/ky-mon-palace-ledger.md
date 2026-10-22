# Kỳ Môn V11.108 — Bảng đối chiếu từng cung

Lớp trình bày trên Chai Bổ/Chuyển Bàn hiện có; không bổ sung thuật toán huyền học. Dữ liệu nguồn: formation.cjs, hour-plate.cjs, hour-signals.cjs. Các quy ước và nguồn của bộ dựng bàn giữ ở ky-mon-chai-bo-rotating.md và ky-mon-hour-signals.md.

## Trạng thái dữ kiện
| Trạng thái | Ý nghĩa |
|---|---|
| Hiện diện | Có giá trị của lớp bàn hoặc có dấu cấu trúc tại cung |
| Không có dấu | Đã tính lớp đó và không có dấu tại cung này |
| Chưa tính | Chưa có giờ/thời bàn hợp lệ; không suy thành dấu vắng |
| Quy ước ký cung | Trung 5 không an riêng các lớp thời bàn; Thiên Cầm ký cùng Thiên Nhuế |

## Truy nguyên
- Xây ledger một lần khi dữ kiện lập cục thay đổi; chọn cung chỉ chọn bản ghi sẵn có.
- Xác minh địa bàn từ tiết khí/Can Chi theo bộ dựng nền; xác minh thời bàn bằng analyzeHourSignals, từ chối bản ghi giả/sai.
- Trình bày Địa Can, Thiên Can, Cửu Tinh, Bát Môn, Bát Thần, Tuần Không giờ, Mã Tinh giờ, Mã Tinh ngày đối chiếu và Lục Nghi Kích Hình.
- Nguồn Thiên Can/Cửu Tinh lấy starFromPalace; nguồn môn lấy doorFromPalace; nguồn an thần lấy chiefStarLanding/spiritDirection. Không tự an lại một phép khác trong UI.
- Thiên Cầm bản vị Trung 5 ký cùng Thiên Nhuế từ bản vị Khôn 2; cung nhận ký trên thời bàn thay đổi khi sao xoay. Không cố định cung nhận ký thực tế là 2.
- Khi không có giờ, ledger chỉ trình bày Địa Can và tham chiếu bản vị; tám trường thời gian còn lại có trạng thái Chưa tính.
- Bảng chín cung có thể cuộn trong vùng riêng; chọn một dòng cập nhật cùng trạng thái chọn cung của bàn chính.

## Giới hạn
Tín hiệu không phải chứng cứ tiên đoán cát/hung, không đủ để xác nhận cách cục hoặc Dụng thần. Phạm vi ký cung là dị bản Chai Bổ/Chuyển Bàn đang dùng. Chưa mở rộng Phi Bàn, Trí Nhuận, Môn Bách hoặc Nhập Mộ. Giờ nhập tiết, chân thái dương thời và lịch sử múi giờ vẫn cần đối chiếu độc lập.
