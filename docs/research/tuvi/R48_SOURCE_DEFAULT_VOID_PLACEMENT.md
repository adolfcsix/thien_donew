# R48 — Kiểm toán vị trí Không Vong của engine tham khảo

**12/11/2026.** Nguồn được ghim `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`.

R47 ghi sáu nhãn sao; R48 bổ sung kiểm toán tọa độ tên chuẩn hóa `截空`, `副截` theo cấu hình mặc định `jiekongSchool='double'`, đồng thời `副旬` phải nằm ở chi kề `旬空`, đúng quy tắc `applySchoolFuxun` của nguồn.

**Phạm vi dữ liệu phải được giữ chính xác:** 65 ca R29 không có trường `sourceYearStemIndex`, không được suy ra thiên can bằng lịch Việt Nam hoặc ngày dương. Hai ca R30 (dương hiếm và đổi giờ) có trường thiên can gốc `sourceYearStemIndex`; R48 chỉ đối chiếu Jiekong theo thiên can trên **hai ca này**. Quan hệ `旬空/副旬` được quan sát trên đủ **67 ca**. Không tăng tự phát phạm vi chứng cứ từ 2 thành 67.

Thêm `auditSourceDefaultVoidPlacement` vào bộ R32 đang có, sử dụng lại bảng nguồn R23 `auditSourceDoubleJiekongCodeConcordance`. Mọi sai khác phải hiển thị `different`, dữ liệu thiếu phải hiển thị `unknown`, không tự sửa lá số. Kiểm thử 10 thiên can, đảo vị trí tên sao, thiên can thiếu/sai, vị trí Fuxun sai/mất, không sửa input. Workflow R32 nguồn thật được tái sử dụng, không tạo CI hay engine mới.

Báo cáo chỉ cung cấp kết quả **trong cùng phiên bản nguồn**. Tuyệt đối không xác nhận Tuần/Triệt Thiên Đồ tương đương Không Vong nguồn, không sửa engine an sao và không bật luận đoán. `sourceSchoolParityVerified=false`, `sourcePlacementVerifiedForLocalChart=false`, `mayDeclarePattern=false`, mốc **31/49** giữ nguyên. Trước gộp cần R32 nguồn thật, Source Integrity, Full Stack, Production Acceptance 5/5; sau gộp nghiệm thu lại `main`.
