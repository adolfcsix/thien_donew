# R43 — chứng cứ còn thiếu của ba cách cục liên quan Không Vong

**Trạng thái:** nghiên cứu chỉ đọc. Lập trên `main` sau nghiệm thu R42, độc lập với PR R41 đang chờ workflow R40.

## Mục đích

Tổng danh mục tham khảo có **49** chỉ mục. Thiên Đồ đã triển khai bộ điều kiện kỹ thuật cho **31 mục** (28 nguyên cục và 3 đại hạn), **chưa đồng nghĩa đã xác nhận cách cục theo học thuật**. Mười tám mục còn lại gồm **3** cần xác minh ngữ nghĩa/vị trí Không Vong theo nguồn, **9** còn tranh luận, **6** thiếu phương pháp suy ra đáng tin. R43 không tự tăng mốc này.

R43 làm rõ từng nguồn điều kiện tại **Định bần 01 · 生不逢时**, **Định bần 02 · 禄逢两杀** và **Định tạp 03 · 禄衰马困**. Với mỗi mục, tách:

- **Kiểm tra nội bộ:** vị trí sao chính/phụ, Tứ Hóa nguyên cục, đại hạn và các bước kiểm chứng đã hiện thực tại Thiên Đồ. Trạng thái met/not-met/unknown chỉ nói về từng kiểm tra, không nói về cách cục.
- **Proxy Tuần/Triệt:** vị trí dấu án ngữ ở địa chi Thiên Đồ, không tự đồng nhất với các nhãn `旬空/副旬/截空/副截` của nguồn.
- **Điều kiện nguồn bắt buộc:** kiểm chứng tương đương ngữ nghĩa, phép an theo trường phái và tính phù hợp trên chính lá số; **vẫn là unknown** và chưa được chuyên gia thẩm định.

Mỗi dòng đưa tên nguồn, nguyên nhân cần nghiên cứu thêm và liên kết tới đúng commit tham khảo đã khóa: `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`.

## Kiến trúc

- `packages/interpretation/src/classical-void-gap-ledger.cjs`: hàm thuần `buildClassicalVoidGapLedger` nhận **các báo cáo đã kiểm toán hiện có**: catalog, readiness, natal, period, voidGates. Không tính lại sao, không đọc profile, không gọi API, không lưu dữ liệu. Kiểm duyệt 49 mục không trùng ID, mốc 31/49, tập ba mục chưa được đánh giá, cờ nguồn và trạng thái Không Vong unknown. Nếu có điều kiện nguồn bị nâng thành đã kiểm chứng mà chưa có quy trình mới, throw thay vì xuất báo cáo sai.
- `classical-void-gap-ledger.d.cts`: khai báo kiểu kết quả bất biến cho web.
- Giao diện: `classical-pattern-research.tsx` dùng ngay **danh mục 49 cách cục đã có** trong chế độ Chuyên sâu, thêm một `details` đóng mặc định. Không thêm route, tab hoặc menu. Bên trong có ba mục nguồn và trạng thái nội bộ/proxy; liên kết tư liệu mở độc lập.
- CSS: các mục kết quả đọc được trên điện thoại, các vùng nhấn có focus rõ; không đổi style phổ quát của Thiên Đồ.
- Bài test: `tests/v111685-tuvi-r43-void-source-gap-ledger.test.cjs` dùng 20 lá số giả lập 10 năm Can × 2 giới tính và các kiểm tra dữ liệu hỏng/đếm sai/cờ chứng cứ giả. Bộ hồi quy R25 và R28 chạy kèm để bảo đảm ba điều kiện nguồn chưa được tự động xác nhận.

## Ranh giới nghiệm thu

**Cấm coi khớp hình học cặp chi là khớp ngữ nghĩa.** Dù 65 lá số giả lập R27 đã đối chiếu hình học hay R29/R30 đã chạy thật quy tắc nguồn, việc áp dụng tương đương vào từng lá số Thiên Đồ vẫn chưa được thẩm định. Công thức và văn bản gốc phải được kiểm chứng độc lập trước khi nâng một điều kiện nguồn từ unknown thành đủ chứng cứ.

R43 không đổi `tuvi.js`, bộ lịch, Tứ Hóa, engine, thuật toán đại hạn, quyền Pro, tài khoản, AI, cơ sở dữ liệu, hóa đơn, xuất PNG/PDF hay khả năng ghi lá số.

**Điều kiện gộp:** Source Integrity, workflow R43, Full Stack và Production Acceptance **5/5** đều PASS trên cùng SHA; không bỏ qua test và không thay mốc 31/49 để lấy PASS. Khi chuyển sang R44, ưu tiên lập bộ test độc lập đối chiếu **từng nhãn Không Vong, từng trường phái, bản lịch và lá số biên**, trước khi đề xuất thay đổi điều kiện kỹ thuật.
