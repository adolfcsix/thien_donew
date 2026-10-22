# Lục Hào — Phục Thần (Kinh Phòng Bát Cung) · V11.97

**Trạng thái:** `deterministic-subroutine-only` · **Tích hợp:** `isolated-research-only` · **Ưu tiên:** P0.

Không công bố dự đoán hoặc Dụng Thần tự động. Đây là sổ nghiên cứu các dữ kiện Nạp Giáp truyền thống, không phải bằng chứng tiên đoán khoa học.

## Đầu vào

1. Quẻ **chủ** gồm đủ sáu hào từ dưới lên trên, Nạp Giáp, Lục Thân và bản cung theo mô-đun Kinh Phòng hiện có.
2. **Một** Lục Thân do người đọc **chủ động chọn** theo mục đích nghiên cứu; không tự suy từ từ khóa trong câu hỏi.
3. Can Chi ngày và Nguyệt kiến nếu cần quan hệ theo ngày/tháng. Dữ liệu tự nhập được gắn `USER_SUPPLIED` chứ không phải dữ liệu thiên văn đã xác nhận.

## Thuật toán được triển khai

- Xác minh lại biểu diễn Nạp Giáp dựa trên quẻ gốc, ngăn dữ liệu hào hoặc bản cung bị thay đổi.
- Nếu Lục Thân đã chọn **có hào hiện**, trả về **toàn bộ hào hiện**, không thêm Phục Thần.
- Nếu Lục Thân **không hiện**, dựng quẻ **thuần** của bản cung (cả hai quái bằng quái của bản cung), tìm tất cả hào cùng Lục Thân; hào ở vị trí `n` trong quẻ thuần là **Phục Thần** tại vị trí `n` của quẻ hiện. Hào quẻ chủ ở cùng vị trí là **Phi Thần**.
- Ghi vị trí, Can–Chi, ngũ hành, Lục Thân, Thế/Ứng, phép Phi→Phục và Phục→Phi theo năm loại tương sinh/tương khắc có hướng. Hai hướng không được tráo đổi.
- Khi có Can Chi ngày, xét đồng chi, lục hợp, lục xung, Tuần Không. Quan hệ tháng chỉ ghi khi tháng được người dùng cung cấp tường minh; tháng trưa gần đúng chưa được xác minh bằng giờ giao tiết sẽ **không** được dùng như một Nguyệt kiến chuẩn.
- Mọi `usefulGod`, `prosperity`, `auspiciousness`, `timing` đều là `null`.

## Ví dụ độc lập cần đối chiếu

**Thủy Lôi Truân (水雷屯), Khảm cung, hỏi giả thiết Thê Tài**: sáu hào quẻ chủ không có Thê Tài. Tại quẻ thuần Khảm (坎為水), hào 3 là **Mậu Ngọ Hỏa — Thê Tài**. Quẻ hiện có **Canh Thìn Thổ** ở hào 3, do đó **Mậu Ngọ** phục dưới **Canh Thìn**. Vì **Hỏa sinh Thổ**, đây là trường hợp **Phục Thần sinh Phi Thần**, không phải Phi Thần sinh Phục Thần. Ghi chiều tương sinh chính xác, không tự suy hung/cát.

Bộ kiểm thử đối chiếu cách tra Phục Thần trên đủ 64 quẻ × 5 nhóm Lục Thân, bao gồm mọi trường hợp nhiều hào cùng Lục Thân và sai dữ liệu bị từ chối.

## Chưa đủ điều kiện

- Chọn Dụng Thần từ mục đích hỏi, ưu tiên khi hào hiện nhiều, hào động/biến hoặc những trường hợp các bản truyền khác nhau.
- Kiểm định khi nào Phục Thần có thể xuất hiện và các ngoại lệ trường phái.
- Điều kiện tổng hợp vượng/suy, nguyệt phá, nhật phá, phát động, hưu tù, trường sinh, mộ tuyệt, không vong, ứng kỳ.
- Xác minh tháng theo *thời khắc giao tiết chính xác* và múi giờ thực tế.
- Đối chứng sách in, dị bản và chuyên gia độc lập. Các liên kết dưới đây chỉ là nguồn tham khảo ban đầu, chưa thay thế đối chiếu văn bản.

## Nguồn nghiên cứu

- [斷易天機 卷三 — 論伏神](https://libokang.com/zh-hant/guji/liuyao/%E6%96%B7%E6%98%93%E5%A4%A9%E6%A9%9F/3/) — cần đối chiếu dị bản.
- [Các quy tắc Phi Phục và bản cung, Wuxi Zhouyi](https://www.wuxizhouyi.com/nd.jsp?id=611).
- [Ví dụ Thủy Lôi Truân – Phục Thần](https://www.yixiangqiankun.com/3724.htm).

## Phân ranh kỹ thuật

`apps/web/src/features/luc-hao/hidden-relative.cjs` là module CJS thuần nghiên cứu. Không sửa `na-jia.cjs`, `relative-focus.cjs`, trang `/luc-hao` hoặc API. Muốn đưa lên giao diện cần giai đoạn riêng có kiểm thử dữ liệu và cảnh báo phiên bản trường phái.
