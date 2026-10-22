# Bát Tự V11.96 — Thấu Can, Hội Chi, ứng viên biến cách (nghiên cứu)

**Trạng thái:** `deterministic-subroutine-only` · `isolated-research-only`; **không phán quyết thành cách/phá cách, hóa khí, vượng suy hoặc Dụng Thần**.

## Đầu vào

Nhận lá số `bazi-hko-jie-calendar-research-v11.94` đủ bốn trụ, `referenceJie.status = RESOLVED` và đã qua kiểm tra ràng buộc Tàng Can/Thập Thần của V11.95. Dùng `evaluatePatternEvidence(input)` để gọi chuỗi kiểm tra lịch và giờ; hoặc `buildPatternEvidence(chart)` với biểu đồ V11.94 đã cấu trúc hóa. Sát ±60 giây quanh Jie và ngoài vùng dữ liệu 2025–2027 trả **BLOCKED**.

## Phép xác định cấu trúc có thể kiểm toán

1. **Thấu can:** xét khí chính/phụ/dư trong Chi tháng và vị trí can xuất hiện trong **năm, tháng, giờ**. Nhật Can được ghi là trùng ký hiệu nếu có, nhưng **không dùng độc lập như bằng chứng thấu can ngoài Nhật Chủ**. Nếu khí phụ/dư lộ, chỉ sinh ứng viên biến cách. Khi chính khí cũng lộ, không khẳng định phụ khí lấn át chính khí.
2. **Tam Hợp:** Thân–Tý–Thìn (Thủy), Hợi–Mão–Mùi (Mộc), Dần–Ngọ–Tuất (Hỏa), Tỵ–Dậu–Sửu (Kim). **Tam Hội:** Dần–Mão–Thìn (Mộc), Tỵ–Ngọ–Mùi (Hỏa), Thân–Dậu–Tuất (Kim), Hợi–Tý–Sửu (Thủy). Để đánh dấu “đủ bộ ba” phải có đủ ba Chi **khác nhau tại ba trụ khác nhau**. Chỉ nhóm **bao gồm Chi tháng** mới là ứng viên ảnh hưởng Nguyệt Lệnh. Trùng chi hoặc thiếu một thành viên không được coi là “đủ bộ”.
3. **Can hợp, can xung, lục hợp, lục xung:** dùng bảng ký hiệu `bazi.js` V9.7, công khai từng cặp trụ. Các cặp xung chạm vào Tam Hợp/Hội tạo cờ `CONFLICT_REVIEW`, không mặc định xung phá hoặc hợp hóa. Một trường hợp có thể đồng thời có nhiều sự kiện.
4. **Điều kiện thành bại và cứu ứng:** ghi checklist 6 điều kiện phải thẩm định. Tất cả quyết định `pattern`, `formation`, `breakage`, `dayMasterStrength`, `usefulGod` bắt buộc **null**.

## Chưa đủ điều kiện

- Chưa chứng nhận bản văn/cách đọc chung của mọi trường phái, chưa thẩm định riêng hình thành và hóa cục theo vượng khí, tiết lệnh, thấu can, hợp-xung, khoảng cách và cứu ứng.
- Chưa có cơ sở để chọn cách cục ưu tiên nếu chính/phụ khí đều thấu, hoặc nhận định cách cục có thành/bại dựa trên tên Thập Thần.
- Dữ liệu Jie 2025–2027 được sao chép từ nguồn thứ cấp theo phút; chưa xác nhận từng dòng bản gốc HKO. Không dựa vào đây để tuyên bố độ chính xác thiên văn chuyên nghiệp.
- Không dùng tỷ lệ số lượng quan hệ hoặc tổng điểm ngũ hành để quyết định Dụng Thần; không tự bật module vào `apps/web`, `apps/api` hoặc engine công khai.

## Nguồn tài liệu phục vụ khảo cứu (để ở tài liệu nội bộ, không đưa URL trần lên UI)

- *Tử Bình Chân Thuyên* (子平真詮), “Luận Dụng Thần Biến Hóa”, https://www.zhaosir.online/Books/BookChapterDetail.aspx?did=267 — phân biệt biến do thấu can và do hội chi, có ca biến mà không mất bản cách.
- *Tử Bình Chân Thuyên*, bản đối chiếu: https://www.mingsage.com/zh/classics/zi-ping-zhen-quan/lun-yong-shen-bian-hua
- “Luận Dụng Thần Thành Bại Cứu Ứng”, bản giới thiệu tư liệu: https://www.aqioo.com/dlbzgjf/160014.html

## Kiểm chứng kỹ thuật

`tests/v1196-bazi-pattern-evidence.test.cjs` và `infrastructure/scripts/audit-bazi-pattern-evidence.cjs`. Không dùng các bài kiểm thử vòng/đối xứng tự sinh để tuyên bố chính xác học thuật độc lập.
