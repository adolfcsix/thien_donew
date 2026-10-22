# Changelog hiện hành

## A83 — kiểm toán chuyên sâu vòng 2, 23/10/2026

- Sửa AI hoàn tất sau khi phiên bị thu hồi/hết hạn/khóa hoặc nguồn bị xóa; kiểm tra lại trước đặt chỗ ngân sách và trước commit.
- API riêng trả 401 gỡ dữ liệu riêng và trở về trang đầu; sai mật khẩu/OTP hoặc 403 vẫn giữ phiên hợp lệ.
- Lịch sử AI mở 80 lượt mới nhất, phân trang theo cursor SQL chính xác microsecond; thêm nút tải trước và bảo vệ request cũ/nhấn trùng.
- Bổ sung kiểm chứng service/SQL, Next–Nest HTTP, React DOM và browser; giữ lockfile/36 migration/thuật toán/assets/MFA.
- Sửa harness DOM lỗi thời và chặn cấu hình browser làm sai cách ly tài khoản. Không coi fixture/provider kiểm soát là dịch vụ thật.
- Không nâng phiên bản; giữ NO_GO và 11 gate OPEN.

## A83 — vòng kiểm toán 23/10/2026, giữ V11.164.103 / NO_GO

- Bảo mật: Next.js 16.4.0 → 16.4.2; npm cập nhật lockfile cho Next/@next/env/các SWC tương ứng. Không dùng audit fix --force.
- Sửa vận hành: công cụ Windows lấy đúng tên artifact lockfile mà workflow xuất ra.
- Sửa kiểm tra nguồn: không defer module SQL build nếu source TypeScript tương ứng không tồn tại.
- Sửa test cũ: xác minh workflow dùng lockfile bất biến; xác minh quy tắc CSS menu compact thay vì nội dung comment.
- Bổ sung kiểm kê AST có thể tái tạo: infrastructure/scripts/audit-function-inventory.cjs; cập nhật endpoint matrix từ controller/service thực tế.
- Bổ sung bộ báo cáo hiện hành và bằng chứng tại verification/master-audit.
- Sửa toàn vẹn ảnh: đối chiếu đủ 78 RWS gốc với manifest cũ và từng cặp ảnh nén trước khi cập nhật bytes/hash. Không đổi byte ảnh hoặc mapping; lưu hồ sơ nguồn và chỉ số so ảnh.
- Không có refactor lớn, chức năng nghiệp vụ mới, thay thuật toán, migration, thay ảnh hay thay UX/motion trong vòng này. Chưa nghiệm thu UI hoặc toàn bộ master prompt.
