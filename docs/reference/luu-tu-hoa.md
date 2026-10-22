# V8.8 — Lưu Tứ Hóa và 4 lưu tinh theo năm xem

## Phạm vi

- `annualOverview(chart, lunarYear)` gọi `annual-layers.js`, **không** ghi đè Tứ Hóa năm sinh trong `chart.houses`.
- **Lưu Tứ Hóa**: 4 hóa theo can năm âm lịch đang xem; áp dụng đúng bảng `tuhoa.js` đã tồn tại, phiên bản `annual-tuhoa-tap-v4.0`. Canh (Khoa Thái Âm / Kỵ Thiên Đồng) là một dị bản; các trường phái không thống nhất toàn bộ bảng.
- **Lưu Lộc Tồn, Lưu Kình Dương, Lưu Đà La**: từ can năm đang xem, dùng đúng bảng `LOC_TON` của `auxiliary.js`, Kình = vị trí Lộc + 1, Đà = Lộc - 1 theo thứ tự chi Tý=0.
- **Lưu Thiên Mã**: từ tam hợp chi năm đang xem; dùng bảng `year-stars.js`, tách biệt Thiên Mã năm sinh.
- **Tiểu hạn / Đại hạn / Lưu Thái Tuế**: giữ nguyên V8.7.
- Các lớp dữ liệu được tính từ năm xem và gắn nhãn rõ trên UI + SVG, không đổi kết quả an sao gốc.

## Điều không được suy diễn

Không gọi tính năng này là **lưu niên đầy đủ**. Chưa có lưu tứ hóa theo can cung đại hạn, lưu nguyệt, lưu nhật, các sao lưu niên còn lại, diễn giải tổ hợp hoặc kiểm định chuyên gia. Các tài liệu tử vi thuộc truyền thống văn hóa/chiêm nghiệm, không chứng minh khả năng dự đoán tương lai bằng phương pháp khoa học.

## Tài liệu đối chiếu công khai

- https://amlichvietnam.vn/kien-thuc/tu-vi/bang-tu-hoa-thien-can — bảng 10 can của dị bản Toàn Thư, dùng tạo fixture trong `tests/fixtures/`.
- https://tuvi.bbateam.com/thu-vien/tu-hoa/an-tu-hoa-theo-can — bảng đối chiếu thứ hai.
- https://nhatnguyet.org/kien-thuc/bai-viet/luu-nien-va-sao-luu-trong-tu-vi-eaa375 — giải thích việc lớp lưu niên không phải lớp niên sinh; nêu ví dụ dị bản.

**Giới hạn độ tin cậy:** kiểm thử các bảng và vị trí trên engine chỉ chứng minh tính nhất quán của mã theo các bảng nguồn. Chưa có bộ lá số chuẩn do chuyên gia độc lập chứng nhận; cần bổ sung bộ đó và kiểm thử từng trường phái trước khi quảng bá độ chính xác chuyên môn.
