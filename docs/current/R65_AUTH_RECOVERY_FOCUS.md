# R65 — Ổn định focus khi khôi phục mật khẩu

Ngày 15/11/2026. Nền triển khai: `02209782b4072d11253c97045c786ce2e613ef4c` (R64).

## Lỗi quan sát và giới hạn kết luận

Production Acceptance của PR #86 từng timeout 15 giây tại `pairedSubmit` khi nút “Đặt lại mật khẩu” đang disabled. Chạy lại cùng HEAD và CI main sau merge đều PASS. Log cũ không có độ dài các trường nhập, nên chưa thể xác nhận nguyên nhân duy nhất của lần timeout đó.

R65 tái hiện được một lỗi cụ thể trong chính `AuthProvider`: cả lúc mở hộp thoại và khi đổi bước, component xếp callback `requestAnimationFrame` để focus ô đầu tiên mà không kiểm tra người dùng đã chọn ô khác hay chưa. Nếu callback đến muộn, con trỏ bị kéo từ ô mật khẩu mới về OTP. Phím gõ hoặc lệnh dán tiếp theo có thể đi vào sai ô, làm biểu mẫu chưa đủ điều kiện gửi.

Đây là lỗi focus đã được tái hiện có kiểm soát, phù hợp với hiện tượng nút chưa sẵn sàng. Không dùng phép tái hiện này để khẳng định mọi timeout trước đây có cùng nguyên nhân.

## Thay đổi

Thêm helper nội bộ `focusDialogInput` dùng chung cho hai callback hiện có. Callback chỉ đặt focus khi hộp thoại vẫn gắn trong document và chưa có control hợp lệ bên trong được chọn. Khi người dùng đã focus ô mật khẩu, OTP hoặc nút đóng, callback giữ nguyên lựa chọn đó. Khi chưa có tương tác, vẫn focus ô đầu tiên; đóng hộp thoại vẫn hủy callback và trả focus về nút mở.

Không thay thời hạn OTP, điều kiện cho phép gửi, xử lý mật khẩu, rate limit, MFA hay khóa chống gửi lặp. Không tăng timeout hoặc dùng force-click để vượt điều kiện biểu mẫu.

`tests/auth-dialog-focus-dom.test.mjs` chạy component React thật, control thật và hook pending thật với hàng đợi RAF do bài test điều khiển. API trong DOM harness được thay bằng dữ liệu kiểm thử; đây không phải kiểm thử email, SQL hoặc browser. Bộ này được nối vào `test:session:dom` hiện có, không thêm dependency vào ứng dụng.

Luồng browser thật trong `tests/account.browser.cjs` trì hoãn callback ở một trang khôi phục riêng, đợi hai frame gốc, cho người dùng chọn ô mật khẩu rồi mới giải phóng callback. Sau đó vẫn phải gửi qua Next/Nest/PGlite, tiêu thụ đúng một OTP và đăng nhập thành công bằng mật khẩu mới. Các trường hợp còn lại tiếp tục chạy bình thường.

Nếu control hết thời gian chờ, log chỉ ghi type, autocomplete, độ dài, disabled/focused và đồng hồ hiệu lực. Không ghi giá trị email, mật khẩu hoặc OTP. Việc chờ và các assertion cũ vẫn được giữ.

## Bằng chứng local

| Kiểm tra | Trước sửa | Sau sửa |
|---|---|---|
| RAF muộn kéo focus khỏi ô mật khẩu khôi phục | FAIL | PASS |
| RAF lúc mở ghi đè control đã được người dùng chọn | FAIL | PASS |
| Tự focus khi chưa có lựa chọn, đóng và trả focus, chống gửi lặp | 3/3 PASS | 3/3 PASS |
| Bộ DOM tài khoản/session hiện có và mới | — | 68/68 PASS |

Đã kiểm source và typecheck local. Chromium local vẫn bị môi trường chặn socket; kết quả browser phải lấy từ CI, không được suy ra từ DOM harness.

## Gate nghiệm thu

Workflow R33 hiện có được mở path cho đúng component và test này để có bằng chứng nguồn cùng HEAD. Không thêm workflow trùng hoặc thay bộ R33/R62/R63/R64. R33 nguồn thật, Source Integrity, Full Stack và Production Acceptance 5/5 phải PASS cùng HEAD trước merge; sau squash kiểm tra lại main.

Mốc Tử Vi giữ **31/49**. R65 là sửa độ ổn định tài khoản, không bổ sung ánh xạ hay công nhận ngữ nghĩa cách cục.
