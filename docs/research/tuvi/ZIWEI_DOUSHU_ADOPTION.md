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


## R10 — Tham Hỏa tương phùng: chứng cứ vị trí, chưa kết luận Miếu/Vượng (10/11/2026)

- **Định quý 17 — Tham Hỏa tương phùng (贪火相逢)** trong `patterns-dinggui.ts` tại commit tham khảo đã ghim yêu cầu **Tham Lang và Hỏa Tinh đồng thủ Mệnh và cùng Miếu/Vượng**. Chỉ có đồng cung không đủ xác nhận cách cục.
- Thiên Đồ hiện có bảng độ sáng `somenh-14-main-stars-2026-09-18-v1` cho **14 chính tinh**, trong đó có Tham Lang, **không bao gồm Hỏa Tinh**. Vì vậy không suy diễn độ sáng Hỏa từ bảng 14 chính tinh, không coi địa chi có Hỏa là đã “nhập miếu”.
- Module `natal-fire-evidence.cjs` tính lại vị trí 4 sao Hỏa/Linh/Không/Kiếp bằng `advanced-placements-tam-hop-v11.6.0` theo can chi, giờ chi, giới tính, năm âm và giờ dân sự (khi có), đối chiếu cả mảng `advancedStars` tổng hợp và `advancedStars`/`advancedStarDetails` tại đủ 12 cung. Dữ liệu thiếu/sai/trùng/thay đổi hồ sơ nguồn -> `verified:false`, không tự công bố khớp.
- Có thể đối chiếu vị trí Tham Lang thuộc lớp `stars`, vị trí Hỏa Tinh thuộc lớp `advancedStars`, độ sáng chính tinh Tham Lang có phiên bản nguồn và tình trạng Tham Lang ở `M`/`V`. **Kiểm tra độ sáng Hỏa Tinh luôn `unknown`**, nên mục này **không bao giờ xuất `structural-match` trong r10**, dù vị trí hợp lệ và Tham Lang ở Miếu/Vượng.
- Phạm vi danh mục: **28/49 mục có bộ điều kiện khảo sát** (Định phú 4/6, Định quý 21/27, Định bần 3/8, Định tạp 0/8). Trong số 28 có ít nhất một mục còn **thiếu điều kiện cốt lõi**, vì vậy số này là độ bao phủ nghiên cứu, **không phải 28 cách cục đã được xác nhận**. Còn 21 mục chưa ánh xạ.
- Giao diện hiển thị chứng cứ Hỏa Tinh gọn trong Chuyên sâu; không thêm tab thừa, không đưa phần chưa thẩm định vào Cơ bản.
- Kiểm thử r10 có các ca vị trí đúng/sai, Mệnh khác cung, sao sai lớp/trùng, can chi/giờ sai, nguồn giả, bảng độ sáng Tham Lang bị sửa, bất biến đầu vào và bảo đảm không phát sinh kết luận thiếu chứng cứ. Không sửa `tuvi.js`, quyền Pro, dữ liệu người dùng hay thanh toán.
- Chỉ merge sau khi Source Integrity, Full Stack và Production Acceptance 5/5 PASS trên đúng HEAD SHA; cần nghiệm thu lại trên `main` sau merge.


### Cùng đợt r10: ổn định WebKit sau r9

- Một lần Production Acceptance trên `main` r9 phát hiện WebKit báo lỗi access control khi điều hướng từ đăng ký/đăng nhập sang `/chart` đối với request `/api/analytics/page-view` và `/api/community/premium-sections`, dù PR r9 trước merge từng PASS. Đây là hồi quy được ghi nhận, không được coi là hệ thống đã ổn định toàn phần.
- Với `page-view-recorder.tsx`, dùng `keepalive:true` cho **POST telemetry ẩn danh** có payload chỉ gồm UUID sự kiện, `credentials:'omit'`; không bắt browser giữ request bằng một AbortController có thể bị hủy khi chuyển trang.
- Với `PremiumLock`, dùng `keepalive:true` cho **GET đọc trạng thái biểu tượng khóa** kèm deadline 12 giây, không ghi dữ liệu. Phần `PremiumGate` **vẫn giữ AbortController và xác minh quyền trên server**. Không sửa endpoint phân quyền, CSRF, CORS hoặc giao dịch.
- Giữ bài kiểm thử WebKit nghiêm ngặt về `pageerror`; thêm assertion ngăn việc vô tình xóa `keepalive` trên hai request này.
- Cả Source Integrity, Full Stack và Production Acceptance (bao gồm WebKit trên `main`) cần được kiểm chứng sau merge trước khi tuyên bố lỗi đã giải quyết ổn định.


## R11 — Hồ sơ so sánh độ sáng Tham Lang/Hỏa Tinh/Linh Tinh theo trường phái (10/11/2026)

### Kiểm chứng mã nguồn và giới hạn
- Nguồn đã ghim: `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`; `lib/ziwei/school-tables.generated.ts` khai báo `SB_QS` (1-based, cột 0 rỗng, các cột 1–12 từ **Tý**). `school-data.ts` ánh xạ `Tham Lang` = ID 9, `Hỏa Tinh` = 23, `Linh Tinh` = 24, và cấp độ `1=Miếu, 2=Vượng, 3=Đắc, 4=Lợi, 5=Bình, 6=Bất, 7=Hãm`.
- **Hồ sơ QS tham khảo (Tý → Hợi):** Tham Lang `2,1,5,4,1,7,2,1,5,4,1,7`; Hỏa Tinh `7,3,1,4,7,3,1,4,7,3,1,4`; Linh Tinh `7,3,1,4,7,3,1,4,7,3,1,4`.
- **Sai khác cần thẩm định:** `SB_QS` trong mã nguồn có hai dãy Hỏa/Linh giống nhau, nhưng `lib/ziwei/algorithm.ts` mô tả một bảng độ sáng Linh Tinh hiệu chỉnh riêng ở cấu hình mặc định. Đây có thể là lựa chọn trường phái khác nhau, **không thể gộp thành một bảng chân lý** và không được lặng lẽ thay bộ độ sáng của Thiên Đồ.
- Module `packages/interpretation/src/classical-brightness-comparison.cjs` cung cấp `lookupQS` và `compareQSBrightness` bất biến, trả nguồn commit, tên trường phái, vị trí và cấp độ. Chỉ đọc dữ liệu đã qua `auditNatalFirePosition`; thiếu dữ liệu trả `available:false`. `mayConfirmClassicalPattern` luôn `false`, `expertReviewed` luôn `false`.
- UI chỉ bổ sung **một mục thu gọn bên trong bằng chứng Hỏa Tinh** ở Chuyên sâu; mặc định đóng, truy cập bàn phím, không tạo tab/menu mới. Hiển thị nguồn QS và mã khác biệt, không mạo nhận đã thẩm định độ sáng.
- Bản đối chiếu không được dùng để đổi `mainStarStrengthRuleSet`, không sửa `advanced-placements.js`, không mở khóa Tham Hỏa tương phùng, không gắn nhãn số mệnh hoặc sửa quyền Pro.
- **Số chỉ mục ánh xạ không tăng:** vẫn **28/49** (4 Định phú, 21 Định quý, 3 Định bần, 0 Định tạp); vẫn còn 21 chỉ mục chưa ánh xạ. Không đếm hồ sơ QS là một quy tắc cách cục mới.

### Kiểm thử và nghiệm thu
- `tests/v111655-tuvi-school-brightness-comparison.test.cjs`: 3 ma trận 12 ô, hệ chỉ số Tý, phân biệt Miếu/Vượng, commit nguồn, khác biệt Linh Tinh, đầu vào bất biến, thiếu dữ liệu, không nâng trạng thái cách cục, UI không trộn bảng QS vào kết luận.
- Merge vào main chỉ sau khi Source Integrity, Full Stack, Production Acceptance cùng PASS trên HEAD SHA; xác minh lại CI sau merge.


## R12 — So sánh từng cung của Linh Tinh giữa hai bảng cùng nguồn (10/11/2026)

### Bằng chứng nguyên bản và phép quy đổi
- Nguồn ghim: `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`. `lib/ziwei/school-tables.generated.ts` chứa dãy `SB_QS[24]` theo **Tý→Hợi**: `7,3,1,4,7,3,1,4,7,3,1,4`, với nhãn `7=Hãm,3=Đắc,1=Miếu,4=Lợi`.
- `lib/ziwei/algorithm.ts` chứa `DEFAULT_BRIGHTNESS['铃星']` theo **Dần→Sửu**: `庙,利,得,得,庙,得,得,得,庙,陷,陷,陷`. Đã quy đổi vào thứ tự **Tý→Hợi** và chuẩn hóa tên cấp độ bằng hàm thuần dữ liệu trong `classical-brightness-comparison.cjs`.
- Hai bảng khác nhau tại **5/12 cung**: **Sửu** (QS Đắc / mặc định Hãm), **Thìn** (Hãm / Đắc), **Mùi** (Lợi / Đắc), **Thân** (Hãm / Đắc), **Hợi** (Lợi / Hãm). Bảy cung còn lại có cùng nhãn.
- Đây là **hai cấu hình trong cùng repo nguồn**, chưa thể từ sự khác biệt suy ra cái nào đúng hoặc áp dụng cho lá số Thiên Đồ. Cờ `adopted:false`, `expertReviewed:false` và `mayConfirmClassicalPattern:false` được giữ bất biến. Vẫn không có bảng độ sáng Hỏa Tinh được chuyên gia phê duyệt để kết luận Tham Hỏa tương phùng.

### UX và kiểm thử
- Ở phần Chuyên sâu → chứng cứ Hỏa Tinh → đối chiếu trường phái, ưu tiên bảng gọn **5 cung có khác biệt**. Có mục phụ **Xem đủ 12 cung** đóng mặc định, chú giải nguồn, đường dẫn đối chiếu và vị trí Linh Tinh của lá số hiện tại khi đã kiểm chứng.
- Bảng dùng tiêu đề cột/dòng có ngữ nghĩa, hỗ trợ thao tác bàn phím, văn bản có thể cuộn ngang khi màn hình hẹp; không tạo thêm menu/tab, không tăng hiệu ứng gây rối.
- `tests/v111656-tuvi-linh-reconciliation.test.cjs`: xác nhận hai dãy gốc và chỉ số bắt đầu, đúng 5 vị trí khác nhau, dữ liệu bất biến, hành vi thiếu/trùng nguồn, engine tạo lá số thật, không cho giá trị tham khảo đi vào logic xác nhận cách cục, không biến bảng thành cấu hình hệ thống.
- Số mục có điều kiện khảo sát **không tăng**: **28/49**, trong đó Tham Hỏa còn điều kiện độ sáng chưa được xác minh. Không sửa engine, cơ sở dữ liệu, Tứ Hóa, tài khoản, Pro hoặc thanh toán.
- Chỉ gộp khi Source Integrity, Full Stack và Production Acceptance đều PASS trên HEAD SHA hiện hành; kiểm tra lại CI của `main` sau merge.


## R13 — Bộ lọc chứng cứ theo trạng thái và giải thích tiến độ từng mục (11/11/2026)

### Phạm vi
- Chỉ bổ sung **lớp trình bày** cho 28 mục nghiên cứu đã có điều kiện. Không thêm cách cục mới, không sửa bảng an sao, Tứ Hóa, độ sáng, quyền người dùng, Pro hay hệ thống thanh toán.
- `classical-evidence-workbench.cjs` đếm các điều kiện ở 3 trạng thái: `met` (đã quan sát), `not-met` (chưa đáp ứng), `unknown` (chưa xác minh). Hàm thuần dữ liệu đối chiếu lại trạng thái tổng: **có `not-met` -> không khớp; nếu không và có `unknown` -> cần thẩm định; chỉ khi không còn `unknown`/`not-met` -> khớp cấu trúc đang triển khai**. Sự đồng thuận của điều kiện cấu trúc **không có nghĩa cách cục đã được chuyên gia xác nhận**.
- Năm bộ lọc không đổi dữ liệu: **Liên quan**, **Khớp cấu trúc**, **Cần thẩm định**, **Chưa khớp**, **Tất cả**. Hiển thị số mục tương ứng, số điều kiện đã quan sát và số điều kiện không đủ dữ liệu hoặc chưa đáp ứng ngay trong mỗi mục có thể mở.
- UI vẫn nằm ở panel Chuyên sâu đã có, không tạo tab hoặc trang riêng. Bộ lọc có `aria-pressed`, vùng thông báo kết quả `role=status` và `aria-live=polite`, giữ thao tác chuyển từ danh mục 49 cách cục tới mục đã ánh xạ bằng nút `Điều kiện`. Nút không gây thay đổi dữ liệu hoặc quyền truy cập.
- Module đối chiếu chỉ đọc `records` từ `auditClassicalPatternCandidates`; kiểm tra mã ID, trùng lặp, trạng thái thiếu hoặc mâu thuẫn, đóng băng số liệu và danh sách lọc để hạn chế sai khác giữa UI và dữ liệu.
- Bài kiểm thử: `tests/v111657-tuvi-evidence-workbench.test.cjs` bao phủ năm bộ lọc, ưu tiên phủ định trước thiếu dữ liệu, dữ liệu lỗi/trùng, chart sinh từ engine, giữ chart bất biến, giao diện accessible và chuyển tới điều kiện.
- **Giữ nguyên 28/49 mục được ánh xạ**, không nâng số lượng dựa trên thay đổi UI. Đặc biệt Tham Hỏa tương phùng còn thiếu thẩm định độ sáng Hỏa Tinh nên vẫn không được tự xác nhận.
- Chỉ merge nếu Source Integrity, Full Stack và Production Acceptance đều PASS trên HEAD SHA, và xác minh lại CI trên main sau merge.


## R14 — Tìm theo sao và điều kiện trong danh mục hiện có (11/11/2026)

- Mở rộng **ô tìm kiếm đã tồn tại** trong danh mục 49 cách cục: bên cạnh tên gốc, tên Việt, mã và nhóm, người dùng có thể tìm theo tên sao và nhãn điều kiện của **28 mục đã được ánh xạ**. Không tạo menu, tab hoặc ô tìm kiếm trùng chức năng.
- `evidenceTerms` chỉ được lấy từ diễn giải phương pháp và nhãn kiểm tra cố định của kết quả nghiên cứu; **không** lập chỉ mục chi tiết vị trí sao theo lá số, ngày sinh hay dữ liệu cá nhân. Chuỗi tìm kiếm giữ cơ chế không phân biệt dấu tiếng Việt, hỗ trợ ký tự Trung Quốc, không xử lý biểu thức chính quy do người dùng nhập.
- Dữ liệu tìm kiếm chỉ tác động lớp danh mục. Không thêm cách cục mới, không thay trạng thái `assessed`, `sourceStatus`, kết quả `structural-match`, bộ an sao, Tứ Hóa hoặc quyền truy cập. Không gán từ khóa điều kiện cho các mục chưa ánh xạ/đang tranh luận/không thể suy ra.
- Test r14 đối chiếu tìm kiếm theo tên sao có dấu và không dấu, chặn nội dung giả gán cho mục chưa ánh xạ, kiểm tra input không hợp lệ, dữ liệu lá số bất biến và đảm bảo tìm kiếm không thay đổi danh mục nguồn.
- Chỉ merge khi Source Integrity, Full Stack và Production Acceptance đều PASS trên chính commit HEAD hiện hành, sau đó tiếp tục kiểm tra trên `main`.


## R15 — Minh bạch điều kiện còn thiếu trước khi mở rộng cách cục (11/11/2026)

- Bộ **28/49 mục có điều kiện nghiên cứu** vẫn giữ nguyên; 21 mục chưa ánh xạ gồm **6 nguồn coi là có thể kiểm tra, 9 còn tranh luận, 6 chưa thể suy ra**. Sáu mục có thể kiểm tra nhưng chưa ánh xạ gồm **2 nguyên cục (Định bần 01/02)** và **4 vận hạn (Định tạp 01/02/03/08)**.
- `classical-research-readiness.cjs` tạo báo cáo chỉ đọc, tính từ danh mục thực tế thay vì cố định tỷ lệ hoàn thành. Từng mục trong sáu trường hợp có *điều kiện tiên quyết nghiên cứu* được mô tả ngắn và bám quy tắc nguồn đã ghim, không tạo kết quả cát/hung.
- Hai mục Định bần cần thống nhất cách hiểu **Không Vong** từ sáu sao nguồn và đối chiếu đúng với dấu Tuần/Triệt đang có trong Thiên Đồ: **không được coi là đồng nghĩa**. Với Định bần 02 còn cần bảo đảm Lộc Tồn/Hóa Lộc, Địa Không và Địa Kiếp cùng đúng lớp và cung.
- Bốn mục Định tạp yêu cầu tách khỏi kiểm tra nguyên cục: xác minh bảng đại hạn, vị trí cung theo địa chi, tiêu chí cường/nhược và sao hội/Không Vong có phiên bản. Chưa lập quy tắc đại hạn từ bảng bản mệnh chỉ để tăng số mục hoàn tất.
- Giao diện dùng chính **danh mục 49 cách cục trong panel Chuyên sâu**; hiển thị số lượng động và thông tin điều kiện còn thiếu chỉ ở sáu mục có thể tiếp tục, không thêm tab hoặc menu mới. Các mục tranh luận/chưa thể suy ra giữ nguyên nhãn và liên kết nguồn.
- Test r15 xác nhận đúng 21 mục chưa ánh xạ, 6 chướng ngại có căn cứ, trạng thái bất biến, fail-closed khi thiếu quy trình đối chiếu và bất biến lá số thực. Không thay engine, Tứ Hóa, DB, quyền Pro, AI hoặc thanh toán.
- Chỉ gộp khi Source Integrity, Full Stack và Production Acceptance (5/5) **đồng thời PASS trên đúng HEAD**, sau đó kiểm tra lại `main`.


## R16 — Kiểm toán hình học 12 đại hạn trước khi nghiên cứu Định tạp (11/11/2026)

- Bổ sung module thuần `classical-period-geometry.cjs` chỉ đọc lá số. So khớp quy tắc chu kỳ có phiên bản (`cycles-tam-hop-fixed-anchor-v5.0`), Can Chi năm gốc, Cục, cung Mệnh, hướng thuận/nghịch, vị trí 12 địa chi và 12 khoảng tuổi mụ liên tiếp, cùng dữ liệu `houses[].daiHan` đã trình bày.
- Khi dữ liệu thiếu, bị trùng, lệch thứ tự, sai hướng, sai tuổi bắt đầu/kết thúc hoặc không khớp bản ghi từng cung, báo **chưa xác minh cấu trúc** thay vì tự điều chỉnh chart. Kiểm tra toàn bộ theo địa chi, không đồng nhất vị trí mảng cung với địa chi.
- Dù kiểm toán hình học đạt, **không** tự cho phép phán đoán Định tạp: kết quả chỉ là tính nhất quán *nội bộ Thiên Đồ*, không xác minh các tiêu chí cung mạnh/yếu, độ sáng, Lộc–Mã, Không Vong hay quan điểm trường phái của nguồn.
- Hiển thị một ghi chú gọn ngay nhóm **Định tạp** của danh mục 49 mục trong panel Chuyên sâu sẵn có; không thêm tab, không thay trang Cơ bản, không thêm điều kiện vào 28/49 mục đã đối chiếu.
- Test `tests/v111660-tuvi-period-geometry.test.cjs`: chart engine thật (Nam/Nữ), tamper từng trường quan trọng, không đổi lá số, kiểu đầu ra bất biến, UI không lặp và không tuyên bố đã thẩm định vận hạn.
- Không chỉnh `tuvi.js`, `cycles.js`, Tứ Hóa, DB, Pro, tài khoản, AI hoặc thanh toán. Chỉ merge sau khi ba workflow Source Integrity, Full Stack, Production Acceptance (5/5) PASS trên đúng HEAD SHA.


## R17 — Hai mục Định bần: chứng cứ từng phần theo source đã ghim (11/11/2026)

- Đã đối chiếu chính xác `patterns-dingpin.ts` tại commit `7922285d947b36610e7e31c232d8f1e2a0d0871d`: mục 01 yêu cầu Liêm Trinh thủ Mệnh và *Không Vong*; mục 02 yêu cầu Lộc Tồn **hoặc** Hóa Lộc thủ Mệnh, đồng cung Địa Không **và** Địa Kiếp và *Không Vong*. Không được nới điều kiện 'và' thành 'hoặc'.
- Nguồn quy ước sáu loại sao Không Vong là `旬空 / 副旬 / 截路 / 截空 / 空亡 / 副截`, khác với cặp dấu án ngữ `Tuần / Triệt` đang được Thiên Đồ xác minh. Vì thế cả hai mục **chưa được ánh xạ đầy đủ**, không thay đổi `records` hoặc tỷ lệ **28/49**.
- Chứng cứ từng phần được kiểm tra ở lớp sao đúng nguồn: Liêm Trinh (`stars`), Lộc Tồn (`auxiliaryStars`), Hóa Lộc nguyên cục có phiên bản, và Địa Không + Địa Kiếp đã được kiểm toán an sao theo Can Chi/giờ sinh. Dữ kiện thiếu/mâu thuẫn trả `unknown`, không tự xác nhận kết quả.
- Trong danh mục 49 cách cục hiện có, hai mục hiển thị **'Đã đối chiếu một phần · chưa ánh xạ'**, có thể mở danh sách điều kiện mà không tạo thêm menu hay tab. Mục vẫn thuộc sáu nguồn có thể nghiên cứu, chưa được chuyển sang `assessed`.
- Test hồi quy yêu cầu 2 mục nghiên cứu từng phần, không tăng số mục đánh giá, không có `structural-match`, không thay đổi chart, không chấp nhận sai lớp sao/phiên bản an sao, không dùng Hóa Lộc lưu hạn hoặc dấu Tuần/Triệt để giả lập sáu Không Vong.
- Không sửa engine, Tứ Hóa, DB, quyền Pro, AI hoặc thanh toán. Tiếp tục nghiên cứu quy tắc an đủ sáu sao, rồi mới quyết định có thể tăng từ 28/49 lên 30/49 hay không. Nhóm Định tạp giữ riêng theo đơn vị **vận hạn**, không đưa thành kết luận bản mệnh.


## R18 — Kiểm tra chứng cứ Định tạp theo 12 đại hạn, chưa phán đoán (11/11/2026)

- Bám nguyên tắc mô-đun `patterns-dingza.ts` của `Renhuai123/ziwei-doushu` tại commit `7922285d947b36610e7e31c232d8f1e2a0d0871d`: 4 mục `dinh-tap-01`, `02`, `03`, `08` mang đơn vị **đại hạn**, không phải kết quả nhị phân trên lá số bản mệnh.
- Mỗi mục kiểm tra 12 khoảng tuổi mụ từ `cycles.daiHan` sau khi vượt `auditClassicalPeriodGeometry`, đọc theo **địa chi**. Không duyệt chart nếu có sai tuổi, sai cung, hướng, hoặc nguồn an hạn.
- Đối chiếu các tín hiệu có thể chứng minh nội bộ: mạnh/yếu cung theo **bảng độ sáng 14 chính tinh phiên bản Thiên Đồ** (không gán tương đương tuyệt đối với nguồn), Thất Sát chính tinh theo Tứ chính, Lộc Tồn, Thiên Mã, một phần Sát tinh cùng cung, Hóa Lộc nguyên cục có nguồn. Các lớp sao kiểm toán lại theo engine để dữ kiện thiếu/trùng/sai `ruleSet` trở thành *unknown*.
- Điều kiện còn thiếu: sáu sao Không Vong độc lập; tiêu chuẩn thống nhất các trường phái cho cát/sát, Miếu/Vượng, và nguyên chú `hai hạn`. Bốn mục luôn `sourceCriterionVerified=false`, không cộng vào **28/49** và không mở khóa một kết luận vận hạn.
- UI: trong danh mục 49 mục của panel Chuyên sâu, mở gọn từng mục Định tạp để xem chứng cứ trong **12 đại hạn**. Không thêm tab mới, giữ responsive và `prefers-reduced-motion`.
- Tests r18: Nam/Nữ, 12 kỳ, trạng thái bất biến, sai bảng độ sáng, sai an sao và thiếu chart sẽ không được xem là chứng cứ khẳng định. Không đổi engine, SQL, Pro, AI, thanh toán hoặc thuật toán sao.
- Chỉ merge sau khi Source Integrity, Full Stack, Production Acceptance **5/5** đều PASS trên cùng HEAD; chạy kiểm tra sau merge trên `main`.


## R19 — Logic ba trạng thái cho Lộc Tồn hoặc Hóa Lộc (11/11/2026)

- Tinh chỉnh bước đối chiếu **Định tạp 01** theo đúng quan hệ **OR** trong nguồn: nếu Lộc Tồn nguyên cục đã được kiểm chứng là hội tam phương tứ chính của đại hạn, nhánh điều kiện Lộc Tồn được ghi nhận là `met` kể cả khi vị trí Hóa Lộc chưa xác minh. Khi Lộc Tồn không hội hạn và Hóa Lộc chưa kiểm chứng, kết quả là `unknown`, **không** phải `not-met`. Chỉ trả `not-met` nếu cả hai nguồn đã kiểm chứng độc lập và đều không hội hạn.
- Đây là **chứng cứ một điều kiện riêng lẻ**, không chứng minh toàn bộ Định tạp 01 (vẫn còn yếu Mệnh/Thân và cách hiểu hai hạn). `sourceCriterionVerified` giữ `false` và **28/49** vẫn là số mục ánh xạ chính thức.
- Thêm test r19 cho cả Nam/Nữ, bao gồm cố ý vô hiệu phiên bản Tứ Hóa, đối chiếu đúng 4 cung trong tam phương tứ chính theo địa chi và xác minh không xuất hiện âm tính giả.
- Không thay đổi engine an sao, Tứ Hóa, DB, quyền Pro hoặc cách cục đã ánh xạ. CI đầy đủ phải PASS trên đúng commit mới trước merge.


## R20 — Chuẩn hóa tên Không Vong của nguồn trước khi an sao (11/11/2026)

- Mã nguồn tham khảo được ghim ở `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` (`lib/ziwei/algorithm.ts`, `school-config.ts`): bộ danh mục cách cục ghi sáu **nhãn** `旬空 / 副旬 / 截路 / 截空 / 空亡 / 副截` nhưng phép chuẩn hóa chuyển `截路 → 截空`, `空亡 → 副截`, còn `副旬` được đặt dựa trên `旬空`. **Sáu nhãn không có nghĩa sáu vị trí sao độc lập cùng tồn tại**; tùy phái `截空` còn có `single/double/zhanyan`.
- Bổ sung module chỉ đọc `classical-source-void-vocabulary.cjs` cùng khai báo TypeScript để chuẩn hóa **tên nhãn** một cách có thể kiểm thử; giữ nguyên phiên bản nguồn, tên cũ, tên mới và trạng thái **chưa xác minh vị trí sao/biến thể trường phái**. Tuyệt đối không dùng đối chiếu ngôn từ để tự coi vị trí Tuần/Triệt là sao Không Vong của nguồn.
- Sửa hai nhãn Định bần 01/02 và hai nhãn Định tạp 03 từ câu gây hiểu nhầm *"phải có đủ sáu sao"* thành kiểm tra sao Không Vong theo **quy tắc nguồn đúng phiên bản**. Cùng một giải thích nguồn được dùng lại giữa hai bộ nghiên cứu, tránh mâu thuẫn khái niệm, không thêm tab hoặc thao tác mới.
- Không thay đặt sao, không thay trạng thái `unknown`, không tăng **28/49** chỉ mục ánh xạ, không suy luận vận mệnh. Test r20 bắt buộc 4 tên chuẩn hóa từ 6 nhãn, Tuần/Triệt không được tự đồng nhất, không làm đổi biểu đồ Nam/Nữ, các cách cục Định bần/Định tạp vẫn chưa đạt xác nhận nguồn.
- Cổng nghiệm thu: Source Integrity, Full Stack và Production Acceptance (5/5) PASS trên đúng HEAD trước merge; sau merge xác nhận trên `main`.


## R21 — Bảng mã Không Vong theo 10 thiên can, chưa đưa vào an sao (11/11/2026)

- Đối chiếu bảng `SCHOOL_JIEKONG_VARIANTS.v1/v2/v3` và `SCHOOL_XUNKONG` của `Renhuai123/ziwei-doushu/lib/ziwei/school-data.ts` tại commit `7922285d947b36610e7e31c232d8f1e2a0d0871d`. Ghi đủ 10 thiên can theo thứ tự Giáp–Quý và 3 mã trường phái `single/double/zhanyan`.
- Xuất `SOURCE_VOID_STEM_ROWS` dạng dữ liệu bất biến và `lookupVoidStemCodes(stem,variant)` chỉ trả mã số 1-based của **nguồn**, không có tham số lá số, không gọi thuật toán an sao và không chuyển mã sang `branchIndex`. Bất kỳ biến thể hoặc thiên can không hợp lệ đều trả `null` (fail-closed).
- Bảng `SCHOOL_XUNKONG` trong nguồn có 12 giá trị sau số sentinel dù chú thích `theo thiên can 1–10`; chỉ đối chiếu 10 thiên can đúng phạm vi chú thích, hai vị trí còn lại **không tự diễn giải**. Cần phân biệt nguồn bảng dữ liệu và cách thuật toán `iztro` thực tế đặt sao trước khi so sánh với Thiên Đồ.
- Thêm **một bảng mã đóng mặc định** trong phần danh mục nghiên cứu 49 cách cục, dùng CSS bảng sẵn có; không thêm route/tab, không hiển thị vị trí sao của người dùng, có caption và link dẫn đến bảng nguồn.
- Test r21 kiểm tra nguyên bảng 10 can × 3 biến thể, 12 mã Xun kèm sentinel, trường hợp tham số sai, tính bất biến, bảo vệ `sourcePlacementVerified=false`, `sourceCriterionVerified=false` và 28/49. Không sửa engine, tài khoản, thanh toán hay AI.


## R22 — Hai điều kiện đại hạn được ánh xạ trên nền độ sáng QS (11/11/2026)

- Đối chiếu `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, `patterns-dingza.ts` và 14 hàng `SB_QS` trong `school-tables.generated.ts`. Mọi mã nguồn đều giữ 1-based Tý..Hợi; **không tự chứng minh tọa độ an sao giữa hai engine là tương đương**.
- Bổ sung lớp độc lập `classical-dingza-source-bridge.cjs` áp nguồn độ sáng SB_QS trên **tọa độ Thiên Đồ đã kiểm toán**; đối chiếu 14 chính tinh, 12 cung và độ sáng theo đúng phiên bản. Sao phụ, sao năm, Không/Kiếp/Hỏa/Linh và Tứ Hóa phải qua kiểm toán nguồn trước khi được tính cát/sát.
- Ánh xạ **điều kiện** cho `dinh-tap-01` (Phong vân tế hội) và `dinh-tap-08` (Khô mộc phùng xuân): Mệnh/Thân yếu theo bảng nguồn, hạn mạnh, cát ≥2, sát ≤1 khi đủ chứng cứ. Hai mục vẫn ở `status=partial-evidence` trong bộ nghiên cứu hiện hữu, cờ `sourceCriterionVerified=false`, `schoolPlacementVerified=false`. **Không phát hành phán đoán vận hạn**.
- Danh mục nay ghi **30/49 mục có điều kiện được triển khai (28 nguyên cục + 2 đại hạn)**, không có nghĩa 30 cách cục đã được chuyên gia xác nhận. Vẫn còn 19 mục chưa ánh xạ, gồm 4 có thể nghiên cứu, 9 tranh luận, 6 nguồn chưa thể suy ra.
- Giữ nguyên 28 kết quả nguyên cục và màn hình lọc; khi vào nhóm Định tạp, hai mục có thêm điều kiện QS trong 12 khoảng tuổi mụ. Không thêm route, tab, menu, không đụng engine, DB, AI, Pro hoặc thanh toán. Tiếp theo cần thẩm định quy tắc an sao nguồn, khác biệt độ sáng và đại hạn/lưu niên.

## R23 — Đối chiếu cặp 截空 / 副截 theo công thức nguồn, chưa an sao (11/11/2026)

- Tiếp nối r22 (đã bổ sung **hai bộ điều kiện Định tạp**, tổng **30/49 bộ điều kiện kỹ thuật**, trong đó 28 nguyên cục và 2 đại hạn). Tiếp tục dùng source `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, không đổi engine hay kết quả đã đánh giá.
- Đối chiếu **hai phát biểu cùng nguồn** cho **biến thể đôi mặc định**: bình chú `applySchoolJiekong` tại `lib/ziwei/algorithm.ts` và bảng `SCHOOL_JIEKONG_VARIANTS.v2` tại `lib/ziwei/school-data.ts`. Theo bình chú, năm cặp thiên can dùng Thân–Dậu, Ngọ–Mùi, Thìn–Tỵ, Dần–Mão và Tý–Sửu; can âm đổi thứ tự sao chính/phụ. Đây **chưa phải một kiểm chứng độc lập giữa hai engine**.
- Thêm `auditSourceDoubleJiekongCodeConcordance(stem)` vào module nguồn đã có. Chấp nhận đúng 10 can Giáp–Quý, chuyển mã **1-based theo nguồn** thành tên chi trong phép so sánh nội bộ và xác nhận bảng v2 có khớp bình chú nguồn hay không. Hàm không nhận chart, không gắn Không Vong vào vị trí người dùng, trả `null` với tham số không hợp lệ và dữ liệu kết quả bất biến.
- Giao diện chỉ bổ sung **một cột** trong bảng nghiên cứu nguồn hiện có, đóng mặc định. Có ghi rõ đây là cặp chi **theo công thức nguồn**, không phải kết quả an sao lá số Thiên Đồ.
- Các cờ `sourcePlacementVerified=false`, `sourceSchoolParityVerified=false`, `sourceCodeMappingVerified=false` (chưa ánh xạ tọa độ Thiên Đồ) và `sourceCriterionVerified=false` được giữ nguyên; chưa được xác nhận nguồn `iztro`, `旬空/副旬`, ba biến thể trường phái hay khả năng thẩm định cách cục Định bần/Định tạp. Không thay đổi **30/49 bộ điều kiện đang triển khai**.
- Kiểm thử mới `tests/v111666-tuvi-jiekong-source-pair-concordance.test.cjs`: đủ 10 can, thứ tự can âm/dương, mã/cặp chi, tham số lỗi, tính bất biến, không thay nguyên cục mẫu Nam/Nữ và không nâng cờ kết luận; UI vẫn nằm trong bảng đóng mặc định.
- Bước kế tiếp: đối chiếu phép an trong `iztro` và so vị trí sao trên chart thực tế theo chứng cứ kiểm toán, trước khi có bất kỳ kết luận Không Vong nào.

## R24 — Kiểm toán hình học cặp Triệt và 截空/副截, không đồng nhất sao (11/11/2026)

- Bám source đã ghim `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, trong đó `applySchoolJiekong` ghi vị trí theo cặp năm thiên can, đảo vị trí chính/phụ cho năm âm; `SCHOOL_JIEKONG_VARIANTS.v2` lưu mã vị trí **Tý=1, ..., Hợi=12**.
- So sánh với engine Thiên Đồ `advanced-placements-tam-hop-v11.6.0`: `TRIET_PAIR` là bộ **hai cung án ngữ**, chi Thiên Đồ dùng **Tý=0, ..., Hợi=11**. Đây là so **hai tập địa chi không phân biệt thứ tự** của hai mô hình, không phải chứng minh hai sao có cùng chức năng.
- Thêm `classical-source-void-geometry.cjs` dưới `packages/interpretation/src`. Bộ kiểm toán tái sử dụng `auditNatalObstructionEvidence(chart)` để xác minh metadata, Can Chi âm lịch, 12 cung, dấu Tuần/Triệt và lớp `obstructionMarkers`; đồng thời tái sử dụng hàm `auditSourceDoubleJiekongCodeConcordance(stem)` từ r23. Thiếu, mâu thuẫn hoặc sai phiên bản → `status='unknown'`, không sinh kết luận sai.
- Kết quả phân biệt `matched/mismatched/unknown`, chỉ cờ `pairGeometryConcordant` có thể true/false. Các cờ `sourcePlacementVerified`, `sourceSchoolParityVerified`, `iztroPlacementVerified`, `nameEquivalenceVerified`, `sourceCriterionVerified` **luôn false**. Kết quả trùng cặp chi **không** được dùng để xác nhận Định bần 01/02, Định tạp 03 hay bất kỳ điều kiện Không Vong nào.
- Giao diện hiển thị một đoạn kết quả nhỏ trong **bảng nguồn Không Vong đang có và đóng mặc định**, nêu rõ cặp chi, phạm vi kỹ thuật và giới hạn; không thêm menu, tab hay trang trùng chức năng.
- Kiểm thử `tests/v111667-tuvi-source-void-geometry.test.cjs`: 10 thiên can × Nam/Nữ, kiểm toán dữ liệu sai, bất biến chart, giữ nguyên 28 nguyên cục + 2 đại hạn đã triển khai và không nâng cờ học thuật.
- Việc **chưa thực hiện**: đối chiếu thực chạy `iztro` đúng phiên bản gắn với source tham khảo, kiểm toán `旬空/副旬` ở từng ngày âm lịch, các biến thể `single/zhanyan` và xác minh trường phái. Không sửa thuật toán an sao Thiên Đồ, DB, quyền Pro, AI hoặc thanh toán.

## R25 — Định tạp 02: ánh xạ bộ điều kiện đại hạn bằng bảng QS và sáu sát tinh (11/11/2026)

- Đã kiểm lại mục 02 `锦上添花` của `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d/lib/ziwei/patterns-dingza.ts`: điều kiện nguồn là **có sát tinh tọa cung đại hạn** (không phải chỉ hội chiếu), cùng một đại hạn đạt `isXianHao`: có chính tinh Miếu/Vượng, đủ **ít nhất 2 cát tinh hội tam phương tứ chính**, và **không quá 1 sát tinh** trong tam phương tứ chính. Mỗi kỳ được tính riêng, không quy cách cục thành kết quả bản mệnh.
- Tái sử dụng `classical-dingza-source-bridge.cjs` hiện có; **không nhân bản thuật toán**, dùng đúng tọa độ địa chi của 12 cung Thiên Đồ đã kiểm chứng và 14 hàng độ sáng `SB_QS` nguồn đã phiên bản hóa. Nhóm cát là Tả/Hữu, Xương/Khúc, Khôi/Việt, Lộc Tồn, Thiên Mã và Hóa Lộc/Quyền/Khoa trên **chính tinh**; sáu sát gồm Kình/Đà, Hỏa/Linh, Địa Không/Địa Kiếp.
- Đối chiếu lớp sao năm, sao phụ và sát tinh theo engine hiện hành; toàn bộ cặp cờ nguồn vẫn `sourceCriterionVerified=false`, `schoolPlacementVerified=false`, `sourcePlacementVerified=false`. Nếu thiếu/sai ruleSet, các phép đếm sát tọa hạn và hạn tốt trả `unknown` thay vì khẳng định/ phủ định giả.
- Mục 02 được hiển thị vào cùng nhóm Định tạp đang có. Test mới `tests/v111668-tuvi-dingza-02-source-qs.test.cjs` kiểm Nam/Nữ, 12 kỳ, các năm mẫu, vị trí sát tinh tọa hạn, dữ liệu bị sửa và tính bất biến; test r22/r24 được cập nhật để tiếp tục giữ nguyên điều kiện nguồn đã ghim.
- **31/49** mục được ánh xạ điều kiện kỹ thuật: 28 nguyên cục + 3 đại hạn (01, 02, 08). Số này **không phải 31 kết luận hợp lệ đã được chuyên gia thẩm định**. **18 mục chưa ánh xạ** gồm 3 khả thi cần nghiên cứu thêm (Định bần 01/02, Định tạp 03), 9 mục nguồn còn tranh luận, 6 mục nguồn chưa có phép suy ra đủ căn cứ.
- Không đổi thuật toán an sao, lịch, SQL, quyền Pro, tài khoản, AI, thanh toán hoặc các UI ngoài bảng nghiên cứu; chỉ merge sau Source Integrity, Full Stack và Production Acceptance 5/5 cùng PASS trên HEAD SHA. R26 ưu tiên nghiên cứu Không Vong `旬空/副旬` và kiểm chứng phép an iztro (chưa được xác nhận bởi kết quả hình học của r24).

## R26 — Công thức ghép 旬空 / 副旬 trong nguồn, chưa phải đối chiếu iztro (11/11/2026)

- Mã tham khảo ghim `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d/lib/ziwei/algorithm.ts`: trong `generateChart`, nguồn gọi `iztro` để an sao, **sau đó** `applySchoolFuxun(palaces)` tìm vị trí `旬空` sẵn có và đặt `副旬` ở địa chi liền kề thuộc cùng cặp Tý–Sửu, Dần–Mão, Thìn–Tỵ, Ngọ–Mùi, Thân–Dậu, Tuất–Hợi. Với chi **dương** (mã 0,2,...,10) vị trí thứ hai là `branch+1`; chi **âm** (1,3,...,11) là `branch-1`. Đầu vào của phép này là **chỉ số chi 0-based trong chart của nguồn**, không phải mã 1-based trong `SCHOOL_XUNKONG`.
- `SCHOOL_XUNKONG` ở `school-data.ts` có 12 giá trị sau sentinel mặc dù chú thích là 10 thiên can. Chưa tìm thấy chứng cứ trong đường gọi `generateChart` chứng minh bảng đó chính là phép an `旬空` của các lá số nguồn. Không gán 10 thiên can trực tiếp thành vị trí `旬空`, không diễn giải hai phần tử vượt giới hạn chú thích.
- Thêm module thuần `classical-source-fuxun-formula.cjs` với hàm `projectSourceFuxunPartner(xunkongBranchIndex)`, kết quả bất biến, chỉ nhận số nguyên 0–11, sai trả `null`. Hàm **không nhận ngày tháng, chart, năm sinh**, không gọi `iztro`, không gắn Tuần/Triệt của Thiên Đồ vào nhãn của nguồn. Sáu cặp chỉ mô tả công thức ghép có điều kiện, không là vị trí sao của một người.
- Các cờ `sourceXunkongPlacementVerified`, `iztroPlacementVerified`, `sourceSchoolParityVerified`, `natalChartParityVerified`, `sourceCriterionVerified` luôn `false`. Chỉ `sourceFormulaReproduced=true` (tái hiện công thức trong mã nguồn) được công nhận.
- Giao diện: một dòng tham khảo sáu cặp địa chi trong **bảng nguồn Không Vong đóng mặc định**, giải thích giới hạn. Chỉnh câu chú thích bảng vốn hard-code mốc 30/49 thành câu không gắn số lượng, tránh hiển thị sai ở các lần cập nhật kế tiếp.
- Kiểm thử mới `tests/v111669-tuvi-xunkong-fuxun-formula.test.cjs`: đủ 12 chi, tính hoán vị cặp, loại dữ liệu sai, nguồn có sentinel + 12 phần tử, kết quả bất biến, không thay đổi lá số Nam/Nữ, Định bần 01/02 giữ `pending`, số lượng điều kiện kỹ thuật **31/49** không tự tăng và UI không thêm tab/route.
- Bước kế tiếp để tiến tới những cách cục Không Vong: chạy `iztro` đúng phiên bản được khóa bởi dự án nguồn, so sánh kết quả sao theo ngày âm/lịch dương/giờ, cả nhuận tháng và cấu hình trường phái; xác nhận dữ liệu đầu vào của `旬空`, `截空/副截` bằng chart nguồn thực và bằng chứng độc lập. Nếu chưa xác minh, Định bần 01/02 và Định tạp 03 tiếp tục `unknown`, không phát hành luận đoán.

## R27 — Bộ đối chiếu lá số `iztro@2.6.1` chạy thật với commit nguồn ghim (11/11/2026)

### Chứng cứ và cách chạy

- Giữ mã nguồn tham khảo công khai tại `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`. Khóa `package-lock.json` của chính commit này xác nhận `iztro@2.6.1` cùng integrity npm; **không sử dụng phiên bản latest hoặc dấu `^2.5.8` khi quyết định phiên bản thực chạy**.
- Tạo workflow độc lập `.github/workflows/tuvi-source-iztro-parity.yml`. Workflow checkout 2 repository trên runner tạm, chạy `npm ci` theo lockfile riêng của từng dự án và dùng `tsx` của nguồn chạy `infrastructure/scripts/tuvi-r27-source-iztro-probe.ts.template` sau khi sao chép vào root nguồn. Probe gọi cả `generateChart` của nguồn **và** `astro.bySolar` trực tiếp từ `iztro` cùng phiên bản để quan sát bốn sao nguồn `旬空/副旬/截空/副截` và các tên gốc `旬空/截路/空亡`.
- Dùng **65 ca giả lập công khai** (không phải thông tin sinh thực): 10 năm thiên can 1984–1993, hai giới tính, ba giờ 00:00/08:00/22:00 (60 ca); năm ca ranh giới năm âm lịch/tháng nhuận. Mã giờ nguồn là địa chi `floor(((hour+1)%24)/2)`; không suy diễn 23:xx đổi ngày. Các ca ranh giới chỉ dùng để đo khác biệt, không tự xác nhận hai lịch pháp giống nhau.
- `tuvi-r27-evaluate-parity.cjs` xác nhận nguồn đúng SHA, package chính xác 2.6.1, danh sách ca không thay đổi, 12 cung, bốn sao duy nhất; `旬空` giữ vị trí từ raw iztro, `副旬` theo cặp của r26, `截空/副截` theo công thức đôi r23 và hoán đổi hai nhãn gốc theo thiên can âm. Bất kỳ thiếu sao, trùng sao, sai công thức, lệch nhãn hoặc thay đổi fixture đều báo lỗi và CI thất bại.
- Engine Thiên Đồ dựng lá số tương ứng bằng `@thiendo/astrology-engine`; so tập hai cung **Triệt** với `截空/副截` và tập hai cung **Tuần** với `旬空/副旬`. Kết quả lưu **quan sát trùng/khác hình học**, không tự khẳng định hai loại sao hoặc trường phái tương đương; cũng ghi khác biệt Can Chi năm âm lịch và cặp biên tháng nhuận. Các cờ `namedPlacementEquivalenceVerified`, `sourceSchoolParityVerified`, `sourceCriterionVerified` **luôn false**.
- Báo cáo đầu ra `.r27-source-iztro-observations.json` và `.r27-iztro-parity-report.json` được upload làm artifact giữ 14 ngày. Dữ liệu thử là giả lập, không chứa thông tin người dùng. Không commit kết quả giả làm dữ liệu chứng minh; chứng cứ thực chỉ có khi workflow chạy thật và PASS.
- Test `tests/v111670-tuvi-source-iztro-parity.test.cjs` có nhánh test nguồn dữ liệu/đầu vào độc lập trong CI hiện hữu. Trong CI r27, đặt `THIENDO_R27_REQUIRE_GENUINE=1` bắt buộc phải có file quan sát thực, không thể âm thầm bỏ qua bước chạy nguồn.
- Không đổi cách an sao của Thiên Đồ, tên sao, giao diện, database, AI, quyền Pro, thanh toán. **Giữ 31/49 bộ điều kiện kỹ thuật**. Kể cả workflow PASS, Định bần 01/02 và Định tạp 03 không tự chuyển thành đã ánh xạ: cần thẩm định tương ứng ngữ nghĩa Không Vong giữa trường phái nguồn và Thiên Đồ, và tiêu chí sao đúng nguyên cục.
- Điều kiện gộp r27: bốn cổng **Source Integrity, Full Stack, Production Acceptance 5/5, và R27 pinned iztro runtime parity** phải PASS trên cùng PR HEAD SHA. Workflow r27 có thể có kết quả `failure` hữu ích nếu phát hiện sai khác thật: giữ PR mở và xử lý dựa trên chứng cứ, không nới lỏng test để lên số lượng cách cục.

### Tái hiện thủ công

Tại root Thiên Đồ, checkout chính xác `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` vào thư mục `reference-ziwei`, chạy `npm ci` ở cả hai root, sao chép `infrastructure/scripts/tuvi-r27-source-iztro-probe.ts.template` thành `reference-ziwei/.thiendo-r27-probe.ts`. Tại thư mục nguồn chạy `./node_modules/.bin/tsx .thiendo-r27-probe.ts`. Trở về root Thiên Đồ chạy `THIENDO_R27_REQUIRE_GENUINE=1 node --test tests/v111670-tuvi-source-iztro-parity.test.cjs` và `node infrastructure/scripts/tuvi-r27-evaluate-parity.cjs .r27-source-iztro-observations.json`. Trên Windows PowerShell dùng `$env:THIENDO_R27_REQUIRE_GENUINE='1'` trước lệnh test.

## R28 — Ranh giới kiểm chứng vị trí và ngữ nghĩa Không Vong cho ba mục còn thiếu (11/11/2026)

- Bắt đầu từ PR #41 **r27 đã được gộp và cả bốn cổng nghiệm thu PASS**. Bộ chạy thật mã nguồn `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` và `iztro@2.6.1` quan sát 65/65 ca giả lập khớp vị trí cặp hai cung. Đây là **kết quả trong tập mẫu**, không chứng minh Tuần/Triệt tương đồng về tên sao, tính chất, biến thể hay trường phái.
- Trong `patterns-dingpin.ts`, nguồn định nghĩa `KONG_STARS` gồm sáu nhãn `旬空`, `副旬`, `截路`, `截空`, `空亡`, `副截`; ở `generateChart` hai tên cũ được chuẩn hóa thành cặp `截空/副截`. Vì thế không được hiểu sáu tên tương ứng sáu sao độc lập hay tự đồng nhất với hai dấu Tuần/Triệt của Thiên Đồ.
- Thêm `classical-void-semantic-gates.cjs` và `.d.cts`, chạy **chỉ đọc, tách biệt engine**. Bộ kiểm toán gọi `auditNatalObstructionEvidence` và `auditClassicalVoidPairGeometry`, chỉ tạo **proxy hình học theo Tuần/Triệt** khi metadata, hai cặp và 12 cung đã được kiểm toán; input lỗi trả các kiểm tra `unknown`. Có kiểm tra provenance thật của `Lộc Tồn` theo `Aux.calculate` và `Thiên Mã` theo `Year.calculate`, bao gồm phiên bản và đối soát 12 cung.
- **Định bần 01**: ghi nhận độc lập dấu Tuần/Triệt tại Mệnh (proxy) bên cạnh điều kiện Liêm Trinh thủ Mệnh đã có. **Định bần 02**: ghi nhận dấu Tuần/Triệt tại Mệnh bên cạnh Lộc Tồn/Hóa Lộc, Không/Kiếp đã kiểm ở module cũ. **Định tạp 03**: ghi nhận Lộc Tồn và Thiên Mã nguyên cục có tọa chi thuộc **tập hai cặp Tuần/Triệt** hay không, đồng thời giữ kiểm tra Thất Sát hội từng đại hạn trong bộ `classical-dingza-period-research.cjs`. Điều kiện Không Vong theo ngữ nghĩa nguồn vẫn luôn `unknown` cho cả ba mục.
- Các cờ `sourcePlacementVerifiedForCurrentChart`, `semanticEquivalenceVerified`, `sourceCriterionVerified` cố định `false`. Ngay cả khi proxy có `state='met'`, **không** phán cách, không tự tăng độ tin cậy trường phái hay xác nhận rằng người dùng mang “Định bần”.
- UI sử dụng chính phần chi tiết Định bần và danh mục đại hạn đóng/mở hiện hữu; không tạo route, tab, modal hay navigation mới. Đồng thời sửa chuỗi hiển thị cũ `28 nguyên cục + 2 đại hạn` thành số lượng tự tính từ danh mục (hiện **28 + 3**), sửa chú thích cuối bảng để không lặp thông tin lỗi thời từ r22.
- Kiểm thử `tests/v111671-tuvi-void-semantic-gates.test.cjs` kiểm 10 thiên can × 2 giới tính, gỡ dữ liệu, sai ruleSet, sai Lộc/Mã, không đột biến chart và ba cờ kết luận luôn false. **31/49 mục điều kiện kỹ thuật không đổi**, 18 mục chưa ánh xạ: 3 chờ xác minh, 9 nguồn còn tranh luận, 6 nguồn đánh dấu không thể suy ra.
- Hướng tiếp theo: nghiên cứu các căn cứ độc lập từ văn bản cổ/kiểm chứng trường phái về ý nghĩa `空亡` có bao hàm Tuần/Triệt và cách đếm sao chính/phụ hay không. Chỉ khi tiêu chí từng mục rõ và được phản biện đủ, mới xem xét chuyển từ `partial-evidence` sang `mapped-condition-research`, hoàn toàn tách khỏi dự báo.

### Phạm vi an toàn phát hành

Không sửa thuật toán an sao, lịch nhuận, Tứ Hóa, PostgreSQL, AI, chức năng Pro, tài khoản, thanh toán hay quyền quản trị. Giữ 31/49 và hệ phân loại nguồn. PR r28 chỉ được gộp sau Source Integrity, Full Stack, Production Acceptance 5/5 cùng PASS trên đúng HEAD SHA.

## R29 — Oracle chạy thật ba quy tắc nguồn còn thiếu trên 65 lá số giả lập (11/11/2026)

- Tiếp nối **r28 đã nghiệm thu và squash-merge**: bộ chứng cứ ngữ nghĩa Không Vong vẫn là `unknown`, số bộ điều kiện ánh xạ kỹ thuật **31/49**. R29 không tác động vào cách an sao của Thiên Đồ, giao diện người dùng hoặc chương trình luận đoán.
- Dùng đúng kho `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, thư viện `iztro@2.6.1` trong lockfile nguồn. Probe độc lập tại `infrastructure/scripts/tuvi-r29-pattern-source-probe.ts.template` được sao chép vào repository tham khảo **chỉ khi CI chạy**, không cho scanner/build Thiên Đồ hiểu nhầm là module nội bộ.
- Mỗi một trong 65 ca giả lập của r27 dùng `generateChart` tạo **12 cung, cung Mệnh và 12 đại hạn**, chạy hai hàm nguồn thực `detectDingPin` và `detectDingZa`. Probe lưu dấu đúng/sai của **Định bần 01 生不逢时**, **Định bần 02 禄逢两杀**, cùng các kỳ đại hạn của **Định tạp 03 禄衰马困**; lưu chứng cứ sao trên từng cung thay vì giả lập kết quả.
- Checker `infrastructure/scripts/tuvi-r29-evaluate-source-oracle.cjs` đọc chart đã ghi, **độc lập tính lại** 3 công thức từ mảng sao và chi 0–11: (1) Liêm Trinh cùng cung Mệnh có Không Vong; (2) Lộc Tồn hoặc Hóa Lộc thủ Mệnh **và** có Không Vong **và** **cả Địa Không, Địa Kiếp** thủ Mệnh; (3) Thất Sát hội tam phương tứ chính từng hạn, **đồng thời Lộc Tồn và Thiên Mã đều tọa cung có Không Vong** (không nới thành chỉ một sao). Ba quy tắc đây là **diễn giải trong mã nguồn tham khảo**, không phải phán đoán độc lập về đời người.
- Không Vong nguồn có danh sách alias sáu nhãn `旬空, 副旬, 截路, 截空, 空亡, 副截`; ở kết quả an sao đã chuẩn hóa, không được hiểu mỗi nhãn là một sao độc lập. Validator từ chối sao trùng, sao thiếu, 12 cung trùng chi, lỗi đại hạn, sai SHA/version, danh sách test trùng hoặc bị thay thế. Kết quả `FAIL` khi `detectDingPin`/`detectDingZa` của nguồn không đồng ý với phép tính lại.
- Workflow `.github/workflows/tuvi-source-pattern-oracle.yml` chạy checkout nguồn và `npm ci` riêng, yêu cầu `THIENDO_R29_REQUIRE_GENUINE=1` để **không thể bỏ qua probe thực**. Hai artifact `.r29-source-pattern-oracle-observations.json` và `.r29-source-pattern-oracle-report.json` được lưu 14 ngày. **Chỉ kết quả của workflow thật mới được ghi nhận là chứng cứ chạy nguồn**, test mô hình trong unit-test không phải chứng cứ 65 lá số.
- Có thêm `tests/v111672-tuvi-source-pattern-oracle.test.cjs` kiểm strict/negative và provenance. R29 không coi việc trùng chart mẫu với kết quả detector là chứng minh **tương đương Tuần/Triệt, trường phái hoặc điều kiện ứng dụng lên một lá số Thiên Đồ thực**. Mọi `semanticEquivalenceVerified` và `localPatternVerdictsVerified` vẫn `false`, **31/49** không tăng.
- R30 sau đó mới đánh giá tính khác biệt giữa proxy Thiên Đồ và tiêu chí nguồn trên **từng ca giả lập được phiên bản hóa**, và phân loại sai khác theo phép an, lịch và tên sao; nếu không đủ căn cứ giải thích, không gộp quy tắc nguồn vào kết luận cách cục. Việc mở rộng 9 mục còn tranh luận và 6 mục nguồn chưa thể suy ra cần quy trình riêng, không tự gắn nhãn `derivable`.

Điều kiện gộp: Source Integrity PASS, Full Stack PASS, Production Acceptance **5/5**, workflow riêng R29 PASS trên cùng HEAD SHA. Không gộp khi detector nguồn lệch với phép tính độc lập, không nới test để đạt số mục.
