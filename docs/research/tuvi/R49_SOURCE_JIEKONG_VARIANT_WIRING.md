# R49 — Kiểm toán ba lựa chọn 截空 và đường sử dụng trong mã nguồn ghim

**Ngày:** 12/11/2026 · **Nguồn:** `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d` · **iztro:** `2.6.1`.

## Phát hiện và giới hạn

`lib/ziwei/school-config.ts` khai báo `JiekongSchool = single | double | zhanyan`, mặc định `double`, và có ba lựa chọn cấu hình. `school-data.ts` chứa ba bảng `SCHOOL_JIEKONG_VARIANTS.v1/v2/v3` và bảng `SCHOOL_XUNKONG`. Trong phiên bản nguồn được ghim, chữ ký `generateChart(birthInfo, opts)` chỉ nhận tùy chọn `leapMonth`; mã gọi `applySchoolJiekong(palaces, lunarInfo.yearStem)` mà không truyền `jiekongSchool`. Do đó **sự hiện diện của lựa chọn trên cấu hình không chứng minh các biến thể ngoài mặc định đã có tác dụng trong `generateChart`**. Không suy diễn việc cấu hình nào đã được kích hoạt tại mọi đường gọi bên ngoài.

## Triển khai gọn

R49 **không tạo module engine hoặc workflow mới**. Bổ sung kiểm thử đọc ba tệp **trực tiếp từ checkout SOURCE ghim** trong workflow R27 đã có, khi `THIENDO_R27_REQUIRE_GENUINE=1`: đối chiếu 30/30 ô thiên can của ba bảng với ma trận mã nguồn Thiên Đồ hiện lưu; so 10 ô thiên can bảng Xun và không diễn giải hai ô cuối; yêu cầu chữ ký `generateChart` và lệnh gọi mặc định không âm thầm đổi.

Kiểm thử này chỉ là đối chiếu **bảng dữ liệu và đường gọi tĩnh của nguồn**. R27 vẫn là bằng chứng riêng cho 65 ca động của chế độ mặc định; R49 không tự nhận đã chạy `single` và `zhanyan`. Nếu nguồn đổi chữ ký hoặc khác bảng, CI FAIL để kiểm toán lại.

Không sửa lịch, engine an sao, quyền người dùng, UX, AI, SQL hoặc kết luận cách cục. Trạng thái ngữ nghĩa nguồn ↔ Tuần/Triệt tiếp tục **chưa xác minh**; tiến độ **31/49** không tăng. Chỉ gộp sau R27 genuine, Source Integrity, Full Stack và Production Acceptance **5/5 PASS**, rồi nghiệm thu lại `main`.
