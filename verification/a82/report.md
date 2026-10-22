# Thiên Đồ A82 — V11.164.102 — Xuất tệp và đồng bộ kết quả Natal

**Mã nguồn gốc:** V11.164.101 A81. **Kết quả:** NO-GO, giữ 11 cổng phát hành OPEN. **GitHub đích:** `adolfcsix/thien_donew`, được xác minh private và có quyền push, chưa push.

## Sửa trực tiếp

1. Bốn luồng xuất JSON/CSV tại Numerology, Natal, Good Days, Collection chuyển sang hàm dùng chung `downloadBlobFile()`, có anchor được gắn vào DOM và trì hoãn `URL.revokeObjectURL` ít nhất 2 giây. Tránh thu hồi blob URL ngay trong tick click khiến tải tệp không đáng tin cậy trên một số trình duyệt.
2. Tại Natal, thay đổi thông số sinh lập tức xoá kết quả `report` phụ thuộc đầu vào cũ; khôi phục hồ sơ mới cũng xoá luận giải cũ, component luận giải chỉ render khi có `result` tương ứng. Ngăn dữ liệu cũ xuất hiện như kết luận của lần tính mới.
3. Xử lý yêu cầu mở hồ sơ Natal/Numerology: lỗi từ lời gọi cũ chỉ hiển thị khi mã phiên chỉnh sửa còn trùng, không làm ô thông báo sai khi người dùng đã sửa thông số.
4. Đồng bộ release metadata/tài liệu sang A82/V11.164.102; không nâng `package.json` hoặc thay đổi lockfile khi không đổi cây dependency.

## Bằng chứng trên đúng mã nguồn đóng gói

- Hồi quy trọng tâm: 41/41 PASS (`verification/a82/regression.tap`). Bài mới A82 xác minh 4 nơi xuất, hành vi trì hoãn thu hồi/cleanup khi click ném lỗi, và các ràng buộc trạng thái Natal/Numerology.
- `npm run check:source`: PASS, 382/382 TS/TSX parse, 890 JS syntax, 2.261 relative imports và 1.838 direct dependency imports (`verification/a82/source.log`).
- `npm run check:github:source`: PASS cấu trúc lockfile, 36 migration, quét secret tĩnh, 0 vi phạm kiến trúc trên 2.194 imports, cú pháp/import source, gitignore, NO-GO (`verification/a82/github-source.log`).
- `npm run audit:handover`: PASS 15 tài liệu nguồn quan trọng, 36 migration, 11 cổng OPEN.
- `npm ping`: FAILED EAI_AGAIN do DNS registry.npmjs.org. Không có bằng chứng `npm ci`, Next/Nest typecheck/build, PostgreSQL native, PayOS/Gemini, Playwright E2E hoặc Safari/Chrome/Edge thực tế.
- Đối chiếu A81 → A82: không xóa tệp, không sửa backend, thuật toán chuyên môn, migration, hình ảnh công khai hoặc package-lock.

## Quyết định bàn giao

A82 là một bản vá đã có kiểm chứng bằng mã nguồn/hồi quy, **KHÔNG ĐỦ CƠ SỞ chứng nhận GitHub-ready theo ngưỡng người dùng đã đặt, càng không đủ chuẩn production-ready.** Giữ source private, không commit/push, không chuyển V12/GO cho đến khi có build và kiểm thử đầy đủ trên CI có npm registry.
