# R66 — Kiểm toán tọa độ sao có tên giữa Thiên Đồ và nguồn ghim

**Ngày bắt đầu:** 23/11/2026  
**Nền:** `main@ba9fba4c6b20897379955b7d45412e61809d2089` (R65).  
**Nguồn tham chiếu:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` và `iztro@2.6.1`.

## Mục đích và ranh giới

R64 đã đối chứng 37 kỳ sóc NASA trong 1988–1990. R56 vẫn ghi một phản chứng nghiên cứu ở `dinh-ban-01 / stem-1989-nam-h0`: Mệnh nguồn và Mệnh nội bộ cùng chi số 8; **Liêm Trinh nguồn chi 11, Thiên Đồ chi 8**. Hóa Lộc cũng khác chi (nguồn 3, nội bộ 0) nhưng **không** là toán hạng trực tiếp của `dinh-ban-01`. Việc trùng bộ chi Không Vong/Tuần–Triệt ở ca đó không chứng minh cùng trường phái hay nghĩa luận giải.

R66 bổ sung **census hình học đọc-only** của 67 lá số tổng hợp được chạy bằng engine nguồn ghim thật ở workflow R32, để tạo danh sách tra cứu có khả năng tái lập. R66 **không** thay an sao, giờ sinh, ngày âm, tháng nhuận, engine, web/API, AI, database, quyền truy cập, và **không** biến cảnh báo nghiên cứu thành kết luận hung cát.

## Đầu vào nguồn thật

Workflow `.github/workflows/tuvi-cross-engine-evidence.yml` đã chạy thử nguồn R29/R30 và tạo `.r32-cross-engine-evidence-matrix-report.json`. Bộ R66 **không** tạo bộ dò sao nguồn riêng, không nhân bản 67 ca thành bộ fixture kết luận, không dùng dữ liệu người dùng:

- R29: 65 ca tổng hợp nguồn; R30: 1 dương, 1 âm; tổng **67 ID duy nhất**.
- Yêu cầu `sourceCommit` đúng SHA ghim, `sourceIztroVersion = 2.6.1`, `referenceRuntimeVerified = true`, `syntheticOnly = true`, `failures = 0`.
- R66 xác minh lại từng ID, `origin`, ngày dương, giờ, giới tính, Mệnh nguồn và nội bộ, các trạng thái tọa độ, bốn nhãn Không Vong và phép hợp địa chi.
- Không nhận các cờ thẩm định bị nâng trái phép, không chấp nhận một tọa độ sao ngoài 12 địa chi, `matched` giả, hàng thiếu, hàng trùng, hay một hợp địa chi bị thay thủ công.

Đầu vào là **báo cáo chạy trong cùng job nguồn thật**, không phải chuỗi JSON người dùng tự khai. CI bật `THIENDO_R32_REQUIRE_GENUINE=1`, nên thiếu artifact ở thời điểm chạy thì kiểm thử phải FAIL. Các bài kiểm thử đơn vị tách biệt sử dụng dữ liệu mô phỏng và **không** được tính là kiểm chứng nguồn.

## Bảy tọa độ sao cần đối chiếu

| Mã nghiên cứu | Sao Thiên Đồ | Tên nguồn |
| --- | --- | --- |
| `liem-trinh` | Liêm Trinh | 廉贞 |
| `loc-ton` | Lộc Tồn | 禄存 |
| `thien-ma` | Thiên Mã | 天马 |
| `that-sat` | Thất Sát | 七杀 |
| `dia-khong` | Địa Không | 地空 |
| `dia-kiep` | Địa Kiếp | 地劫 |
| `hua-loc` | Hóa Lộc | Tọa độ sao `siHua = 禄` trên nguồn |

R66 tạo **469 cặp tọa độ (= 67 × 7)**. Với mỗi sao, phân loại đúng một trong ba trạng thái:
- `matched`: hai địa chi biết rõ và bằng nhau.
- `different`: hai địa chi biết rõ và khác nhau.
- `unknown`: thiếu tọa độ một phía; tuyệt đối không coi là khớp.

Đối với Không Vong, giữ tên riêng `旬空`, `副旬`, `截空`, `副截`; chỉ so **tập chi hợp** với proxy Tuần/Triệt đã có. Việc trùng tập chi không suy ra tương đương bốn nhãn sao riêng lẻ, sáu tên trong nguồn, hoặc các phép luận đại hạn.

## Đầu ra và cách dùng

- `infrastructure/scripts/tuvi-r32-r66-pinned-source-local-coordinate-census.cjs`: hàm `census(report)` không làm biến đổi nguồn; xuất `.r66-pinned-source-local-coordinate-census.json`.
- `tests/v111687-tuvi-r66-coordinate-census.test.cjs`: đối chứng tính xác định, tổng số ca, các vị trí ca 1989 từng ghi ở R56, và các đầu vào nhiễu/tamper (ID, canh nguồn, tọa độ, hợp chi, cờ học thuật).
- Workflow R32 có sẵn: chạy kiểm thử R66 **sau khi tạo báo cáo R32**, tính census và lưu artifact cùng các báo cáo R29–R61; không tạo pipeline thứ hai.
- Báo cáo chứa số ca theo năm dương, ba loại trạng thái từng sao, trạng thái hình học Không Vong, hàng đợi xem xét và SHA-256 của danh sách ca chuẩn hóa. Hash chỉ giúp nhận biết nội dung thay đổi; **không** là chứng thư do thư viện nguồn cấp.

Ví dụ trường hợp `stem-1989-nam-h0`: kiểm thử chạy nguồn thật bắt buộc xác nhận Liêm Trinh 11/8, Hóa Lộc 3/0, Mệnh 8/8 và hình học hợp chi `matched`. Đây là **các dấu hiệu chưa đủ chứng minh nguyên nhân gốc**: không kết luận Liêm Trinh nguồn đúng còn Thiên Đồ sai nếu khác chính sách an sao/đầu vào lịch/trường phái.

## Câu hỏi tiếp nối R66

1. Nếu đối chứng giờ/ngày âm và Mệnh đã cùng điều kiện, truy vết **độc lập** luật an Liêm Trinh, không suy từ `matched` ở cặp địa chi Không Vong.
2. Rà các ca lệch theo năm sinh, thiên can năm nguồn và giờ chi để phân biệt hiện tượng chỉ ở biên ngày với sai lệch quy tắc sao.
3. Chỉ khi có hồ sơ đối chiếu cùng trường phái, nguồn được dẫn độc lập, phản chứng và review chuyên môn mới được đề xuất sửa engine hoặc nâng mốc 31/49. R66 **không** cấp quyền tự động làm việc đó.

## Nghiệm thu bắt buộc

Trên **cùng HEAD SHA** của PR: R32 genuine (có R66), Source Integrity, Full Stack và Production Acceptance **5/5** đều PASS; sau merge kiểm tra lại trên `main`. Nếu chưa đạt, để PR dạng draft, không tự gộp và không tuyên bố nghiệm thu. Số **31/49** chỉ là số điều kiện đã ánh xạ phục vụ nghiên cứu; số mục đã thẩm định học thuật độc lập không tăng.

Toàn bộ cờ `rootCauseVerified`, `sourceSchoolParityVerified`, `semanticEquivalenceVerified`, `expertReviewed`, `mayChangeChartRules` và `mayIncreaseMapping` đều `false` theo phạm vi R66.
