# Lục Hào V11.99 — Đối chiếu Lưỡng Hiện, Phi/Phục và 12 Jie

**Trạng thái:** `deterministic-subroutine-only`; `isolated-research-only`. Không đưa kết luận lên giao diện sản phẩm.

## Mục đích và Đầu vào

- Quẻ phải được lập bằng Bát Cung/Nạp Giáp chuẩn của hệ thống, đủ sáu hào.
- Năm phạm vi câu hỏi hẹp và **Lục Thân do người nghiên cứu xác nhận** (tái sử dụng V11.98). Đây không phải phân loại ngôn ngữ tự nhiên.
- Tùy chọn Can Chi ngày và Nguyệt Kiến được nhập thủ công (`manualContext`) và vị trí hào động do người nghiên cứu cung cấp.
- Tùy chọn ISO thời điểm **có timezone** để đối chiếu Nguyệt Kiến với bảng Jie 2025–2027. Không tự tính Can Chi ngày từ thời điểm này.

## Quy tắc / dữ liệu

1. Theo chương **兩現章** của *《增刪卜易》*, cổ pháp so sánh vượng/tĩnh/không phá/không không; tác giả trình bày ngoại lệ có trường hợp ứng vào hào nguyệt phá/tuần không. Vì vậy bộ kiểm tra chỉ lập sổ **những tín hiệu khác nhau** giữa hai ứng viên, **không tự xếp hạng**. `chosenUsefulGodLine=null`, mỗi cặp có `selected=null`.
2. Với Phục Thần, lấy nguyên dữ liệu Phi/Phục và ngũ hành từ V11.97, ghi `flyingVoid`, `flyingMonthBreak`, `flyingDayClash`, và trạng thái hào động **thuộc Phi Thần**. Phục Thần không tự được gọi là hào động.
3. 12 Jie tái sử dụng dữ liệu ở `packages/astrology-engine/src/reference/hko-jie-2025-2027.json`. Mỗi giao tiết là **độ chính xác công bố đến phút**, cần tránh ±60 giây. Chỉ khi trong phạm vi 2025–2027 mới tra ra Nguyệt Kiến; cùng UTC giữa múi giờ Việt Nam/Hồng Kông phải nhất quán.
4. Nếu Nguyệt Kiến người nghiên cứu nhập khác dữ liệu tham chiếu, trả lỗi và **không suy luận**. Khớp hai nguồn chỉ là `REFERENCE_CONSISTENT_NOT_CERTIFIED` vì dữ liệu Jie từ **bảng chép thứ cấp**, không phải bản gốc đã kiểm định từng dòng.

## Nguồn đối chiếu (tài liệu nội bộ, không hiển thị nguồn trên UI)

- [《增刪卜易》— 兩現章 (Thư viện Shidian)](https://www.shidianguji.com/book/XYXZSBY/chapter/1lzxsny7db6rt): cổ pháp và phản ví dụ do tác giả nêu.
- [《增刪卜易》— 伏神章 (Chinese Text Project)](https://ctext.org/wiki.pl?chapter=157683&if=en): các điều kiện xuất/không xuất khác nhau; **không thể suy chỉ bằng một dấu**.
- [HKO 2026 almanac index](https://www.hko.gov.hk/en/gts/astron2026/almanac2026_index.htm): trang để thẩm tra lại; chưa xác nhận trực tiếp từng mốc của bộ dữ liệu thứ cấp.
- V11.97: `docs/research/schools/luc-hao-phuc-than.md`; V11.98: `luc-hao-dung-than-evidence.md`; V11.94: `docs/research/BAZI_JIE_REFERENCE.md` (nếu hiện hữu).

## Chưa đủ điều kiện

- Chưa có quy tắc xác định tuyệt đối ưu tiên hào nào khi Lưỡng Hiện, đặc biệt dị bản chọn hào phá/không hoặc ngoại lệ theo việc hỏi.
- Chưa đủ quy tắc vượng suy, nhập mộ, xung hợp hóa, động biến, tương quan Phi/Phục cho **xuất phục** và ứng kỳ.
- Chưa thẩm định mốc Jie trực tiếp từ bản thiên văn chuẩn hoặc phép tính kinh độ Mặt Trời có sai số định lượng; dữ liệu thứ cấp cần kiểm tra.
- Chưa chứng minh sản phẩm chạy build/TypeScript/E2E; các thuật toán chỉ phục vụ kiểm chứng nghiên cứu.
