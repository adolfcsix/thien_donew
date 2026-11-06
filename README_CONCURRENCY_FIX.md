# Bảo vệ khi nhiều người sử dụng — 06/11/2026

## Thay đổi

- DatabaseService dùng một ngân sách chung tối đa 64 thao tác đang xử lý hoặc chờ kết nối trên mỗi tiến trình API. Pool vẫn tối đa 10 kết nối. Truy vấn và transaction đều phải nhận suất trước khi gọi pg; phần vượt giới hạn bị từ chối với HTTP 503 thay vì tăng hàng chờ không giới hạn.
- Luôn trả suất sau thành công, lỗi truy vấn, lỗi kết nối, rollback và commit. Khi bắt đầu shutdown, từ chối thao tác DB mới.
- Phản hồi 429/503 từ bộ lọc lỗi API thêm Retry-After: 5. Không tự gửi lại thao tác ghi vì có thể tạo dữ liệu trùng khi kết quả trước đó chưa rõ.
- Giữ nguyên hàng chờ xử lý mật khẩu hiện có: tối đa 4 scrypt hoạt động và 32 lượt chờ; phần vượt giới hạn nhận 429. Không giảm độ mạnh mật khẩu hoặc bỏ MFA.

## Bằng chứng kiểm thử

Chín kiểm thử deep-auth-pool-hardening bao gồm đăng nhập hợp lệ liên tục, khóa sau mật khẩu sai, 64 yêu cầu xác thực dồn dùng scrypt thật với DB giả lập, rollback, lỗi kết nối, shutdown và phục hồi. Kiểm thử 1.000 thao tác DB đồng thời dùng pool giả lập giữ yêu cầu đang chờ: đúng 64 thao tác được chuyển vào pool, 936 bị từ chối 503, sau khi hoàn tất thì thao tác mới thành công. Transaction dùng chung giới hạn; 100 lỗi kết nối liên tiếp không làm rò suất.

Đây là kiểm thử cơ chế giới hạn và phục hồi trong tiến trình, không phải kiểm thử 1.000 người dùng trên PostgreSQL/máy chủ production. Không suy ra một số người dùng tối đa từ số kiểm thử này.

## Triển khai thực tế

Mỗi bản sao API có pool và giới hạn riêng; N bản sao có thể dùng tới 10×N kết nối DB. Phải chừa kết nối cho migration, vận hành và dịch vụ khác trước khi tăng số bản sao. Không tăng pool hoặc hàng chờ chỉ để giấu lỗi 503.

Cần kiểm thử tải trên máy chủ thử nghiệm có cấu hình tương đương triển khai: tăng tải theo từng bậc với tài khoản riêng, đo độ trễ p95/p99, tỷ lệ 429/503/5xx, CPU/RAM, event-loop lag, kết nối DB và phục hồi sau tải. Bao gồm đăng nhập, xem lá số, diễn đàn, AI và thao tác ghi. Giới hạn này bảo vệ đường vào DB; nó không thay thế giới hạn tại reverse proxy, chống DDoS, giới hạn dùng chung Redis cho nhiều bản sao, hay kiểm soát tài nguyên của nhà cung cấp AI.

Chưa có quyền truy cập hạ tầng đang chạy của người dùng nên chưa đo sức chứa production. Bản này bao gồm các sửa đăng nhập admin và iPhone ở các README tương ứng.
