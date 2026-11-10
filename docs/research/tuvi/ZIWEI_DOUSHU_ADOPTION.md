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


## Bổ sung r2 — từ 6 lên 12 điều kiện nghiên cứu (2026-11-10)

- Bộ classical-pattern-research.cjs hiện kiểm tra **12/49 chỉ mục**: **8 định quý, 4 định phú**, bằng hình học bản mệnh. Đây là danh mục nghiên cứu, không phải phán đoán đầy đủ 49 cách cục. 37 chỉ mục chưa kiểm chứng.
- Thêm sáu mục dựa trên quy tắc đối chiếu lib/ziwei/patterns-dinggui.ts: Nguyệt lạc Hợi cung, Nguyệt sinh Thương Hải, Minh châu xuất hải, Nhật Nguyệt đồng lâm, Vũ Khúc thủ viên và Cự Cơ cư Mão.
- Mọi nguồn GitHub trong kết quả chỉ đến commit tham khảo cố định 7922285d947b36610e7e31c232d8f1e2a0d0871d thay vì URL main dễ thay đổi nội dung.
- Giữ ba trạng thái structural-match, not-met, needs-review, và cấm suy từ điều kiện hình học thành kết luận cát/hung. Nếu thiếu sao hoặc vị trí sao không rõ, các kiểm tra phụ thuộc phải giữ unknown.
- Bộ kiểm thử Node mở rộng đối chiếu từng mẫu và phản chứng, trường hợp sao trùng tên nhưng sai lớp sao, đối chiếu Điền Trạch/Mệnh và không sửa dữ liệu lá số đầu vào. Trước khi gộp phải chờ GitHub Actions xác nhận typecheck và các thử nghiệm cần thiết.
- Không thêm menu hoặc một khu đọc mới: tái sử dụng bộ lọc và bảng chứng cứ đang có ở chế độ Chuyên sâu, cung Mệnh.

### Hạng mục còn phải đối chiếu

- Kiểm chứng đầy đủ 49 mục cần tách **Định tạp** (đại hạn/lưu niên) khỏi hình học bản mệnh; những mục bất khả thi hoặc đang tranh luận không bị chuyển thành nhãn đã thành cách.
- Cần bổ sung các nhóm sao được xác minh, quy tắc Không Vong theo trường phái và kiểm toán định nghĩa cát tinh trước khi xác nhận Nhật Nguyệt giáp Mệnh.
- Bản Tử Vi hiện tại không tự chọn lại trường phái hoặc thay thế thuật toán đang dùng.

## Bổ sung r3 — nâng phạm vi từ 12 lên 18 cách cục (10/11/2026)

- Đối chiếu thêm sáu mục nhóm **Định quý** trong `patterns-dinggui.ts` tại commit nguồn `7922285d947b36610e7e31c232d8f1e2a0d0871d`: **Phụ Bật củng chủ** (số 5), **Quân thần khánh hội** (6), **Tọa quý hướng quý** (9), **Khoa Quyền Lộc củng** (16), **Tử Phủ triều viên** (20), **Minh Lộc ám Lộc** (25).
- Tổng danh mục được ánh xạ **18/49** (Định quý 14/27, Định phú 4/6, Định bần 0/8, Định tạp 0/8). 31 mục chưa ánh xạ, trong đó có các mục bất khả thi hoặc đang tranh luận chưa đủ cơ sở chứng minh.
- Kiểm tra Tả/Hữu và Khôi/Việt bắt buộc có vị trí duy nhất trong lớp sao phụ nguyên cục, không đổi sao từ các lớp vận hạn; Tử Phủ bắt buộc đồng tọa ở Mệnh Dần/Thân; không nới điều kiện thành hội chiếu nếu nguyên tắc yêu cầu đồng cung.
- Với hai cách cục cần Tứ Hóa, phải có **đủ bốn Hóa nguyên cục** (Lộc, Quyền, Khoa, Kỵ) và tên sao nhận Hóa thống nhất giữa `houses[].tuHoa`, sao nguyên cục trong cùng cung, và `transformations` (nếu có). Dữ liệu thiếu/trùng/sai cung/sai sao nhận Hóa -> **needs-review**, không tự nhận đạt hay đổi bảng Tứ Hóa của engine. Không dùng Tứ Hóa lưu niên/đại hạn thay thế.
- Từ phiên bản r3, `classical-pattern-research.cjs` chỉ thêm lớp nghiên cứu; **không thay `tuvi.js` hoặc `tuhoa.js`**, chế độ Cơ bản, quyền Pro và kết quả lá số hiện hành.
- Bộ test `tests/v111650-tuvi-classical-research.test.cjs` có 23 trường hợp; xác nhận điều kiện đạt, các phản chứng không đồng cung/đối cung, sai lớp sao, bốn Hóa bị thiếu/trùng/lệch, dấu vết nguồn, tính bất biến của lá số. Cần chờ CI xác nhận trước khi gộp vào `main`.
- Nguyên tắc nghiệp vụ: “khớp cấu trúc” chỉ là chứng cứ tổ hợp sao trong một trường phái, **không phải** phán quyết giàu sang, năng lực, sức khỏe hay tương lai của người dùng.


## Bổ sung r4 — đối chiếu 20/49 cách cục (10/11/2026)

- Hai quy tắc vừa ánh xạ từ nhóm **Định quý** của nguồn nghiên cứu gắn cố định commit `7922285d947b36610e7e31c232d8f1e2a0d0871d`:
  - **Thất Sát triều đẩu** (mục 11): Thất Sát lớp chính tinh tại Mệnh, Mệnh ở Tý/Dần/Ngọ/Thân. Không tính Thất Sát chỉ hội chiếu, ở cung khác, thiếu vị trí hay nằm trong lớp sao khác.
  - **Phủ Tướng triều viên** (mục 19): Mệnh ở Dần hoặc Thân, Thiên Phủ và Thiên Tướng nguyên cục phân tọa **Tài Bạch/Quan Lộc**, cả hai chiều. Không lấy điều kiện tổng quát hai sao cùng hội Tứ chính, không nhận đồng tọa một cung.
- Phạm vi nghiên cứu được ánh xạ **20/49** (Định quý 16/27, Định phú 4/6, Định bần 0/8, Định tạp 0/8). Còn 29 mục cần nghiên cứu riêng; `structural-match` chỉ xác nhận quan hệ sao theo điều kiện đã mô tả, không kết luận số mệnh.
- Không sửa logic an sao tại `tuvi.js`, phép an Tứ Hóa, quyền tài khoản hoặc giao diện Cơ bản.
- Thêm 4 kiểm thử độc lập cho chiều an sao, sai địa chi Mệnh, sao trùng/sai lớp hoặc thiếu, phân biệt Tam phương và đúng Tài Bạch/Quan Lộc; tổng 27 trường hợp tại `tests/v111650-tuvi-classical-research.test.cjs`.
- Hai chỉ mục mới không đòi suy diễn độ sáng Miếu/Vượng/Hãm từ dữ liệu chưa xác minh. Các mục 8/12/15/17/22/23/26 và nhóm Định bần/Định tạp sẽ chỉ được đưa vào sau khi chuẩn hóa điều kiện nguồn, lớp sao, độ sáng và/hoặc vận hạn với bằng chứng đầy đủ.



## Danh mục đủ 49 cách cục — tách tra cứu học thuật và bộ đối chiếu

- `packages/interpretation/src/classical-pattern-catalog.cjs` ghi danh mục nguồn theo 4 nhóm và giữ mỗi mục một ID bền vững, trạng thái **do nguồn phân loại** (`derivable`, `disputed`, `unreachable`) cùng URL truy nguyên ghim commit. Không nhập nguyên lời giảng tham khảo.
- `summarizeClassicalCatalog(assessedIds)` chỉ đánh dấu mục đã có điều kiện trong engine Thiên Đồ, không suy đoán quy tắc cho mục chưa ánh xạ; không cho phép đánh dấu trùng ID, ID không có thật, mục bất đồng hoặc mục nguồn coi là bất khả thi.
- 49 mục của nguồn tại commit cố định hiện phân bố **34 có thể kiểm tra / 9 tranh luận / 6 chưa suy ra được**, theo chính nguồn và phạm vi bảng an sao của họ. Các nhóm lần lượt: Định phú 6, Định quý 27, Định bần 8, Định tạp 8.
- Giao diện `classical-pattern-research.tsx` đặt mục tra cứu trong phần **Chuyên sâu của cung Mệnh**, mặc định thu gọn, chia nhóm, có liên kết nguồn; không thêm tab hay nhân bản bộ kiểm tra.
- **Không** biến phân loại `derivable` thành `structural-match`, không tự xác nhận danh mục 49/49 đã hiện thực, không ghép vận hạn vào nguyên cục. Số đã ánh xạ được tính từ dữ liệu `auditClassicalPatternCandidates(chart).records`, nên vẫn chính xác trên bản tích hợp 20 cách cục.
- `tests/v111651-tuvi-classical-catalog.test.cjs` kiểm tra đủ 49 ID, phân bố nhóm, dẫn nguồn cố định, phạm vi vận hạn, bất biến dữ liệu và tính nhất quán với bộ đối chiếu thực. Cần Source Integrity, TypeScript, build và Full Stack nghiệm thu trước khi gộp PR.


## Tra cứu danh mục 49 cách cục bằng tên và trạng thái

- Bộ tra cứu trong chế độ Chuyên sâu được bổ sung tìm kiếm theo **ID nguồn, tên Hán, và tên tiếng Việt đối với những quy tắc đã có ánh xạ trong engine**. Các tên tiếng Việt được đọc trực tiếp từ đối tượng chứng cứ, không tạo thêm bảng ánh xạ trùng lặp, không suy đoán bản dịch đối với mục chưa đánh giá.
- Công cụ tìm kiếm hỗ trợ chữ Việt có dấu/không dấu; các lựa chọn trạng thái gồm tất cả, đã ánh xạ điều kiện, nguồn cho phép suy ra nhưng chưa ánh xạ, nguồn còn tranh luận, và nguồn chưa thể suy ra.
- Kết quả lọc chỉ ảnh hưởng giao diện trình bày; **không được sửa đánh giá cấu trúc** từ `auditClassicalPatternCandidates`, không tự gắn `structural-match` cho mục chưa thẩm định.
- Kết quả hiển thị rõ x/49 và báo khi không có mục phù hợp; sử dụng input/select có nhãn truy cập, focus-visible, tối ưu kích thước cho cảm ứng và màn hình nhỏ.
- `filterClassicalCatalog` là hàm thuần, có kiểm tra tham số, tạo kết quả bất biến; các ca kiểm thử mở rộng gồm 9 bài catalog về số lượng, tìm tên Hán/tên Việt/ID, dấu tiếng Việt, lọc trạng thái và dữ liệu không bị thay đổi.


## Bổ sung r5 — 22/49 điều kiện khảo sát và điều hướng chứng cứ (10/11/2026)

### Hai mục nghiên cứu bổ sung (không thay kết quả an sao)

- **Định quý 08 — Lộc Mã bội ấn (禄马佩印)**: Thiên Mã phải là sao năm ở Mệnh, Thiên Tướng phải là chính tinh ở Mệnh, Lộc Tồn hoặc Hóa Lộc bản mệnh xuất hiện ở cung Mệnh hay cung kế tiếp theo thứ tự địa chi. Với nhánh Hóa Lộc, chỉ nhận dữ liệu sau khi đối chiếu đủ bốn Tứ Hóa nguyên cục, đúng sao nhận Hóa, đúng cung và đúng danh sách `transformations`. Nếu Lộc Tồn bị trùng/sai lớp hoặc thiếu Tứ Hóa mà không thể quyết định nhánh thay thế: trả `needs-review`. Đây là **một phép đọc khả kiểm theo nguồn**, không đồng nhất với chân lý duy nhất của mọi trường phái; không dùng Hóa Lộc của đại hạn/lưu niên.
- **Định quý 23 — Kình Dương nhập miếu (羊刃入庙)**: Mệnh đóng Sửu/Thìn/Mùi/Tuất, Kình Dương thuộc lớp `auxiliaryStars` tọa Mệnh, có ít nhất một cát tinh nguyên cục đúng vị trí (Tả/Hữu, Xương/Khúc, Khôi/Việt, Lộc Tồn hoặc Thiên Mã) **hoặc** Hóa Lộc/Quyền/Khoa đã được kiểm chứng cùng Mệnh. Nếu không có cát tinh riêng và Tứ Hóa chưa đủ chứng cứ, kết quả là `needs-review`. Nhãn “nhập miếu” ở đây dựa vào **bốn địa chi theo bảng tham khảo**, chưa tuyên bố xác minh thang độ sáng của mọi hệ phái.

Tổng phạm vi: **22/49** đã có điều kiện đối chiếu (Định phú 4/6, Định quý 18/27, Định bần 0/8, Định tạp 0/8). **27 mục còn lại** chưa được ánh xạ. Các trường hợp `structural-match` chỉ có nghĩa điều kiện khảo sát khớp dữ liệu, **không phải khẳng định cách cục mang lại giàu sang, nghèo khó hay sự kiện đời người**. `expertReviewed` vẫn bằng `false`.

### Giao diện và kiểm thử

- Trong danh mục 49 mục tại giao diện Chuyên sâu cung Mệnh, các mục đã có quy tắc nay có liên kết “Điều kiện” để chuyển về khối chứng cứ chi tiết; không tạo tab hay thành phần đánh giá trùng lặp.
- Bộ `tests/v111650-tuvi-classical-research.test.cjs` có thêm kiểm thử: khớp vị trí Mã/Tướng/Lộc, Hóa Lộc được kiểm chứng, sai lớp sao, sai chi cung, sao trùng, dữ liệu Tứ Hóa thiếu/trùng/lệch, trường hợp có và không có cát tinh. Các kiểm thử hiện hữu được nâng kỳ vọng từ 20 lên 22.
- Không chỉnh `packages/astrology-engine/src/tuvi.js`, bảng Tứ Hóa, thuật toán vận hạn, phân quyền, paywall hay chế độ Cơ bản.
- Bằng chứng kiểm thử CI phải được kiểm tra trên SHA của PR trước khi gộp vào `main`; nếu CI chưa hoàn tất hoặc thất bại, **không coi giai đoạn r5 là đã nghiệm thu**.


## Bổ sung r6 — 24/49 điều kiện khảo sát, cung Thân và điều hướng chứng cứ (10/11/2026)

### Thêm hai quy tắc minh bạch theo dữ kiện bản mệnh

- **Định quý 15 — Hình Tù giáp Ấn (刑囚夹印)**: theo chú giải `patterns-dinggui.ts` tại commit tham khảo đã ghim, Thiên Hình và Liêm Trinh đồng cung Mệnh **hoặc** đồng cung Thân. Thiên Hình phải thuộc `additionalStars`, Liêm Trinh thuộc `stars`; không giả lập hai sao bằng lưu hạn. Dù tên cách có chữ “giáp”, chú giải đang đối chiếu yêu cầu **đồng cung**; không tự thêm điều kiện Thiên Tướng hoặc cắt rộng thành hội chiếu.
- **Định bần 05 — Tài dữ Tù cừu (财与囚仇)**: Vũ Khúc và Liêm Trinh lần lượt phân thủ Mệnh–Thân, chấp nhận cả hai chiều. Quy tắc chỉ có ý nghĩa mô tả vị trí của sao trong thư tịch; **không được đưa ra dự đoán về nghèo khó, thân phận hoặc tài chính cá nhân**. Thân trùng Mệnh không được tự tính thành phân thủ hai cung.

### Kiểm tra cung Thân an toàn

- Đọc cung Thân từ đúng **một** cờ `houses[].isThan === true`; các cờ còn lại phải là boolean `false`. Dữ liệu thiếu, trùng cờ hoặc không khớp `chart.than`/`chart.thanPalace` (khi có) -> `needs-review`.
- Không tự suy ra cung Thân từ `hour`, không thay kết quả trong `packages/astrology-engine/src/tuvi.js`, không sửa `transformations` hay các lớp sao.
- Sai lớp sao, sao trùng, mâu thuẫn cung, hoặc dữ kiện chưa đủ đều không được biến thành `structural-match`. Bộ nghiên cứu đọc dữ liệu nhưng không ghi ngược vào lá số.

### Giao diện và kiểm thử

- Số quy tắc: **24/49**, phân bố **Định phú 4/6, Định quý 19/27, Định bần 1/8, Định tạp 0/8**. 25 mục tiếp theo chưa được ánh xạ.
- Nút **Điều kiện** trong danh mục 49 mục mở bộ lọc `Tất cả` trước khi tìm kết quả, mở thẻ chứng cứ và cuộn tới đúng kết quả; tôn trọng `prefers-reduced-motion`. Tránh đường dẫn bị ẩn khi đang ở bộ lọc `Liên quan`.
- Ghi thêm 7 ca kiểm thử gồm hai chiều Mệnh–Thân, sao đồng/khác cung, sai lớp, sao trùng, thiếu/trùng cờ Thân, thông tin tổng hợp mâu thuẫn, bất biến lá số và hợp đồng điều hướng UI.
- Kết quả mới chỉ là **đối chiếu cấu trúc theo nguồn**. `expertReviewed: false` tiếp tục giữ nguyên. Không công bố hoàn tất 49/49, không chép dữ liệu diễn giải không rõ quyền sử dụng.
- PR chỉ được merge khi CI (Source Integrity, Full Stack và Production Acceptance) đạt trên chính head SHA. Không bỏ qua hoặc nới lỏng kiểm thử.


## Bổ sung r7 — 26/49 đối chiếu, chính tinh hãm địa và Không–Kiếp (10/11/2026)

### Nguyên tắc kiểm chứng độ sáng

- **Chỉ đọc bộ `packages/astrology-engine/src/star-strength.js` đã định phiên bản**, gồm 14 chính tinh × 12 chi; sử dụng `chart.mainStarStrengthRuleSet` cùng `houses[].mainStarStrengths` để xác nhận provenance. Không tính lại sao, không thay hoặc tự gán độ sáng từ trường phái của dự án nguồn.
- Một phép so sánh độ sáng chỉ được đánh dấu `met` khi `mainStarStrengthRuleSet` đúng và danh sách độ sáng trong cung khớp **từng chính tinh, từng mã cấp và từng thuộc tính nguồn** do `MainStarStrength.lookup` trả về. Thiếu/sai/trùng nguồn, thiếu trường, nhầm vị trí hoặc mã cấp -> `needs-review` khi thiếu chứng cứ.
- Không đồng nhất mức `D` (Đắc), `B` (Bình) với `H` (Hãm). Không coi bất kỳ bảng nào là chuẩn chung cho mọi trường phái.

### Hai mục tiếp nhận nghiên cứu

- **Định bần 06 — Phá Quân thủ Mệnh hãm địa (一生孤贫)**: Phá Quân phải là chính tinh độc nhất về vị trí tên sao trong đúng lớp `stars`, tọa Mệnh, với độ sáng `H` được đối chiếu theo `mainStarStrengthRuleSet` hiện hành. Nếu bảng thiếu hoặc mâu thuẫn -> `needs-review`. Đã có dữ liệu đầy đủ và kết quả khác Hãm -> `not-met`.
- **Định bần 08 — Lưỡng trùng Hoa Cái (两重华盖)**: Lộc Tồn và Hóa Lộc **nguyên cục** cùng tọa Mệnh, đồng thời Địa Không hoặc Địa Kiếp **nguyên cục** ở Mệnh. Vẫn yêu cầu xác nhận vị trí duy nhất của cả hai sao Không–Kiếp từ `advancedStars`, đối chiếu đủ 4 Tứ Hóa nguyên cục, và không nhận các lớp sao vận hạn.

Nhóm Định bần trong thư tịch dùng tên gọi cổ có thể mang hàm ý tiêu cực. Thiên Đồ **không suy luận mức độ giàu nghèo, giá trị con người hay định mệnh** từ quy tắc đối chiếu này; chỉ hiển thị cấu trúc sao và chứng cứ đã có trên lá số.

Tổng phạm vi r7: **26/49** (Định phú 4/6, Định quý 19/27, Định bần 3/8, Định tạp 0/8). Còn **23 mục** chưa có quy tắc nghiên cứu được ánh xạ. `expertReviewed` tiếp tục là `false`.

### Kiểm thử và giới hạn tích hợp

- Thêm kiểm thử sao Phá Quân tại vị trí Hãm/khác Hãm, thiếu phiên bản bảng, độ sáng sai/đổi nhãn, sai nguồn, thiếu bản ghi, sai lớp sao; xác minh bất biến dữ liệu đầu vào.
- Kiểm thử song song Địa Không và Địa Kiếp cùng Mệnh, sai cung, sai lớp, sao trùng, Lộc Tồn ngoài Mệnh, Hóa Lộc ngoài Mệnh, bộ Tứ Hóa thiếu/trùng/lệch.
- Sửa lời cảnh báo Định bần trên UI cho đúng phạm vi thực tế; không thêm tab hoặc tăng thao tác bắt buộc.
- Không chỉnh bộ tính `tuvi.js`, bảng Tứ Hóa `tuhoa.js`, database, quyền admin/Pro, thanh toán, engine vận hạn hoặc chế độ Cơ bản.
- Chỉ nghiệm thu sau khi Source Integrity, Full Stack và Production Acceptance đều PASS trên đúng SHA của PR; không tự động gộp khi còn bài kiểm tra chưa hoàn tất.


## Bổ sung r8 — 27/49 chỉ mục, Quyền Lộc sinh phùng (10/11/2026)

- Đã kiểm tra và phát hiện **Vũ Khúc thủ viên** (`dinh-quy-18`) và **Cự Cơ cư Mão** (`dinh-quy-24`) vốn đã có trong r7; tuyệt đối không cộng trùng số mục hoặc nhân bản quy tắc/giao diện.
- **Định quý 22 — Quyền Lộc sinh phùng (权禄生逢)**: hai Hóa Lộc/Quyền nguyên cục phải đồng tọa Mệnh. Mỗi sao nhận Hóa phải là chính tinh có vị trí duy nhất và hồ sơ độ sáng thuộc đúng bảng `somenh-14-main-stars-2026-09-18-v1`. Hai sao nhận Hóa phải cùng ở cấp **Miếu/Vượng** (`M`/`V`), không tự coi `Đắc` hay `Bình` tương đương.
- Nguồn `patterns-dinggui.ts` kiểm tra sao nhận Hóa “không Hãm”; riêng chú giải cổ dùng chữ Miếu/Vượng. Bản r8 cố ý chọn cách đọc *nghiêm ngặt hơn* (`M`/`V`) và đánh dấu rõ khác biệt trong `extra`. Không khẳng định rằng đây là quy ước chung của tất cả trường phái.
- Bộ kiểm chứng thêm yêu cầu `tuHoaRuleSet` chính xác bằng phiên bản `annual-tuhoa-tap-v4.0`, đọc can năm từ `chart.yearCanChi`, kiểm tra từng sao nhận Hóa so với `TuHoa.ROWS[yearStem]`. Dữ liệu thiếu/mâu thuẫn, Tứ Hóa trùng, trường phái sai, nhận Hóa từ sao phụ không có hồ sơ độ sáng: `needs-review`, không tự biến thành `structural-match`.
- Kiểm thử gồm khớp cấu trúc, độ sáng Đắc/Hãm, Hóa nằm ngoài cung Mệnh, sai can năm, sai phiên bản bảng, khác sao nhận Hóa, thiếu Tứ Hóa, sao sai lớp, dữ liệu độ sáng bị sửa và trùng chính tinh; đầu vào lá số không bị sửa.
- Phạm vi sau r8: **27/49** có điều kiện so sánh nghiên cứu (Định phú 4/6, Định quý 20/27, Định bần 3/8, Định tạp 0/8), còn 22 mục chưa được ánh xạ. Đây là diện bao phủ danh mục **không phải tỷ lệ hoàn thành website hay xác nhận chuyên gia**.
- Không chỉnh engine Tử Vi, bảng sao, các trang người dùng khác, cơ sở dữ liệu, phân quyền/Pro, thanh toán hay Tứ Hóa vận hạn. CI Source Integrity, Full Stack, Production Acceptance phải PASS trên đúng HEAD của PR trước khi merge.


## R9 — Xác minh Tuần/Triệt nguyên cục, không đánh đồng Không Vong (10/11/2026)

### Vấn đề dữ liệu
Danh mục gốc có các điều kiện **Không Vong**. Dữ liệu `obstructionMarkers` của Thiên Đồ ghi **hai dấu án ngữ Tuần/Triệt**, mỗi dấu che hai cung theo bản Tam Hợp đã định phiên bản. Không có cơ sở để suy ra rằng Tuần/Triệt là toàn bộ mọi loại Không Vong trong thư tịch; vì vậy **không tự mở khóa những cách cục đang thiếu điều kiện Không Vong**, kể cả khi cung Mệnh không có Tuần/Triệt.

### Lớp kiểm toán độc lập
- Module: `packages/interpretation/src/natal-obstruction-evidence.cjs` và declaration tương ứng. Dựa vào `advanced-placements-tam-hop-v11.6.0` của engine hiện tại; **không thay đổi thuật toán tính sao**.
- Xác minh `advancedStarRuleSet`, can chi năm, năm âm lịch, giới tính, giờ chi và giờ dân sự nếu có; phát hiện can chi trái âm dương, năm không khớp, giờ sai.
- Sinh lại hai cặp Tuần/Triệt từ bảng đã ghim, kiểm tra tên, căn cứ, phiên bản, hai địa chi và thứ tự; sau đó đối chiếu `obstructionMarkers` của **cả 12 cung**, không chỉ cung Mệnh.
- Dữ liệu thiếu, giả mạo, trùng hoặc không nhất quán -> `verified:false`, trả giải thích cụ thể; không sửa lá số.
- Trạng thái chỉ gồm **chứng cứ Tuần/Triệt tại Mệnh**, không đồng nhất với “Không Vong không tồn tại”. Kết quả được hiển thị trong cùng giao diện Chuyên sâu, không tạo thêm menu hoặc tab.
- Định quý 01 (Nhật Nguyệt giáp Mệnh) có thêm kiểm chứng nguồn Tuần/Triệt nhưng **điều kiện Không Vong đầy đủ vẫn `unknown`** và **không được tạo `structural-match`** chỉ nhờ cặp Tuần/Triệt.

### Nghiệm thu
- **Không tăng số quy tắc cách cục**: vẫn **27/49**, Định phú 4, Định quý 20, Định bần 3, Định tạp 0; các mục chưa ánh xạ vẫn là 22. Đây là cải thiện chất lượng kiểm chứng, không được ghi nhận là đã hoàn thiện thêm một cách cục.
- Test mới `tests/v111652-tuvi-natal-obstruction-evidence.test.cjs`: dữ liệu hợp lệ, thiếu dấu, thay đổi cung, đảo thứ tự, sai nguồn, trùng cặp, sai giờ/can chi/năm âm, bất biến đầu vào và trường hợp Không Vong còn bất định.
- Chỉ merge khi Source Integrity, Full Stack và Production Acceptance đều PASS trên SHA hiện tại; sau merge vẫn phải xác minh lại CI của `main`.
