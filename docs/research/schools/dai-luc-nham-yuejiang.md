# Đại Lục Nhâm — Nguyệt Tướng gia thời — hồ sơ phương pháp

**Trạng thái:** `deterministic-subroutine-only` · **Phạm vi tích hợp:** `isolated-research-only` · **Ưu tiên:** P1.

> Tài liệu phục vụ số hóa và đối chiếu một hệ quy ước, không phải bằng chứng dự báo vận mệnh đã được khoa học kiểm chứng. Một tài liệu cổ nêu quy tắc chưa đủ để chứng minh mọi biến thể của trường phái.

## Đề bài và đầu vào

Thiên bàn xoay quanh địa bàn 12 chi, đặt Nguyệt Tướng tại cung chi giờ.

**Đầu vào phải được công bố rõ:** nguyệt tướng do người nghiên cứu cung cấp HOẶC tra từ mốc Trung khí 2025–2027 theo HKO với múi giờ rõ ràng; chi giờ vẫn do người nghiên cứu xác nhận.

**V11.89 (tham chiếu mới):** `da-liu-ren-zhongqi.cjs` có bảng 36 mốc Trung khí từ HKO; chấp nhận thời điểm ISO 8601 có UTC offset; các thời điểm nằm trong ±60 giây của phút công bố được trả về trạng thái `boundary-needs-verification` và **không tự dựng bàn**. Chỉ hỗ trợ từ 20/1/2025 đến hết 2027. Tính từ bảng, **không tính kinh độ Mặt Trời bằng ephemeris độc lập**.

**Những điểm cần phân biệt:** Nguyệt Tướng đổi theo Trung khí, không phải tiết khí đầu tháng, nguồn thời gian giờ chi, chưa xác minh các cách tính tiết khí.

## Phần có thể chạy trong dự án

thiên địa bàn, phục ngâm/phản ngâm về hình học; Tứ Khóa và Tam Truyền một phần V11.90 (nghiên cứu tách biệt)

## Chưa đủ điều kiện triển khai

- phép tính thiên văn trực tiếp bằng ephemeris độ chính xác cao (hiện chỉ dùng bảng HKO đã công bố).
- Tứ Khóa chưa đủ đối chiếu dị bản và chưa bật trong engine chính (xem `dai-luc-nham-four-lessons.md`).
- Tam Truyền chưa đủ Chín Tông Môn; chỉ có Độc Khắc/Bỉ Dụng duy nhất ở module nghiên cứu.
- Thiên Tướng.
- biệt lệ trường phái.

## Giao thức kiểm định trước khi nhập vào engine

1. Trích quy tắc đúng theo tài liệu và ghi phiên bản sách, trang/thiên/đoạn nếu có; tách nguyên văn khỏi diễn giải.
2. Định nghĩa tham số, ranh giới thời gian, phép đánh chỉ số, bảng tra và thứ tự ưu tiên khi gặp dị bản.
3. Lập các ca thử có kết quả kỳ vọng độc lập, bao gồm ca sát ranh và tình huống lỗi.
4. Chạy so sánh ít nhất hai triển khai hoặc đánh giá chuyên môn độc lập; ghi mọi sai khác thay vì che giấu.
5. Chỉ công bố tính năng ở trạng thái đã thẩm định sau khi có phê duyệt và kiểm tra hồi quy.

## Tài liệu đối chiếu ban đầu

- https://www.hko.gov.hk/tc/gts/astron2025/files/2025SolarTerms24.pdf
- https://www.hko.gov.hk/en/gts/astron2026/files/2026SolarTerms24.pdf
- https://www.hko.gov.hk/tc/gts/astron2027/files/2027SolarTerms24.pdf
- https://www.weather.gov/dvn/Climate_Astronomical_Seasons (đối chiếu độc lập 4 mùa 2026, sai khác tối đa 1 phút).

- https://zh.wikisource.org/zh-hans/%E5%85%AD%E5%A3%AC%E6%8C%87%E5%8D%97/1 (đầu mối đối chiếu; chưa thay thế tra cứu nguyên bản).
- https://journals.openedition.org/extremeorient/282 (đầu mối đối chiếu; chưa thay thế tra cứu nguyên bản).
