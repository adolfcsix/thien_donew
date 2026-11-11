# Tử Vi R40 — hành trình dịch chuyển của 14 chính tinh giữa hai kịch bản giờ Tý

Trạng thái: công cụ nghiên cứu chỉ đọc, phát triển trên `main` sau R39 đã nghiệm thu.

## Vì sao cần R40

R38–R39 hiển thị hai địa bàn A/B và đánh dấu sao đổi vị trí. Tuy nhiên người dùng vẫn phải tìm sao trong từng bảng để biết chính tinh nào chuyển từ địa chi nào sang địa chi nào. R40 bổ sung một lớp tra cứu chuyên biệt, **đóng mặc định**, bên dưới phần xem một cung và bên trên bảng sáu chỉ số.

## Hành trình sao

Mục **“Hành trình chính tinh · N/14 sao đổi địa chi”** sử dụng cấu trúc `details/summary` có thể mở bằng chuột, chạm hoặc bàn phím. Khi mở, mỗi dòng chỉ chứa:

- Tên một chính tinh đã chuyển địa chi.
- Địa chi trên lá số A, tức **giữ ngày dân sự đã nhập**.
- Địa chi trên lá số B, tức **chuyển sang ngày dân sự tiếp theo để nghiên cứu**.

Các dòng sắp xếp tên sao bằng thứ tự tiếng Việt do mô hình so sánh đã sử dụng; không tạo dữ liệu sao mới trong component. Tập 14 chính tinh được lấy từ chính `late-zi-compare-model.cjs`. Với kịch bản không có chính tinh nào đổi vị trí, báo trạng thái rõ ràng thay vì một danh sách trống. Trạng thái `details` nằm trong component tạm, không ảnh hưởng đến lá số gốc, export hay database.

## Responsive và accessibility

Trên desktop, tối đa hai cột các dòng đối chiếu để tiết kiệm chiều dài. Trên điện thoại và tablet, chỉ một cột, giữ nhãn **Giữ ngày / Sang ngày sau** ở mỗi dòng. Nút mở rộng cao tối thiểu 44px và có focus ring nhìn rõ. Mũi tên chỉ trang trí, còn nội dung đọc của trình đọc màn hình vẫn là tên sao, nhãn phương án, địa chi. Không chỉ dựa vào màu để truyền tải sự thay đổi.

## Nghiệm thu

`tests/v111683-tuvi-r40-star-transition-legend.test.cjs` kiểm 16 cặp lá số giả lập (4 ngày × 2 giới tính × hai phút), vị trí nguồn/đích từng sao, không sao nào bị trùng, trường hợp **0/14** và **14/14** thay đổi, và bất biến đầu vào.

`tests/helpers-late-zi-compare-browser.cjs` mở mục này trong browser Production ở cả **390px và 1440px**, kiểm 14 dòng, mỗi dòng có một tên sao và hai địa chi, sau đó đóng; ảnh mở rộng được lưu dưới `docs/reports/isolated-sql/r40-visual-evidence/`.

Workflow `.github/workflows/tuvi-r40-star-transitions.yml` chạy source check, R37–R40 tests và typecheck. **Chỉ gộp khi workflow R40, Source Integrity, Full Stack và Production Acceptance 5/5 PASS cùng HEAD SHA.**

R40 **không sửa** luật đổi ngày giờ Tý, timezone, engine an sao, AI, phân quyền, lưu lá số, tài khoản, payments hoặc số điều kiện ánh xạ kỹ thuật **31/49**. Các quan sát không phải xác nhận trường phái hay độ chính xác thiên văn.
