# R34 — Kiểm toán mốc Sóc và nguồn gốc lịch âm giữa UTC+7 / UTC+8

Ngày nghiên cứu: 11/11/2026 · Trạng thái: research-only · Không đưa trực tiếp vào quyết định cách cục.

## Bối cảnh

R32 (đã gộp) có 67/67 lá số giả lập so sánh thành công nhưng 6 trường hợp 15/08/1989 có sai khác ở Liêm Trinh, Thất Sát và Hóa Lộc. R33 ghi nhận 18 mẫu (14–16/08/1989 × 3 giờ × Nam/Nữ) bị lệch đúng một ngày âm giữa hai engine và cả 12 mẫu đối chứng 1988/1990 không lệch. R33 đã có kiểm toán nguồn PASS nhưng **chỉ được gộp khi các gate production PASS**; r34 chạy độc lập, không phụ thuộc vào việc đã gộp PR R33.

## Nguồn thiên văn độc lập

NASA GSFC, Fred Espenak — *Phases of the Moon: 1901 to 2000*:
https://eclipse.gsfc.nasa.gov/phase/phases1901.html

Bảng công bố theo Universal Time (UT), làm tròn đến phút. Dùng phép chiếu UT gần UTC trong bài tính ngày dân sự (sai biệt UT1–UTC ở giai đoạn này nhỏ hơn 1 phút, không thể đổi kết luận cho các mẫu cách ranh giới tối thiểu 6 phút). Bốn lần Sóc được ghi trực tiếp trong `tests/fixtures/tuvi-r34-nasa-boundaries.json`:

| Lần Sóc UT | UTC+7 (Việt Nam) | UTC+8 (Trung Quốc, đối chiếu dân sự) |
| --- | --- | --- |
| 1984-05-30 16:48 | 1984-05-30 23:48 | 1984-05-31 00:48 |
| 1986-12-01 16:43 | 1986-12-01 23:43 | 1986-12-02 00:43 |
| 1989-08-01 16:06 | 1989-08-01 23:06 | 1989-08-02 00:06 |
| 1996-07-15 16:15 | 1996-07-15 23:15 | 1996-07-16 00:15 |

**Điều quan trọng:** Đây là dự đoán ngày dân sự chứa Sóc theo múi giờ, **không phải** chứng cứ rằng mọi lá số nguồn đều khác Thiên Đồ đúng một ngày. Bản tham khảo `Renhuai123/ziwei-doushu` sử dụng `iztro` và `lunar-javascript`; cần giữ tên hệ lịch trong báo cáo, không tự khẳng định toàn bộ cấu hình múi giờ nội bộ đã được độc lập kiểm chứng.

## Ma trận chạy thật 48 trường hợp

Nguồn: `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, `iztro@2.6.1` từ lockfile.

Bốn lần Sóc × ba ngày dương lịch (cách ngày Sóc **2, 14 và 22 ngày**) × hai giới tính giả lập Nam/Nữ × hai giờ sinh **00:00 và 12:00** = **48 trường hợp**. Tất cả là trường hợp tổng hợp, không chứa dữ liệu sinh hoặc thông tin cá nhân của người dùng.

CI `.github/workflows/tuvi-calendar-provenance-r34.yml` chạy trực tiếp `generateChart` nguồn cho 48 trường hợp, lưu ra `.r34-source-calendar-boundaries.json`, sau đó dựng lại với engine Thiên Đồ. `tuvi-r34-evaluate-calendar-provenance.cjs` kiểm sự toàn vẹn đầu vào, SHA/version nguồn, tọa chi Tử Vi/Cục/Mệnh, và phân loại:
- `same-lunar-day` — cùng năm, tháng, trạng thái nhuận và ngày âm;
- `local-one-day-ahead`, `source-one-day-ahead` — cùng tháng nhưng hai ngày âm cách một;
- `different-month-or-year` — không cùng tháng, năm hoặc trạng thái nhuận;
- `other-day-difference` — khác ngày không thuộc hai quy tắc trên.

Mỗi bản ghi chứa mốc NASA, ngày dân sự UTC+7 và UTC+8, ngày âm của cả hai engine, phân loại trên, so sánh Cục/Tử Vi/Mệnh, quy ước nguồn và cờ **chưa xác minh tính tương đương trường phái**. Dữ liệu tháng âm/tháng nhuận khác sẽ được ghi nhận như quan sát, **không làm test fail chỉ vì hai engine khác nhau**.

Bài kiểm thử `tests/v111677-tuvi-r34-calendar-provenance.test.cjs` bao gồm kiểm bản ghi NASA, đủ 48 mẫu không trùng, từ chối provenance hỏng, mốc Sóc bị thay, kiểm các trạng thái dự đoán / quan sát, bất biến 31/49 và bắt buộc chạy nguồn thật `THIENDO_R34_REQUIRE_GENUINE=1`. Trường hợp 1989-08-15 đã xác minh ở R33 được giữ làm regression anchor tối thiểu bốn mẫu nguồn.

## Ranh giới phát hành và việc cần làm tiếp

- Không thay đổi `lunar.js`, `tuvi.js`, bảng an chính tinh, Tứ Hóa, AI, quyền Pro, database, thanh toán hoặc UI.
- **31/49 bộ điều kiện ánh xạ kỹ thuật không đổi**, không gán nhãn cách cục dựa trên số liệu khảo sát 48 mẫu.
- Chỉ merge sau Source Integrity, Full Stack, Production Acceptance 5/5 và workflow nghiên cứu r34 cùng PASS đúng HEAD SHA; nếu không, PR giữ mở.
- Sau khi có báo cáo 48 trường hợp thật, tách nhóm sự kiện có/không chênh lệch, tập trung tháng nhuận, giờ Tý và biên năm âm. Chỉ đề nghị sửa engine nếu có bằng chứng lỗi chuẩn hóa ở **cùng quy ước lịch**; khác biệt do múi giờ phải được lưu dưới dạng nguồn gốc lịch.
