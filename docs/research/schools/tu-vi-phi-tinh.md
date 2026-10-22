# V11.92 — Tử Vi: Tứ Hóa / Phi Hóa theo dị bản (nghiên cứu có giới hạn)

**Trạng thái:** `deterministic-subroutine-only` · **Quyền chạy:** `isolated-research-only` · **Không thay thế bảng Tứ Hóa của engine chính**.

## Đầu vào và vấn đề học thuật

Tứ Hóa: Hóa Lộc / Hóa Quyền / Hóa Khoa / Hóa Kỵ, được chỉ định bằng một Thiên Can. Phi Hóa từ cung can phải gắn với **vị trí sao đã an trong lá số thật**; không được suy ra vị trí sao từ tên sao, mượn sao hoặc từ mô tả văn học. Cần tách riêng tầng **năm sinh**, **năm xem** và **cung can**. Một biến thể của bảng không được bí mật thay đổi kết quả của biến thể khác.

Ba hồ sơ phục vụ đối chiếu, *không chứng nhận tính chính thống của từng truyền bản*:

| Mã | Đặc điểm so với bảng hiện tại | Mức tin cậy |
|---|---|---|
| `toan-tap-common` | Bảng 10 can × 4 hóa y hệt `packages/astrology-engine/src/tuhoa.js` hiện tại | Tương thích baseline; vẫn cần đối chiếu nguyên bản |
| `toan-thu-research` | Canh: Khoa Thiên Đồng, Kỵ Thái Âm (khác 2 ô) | Dị bản được tài liệu thứ cấp tổng hợp; chưa thẩm định sách gốc |
| `trung-chau-research` | Mậu: Khoa Thái Dương; Canh: Khoa Thiên Phủ; Nhâm: Khoa Thiên Phủ (khác 3 ô) | Dị bản tổng hợp; chưa kiểm chứng đủ nguyên bản và truyền thừa |

## Căn cứ kiểm tra ban đầu (không coi là bản in gốc)

- Hội Tử Vi Trung Hoa Dân Quốc, bài so sánh bảng 4 hóa ngày 4/11/2013: https://qqqtseng.pixnet.net/blog/posts/9292852613 — liệt kê khác biệt Mậu, Canh, Nhâm và tên các truyền bản.
- Bảng so sánh 2026: https://tradiculture.com/ziweisihuabiaowanzhengjiexi/ — cùng nhấn mạnh biến thể Canh và Mậu/Nhâm.
- Mô hình provenance Phi Hóa: https://wiki.openfate.ai/zh-hant/ziwei/transformations/four-transformations — mô tả nguồn can → sao → cung thật, tầng niên hạn.
- Bảng thông dụng độc lập: https://www.aizhanxing.com/wiki/eastern/ziwei-timing.html — 10 hàng dùng để so baseline.

**Yêu cầu trước nghiệm thu chuyên gia:** lưu bản scan/trang của 《紫微斗數全集》/《紫微斗數全書》 phù hợp bản quyền, kiểm tra cách ngắt câu từng quyết, so ít nhất hai nguồn độc lập cho phép Khoa, xác minh các đại diện truyền thừa. Nguồn web có thể dùng để định hướng nhưng chưa thay cho văn bản gốc.

## API nghiên cứu riêng

- `lookupFour(stem, profileId)` — tra bốn hóa theo can và bảng đã khai báo; không có mặc định ngầm nếu mã trường phái sai.
- `compareProfiles(a,b)` — trả về từng can, hóa, sao khác nhau; toàn bộ 10 can × 4 ô được duyệt.
- `buildFlights({palaces,scope,sourceBranchIndex,sourceStem,profileId})` — đồ thị bốn cạnh Phi Hóa; scope là `palace-stem`, `birth-year` hoặc `annual-year`.
- **Chỉ** các nhóm `stars` và `auxiliaryStars` từ 12 cung thật được phép làm vị trí sao; nhóm sao nghiên cứu chồng chéo không được nhân đôi.
- `STAR_NOT_LOCATED`, `STAR_MULTIPLE_PALACES` → trạng thái `unresolved`, không tạo chi giả.
- `selfTransformation`/`oppositePalace` chỉ áp dụng cho Phi Hóa từ cung can; không gắn nhãn tự hóa cho Tứ Hóa năm sinh/năm xem.
- Có nhãn nguồn (`scope`, `sourceStem`, `sourceBranchIndex`, `profileId`), kết quả thuần và đóng băng, tuyệt đối không chứa điểm số cát hung hay lời tiên đoán.

## Ca kiểm tra đi kèm

1. 40 ô bảng thông dụng **trùng tuyệt đối** bảng gốc `tuhoa.js` chưa bị chỉnh sửa.
2. Toàn Thư chỉ khác Canh Khoa/Kỵ; Trung Châu chỉ khác Mậu/Canh/Nhâm Khoa trong các phiên bản nghiên cứu này.
3. 12 cung × 3 lá số thử × 3 trường phái = 108 lượt đồ thị, mỗi lượt có 4 hóa tra thực tế; kiểm tra toàn bộ sao thực an có thể truy vết.
4. Cung trùng, số cung thiếu, Can sai, trường phái không được hỗ trợ hoặc dữ liệu sao thiếu phải báo lỗi/chưa xác định.
5. Các tầng năm sinh/năm xem tách khỏi cung can và không suy can từ ngày Gregorian thiếu quy tắc lịch.

## Chưa đủ điều kiện triển khai chính thức / công việc còn lại

- Chưa thẩm định văn bản cổ ở cấp trang; phân loại học thuật hiện là **research**.
- Chưa xử lý liên hoàn Phi Hóa, tứ hóa xung điệp, hồi đầu hóa hay thuật luận đoán của các phái; không được coi là một Phi Tinh luận bàn hoàn chỉnh.
- Không đổi engine natal, CSS, backend, phiên bản API hiện có; không công bố UI chính thức cho lựa chọn phái trước khi có kiểm định độc lập.
- Phân tích quan hệ theo quy ước cổ truyền không chứng minh khả năng dự báo thực nghiệm.
