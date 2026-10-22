# Bát Tự — Tiết khí và giờ Mặt Trời — hồ sơ phương pháp V11.93

**Trạng thái:** `deterministic-subroutine-only` · **Phạm vi tích hợp:** `isolated-research-only` · **Ưu tiên:** P0.

Đây là **phép nghiên cứu**, không phải bộ giải đoán Bát Tự hoàn chỉnh hoặc cam kết độ chính xác thiên văn sát giao tiết.

## Đầu vào

Yêu cầu `date`, `hour`, `minute`, `utcOffsetMinutes` **tại đúng thời điểm sinh**, `longitudeDeg` (Đông dương), `timeMode` (`civil`, `mean-solar`, `apparent-solar`) và `dayBoundary` (`midnight`, `late-zi`).

Không suy UTC offset từ quốc gia hoặc kinh độ, không mặc định giờ Việt Nam hiện tại cho năm lịch sử, không tự quyết định quy tắc Giờ Tý. Để giới hạn tương thích động cơ tham chiếu, phiên bản hiện hỗ trợ 1901–2099; dữ liệu đầu vào chỉ chuẩn tới **phút**.

## Quy tắc mô hình

1. Sinh `utcMs` từ thời gian dân dụng và UTC offset. Đây là **thời điểm thực của sự kiện**. Dùng `utcMs` quy đổi sang UTC+7 để tái sử dụng hàm năm/tháng của Bát Tự v9.8, **chỉ cho trụ NĂM và THÁNG**. Đầu vào không dịch chuyển theo kinh độ. Mô hình kinh độ Mặt Trời hiện tại vẫn xấp xỉ, không xác minh giờ Jie độc lập.
2. Hiệu chỉnh kinh độ so với kinh tuyến giữa của múi giờ đã nhập: `4 × (λ_nơi_sinh – 15 × UTC_offset_giờ)` phút. Phần mềm tự unwarp ±360° gần đường đổi ngày quốc tế để giữ khoảng cách kinh độ hợp lý.
3. Đối với `apparent-solar`, cộng **phương trình thời gian xấp xỉ NOAA** theo năm phân số γ (không phải thuật toán thiên văn cao độ chính xác). `civil` không hiệu chỉnh, `mean-solar` chỉ có kinh độ.
4. Lấy **ngày/giờ** từ ngày giờ sau hiệu chỉnh, theo tùy chọn bắt đầu ngày lúc **00:00** hoặc **23:00**, làm tròn tới phút để tương thích với engine tham chiếu.
5. Tổng hợp lại quan hệ Thập Thần/Tàng Can theo **Nhật Can mới** và tính các quan hệ ký hiệu với 4 trụ kết quả. Không giữ các quan hệ cũ nếu Nhật Can đổi.
6. Đầu ra trả `PROVISIONAL` hoặc `REVIEW_REQUIRED`; trụ sát Jie trong dải cảnh báo xấp xỉ ±1.2° của engine tham chiếu và trụ ngày/giờ cách ranh dưới 5 phút phải **kiểm chứng độc lập**. Vùng ±1.2° chỉ là ngưỡng bảo thủ, không phải sai số thiên văn được kiểm định.

**Lưu ý phương pháp:** Chế độ `midnight` dùng cách an trụ giờ hiện tại của engine v9.8 (không phải mọi biến thể phân biệt Tý đầu và Tý cuối). Chế độ `late-zi` thay đổi Nhật Can từ 23:00. Lịch sử DST và múi giờ địa phương cần tự đối chiếu dữ liệu có thẩm quyền.

## Phần có thể chạy trong dự án

`packages/astrology-engine/src/bazi-time-research.cjs` cung cấp `equationOfTimeNoaa`, `solarTimeCorrection`, `evaluate`, `compareConventions`. Đầu ra so sánh 3 đồng hồ × 2 quy ước ngày; **không thay thế** `bazi.js` hoặc dịch vụ tính tứ trụ chính.

## Chưa đủ điều kiện triển khai

- Tính thực nghiệm giao tiết Jie chính xác theo ephemeris, có kiểm tra mốc UTC độc lập, đặc biệt Lập Xuân/Kinh Trập/Thanh Minh.
- Đối chiếu nhiều ca ranh giờ trong lịch sử và mùa DST, đồng hồ sinh có sai số.
- Thẩm định bảng quy ước của từng truyền phái và sai số công thức EOT NOAA.
- Test build/typecheck và E2E production trên môi trường có `package-lock.json` và dependencies.

## Giao thức kiểm định trước khi nhập vào engine

1. Lưu phiên bản quy tắc, múi giờ và thời điểm sinh đã quy về UTC; không làm tròn trước khi đối chiếu.
2. Tách dữ kiện thiên văn đo được khỏi quy ước truyền thống; lưu mọi dị bản.
3. Lập ca thử sát giao Jie và sát ranh 23:00, 00:00, đầu mỗi chi giờ trên các kinh độ và múi giờ khác nhau.
4. So sánh ít nhất hai triển khai hoặc nguồn thiên văn độc lập; ghi mọi sai khác thay vì ép trùng.
5. Chỉ thẩm định cho engine công khai sau khi duyệt chuyên môn và đạt bài kiểm thử hồi quy.

## Tài liệu đối chiếu ban đầu

- NOAA Global Monitoring Laboratory, *General Solar Position Calculations*: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
- Hong Kong Observatory, *The 24 Solar Terms*, định nghĩa 24 mốc theo kinh độ hoàng đạo: https://www.hko.gov.hk/en/gts/time/24solarterms.htm
- Hong Kong Observatory, *Date and Time of the 24 Solar Terms*, dữ liệu thời điểm theo UTC+8: https://www.hko.gov.hk/en/gts/astronomy/Solar_Term.htm

Việc dẫn tài liệu **chỉ có trong hồ sơ kỹ thuật nội bộ**, không chèn trích nguồn thô vào bảng luận giải dành cho người dùng.


## V11.94 — 12 Jie theo lịch tham chiếu 2025–2027

**Module:** `packages/astrology-engine/src/bazi-jie-reference.cjs` · dữ liệu `reference/hko-jie-2025-2027.json`. Đây là thuật toán nghiên cứu **không kích hoạt sản phẩm chính**, không được coi là bản thẩm định lịch thiên văn chuyên nghiệp.

- Dùng 12 **tiết (Jie)** bắt đầu tháng Can Chi theo thứ tự: Tiểu Hàn (Sửu), Lập Xuân (Dần), Kinh Trập (Mão), Thanh Minh (Thìn), Lập Hạ (Tỵ), Mang Chủng (Ngọ), Tiểu Thử (Mùi), Lập Thu (Thân), Bạch Lộ (Dậu), Hàn Lộ (Tuất), Lập Đông (Hợi), Đại Tuyết (Tý). Không nhầm 12 Trung khí làm thời điểm đổi tháng.
- 12 tiết nằm cách 30° trên hoàng đạo, bắt đầu Lập Xuân 315°. Dữ liệu tháng đổi ở phút in trên bảng *HKT UTC+08*; ép chuyển sang UTC có offset rõ ràng.
- Tính năm Bát Tự theo **Lập Xuân**, không theo Tết Nguyên Đán; năm và tháng **chung một đồng hồ UTC thực**, trụ ngày/giờ có thể xét theo 3 đồng hồ và 2 quy ước đổi ngày của V11.93.
- Can năm = `(năm can chi - 4) mod 10`, chi năm = `(... - 4) mod 12`; Chi tháng Dần ... Sửu, Can tháng theo **Ngũ Hổ Độn** `((can năm % 5) × 2 + 2 + chỉ số tháng từ Dần) mod 10`. Các quan hệ và Thập Thần được tái tính với nhật chủ của trụ ngày V11.93.
- Không ngoại suy năm ngoài bảng; tại ±60 giây gần mọi Jie, trả `BOUNDARY_REVIEW` và **null cho trụ năm/tháng** (không coi phút công bố là thời khắc chính xác tới giây). `OUT_OF_COVERAGE` cũng trả null.
- Giữ `bazi.js` và `bazi-time-research.cjs` nguyên vẹn. Đối chiếu các giá trị năm/tháng xấp xỉ V11.93 chỉ là thông tin chẩn đoán, không dùng để thay thế khi thiếu bảng Jie.

### Phạm vi chứng cứ và giới hạn

HKO giải thích kinh độ hoàng đạo của 24 tiết khí (mỗi 15°) và công bố bảng lịch almanac tính theo HKT UTC+8. Bảng 36 mốc Jie V11.94 được **chép từ các bảng thứ cấp**: Tinh Mệnh Đồ (2025), RecaTools (2026), Qimena (2027, bảng đối chiếu với HKO). Việc truy cập/tải trực tiếp các bảng almanac bản gốc để **xác thực từng phút** còn chưa hoàn tất; vì vậy metadata ghi rõ trạng thái chứng cứ, tuyệt đối không tự gọi kết quả là “độ chính xác HKO đã xác nhận”. Dữ liệu có năm trong 2025–2027, thiếu lịch sử giờ mùa hè, ranh tháng các năm khác, và không kết luận hành vận/dụng thần.

- HKO giải thích 24 tiết: https://www.hko.gov.hk/en/gts/time/24solarterms.htm
- Almanac HKO 2025: https://www.hko.gov.hk/en/gts/astron2025/almanac2025_index.htm
- Almanac HKO 2026: https://www.hko.gov.hk/en/gts/astron2026/almanac2026_index.htm
- Almanac HKO 2027: https://www.hko.gov.hk/en/gts/astron2027/almanac2027_index.htm
- Bảng chép đối chiếu 2025: https://tinhmenhdo.web.app/en/solar-terms-hongkong-2025/
- Bảng chép đối chiếu 2026: https://recatools.com/guides/why-solar-term-dates-move/
- Bảng đối chiếu năm 2027: https://www.qimena.com/en/wiki/qimen-calculation-rules/
