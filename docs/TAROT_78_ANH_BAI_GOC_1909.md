# Hình minh họa 78 lá Tarot (RWS 1909) — Thiên Đồ

- **Nguồn**: [sixseeds/tarot-api](https://github.com/sixseeds/tarot-api), ảnh từ bộ Tarot Rider–Waite–Smith (1909) của Pamela Colman Smith, do Arthur Edward Waite chỉ đạo.
- **Tình trạng**: nguồn công bố tranh gốc 1909 thuộc phạm vi công cộng tại Hoa Kỳ. Cần xác minh quy định tại quốc gia triển khai nếu phát hành thương mại và không thay bằng bản tô màu hiện đại có bản quyền.
- **Ảnh**: 78 tệp JPEG theo mã `ar00`–`ar21`, `wa01`–`wa14`, `cu01`–`cu14`, `sw01`–`sw14`, `pe01`–`pe14`.
- **Đang dùng A44**: gói đã có đủ 78 JPEG local; lá rút dùng ảnh gốc, danh mục dùng WebP dẫn xuất. Nguồn GitHub chỉ là phương án dự phòng khi tệp gốc lỗi. Giữ nguyên nguồn/ghi công.
- **Lưu ảnh vào dự án**: nhấp đúp `TAI_78_ANH_TAROT_WINDOWS.bat` tại thư mục gốc, hoặc chạy `npm run assets:tarot`. Node tải từng ảnh vào `apps/web/public/tarot/rws-1909/`, xác minh JPEG, chỉ bật `tarot-artwork-local.json` nếu đủ cả 78. Từ đó website hiển thị ảnh local, có thể phục vụ offline.
- **Không ảnh hưởng thuật toán**: dữ liệu lá, mã ID, luận giải, chiều lá và hồ sơ JSON giữ nguyên.
- **Khi phát hành**: chạy `node infrastructure/scripts/audit-tarot-assets.mjs` và kiểm offline. Build A44 xác thực hash/ánh xạ và từ chối thiếu ảnh, không chỉ đọc cờ ready. Tệp manifest nằm trong infrastructure/assets. Công cụ tải dùng để phục hồi tệp; thay bộ nguồn hoặc hình ảnh phải tạo lại thumbnail/manifest và kiểm quyền xuất bản.
- **Ghi công**: Pamela Colman Smith (1878–1951); thiết kế/biên soạn Arthur Edward Waite; nhà phát hành Rider & Company 1909.
