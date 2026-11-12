# R45 — Đối chiếu R44 với chứng cứ engine nguồn đã chạy thật

**Ngày:** 12/11/2026. **Nhánh:** feat/tuvi-r45-pinned-observation-fixture-reconciliation-20261112

## Mục tiêu

R44 đã kiểm chứng ba công thức Không Vong trên dữ liệu giả lập SOURCE nhưng chưa đối chiếu bộ hàm đó với kết quả chạy thực tế engine nguồn. R45 **không dựng engine mới**: nối hàm `evaluatePinnedSourceVoidFixture` của R44 vào bộ kiểm toán R29 đã tồn tại để kiểm tra cùng **65 quan sát từ `generateChart` + `detectDingPin` + `detectDingZa`** của commit nguồn được ghim.

## Kiểm tra được bổ sung

- Bắt buộc giữ đủ 12 cung, chi Mệnh, 12 địa chi đại hạn và provenance R29/iztro theo workflow cũ. Không sao chép hay thêm dữ liệu sinh của người dùng.
- Chuyển từng đối tượng sao nguồn dạng `{name,siHua:null}` sang định dạng kiểm thử công thức R44 bằng cách **chỉ bỏ thuộc tính Hóa Tứ khi null/rỗng**. Giữ nguyên vị trí, tên sao và Hóa Tứ có giá trị.
- So sánh kết quả hai công thức nguyên cục và mọi kỳ đại hạn theo **địa chi**, không dựa thứ tự mảng, với bộ oracle độc lập R29 và detector nguồn thực. Chênh lệch hoặc dữ liệu sai phải FAIL.
- Khóa các cờ `semanticEquivalenceVerified=false`, `localPatternVerdictsVerified=false`, `mayDeclarePattern=false` cùng mốc **31/49**. Không chuyển dữ liệu nguồn giả lập thành luận giải người thật.

## Tái sử dụng CI, không nhân bản hạ tầng

R45 sử dụng workflow **`.github/workflows/tuvi-source-pattern-oracle.yml`** đã có. Workflow này checkout trực tiếp nguồn `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, cài đúng `iztro@2.6.1` rồi chạy probe và test R29 theo cờ `THIENDO_R29_REQUIRE_GENUINE=1`. Do R45 nằm trong script `tuvi-r29-*` và test `v111672-*`, CI tự chạy lại chứng cứ thật mà không cần workflow, container, API hay engine mới.

## Giới hạn và nghiệm thu

Kết quả PASS chỉ chứng minh ba cách diễn giải công thức SOURCE nhất quán **trên 65 quan sát giả lập có provenance**. Nó không chứng minh lịch Việt Nam và Trung Quốc tương đương, Không Vong bằng Tuần/Triệt, tất cả cách cục được thẩm định hay Thiên Đồ có quyền kết luận đời sống. Không tăng **31/49**. Gộp chỉ sau Source Integrity, chuyên biệt R29 nguồn thật, Full Stack và Production Acceptance **5/5 PASS** trên đúng HEAD.
