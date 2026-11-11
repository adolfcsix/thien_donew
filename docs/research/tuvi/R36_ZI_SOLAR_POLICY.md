# R36 — kiểm chứng giờ Tý và ranh giới ngày theo giờ mặt trời thực

Ngày: 11/11/2026 · Trạng thái: **nghiên cứu độc lập, chưa áp dụng lên thuật toán an sao**.

## Mục tiêu

R35 đã chứng minh việc truyền địa chi Tý vào `generateChart` không đủ để xác nhận quy tắc đổi ngày tại 23:00. R36 kiểm tra lớp tiền xử lý ngày giờ trong **mã nguồn tham khảo**, không sửa hay ép Thiên Đồ sử dụng quy ước nguồn.

Nguồn ghim: `Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d`, file `lib/ziwei/true-solar-time.ts`, sử dụng ba hàm `calculateTrueSolarTime`, `resolveZiweiDayOffset`, `shiftGregorianDate`.

## Các trường hợp kiểm chứng

- Bốn ngày sát các mốc chuyển lịch: `2020-05-22`, `2023-03-21`, `2024-02-09`, `2025-01-28`.
- Sáu đồng hồ: `00:00`, `00:59`, `01:00`, `22:59`, `23:00`, `23:59`.
- Ba chế độ: không hiệu chỉnh kinh độ, kinh độ 105° Đông và 135° Đông (cả hai dùng tham số UTC+8 như chính API nguồn; đây **không phải cấu hình mặc định Việt Nam**).
- Bốn chính sách: `next-day`, `current-day`, `all-current`, `day-cur-time-next`.

Tổng cộng **4 × 6 × 3 × 4 = 288 trường hợp giả lập**, không chứa dữ liệu cá nhân.

## Công thức và kiểm tra độc lập

Nguồn sử dụng chuẩn hóa theo giây: `Math.round(rawMinutes * 60)`, sau đó lấy ngày dịch, giờ, phút, giây và chi Tý/Sửu. Trình đánh giá R36 tính lại từ dữ liệu quan sát, kiểm tra hiệu chỉnh kinh độ `(longitude - utcOffsetMinutes / 4) * 4`, tổng hiệu chỉnh, chuẩn hóa qua nửa đêm, địa chi giờ, ngày ứng với chính sách, và ngày dương lịch cuối.

Với giờ mặt trời 23:00–23:59 thuộc Tý, `next-day` sẽ chuyển sang ngày sau nếu `dayOffset=0`; các chính sách còn lại giữ ngày. Trường hợp hiệu chỉnh kinh độ tạo `dayOffset<0` mà giờ đã chuyển về 23:00 sẽ được xử lý theo quy tắc đặc biệt của nguồn. Đây là **quy tắc thực thi nguồn**, không phải kết luận quy tắc nào hợp lệ nhất tại Việt Nam.

## Ranh giới nguồn và phát hành

Phần toán học xác nhận **mã nguồn tự nhất quán**, chưa xác nhận độ chính xác thiên văn của xấp xỉ NOAA, giờ mùa hè, múi giờ lịch sử, độ chính xác tọa độ nơi sinh hoặc tính tương đương trường phái. Các cờ `sourceAstronomicalAccuracyVerified`, `sourceGeographicTimezoneAccuracyVerified`, `vietnamSchoolSemanticEquivalenceVerified` đều phải giữ `false`.

R36 không sửa `lunar.js`, `tuvi.js`, giao diện, bảng sao, hệ thống quản trị, AI, thanh toán, quyền Pro hoặc các kết luận cách cục. Mốc ánh xạ kỹ thuật **31/49** giữ nguyên.

Chỉ nghiệm thu khi workflow thực thi nguồn (288 mẫu) PASS cùng Source Integrity, Full Stack và Production Acceptance đủ 5/5 trên **HEAD SHA**. Nếu có bất đồng, phải lưu dữ liệu thực thay vì chỉnh bộ test cho trùng. Sau R36, chỉ xem xét thay đổi engine từ chứng cứ kiểm chứng hai chiều, cùng trường phái và cùng quy ước múi giờ.
