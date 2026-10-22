# THIÊN ĐỒ — GIAI ĐOẠN 2: ROADMAP KIẾN THỨC & THUẬT TOÁN

**Bắt đầu từ V11.88.0.** Giai đoạn này là công tác nghiên cứu, số hóa nguyên tắc theo *trường phái*, kiểm thử và khắc phục khả năng chạy thật; không đồng nghĩa các phép đoán truyền thống có giá trị dự đoán được kiểm chứng bằng phương pháp khoa học.

## Những lớp độc lập, không gộp

1. **Dữ liệu gốc**: tài liệu thư tịch, phiên bản, nguồn bản chụp, văn bản gốc; không sao chép toàn văn có bản quyền khi chưa có quyền sử dụng.
2. **Trường phái/phương pháp**: tên định danh, phương pháp lập, các bảng tra, biến thể, ranh giới lịch pháp, đầu vào và các ca đối chiếu.
3. **Thuật toán thuần**: deterministic computation với bản ghi version, kiểm tra đầu vào và hành vi tại ranh giới. Khả năng tính đúng *nội bộ* khác với khẳng định đúng theo mọi truyền thống.
4. **Diễn giải**: phân tách phân tích cấu trúc, dẫn chiếu văn bản, góc nhìn trường phái, phản biện và giới hạn; không suy kết luận khẳng định chắc chắn về sức khỏe, tiền bạc hoặc tương lai.
5. **Trình bày**: giao diện chỉ là lớp cuối; không dùng nó che giấu công thức chưa hoàn thành.

## Milestone có tiêu chí nghiệm thu

| Mốc | Trọng tâm | Điều kiện hoàn tất |
|---|---|---|
| V11.88 | Sổ bộ môn và trường phái + Đại Lục Nhâm Thiên/Địa bàn | Tách biệt trạng thái `research-only`, 144 ca vòng bàn, tài liệu riêng, không thay lõi cũ |
| V11.89 | Đại Lục Nhâm: xác định Nguyệt Tướng theo Trung khí bằng mốc thiên văn | Mốc UTC và múi giờ được đối chiếu độc lập, thử trước/sau giao Trung khí, không suy tự động khi không chắc |
| V11.90 | Đại Lục Nhâm: Tứ Khóa/Tam Truyền | Bảng quy tắc, chọn nhánh và thứ tự ưu tiên ghi rõ; fixture đối chiếu từ nguyên bản có dẫn trang |
| V11.91 | Thái Ất: nghiên cứu epoch và phép định cục | So ít nhất hai bản truyền trước khi chọn quy ước; không dựng cục giả |
| V11.92 | Tử Vi: hệ dị bản Tứ Hóa và Phi Tinh | Bảng 10 can, truy nguyên từng bảng, ca hiển thị sai khác giữa các phái |
| V11.93 | Bát Tự: lịch pháp chuẩn biên và Chân thái dương thời | Có phép kiểm theo kinh độ, múi giờ, giao tiết và đổi ngày Tý |
| V11.94 | Lục Hào: Dụng Thần, Phục Thần, ứng kỳ | Chọn được phương pháp, câu hỏi, dữ kiện minh bạch; trường hợp bất định không tự luận |
| V11.95 | Phong thủy: hệ Tam Nguyên/Tam Hợp | Tọa-hướng, Hạ/Thế quái tách thuật toán; đầu vào đo đạc và khoảng sai số |
| Song song | Readiness kỹ thuật | Lockfile thật, `npm ci`, Next/Nest build, typecheck, PostgreSQL E2E database riêng, Playwright/browser smoke |

**Không coi version number là proof của mức độ hoàn thiện.** Mỗi cổng nghiệm thu phải đưa ra artifact: mã nguồn, unit tests, integration tests (nếu đủ môi trường), log, chuyên gia/nguồn rà soát, checksum.

## Chống nhập nhằng nguồn

- Nguồn lịch sử xác nhận bộ môn từng được thực hành, không xác nhận công thức cụ thể hay xác suất dự báo.
- Quy tắc trong một văn bản cổ có thể có dị bản, ngắt câu, phép tính và quy ước lịch khác; tài liệu độc lập phải được dẫn tới đúng vị trí.
- Nếu chưa xác minh tháng nhuận, giờ Tý, Trung khí, giao vận, tọa-hướng, độ chính xác đầu vào: trả về trạng thái **chưa đủ điều kiện**, không đoán.
- Hồ sơ trường phái có thể mô tả thuật toán đang tồn tại mà không được phép thay `@thiendo/astrology-engine` hiện thời.

## Tài liệu nghiên cứu chính

- Alexei Volkov, *Astrology and Hemerology in Traditional Vietnam*, Extrême-Orient Extrême-Occident (2013), DOI: https://doi.org/10.4000/extremeorient.282 — bối cảnh thư tịch và Tam Thức, **không thay thế công thức**.
- 《六壬指南》卷一 (Wikisource, cần so với bản in độc lập): https://zh.wikisource.org/zh-hans/六壬指南/1 — nguồn mô tả “月将加时”; chưa kiểm chứng độc lập về mọi dị bản.

Xem dữ liệu quản trị tại `packages/knowledge/src/phase2-school-methods.json`, mỗi trường phái có hồ sơ trong `docs/research/schools/`.

## Tiến độ V11.90 — thực thi có giới hạn

Tứ Khóa đã có phép lập với 10 ký cung; Tam Truyền chỉ xác định cho độc khắc hoặc Bỉ Dụng đúng một ứng viên. Các nhánh còn lại của Cửu Tông Môn trả về `unresolved` có lý do và không tạo bộ ba giả. Xem `docs/research/schools/dai-luc-nham-four-lessons.md`. **Mốc V11.90 trong bảng roadmap chưa phải hoàn tất toàn bộ Tam Truyền**: cần bổ sung dị bản, đối chứng bản in và triển khai các nhánh còn thiếu.

## Tiến độ V11.91 — Taiyi Tuế kế với ranh giới nghiên cứu

Mốc 《太乙金鏡式經》quyển 1 (724, tích niên 1.937.281) được số hóa thành phép tính thuần cho chu kỳ 360/60/72/24/3 và tám cung bỏ trung 5. Bắt buộc người gọi xác nhận ranh giới năm; dị bản epoch khác không được trộn. `tests/v1191-taiyi-annual.test.cjs` có 14 test, kiểm toán xuyên suốt 9.999 năm; chưa xác lập bàn Thái Ất đầy đủ hay tính dự đoán. Chi tiết: `docs/research/schools/thai-at-foundation.md`.

## Tiến độ V11.92 — Tứ Hóa / Phi Hóa đa bảng có truy nguyên

Module độc lập `packages/astrology-engine/src/tuvi-phihoa-research.cjs` chứa ba bảng `toan-tap-common`, `toan-thu-research`, `trung-chau-research`. Đối chiếu Toàn Thư khác 2 ô Canh; bảng Trung Châu khác 3 ô Hóa Khoa Mậu/Canh/Nhâm. Phi Hóa xác định nguồn cung can, sao nhận hóa, cung tọa thật, tự hóa/đối cung, lý do `unresolved` nếu dữ liệu không đủ. **Chưa là engine chính/đã thẩm định**. `tests/v1192-tuvi-phihoa-research.test.cjs`, `infrastructure/scripts/audit-tuvi-phihoa.cjs` và `docs/research/schools/tu-vi-phi-tinh.md` ghi thuật toán và giới hạn.
