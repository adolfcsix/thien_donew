# R51 — Ma trận nguồn thật và dấu Tuần/Triệt nội bộ (chẩn đoán chỉ đọc)

**Nguồn khóa:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, `iztro@2.6.1`. **Ngày:** 12/11/2026.

## Phạm vi

Dùng ngay báo cáo R27 lấy từ **65 lá số giả lập công khai nhưng chạy bằng engine nguồn thật**, không chép dữ liệu nguồn vào fixture mới. R27 đã đối chiếu nhãn `旬空` / `副旬` / `截空` / `副截` và so sánh hình học với hai dấu Tuần/Triệt Thiên Đồ mà không sửa lá số. R51 xuất ma trận minh bạch 65 dòng, giữ danh tính ca và thời điểm, thiên can năm nguồn/nội bộ, bốn vị trí nguồn, hai trạng thái đối chiếu cặp địa chi.

`matched` chỉ nói **hai cặp địa chi giống nhau khi bỏ thứ tự**, `different` là hai cặp địa chi khác nhau; `unknown` là thiếu bằng chứng hình học để so. Khác thiên can năm được nêu riêng, không tự sửa lịch.

**Không được suy ra:** cùng ngữ nghĩa Không Vong/Tuần/Triệt; tên sao tương đương; cùng thuật toán an sao hay trường phái; cùng cách xét cục; dự đoán tài vận, hung cát. Mọi cờ ngữ nghĩa/học thuật giữ `false` kể cả khi 100% tọa độ trùng nhau.

## Ba điều kiện bị khóa

- `dinh-ban-01` — 生不逢时: chưa kiểm chứng điều kiện Không Vong nguồn có thể dùng thay thế dấu Tuần/Triệt nội bộ.
- `dinh-ban-02` — 禄逢两杀: cần đối chiếu đúng sao, hai sát và ngữ nghĩa của điều kiện Không Vong.
- `dinh-tap-03` — 禄衰马困: thêm yêu cầu đối chiếu ngữ cảnh đại hạn, tránh dùng proxy nguyên cục để suy ra kết quả đại hạn.

Mốc danh mục vẫn **49 chỉ mục, 31 ánh xạ điều kiện nghiên cứu, 18 chưa triển khai** (3 chờ kiểm chứng nguồn, 9 tranh luận, 6 chưa đủ phương pháp). R51 không tự đánh dấu mục nào là đã thẩm định.

## Cấu trúc kỹ thuật

- `infrastructure/scripts/tuvi-r27-r51-void-evidence-matrix.cjs`: lấy báo cáo R27 đã đánh giá từ engine thật, kiểm tra tính toàn vẹn, danh tính ca, cờ chứng cứ, số dòng, và xuất `.r51-source-local-void-evidence-matrix.json`.
- `tests/v111670-tuvi-source-iztro-parity.test.cjs`: kiểm thử nghiệm thu thực với nguồn ghim, đầy đủ 65 dòng, dữ liệu sai kiểu, trùng ca, thiếu ca và cờ tương đương bị nâng trái phép.
- `.github/workflows/tuvi-source-iztro-parity.yml`: chạy R51 ngay sau R27 trong **workflow hiện có**; lưu artifact chứng cứ R51 cùng R27. Không tạo workflow hoặc engine runtime mới.

**Điều kiện gộp:** R27 genuine có R51, Source Integrity, Full Stack và Production Acceptance **5/5** đều PASS trên đúng HEAD SHA; không gộp nếu thiếu bất kỳ gate nào. Sau gộp kiểm tra lại `main`. Không sửa thuật toán, SQL, đăng nhập, phân quyền, AI, xuất lá số hay UI.
