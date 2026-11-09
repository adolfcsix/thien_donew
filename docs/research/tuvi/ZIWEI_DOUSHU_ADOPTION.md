# Thiên Đồ — nghiên cứu đối chiếu Ziwei Doushu

Ngày đối chiếu: 2026-11-10. Tham khảo: https://github.com/Renhuai123/ziwei-doushu (nhánh main).

## Nguyên tắc

- Không thay `packages/astrology-engine/src/tuvi.js` hoặc quy tắc Tứ Hóa chỉ vì dự án khác cho kết quả khác. Trường phái cần được lựa chọn và kiểm chứng, không ép một bảng quy tắc thành đáp án tuyệt đối.
- Không đưa nguyên mã nguồn/giao diện hoặc bài giảng của dự án tham khảo vào Thiên Đồ. Chỉ hiện thực độc lập các kỹ thuật cần thiết, dẫn nguồn khi dùng dữ liệu được cấp phép.
- Mọi điều chỉnh đầu vào (múi giờ lịch sử, DST, chân thái dương, giờ Tý, tháng nhuận) phải có dấu vết, được người dùng xem và xác nhận trước khi thay đổi lá số.
- Cơ bản: xem lá số rõ ràng, ít thuật ngữ, không thêm thao tác bắt buộc. Chuyên sâu: mở khung phân tích nguồn, cấu hình trường phái và thí nghiệm ranh giới.
- AI chỉ giải thích kết quả do engine cung cấp, không bịa vị trí sao, trích dẫn cổ thư hay kết luận định mệnh.

## Những thành phần thực tế đã có ở Thiên Đồ

- Bộ tính Tử Vi: `packages/astrology-engine/src/tuvi.js`, `tuhoa.js`, các nhóm sao, vận hạn và nghiên cứu cung.
- Mô-đun kiểm tra lịch/giờ đổi ngày: `traditional-calendar-audit.cjs`; bộ xử lý múi giờ IANA đã có trong `natal-timezone.cjs` nhưng chưa đồng nghĩa Tử Vi đã áp dụng vào lá số.
- UI nghiên cứu trong `apps/web/src/features/chart/components/`: tam phương tứ chính, 12 cung, phi hóa, giải đoán đa sao, luận cứ truy nguyên.
- Kiểm thử hồi quy Tử Vi hiện có tại `tests/v1116435-a08-tuvi-calendar-safety.test.cjs` và các bài kiểm tra khác.

## Ưu tiên tích hợp

1. **Giai đoạn 1: Hiệu chỉnh giờ sinh như một mô-đun đối chiếu an toàn.** `solar-time-research.cjs` dùng gần đúng phương trình thời gian NOAA và hiệu chỉnh kinh độ với kinh tuyến trung tâm của múi giờ tiêu chuẩn. UI chỉ đọc, không sửa kết quả `Engine.calculate`, để tránh hồi quy âm thầm. Kiểm thử dữ liệu sai, đổi ngày, đổi chi giờ, UTC+7 và múi giờ khác. *Phạm vi commit này.*
2. **Giai đoạn 2: So sánh cấu hình trường phái**. Lập bảng ánh xạ giữa Tam Hợp Thiên Đồ và các biến thể được công bố trong `lib/ziwei/school-config.ts` của dự án tham khảo; mỗi cấu hình cần mã phiên bản, dữ liệu viện dẫn và lá số vàng kiểm chứng. Không công bố lựa chọn chưa được kiểm toán như là kết quả chính thức.
3. **Giai đoạn 3: Giải đoán có luận cứ**. Mỗi cách cục gồm điều kiện phải có, dấu hiệu hỗ trợ, phá cách, sao/cung liên đới, nguồn tham khảo và tình trạng kiểm chứng. Tái sử dụng giao diện luận cứ hiện có thay vì tạo tab trùng lặp.
4. **Giai đoạn 4: Kho nghiên cứu và AI**. Liên kết sao–cung–cách cục–trường phái; đưa trích dẫn và giới hạn diễn giải vào AI, không đưa nguyên dữ liệu giấy phép hạn chế lên hệ thống thương mại.
5. **Giai đoạn 5: Đối chiếu hàng loạt**. Test ma trận 12 giờ × 2 giới × các năm/leap-month/ranh giới ngày. Đối chiếu sai biệt theo quy tắc, báo rõ nguồn, không hứa tính đúng tuyệt đối.

## Chính sách nguồn và bản quyền

- Repository tham khảo nêu code theo MIT; nếu *sao chép hoặc sửa từ code có giấy phép MIT*, phải lưu thông báo bản quyền và giấy phép phù hợp. Phiên bản đầu triển khai độc lập theo công thức NOAA công khai, không chép module từ dự án tham khảo.
- Bộ giải đoán được công bố theo CC BY 4.0, có yêu cầu ghi công; cần kiểm tra giấy phép ở bản tải cụ thể và giới hạn đối với các trích dẫn nằm trong dữ liệu.
- Bản ghi lời giảng Ni Haixia thuộc CC BY-NC-SA 4.0 theo thông báo của dự án nguồn: không tự đưa vào gói Pro hoặc nội dung thương mại.
- Phần cổ thư có thể là công hữu theo mô tả nguồn, nhưng vẫn cần kiểm tra provenance, chất lượng văn bản và quy định ở nơi sử dụng.

## Tiêu chí nghiệm thu

- Trợ lý giờ sinh không tự động thay lịch hay giờ người dùng đã nhập.
- Khi kinh độ/múi giờ/giờ sinh không hợp lệ: báo lỗi rõ, không âm thầm chuyển về mặc định.
- Chuyển UTC+7, UTC−5, ngày kế/trước và chi giờ được kiểm bằng Node test.
- Được kiểm tra bằng typecheck, build, kiểm thử browser trên desktop và điện thoại trước khi merge.
- Chỉ khi Giai đoạn 2 hoàn tất mới mở tùy chọn trường phái có tác động trực tiếp đến thuật toán.

