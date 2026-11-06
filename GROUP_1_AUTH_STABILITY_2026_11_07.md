# Nhóm 1 — Tài khoản, phiên, MFA và tải đồng thời

## Đã sửa trong đợt này

1. Hàng chờ scrypt giữ tối đa 4 tác vụ hoạt động và 32 chờ, bổ sung hạn chờ 5 giây. Tác vụ hết hạn bị gỡ khỏi hàng chờ, trả 429, không tiếp tục chạy về sau. Kiểm thử kiểm soát worker bị chậm, hàng chờ đầy, hết hạn, chuyển suất và phục hồi. Không giảm tham số scrypt hoặc bỏ kiểm tra mật khẩu.
2. Nginx tách login/register khỏi nhóm khôi phục/Google/MFA. Login/register có ngân sách riêng theo IP 60/phút, burst 20 và tổng cổng vào 10/giây, burst 20. Nhóm khôi phục/Google/MFA vẫn 10/phút, burst 5; thêm setup/confirm/verify MFA vào nhóm hạn chế. Giữ giới hạn API chung, kết nối, hạn thử sai theo tài khoản và ngân sách KDF/DB. Đây là cấu hình khởi điểm để kiểm thử, không phải bằng chứng sức chịu tải hay bảo đảm mọi người chung mạng đều được nhận yêu cầu ngay. Không dùng user-provided header để tách IP hoặc nhận diện tài khoản.
3. Sửa fixture kiểm thử bộ lọc lỗi cho API Response thực tế có setHeader; kiểm tra 429/503 trả Retry-After và 503 không lộ lỗi nội bộ.

## Đã kiểm chứng cục bộ

- 3225 Node regression tests trong 375 tệp đạt. Hai ca deadline được chạy lại sau khi bỏ phụ thuộc artifact API đã build, vẫn đạt.
- 78 SQL/service tests tài khoản và phân quyền trên PGlite đạt, gồm xác thực, khôi phục, quyền, MFA và thu hồi phiên theo phạm vi bộ kiểm thử.
- 63 DOM tests đạt.
- Build API và typecheck API/web đạt.
- 6 kiểm thử production/security-runtime đạt, gồm Retry-After mới.

## Kiểm chứng đã chuẩn bị nhưng còn mở

Đã bổ sung tests/api-postgres-e2e.test.mjs: 12 tài khoản đăng ký đồng thời, đăng nhập đồng thời từ cùng nguồn chạy, kiểm tra danh tính qua /me, cookie cũ bị thu hồi và dọn tài khoản sau thử nghiệm. Tái sử dụng guard database thử nghiệm, so khớp instance API/DB trước khi tạo tài khoản, không dùng database production. Workflow database-http hiện có chạy bộ này với PostgreSQL 16. Ca này chưa chạy tại môi trường hiện tại vì không có PostgreSQL native. Nó đi qua API/Next trong CI hiện có, không chứng nhận luật giới hạn Nginx đã được đo dưới tải chung IP.

Môi trường hiện tại không có lệnh Docker/PostgreSQL/Nginx; công cụ environment_status và policy snapshot cũng không khả dụng. Vì vậy chưa chạy nginx -t hoặc đo native DB/network concurrency ở đây. Workflow có bước nginx -t; cần kết quả CI trước khi nhận cấu hình ingress là đã nghiệm thu runtime.

## Điều kiện chưa đủ để đóng nhóm 1

- CI PostgreSQL và Nginx mới phải đạt; chạy qua ingress để đo nhiều người chung IP và nhiều IP, kiểm tra 429 hợp lý.
- Chạy tải tăng dần trên hạ tầng tương đương triển khai, ghi p50/p95/p99, request rate, 429/503/5xx, CPU/RAM, pool DB và thời gian phục hồi. Không suy ra số người dùng từ số test hoặc số thao tác giả lập.
- Nhiều bản sao API cần limiter dùng chung ở ingress/Redis và tổng ngân sách kết nối DB; bộ đếm nội bộ chưa trở thành bộ đếm phân tán.
- Email/Google thật, MFA trên thiết bị thật, Windows và Safari còn cần nghiệm thu.

Trạng thái: ĐÃ SỬA VÀ KIỂM CHỨNG CỤC BỘ; NHÓM 1 CHƯA ĐÓNG NGHIỆM THU. Không tự đổi trạng thái phát hành NO_GO.
