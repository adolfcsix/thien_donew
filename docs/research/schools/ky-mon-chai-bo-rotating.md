# Kỳ Môn — Chai Bổ Chuyển Bàn — hồ sơ phương pháp

**Trạng thái:** `existing-needs-external-verification` · **Phạm vi tích hợp:** `legacy-reference-only` · **Ưu tiên:** P0.

> Tài liệu phục vụ số hóa và đối chiếu một hệ quy ước, không phải bằng chứng dự báo vận mệnh đã được khoa học kiểm chứng. Một tài liệu cổ nêu quy tắc chưa đủ để chứng minh mọi biến thể của trường phái.

## Đề bài và đầu vào

Âm/Dương độn, cục, địa bàn, Thiên bàn, Bát Môn, Cửu Tinh.

**Đầu vào phải được công bố rõ:** tiết khí, can chi ngày giờ, quy tắc định cục.

**Những điểm cần phân biệt:** giao tiết, giờ Tý, chân thái dương thời.

## Phần có thể chạy trong dự án

địa bàn, chuyển bàn giờ

## Chưa đủ điều kiện triển khai

- đối chiếu tam nguyên.
- cách cục/tổ hợp.
- dị bản Thiên bàn.

## Giao thức kiểm định trước khi nhập vào engine

1. Trích quy tắc đúng theo tài liệu và ghi phiên bản sách, trang/thiên/đoạn nếu có; tách nguyên văn khỏi diễn giải.
2. Định nghĩa tham số, ranh giới thời gian, phép đánh chỉ số, bảng tra và thứ tự ưu tiên khi gặp dị bản.
3. Lập các ca thử có kết quả kỳ vọng độc lập, bao gồm ca sát ranh và tình huống lỗi.
4. Chạy so sánh ít nhất hai triển khai hoặc đánh giá chuyên môn độc lập; ghi mọi sai khác thay vì che giấu.
5. Chỉ công bố tính năng ở trạng thái đã thẩm định sau khi có phê duyệt và kiểm tra hồi quy.

## Tài liệu đối chiếu ban đầu

- Cần tìm và xác minh nguồn gốc; chưa được gắn tài liệu độc lập.

## Mở rộng V11.105

Tra Mã Tinh theo chi giờ và Lục Nghi Kích Hình trên **Thiên bàn Chuyển Bàn**; đây chỉ là so khớp vị trí, không chọn cách cục. Chi tiết và nguồn: [`ky-mon-hour-signals.md`](ky-mon-hour-signals.md).
