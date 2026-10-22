# Thiên Đồ — Kiến trúc mở rộng hệ sinh thái huyền học (V11.29)

**Trạng thái:** thiết kế kỹ thuật có kiểm kê source, **không** phải lời tuyên bố 20 chức năng đã hoàn thiện.

## Nguyên tắc vận hành

1. **Một nguồn sự thật:** mã quy tắc nằm ở engine theo môn; nội dung biên tập nằm ở knowledge; tổng hợp điều kiện trong interpretation; frontend chỉ trình bày dữ liệu. Không sao chép code các thuật toán giữa các môn.
2. **Có bằng chứng mới hiển thị:** chưa có thuật toán và kiểm thử thì không tạo route công khai hay nút trống. `capability-registry.json` dùng cho kiểm toán và điều phối kỹ thuật, không phải cam kết sản phẩm.
3. **Không tự nhận đúng trường phái:** quy tắc lưu `schoolId`, `ruleSetVersion`, `inputAssumptions`, `edgeCases`, `reviewStatus`, fixture và kết quả thẩm định độc lập.
4. **Giao diện hai tầng:** Cơ bản là lời giải thích đơn giản; Chuyên sâu mới mở điều kiện sao/cung/hạn; hai chế độ dùng **cùng** dữ liệu engine, không có hai bộ tính toán khác nhau.
5. **Nội dung có bản quyền và biên tập:** không chép bài từ website tham chiếu; mọi chuyên luận do đội ngũ viết lại, có ví dụ và quy trình duyệt; thông tin thẩm định chi tiết chỉ ở giao diện quản trị nội bộ.
6. **Tính chất phương pháp:** hệ thống huyền học thuộc bối cảnh văn hóa/truyền thống, không đưa ra khẳng định dự đoán khoa học chắc chắn.

## Cấu trúc đích (đề xuất, CHƯA tạo package rỗng)

```text
apps/
  web/           # Next.js: trải nghiệm, tra cứu, học viện, lá số
  api/           # NestJS: auth, lưu trữ, CMS, quyền truy cập, audit log
packages/
  astrology-engine/   # Các engine Tử Vi/Bát Tự/lịch pháp đang có
  knowledge/          # Dữ liệu biên tập, danh mục hiện trạng V11.29
  interpretation/     # Kết hợp luận cứ có điều kiện, không tự an sao
  shared-types/       # Kiểu dữ liệu liên ứng dụng
  [new-domain]/       # Chỉ tạo khi có đặc tả, fixture đối chiếu, test
infrastructure/
  scripts/            # CLI kiểm toán, migration, release gate
  ...
docs/
  validation/         # Kiểm chứng có version và số liệu máy đọc
  architecture/       # Quy tắc tách lớp và quyết định kỹ thuật
```

## Cổng chất lượng cho một môn mới

- **Gate 0 — Đặc tả:** định nghĩa phạm vi, trường phái/biến thể, dữ liệu thời gian và thuật ngữ, cảnh báo trường hợp không thể tính.
- **Gate 1 — Engine:** các hàm thuần, input/output định kiểu, không phụ thuộc React hoặc database.
- **Gate 2 — Fixture:** tập mẫu đầu vào/đầu ra được đối chiếu với tài liệu hoặc chuyên gia **độc lập**; kiểm tra biên giờ/ngày/múi giờ/tháng nhuận nếu áp dụng.
- **Gate 3 — Knowledge:** nội dung có `id`, `version`, `status`, `conditions`, `exclusions`, `schoolId`; không lặp các đoạn mẫu vô nghĩa.
- **Gate 4 — API:** endpoint có validation, quyền truy cập, rate limits, log; không tải những dữ liệu riêng tư không cần thiết.
- **Gate 5 — Frontend:** chỉ lúc này tạo route, liên kết sidebar và diễn giải Cơ bản/Chuyên sâu.
- **Gate 6 — Release:** typecheck, build, E2E database, kiểm thử desktop/mobile, hiệu suất và đối chiếu kết quả.

## Thứ tự thực hiện đề xuất

| Nhịp | Mục tiêu | Điều kiện chấp nhận |
|---|---|---|
| V11.29 (hiện tại) | Registry 20 hạng mục, kiểm kê kho kiến thức, không thêm route giả | audit paths + test chạy được |
| V11.30 | Chuẩn hóa sao, tên alias, tình trạng an sao/luận giải và phiên bản nguồn | Một mã sao thống nhất, không cộng trùng danh mục |
| V11.31 | Tách bớt code trùng, chuẩn hóa API, giảm nợ kỹ thuật | Các fixture lá số trước/sau trùng kết quả, regression xanh |
| Tiếp sau | Hoàn thiện nội dung Tử Vi, Bát Tự và kho sách có biên tập | Không công bố chuyên luận chưa duyệt như đã xác thực |
| Từng giai đoạn | Mai Hoa, Hà Lạc, Kỳ Môn, Thái Ất, Lục Nhâm... | Chỉ mở route khi vượt Gate 0–6 |

## Các khoảng trống chưa giải quyết

- Thiếu lockfile/npm dependencies tại môi trường kiểm thử; chưa build Next.js/NestJS/PG E2E.
- Một số file legacy trùng byte với engine, nhưng vẫn được root test gọi: không xóa ngay.
- Một số mục `knowledge` là biểu tượng/biên tập, không phải mô hình an sao hay bằng chứng thẩm định chuyên môn.
- 20 hạng mục được **phân loại ở mức module**, không phải danh mục 20 tính năng user có thể dùng trên web.
- Website mẫu có phần cần đăng nhập; không có kiểm kê tuyệt đối nội dung mẫu.

## Tệp nguồn duy nhất của trạng thái

- `packages/knowledge/src/capability-registry.json` — mã định danh, route thật, tình trạng, đường dẫn chứng cứ, khoảng trống.
- `infrastructure/scripts/audit-capabilities.cjs` — CLI kiểm tra khả năng truy nguyên đến source.
- `infrastructure/scripts/audit-knowledge-coverage.cjs` — CLI đếm dữ liệu và tên sao không cộng trùng.
- `docs/validation/V11_29_*.json` — dữ liệu máy đọc để CI theo dõi phiên bản.
