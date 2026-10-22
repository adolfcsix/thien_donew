# Mai Hoa Dịch Số — đối chiếu khởi quẻ Tiên Thiên và Hậu Thiên (V11.104)

**Trạng thái:** `deterministic-subroutine-only`, `isolated-research-only`. Không thay đổi engine và dữ liệu của các môn khác.

## Nguồn và phương pháp

- 《梅花易數》, quyển một, “周易卦數”: 乾1 兌2 離3 震4 巽5 坎6 艮7 坤8. https://zh.wikisource.org/wiki/梅花易數/卷一
- Cùng quyển, “卦以八除”, “爻以六除”, “互卦起例”, “年月日時起例”: nguyên tắc chia dư và quẻ hỗ; “物卦起例（端法後天起卦）” mô tả vật tượng làm thượng quái, phương vị làm hạ quái, cộng số chi giờ để tính hào động. Tham chiếu bản phiên khắc trực tuyến, **chưa xác nhận đúng mọi truyền bản**.
- 《梅花易數》 quyển hai, “體用”: Thể–Dụng và quan hệ ngũ hành. https://zh.wikisource.org/wiki/梅花易數/卷二

## Đầu vào và phạm vi

`castByLaterHeaven({objectTrigram,directionTrigram,hourBranch})`: ba số nguyên hợp lệ, lần lượt 1..8, 1..8, 1..12. **Các phép nhận diện đồ vật và hướng thực tế thành một quái là việc của người nghiên cứu**, không có bộ nhận diện tự động trong V11.104. Chi giờ chỉ nhập dưới dạng số Tý=1 … Hợi=12; không suy từ giờ/phút dân dụng.

- Thượng quái = số quái vật tượng; hạ quái = số quái phương vị.
- Hào động = `(số vật + số phương vị + số chi giờ) mod 6`, số dư 0 đổi thành 6.
- Quẻ hỗ = hạ 2–3–4, thượng 3–4–5 (đếm hào từ dưới lên).
- Quẻ biến chỉ đảo một hào động, Thể là quái không chứa hào động; Dụng là quái chứa hào động.
- Bảng 64 quẻ, sáu hào, ngũ hành lấy từ chính các module Kinh Dịch/Mai Hoa đang có; **không chép lại bảng**.

## So sánh dị bản

`compareLaterHeavenWithTwoNumbers()` dựng hai hồ sơ trên cùng thượng/hạ quái: phép **hai số giản lược** hiện có dùng `(vật + phương vị) mod 6`; Hậu Thiên thêm chi giờ. Một quẻ chủ có thể đổi hào động, quẻ biến và Thể–Dụng; điều này **không có nghĩa cả hai phương pháp đều cùng mô tả một bài toán truyền thống**. Cấu trúc trả về chỉ ghi khác biệt, `verdict: null`.

## Kiểm toán

64 tổ hợp thượng/hạ quái × 12 giờ chi = 768 trường hợp; bao phủ 64 quẻ Văn Vương và sáu hào động ở mỗi cặp quái; kiểm tra đúng 1 hào biến, đúng hỗ quẻ, giữ nguyên Thể, quan hệ ngũ hành có hướng, không sinh kết luận dự đoán. Có kiểm thử đầu vào biên, URL lưu/khôi phục và module bảo vệ nguyên bộ máy cũ.

## Chưa đủ điều kiện triển khai như kết luận đã thẩm định

- Chưa xác minh bản in/phiên khắc, dị bản gán tượng vật, hướng thực tế, giờ đầu ngày.
- Không xác thực chứng nghiệm độ tin cậy của luận đoán, không chọn cát/hung hoặc ứng kỳ.
- Build, typecheck dự án và E2E trên PostgreSQL/Next.js cần dependencies và lockfile thật.
