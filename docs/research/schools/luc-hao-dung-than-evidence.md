# Lục Hào — Sổ đối chiếu Dụng Thần và Nhật–Nguyệt · V11.98

**Trạng thái:** `deterministic-subroutine-only` · `isolated-research-only`; không phải công cụ phán đoán khoa học.

## Phạm vi quy tắc có thể tính

Bảng đề tài giới hạn năm ngữ cảnh có đối tượng rõ: tài sản → **Thê Tài**; giấy tờ → **Phụ Mẫu**; chức vụ → **Quan Quỷ**; con cháu → **Tử Tôn**; anh chị em đồng bối → **Huynh Đệ**. Tham khảo mục “用神分類定例第一” của **《卜筮正宗》**. Đây là phép **gợi ý Lục Thân theo loại hỏi**, không phải phép chọn một hào Dụng Thần thực sự. Người nghiên cứu phải tự xác nhận và với các câu hỏi phức hợp, tình duyên, kiện tụng hoặc sức khỏe, module trả lỗi thay vì ánh xạ bừa. Chưa đủ điều kiện khái quát mọi trường phái.

Sau khi có gia đình Lục Thân được xác nhận, tra tất cả ứng viên hiện hoặc Phục Thần theo V11.97. Không loại ứng viên vì trùng. Dấu Nhật xung (`day.clash`) được tách riêng khỏi Nhật phá/Ám động vì hai khái niệm đó cần xét mạnh yếu và động/tĩnh. Nguyệt phá (`month.monthBreak`) trong bộ quy tắc này nghĩa là **hai chi lục xung về cấu trúc**, khi có Nguyệt Kiến được nhập thủ công; không kết luận “vô dụng”. Tuần Không (`xunVoid`) xuất phát từ Can Chi ngày hợp lệ. Tương tác Phi/Phục giữ chiều sinh khắc, ghi cả dấu của Phi Thần. Đầu vào hào động `movingPositions` là *người tự khai*, không giả lập quẻ biến.

Sổ ghi nhận `chosenUsefulGodLine=null`, `emergence=null`, `prosperity=null`, `auspiciousness=null`, `timing=null`. Điều này có chủ ý vì chưa đủ dữ kiện trường phái để luận **xuất phục, hưu tù, hợp phá, dụng thần đa hiện, ứng kỳ**. Không có dữ liệu lịch thì các dấu liên quan ngày/tháng trả `null`, không trả `false`. Khi nguồn tháng gần đúng (`calendar-utc7-noon-approx`) thì **toàn bộ dấu Nguyệt Phá trả `null`**; không tự gán tháng được nghiệm chuẩn.

## Ca đối chiếu và nguồn

- **《卜筮正宗》**: [十八論·用神分類定例](https://www.quanxue.cn/qt_mingxiang/boshi/boshi26.html); đối tượng hỏi có thể quyết định nguồn tham khảo Lục Thân.
- **《增刪卜易》**: [月将章](https://shuyuan.zhiming.life/read/%E5%A2%9E%E5%88%A0%E5%8D%9C%E6%98%93/16), giải thích Nguyệt kiến xung hào là nguyệt phá, nhưng có ngoại lệ thực hành nên đây chỉ là một nhãn điều kiện.
- **《增刪卜易》**: [日辰章（Wikisource）](https://zh.wikisource.org/zh-hans/%E5%A2%9E%E5%88%AA%E5%8D%9C%E6%98%93/17), phân biệt nhật xung, ám động và nhật phá theo tình trạng hào.
- Phục Thần: xem `luc-hao-phuc-than.md` (V11.97) và ca Thủy Lôi Truân/Khảm cung.

## Chưa đủ điều kiện

Chưa xác định duy nhất Dụng Thần cho câu hỏi hỗn hợp, chưa chứng nhận Nguyệt kiến bằng ephemeris, chưa có luật lâm thời xuất phục/cứu ứng, chưa xác định vượng suy hoặc cát hung. **Không tự động đưa mã nghiên cứu này vào giao diện sản phẩm**. Yêu cầu chuyên gia và ví dụ độc lập trước khi mở rộng.
