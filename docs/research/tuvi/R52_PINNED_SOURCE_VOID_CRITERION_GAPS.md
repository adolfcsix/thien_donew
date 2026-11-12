# R52 — Đối chiếu điều kiện cách cục Không Vong theo từng quy tắc nguồn

**Ngày:** 12/11/2026 · **Nguồn khóa:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` · **iztro:** `2.6.1`.

## Câu hỏi

R51 ghi nhận hình học hai cặp chi của nguồn và Tuần/Triệt Thiên Đồ khớp 65/65 ca nguồn thật, nhưng *không chứng minh* tương đương sao, trường phái hay điều kiện cách cục. R52 tiếp tục với **đúng ba tiêu chí nguồn đang bị khóa**, nhằm phân biệt việc detector nguồn và proxy nội bộ cùng đạt, khác nhau, không đủ thông tin hoặc khác vị trí cung Mệnh.

## Quy tắc thực tế ở mã nguồn ghim

| ID | Tên gốc | Điều kiện mà detector nguồn thực thi | Điều kiện chưa đủ để chuyển thành kết luận Thiên Đồ |
|---|---|---|---|
| `dinh-ban-01` | 生不逢时 | Mệnh có Liêm Trinh **và** sao Không Vong nguồn | Chưa thẩm định ngữ nghĩa và phép an nguồn so với dấu Tuần/Triệt tại Mệnh |
| `dinh-ban-02` | 禄逢两杀 | Mệnh có Lộc Tồn hoặc Hóa Lộc; có Không Vong; **cả** Địa Không và Địa Kiếp cùng cung Mệnh | Chưa kiểm chứng đồng nhất sao và trường phái; ca dương/âm nguồn R30 không phải kết quả Thiên Đồ |
| `dinh-tap-03` | 禄衰马困 | Thất Sát thuộc tam phương tứ chính của một đại hạn; Lộc Tồn và Thiên Mã **đều** tọa cung có Không Vong nguồn | Cần đối chiếu sao, Không Vong và vị trí từng đại hạn; không lấy proxy nguyên cục để suy ra phán quyết đại hạn |

Tên Hán và quy tắc trên mô tả **mã nguồn tham khảo** ở hai tệp `patterns-dingpin.ts`, `patterns-dingza.ts` của commit ghim, không khẳng định độc lập chân lý học thuật.

## Bằng chứng được chạy

Báo cáo R52 được xây trên kết quả **67 ca nguồn thật** đã được engine `generateChart` và detector `detectDingPin` / `detectDingZa` thực thi trong CI R29/R30/R32: 65 ca nguồn R29 + 1 ca dương và 1 ca âm hiếm R30. Báo cáo tạo ba phân loại: 67 so sánh `dinh-ban-01`, 67 so sánh `dinh-ban-02`, 804 (=67×12) so sánh đại hạn `dinh-tap-03`.

Nhóm kết quả `both-met-proxy-only`, `both-not-met-proxy-only`, `source-only`, `local-proxy-only`, `local-unknown`, `different-ming-branch` **chỉ** mang tính chẩn đoán. Không được đổi `sourceCriterionVerified`, `semanticEquivalenceVerified`, `sourceSchoolParityVerified`, `expertReviewed` hoặc `readyForMapping` thành true dựa vào các nhóm này. Báo cáo được khóa để FAIL nếu thiếu/trùng ca, mất một đại hạn, sai nhánh, sai nhóm phân loại, không chứng minh được ca dương/âm hay nâng cờ kết luận.

## Thay đổi tối giản

Chỉ thêm `infrastructure/scripts/tuvi-r32-r52-criterion-disagreement.cjs`, mở rộng bài test R32 hiện có và workflow R32 đã có, lưu artifact `.r52-source-criterion-disagreement.json`. Không thêm runtime module, route, giao diện, chức năng, CSS hay workflow độc lập. Không thay đổi chính sách luận giải, lịch, an sao, SQL, AI, quyền hoặc dữ liệu cá nhân.

**Điều kiện gộp:** R32 genuine 67/67 + R52, Source Integrity, Full Stack, Production Acceptance 5/5 cùng HEAD SHA. Chỉ gộp khi đã nghiệm thu R51 trên main; sau gộp kiểm tra lại main. **Mốc nghiên cứu 31/49 giữ nguyên**. 
