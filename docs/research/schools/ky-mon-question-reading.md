# V11.110 — Đọc bàn theo câu hỏi: hợp đồng bằng chứng

**Ngày:** 12/10/2026 · Kế thừa nguyên trạng **Thời gia Chai Bổ – Chuyển Bàn** và bảng Môn Bách/Tam Kỳ Nhập Mộ Diễn Nghĩa đã chốt trong V11.109. Đây là lớp *đối chiếu câu hỏi có kiểm soát*, không thay đổi phép an bàn và không được coi là một trường phái luận đoán đã được chứng nhận.

## Ranh giới đầu vào và nguồn

1. Người dùng **tự chọn chủ đề** (công việc, tài chính, quan hệ, sức khỏe, đi lại, học tập, khác). Danh sách này chỉ nhóm câu hỏi, **không quyết định Dụng thần**.
2. Người dùng **tự chọn một biểu tượng Dụng thần** thuộc Môn thời bàn, Thiên Can thời bàn, Cửu Tinh thời bàn hoặc Bát Thần thời bàn. Danh sách đầy đủ hơn những ví dụ gợi ý trong tài liệu thứ cấp; app không có ánh xạ cứng `chủ đề → Dụng thần` và không tự chọn biểu tượng. Nếu chọn Thiên Cầm, chỉ coi là **ký Thiên Nhuế**, có cảnh báo riêng.
3. Người dùng có thể khai **cung tham chiếu do họ đã xác minh**; ứng dụng không tự xưng đã tìm được cung người hỏi/đối tượng. Chưa có cung tham chiếu phải báo thiếu, không tự dùng cung 1 hoặc ngày Can. Trung 5 không dùng làm cung tham chiếu thời bàn độc lập.
4. Khi thay thời bàn, chủ đề, câu hỏi, Dụng thần hay cung tham chiếu, hiệu lực xác nhận cũ bị hủy trên giao diện. Không chạy mô-đun luận khi chưa nhấn xác nhận.
5. Không lưu nội dung câu hỏi vào Thư phòng, URL, backend hoặc phân tích từ xa. Chỉ giữ trong trạng thái component đang mở.

Nguồn nghiên cứu của các lớp cấu trúc vẫn là `docs/research/schools/ky-mon-structural-signals.md`, gồm bản chép số Độn Giáp Diễn Nghĩa và dị bản Bảo Giám. Quy tắc ngũ hành cung của V11.110 là lớp so sánh kỹ thuật được định nghĩa rõ chiều, không phải khẳng định cùng được các sách đó ghi nguyên dạng. Bảng ca kiểm thử được nhập độc lập tại `tests/fixtures/qimen-v11110-relations-independent.json`.

## Thứ tự đọc chứng cứ

- Trước hết tái kiểm định chín cung, Can Chi, Thời bàn và dấu V11.109 qua `analyzeStructuralSignals` → `buildPalaceLedger`, từ chối mã bàn sai/chắp vá.
- Xác định Dụng thần trên **lớp thời bàn** (không dùng bản vị). Chỉ xử lý khi biểu tượng có đúng **một** cung biểu diễn. Nếu 0 vị trí hoặc nhiều vị trí, báo rõ, không đoán lại.
- Với cung tham chiếu ngoài Trung 5, so sánh ngũ hành **từ cung tham chiếu → cung Dụng thần**. Xét riêng **đối cung** của Dụng thần, không gộp hai quan hệ.
- **Thuận theo quy tắc hẹp**: cung tham chiếu *sinh* cung Dụng thần. **Nghịch theo quy tắc hẹp**: cung tham chiếu *khắc* cung Dụng thần. Cung đồng hành, Dụng thần sinh cung tham chiếu và Dụng thần khắc cung tham chiếu là quan hệ *trung tính/chưa định loại*, không tự biến thành dấu thuận/nghịch.
- Môn Bách có dấu và Tam Kỳ Nhập Mộ có dấu tại cung Dụng thần được trình bày trong cột **chứng cứ nghịch cấu trúc** và luôn kèm phát biểu giới hạn: dấu cấu trúc không dự đoán sự kiện. Không có dấu **không** tự sinh ra chứng cứ thuận. Tuần Không chỉ là dữ kiện cần xét riêng, không cộng điểm.
- **Thiếu dữ kiện**: chưa chọn cung tham chiếu; Thiên Can không biểu diễn (có thể vì ở Trung 5); thiếu thời bàn; Thiên Cầm chỉ được ký; thiếu vượng suy theo mùa/nguyệt lệnh, tổ hợp Can–Môn–Sao–Thần/ứng kỳ, độ chính xác thời điểm và địa điểm.

## Đối chiếu ngũ hành: chiều từ cung A đến cung B

| Quan hệ A → B | Mã | Cách phân loại tại cặp tham chiếu → Dụng thần |
|---|---|---|
| A và B đồng hành | `same` | Trung tính |
| A sinh B | `generates` | Thuận (trong phạm vi quan hệ này) |
| A khắc B | `controls` | Nghịch (trong phạm vi quan hệ này) |
| B sinh A | `generated-by` | Trung tính; khác chiều sinh |
| B khắc A | `controlled-by` | Trung tính; khác chiều khắc |

Tham chiếu kỹ thuật: Thủy sinh Mộc, Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy; Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc. **Mã chiều là mô tả so sánh, không phải cát hung tuyệt đối**.

## Bảo toàn ranh giới phương pháp

Không có phép chấm điểm hay tỷ lệ phần trăm, không suy kết quả thành/bại, không tự lắp dụng thần theo chủ đề, không trộn Chuyển Bàn và Phi Bàn. Phiên bản tiếp theo muốn thêm cách cục, vượng suy hay phép xác định ngày/giờ phải có quyết định trường phái và fixture độc lập trước thuật toán. Luồng hiện tại là chứng cứ có cấu trúc, không phải kết luận tương lai đáng tin cậy.
