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



## Đã hiện thực trong nhánh nghiên cứu (2026-11-10)

### Cách cục có kiểm chứng điều kiện

- Đã bổ sung module packages/interpretation/src/classical-pattern-research.cjs và khai báo kiểu; không sửa engine an sao.
- Đã gắn ClassicalPatternResearch vào khu Chuyên sâu trong palace-reading.tsx, chỉ khi xem cung Mệnh; dùng chung phong cách thẻ và bộ lọc của conditional-pattern-evidence.tsx, không tạo menu trùng.
- Tổng danh mục tham khảo của bộ tứ 《Toàn Thư》 là 49 chỉ mục: Định phú 6, Định quý 27, Định bần 8, Định tạp 8. Bản đầu chỉ ánh xạ 6 điều kiện: Định phú 4 và Định quý 2; **không tuyên bố đã hiện thực cả 49**.
- Sáu chỉ mục: Nhật Nguyệt giáp Mệnh (chưa thể xác nhận Không Vong), Nhật xuất Phù Tang, Nhật Nguyệt giáp Tài, Tài Lộc giáp Mã, Nhật Nguyệt chiếu bích, Kim xán quang huy.
- Đầu ra phân biệt structural-match / not-met / needs-review, ghi từng điều kiện met / not-met / unknown, có liên kết tới tệp quy tắc của dự án tham khảo.
- Lớp nghiên cứu không sử dụng sao hạn hoặc phi hóa lưu niên làm bằng chứng cho hình học bản mệnh; không biến các hệ quy tắc có bất đồng thành một phép kết luận duy nhất.
- tests/v111650-tuvi-classical-research.test.cjs: kiểm tra sáu trường hợp hình học, sai lớp sao, sao trùng, dữ liệu sai và dữ liệu đầu vào không bị biến đổi; có thêm smoke test bằng lá số engine thật. Chưa được phép gọi đây là tính năng production khi CI, E2E và thẩm định trường phái chưa hoàn tất.

### Các độ sâu cần bổ sung tiếp theo

| Nhánh | Mục tiêu | Điều kiện chấp nhận |
|---|---|---|
| 49 cách cục | Mở rộng 6/49 sang danh mục đầy đủ; tách định tạp sang vận hạn | Mỗi mục có câu định nghĩa chuẩn, vị trí sao, giới hạn, trường hợp phản chứng và fixture thực tế; mục tranh luận phải đánh dấu |
| Tứ Hóa đa trường phái | Đối chiếu Canh/Nhâm, Tứ Hóa nguyên cục / đại hạn / lưu niên / tháng / ngày / giờ | Không đổi bảng gốc mặc định; cho xem sai khác và nguồn trước khi bật một bản quy tắc đã kiểm chứng |
| Quy ước thời gian | Múi giờ địa phương, DST lịch sử, kinh độ và chân thái dương, Tý sớm/muộn, tháng nhuận | Người dùng xác nhận mọi dịch chuyển; cùng một đầu vào có trace kết quả tính toán, báo vùng thiếu chứng cứ |
| 13 chủ đề luận giải | Tổng quan, tính cách, tình cảm, sự nghiệp, tài lộc, sức khỏe, huynh đệ, tử tức, thiên di, giao tế, điền trạch, phúc đức, phụ mẫu | Nội dung dựa trên sao/cung/điều kiện thật; dẫn xuất xứ, giới hạn, không tự suy diễn y khoa hoặc định mệnh |
| Kho cổ thư và học liệu | Lập chỉ mục liên kết lời chú, sao, cung, cách cục và điều kiện | Soát văn bản gốc, giấy phép và trích dẫn; không bê nguyên lời giảng giới hạn phi thương mại sang gói Pro |
| AI đọc lá số | Đưa chứng cứ, nguồn và cờ trường phái vào giải thích | Không tạo sao mới, không tự đổi quy tắc an sao, truy vấn theo quyền, hiển thị lý do và mức độ chắc chắn |
| Chất lượng UI/UX | Chế độ Cơ bản gọn, Chuyên sâu nhiều bằng chứng; tra cứu không ngắt quãng | Responsive điện thoại/máy tính, bàn phím, screen reader, reduced motion, xuất PDF/ảnh rõ nét |

### Vấn đề khác đang theo dõi

Workflow Full Stack của commit giai đoạn trước từng thất bại tại kịch bản Playwright Kỳ Môn: không tìm thấy nhãn “Tiết khí đã xác nhận” trong bước phục hồi form sau 30 giây. Đây là lỗi của luồng E2E khác với phạm vi mới, nhưng vẫn là **cổng chặn merge** nếu còn tái diễn. Không ghi nhận “đã đạt full CI” chỉ vì các kiểm thử Node của Tử Vi đạt.

### Chứng cứ và nguồn đối chiếu

- Repository: https://github.com/Renhuai123/ziwei-doushu
- Phân loại 49 cách cục: lib/ziwei/patterns-dingfu.ts, patterns-dinggui.ts, patterns-dingpin.ts, patterns-dingza.ts
- Quy tắc trường phái: lib/ziwei/school-config.ts; thời gian: true-solar-time.ts, clock-adjust.ts, lunar-solar.ts
- Dữ liệu giải đoán 13 chiều v4.0: mục Releases v4.0-13d, cần kiểm tra nguồn cấp phép, giới hạn trích lời giảng, khối lượng lưu trữ và sự lệch phiên bản khi sử dụng.
