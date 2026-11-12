# R46 — Xác nhận R44 trên cặp nguồn dương tính hiếm R30

**Ngày:** 12/11/2026 · **Nhánh:** `feat/tuvi-r46-source-rare-positive-r44-confirmation-20261112` · **Nguồn ghim:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`.

## Mục tiêu

R45 đã đối chiếu các công thức R44 với 65 lá số giả lập được **engine nguồn chạy thật** qua R29. R46 bổ sung kiểm chứng ở trường hợp hiếm `禄逢两杀` (Lộc phùng lưỡng sát), bằng **cặp dương tính / âm tính đổi giờ** vốn đã được R30 tìm từ `generateChart` và `detectDingPin` nguồn. Không mở rộng bộ dự đoán, không suy luận cho lá số thật.

## Thay đổi có giới hạn

- Trong `tuvi-r30-audit-rare-positive.cjs`, chạy thêm `reconcilePinnedR44Fixture` (được R45 kiểm toán) trên **cả hai** quan sát: dương tính và đối chứng âm tính. Chỉ chạy sau `validate()` và `independentlyEvaluate()`.
- Đối chiếu **ba** công thức R44 với bộ oracle nguồn; 12 đại hạn được so theo chi, không dựa vào vị trí mảng. Không tạo bản sao các công thức.
- Ghi `r44SourceFixtureCrosschecks` và `r44SourcePeriodsMatched` vào báo cáo R30 để chứng minh cả hai nguồn đã được kiểm. Nếu thiếu hoặc lệch, xuất `issues` và kiểm thử thật phải FAIL.
- Test phản chứng: alias Không Vong trùng lặp, đại hạn sai địa chi, sửa cờ detector nền phải bị từ chối; kiểm bất biến input và các cờ không được công bố kết luận.

## Nghiệm thu bằng workflow hiện có

Workflow `.github/workflows/tuvi-source-dingpin02-positive.yml` đã checkout commit nguồn cố định, cài `iztro@2.6.1` và quét tối đa 5.000 lá số để tìm ca dương tính hiếm; sau đó xác minh đối chứng âm tính cùng ngày và giới tính. R46 tái dùng workflow này và các artifact có sẵn, không tạo workflow mới. Cần PASS **Source Integrity + R29/R30/R32 khi kích hoạt + Full Stack + Production Acceptance 5/5** trên HEAD.

## Ranh giới học thuật và phát hành

Sự đồng ý giữa các công thức ở mẫu SOURCE chỉ chứng minh nhất quán theo phiên bản mã nguồn được ghim, **không** chứng minh nghĩa `空亡` tương đương Tuần/Triệt, lịch Trung Quốc tương đồng lịch Việt Nam, hay dự báo tài chính và số phận. Không đổi `main` trước nghiệm thu, không sửa engine an sao và **không nâng 31/49**.
