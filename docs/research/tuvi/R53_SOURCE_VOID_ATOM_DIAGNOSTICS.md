# R53 — Tách nguyên nhân điều kiện Không Vong theo từng nhãn sao nguồn

**Thời điểm:** 12/11/2026. **Nguồn ghim:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` · `iztro@2.6.1`.

## Vấn đề đã rõ

R51 xác nhận 65/65 ca **trùng hình học** của hai cặp chi nguồn với Tuần/Triệt Thiên Đồ. R52 xác minh ba bộ điều kiện nguồn thật R29/R30; 67 lá số và 804 bối cảnh đại hạn được phân loại theo proxy nội bộ, song **chưa biết rõ nhãn sao nào gây điều kiện Không Vong nguồn tại từng cung**. Không được dùng hình học hoặc tổng hợp proxy thay cho bằng chứng ngữ nghĩa.

## Phép kiểm toán R53

Dùng lại đúng **67 lá số chạy engine nguồn thật**: 65 nguồn R29 và ca dương + âm R30. Gọi lại kiểm toán R32 trước khi phân tích, từ chối dữ liệu không đúng commit, thiếu ca, thiếu sao, trùng cung, sai detector. Mỗi ca ghi chi tiết:

- **Định bần 01 · 生不逢时:** Liêm Trinh có tại Mệnh hay không, những nhãn nguồn nào thuộc bộ sáu nhãn Không Vong đang thực sự ở Mệnh; so với kết quả source detector và trạng thái proxy Thiên Đồ.
- **Định bần 02 · 禄逢两杀:** Lộc Tồn hoặc Hóa Lộc ở Mệnh; cả Địa Không và Địa Kiếp ở Mệnh; cùng danh sách nhãn Không Vong thực tế ở Mệnh. Ca dương/âm hiếm vẫn bắt buộc.
- **Định tạp 03 · 禄衰马困:** cung chứa Lộc Tồn, cung chứa Thiên Mã và tên sao Không Vong tại mỗi cung; Thất Sát trong tam phương tứ chính của từng đại hạn; 12 đại hạn × 67 ca; chỉ xác minh lại kết quả detector nguồn.

Nhãn nguồn gồm `旬空`, `副旬`, `截路`, `截空`, `空亡`, `副截`. Hai nhãn cũ có thể đã được đổi tên bởi engine, không được tự đếm thành sao độc lập.

## Phạm vi giữ nguyên

R53 là báo cáo **chẩn đoán chỉ đọc**, không thêm rule an sao hoặc rule luận giải mới cho Thiên Đồ, không mở UI hay route mới, không đọc dữ liệu người dùng, không đổi AI/phân quyền/SQL/CSS. Chỉ thêm script audit, test trong bộ R32 hiện tại, chỉnh workflow R32 đang có và xuất `.r53-source-void-atom-breakdown.json`.

Báo cáo luôn giữ `sourceSchoolParityVerified=false`, `semanticEquivalenceVerified=false`, `sourceCriterionVerifiedForLocalChart=false`, `expertReviewed=false`, `mayIncreaseMapping=false`. **31/49** vẫn là mốc nghiên cứu, không phải 31 cách cục đã được chứng minh học thuật.

**Điều kiện gộp:** chờ R52 được gộp sạch vào main, R32 genuine + R53, Source Integrity, Full Stack và Production Acceptance 5/5 đều PASS trên commit chính xác. Sau squash kiểm tra lại main.
