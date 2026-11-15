# R64 — Đối chiếu thời gian sóc với bảng UT phút của NASA

Ngày 15/11/2026. Tiếp nối R63 tại `359d1ca4e6c57d14ed2990bd66ebeae5cb9cad14`.
Nguồn phần mềm vẫn ghim `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, `lunar-javascript@1.7.7`, `lunar-typescript@1.8.6`, `iztro@2.6.1`.

## Câu hỏi và phạm vi

R34 đã đối chiếu bốn ranh giới ngày theo NASA; R63 đã nối được các lời gọi pha sóc, hiệu chỉnh thời gian, phần dịch tám giờ và bước làm tròn ngày trong thư viện nguồn. R64 bổ sung việc đo sai lệch **thời gian** với nguồn thiên văn công bố độc lập trên toàn bộ kỳ sóc của ba năm 1988–1990. Không tạo một engine thiên văn mới hoặc sao chép bộ dò R63.

## Dữ liệu tham chiếu độc lập

Bảng [NASA GSFC — Phases of the Moon: 1901 to 2000](https://eclipse.gsfc.nasa.gov/phase/phases1901.html) công bố theo Universal Time (UT), hiển thị giờ và phút. Ngày 15/11/2026 đã tải trang chính thức và trích riêng cột **New Moon** của năm 1988, 1989, 1990: lần lượt 12, 13, 12 sự kiện, tổng cộng **37**. Các cột First Quarter, Full Moon, Last Quarter không được nhập thành sự kiện sóc.

Manifest `tests/fixtures/tuvi-r64-nasa-new-moons-1988-1990.json` lưu các dữ kiện thời gian cùng URL, thang thời gian, độ phân giải và SHA-256 của mảng bản ghi chuẩn hóa:

`81cfcedd33f6748fcbee9f7aea1887e2d856052a01787c6f9940fb352f504fe0`

Hàm `extractNasaNewMoons` kiểm lại bản HTML tải thật; thiếu, trùng, đổi thứ tự hoặc sửa một phút đều bị từ chối. Có thể tái lập việc kiểm tra bằng `node infrastructure/scripts/tuvi-r33-r64-audit-independent-new-moons.cjs --verify-nasa-html <duong-dan-html>`. CI dùng dữ liệu đã ghim để không phụ thuộc khả năng truy cập trang NASA ở mỗi lần chạy. Hash này kiểm sự toàn vẹn của dữ kiện đã trích, không phải chữ ký số do NASA cấp.

Các chuỗi thời gian dùng hậu tố `Z` để tính số học bằng JavaScript, nhưng nguồn tham chiếu là **UT ở độ phân giải phút**, không phải phép xác nhận UT1 bằng UTC chính xác tới giây. R64 không dùng thời gian TT làm UT hoặc lấy độ lệch nhỏ làm chứng nhận toàn bộ ephemeris.

## Cách đo

Mở rộng probe R63 bằng đối số `--r64-manifest`, giữ nguyên chế độ R63 năm tháng ban đầu. Với mỗi mốc NASA, chọn một ngày nằm hai ngày bên trong kỳ sóc dự kiến, đọc tháng âm mà chính thư viện nguồn đang dùng và ghi ngày đầu tháng thực tế của nó. Không ghi đè ngày đầu tháng bằng ngày mong muốn từ NASA.

Probe tiếp tục gọi các phương thức gốc và phục hồi wrapper trong `finally`. Evaluator R64 tái sử dụng `auditR63` và `auditMonthTrace`, so fingerprint cả năm phương thức với lượt R63, kiểm đầy đủ 37 ID ở mỗi thư viện và từ chối việc ghép nhầm kỳ sóc. Với giá trị Julian chưa cộng phần dịch tám giờ của thư viện, tính chênh lệch giây so với phút UT công bố. Cửa sổ **120 giây** chỉ là ngưỡng phân loại trong báo cáo, không phải tuyên bố độ chính xác thiên văn. Chênh lệch vượt ngưỡng được giữ thành quan sát; dữ liệu hỏng hoặc ghép nhầm kỳ mới gây lỗi toàn vẹn.

Đồng thời so ngày dân sự sau phép cộng 7 và 8 giờ, kiểm tra ngày nguồn và kiểm tra `solarToLunar` của Thiên Đồ trả mùng 1 tại ngày NASA chiếu theo +7. Thang UT phút và bộ đệm ổn định ngày 61 giây được ghi rõ; khoảng cách tới nửa đêm nhỏ hơn bộ đệm không được gọi là ngày ổn định. Không suy từ phép chiếu số học ra chính sách lịch hợp pháp hay trường phái.

## Kết quả local trên nguồn ghim thật

| Phép đối chiếu | Kết quả |
|---|---:|
| Mốc NASA độc lập | 37 |
| Dấu vết hai thư viện | 74 |
| Sai lệch nằm trong cửa sổ 120 giây | 74/74 |
| Chênh lệch tuyệt đối lớn nhất so với phút công bố | 34,072 giây, kỳ 17/11/1990 |
| Ngày nguồn khớp phép chiếu NASA +8 | 74/74 |
| Phép chiếu số học +7 từ nguồn khớp NASA +7 | 74/74 |
| Thiên Đồ trả mùng 1 tại ngày NASA +7 | 74/74 |
| Khoảng cách nhỏ nhất tới nửa đêm trong mẫu | 360 giây |

Trong 37 sự kiện, chỉ kỳ 01/08/1989 có ngày +7 và +8 khác nhau; mỗi thư viện quan sát cùng kỳ đó, không phải hai sự kiện thiên văn độc lập. Bộ R33/R62/R63/R64 local đạt **20/20 kiểm thử**, không bỏ qua bài nào khi bật gate nguồn thật. Các số liệu local phải được xác nhận lại bằng CI của đúng HEAD trước merge.

Hai dependency phần mềm cho cùng kết quả không được tính là hai nguồn thiên văn độc lập. Nguồn đối chứng ngoài mã ở đây là một bảng NASA, có độ phân giải phút. Chưa kiểm chứng các năm khác, toàn bộ chính sách tháng nhuận/giờ Tý, độ chính xác ephemeris dưới phút hoặc tương đương các họ Không Vong với Tuần/Triệt.

## Tích hợp và điều kiện nghiệm thu

Chỉ thêm manifest, evaluator, test và tài liệu; mở rộng probe R63 và workflow R33 hiện có. Artifacts mới là `.r64-source-lunar-rounding-trace.json` và `.r64-independent-new-moon-audit.json`. Không đổi engine, giao diện, API, DB, AI hoặc phân quyền.

Giữ **31/49**. Các cờ `fullEphemerisAccuracyVerified`, `sourceCalendarPolicyFullyVerified`, `rootCauseVerified`, `semanticEquivalenceVerified`, `sourceSchoolParityVerified`, `expertReviewed`, `mayChangeChartRules`, `mayEnableCalendarSchoolMode`, `mayIncreaseMapping` vẫn `false`.

Gate: R33 nguồn thật có R64, Source Integrity, Full Stack và Production Acceptance 5/5 PASS cùng HEAD; sau squash kiểm tra lại CI main. Bước tiếp theo là kiểm toán chính sách tháng nhuận/giờ Tý và đối chiếu sao theo cùng chuẩn lịch, không tự tăng mốc từ kết quả thời gian này.
