# V11.132 — Đại Lục Nhâm / 大六壬 · Cửu Tông Môn

## Quyết định kỹ thuật

- **Engine mới**: `packages/astrology-engine/src/da-liu-ren-depth.cjs`; cố ý giữ độc lập với mô-đun V11.90. `RULESET=da-liu-ren-nine-gates-yuanshushan-research-v1`.
- **Nguồn ưu tiên**: 袁树珊《大六壬探原》, 推演篇, bản đọc trực tuyến tại https://www.dadaojiayuan.com/ddjy_66/563.html (trang được gắn tiêu đề ngoài 《大六壬指南》 nhưng văn bản bên trong ghi 《大六壬探原》). Đối chiếu bản lưu trữ: https://upload.wikimedia.org/wikipedia/commons/6/63/NLC416-12jh003129-43598_%E5%A4%A7%E5%85%AD%E5%A3%AC%E6%8E%A2%E5%8E%9F.pdf .
- **Nguồn chéo Thiên Tướng**: https://www.zhaosir.online/Books/BookChapterDetail.aspx?did=886 và https://www.yjhome.com/dlr/index.htm (khẩu quyết, 12 tướng và phép thuận/nghịch). Riêng ban ngày/ban đêm và thứ tự Nhâm–Quý tồn tại dị bản; mã V11.132 công khai phép đang dùng, không âm thầm gộp dị bản.
- **Mô hình dữ kiện**: nhật Can Chi (hợp lệ theo chu kỳ 60), Nguyệt Tướng, chi giờ chiếm, phép xác định Quý Nhân ngày/đêm (thủ công hoặc quy ước Mão–Thân). Không tự giả định ngày Can Chi hoặc mốc Trung khí từ ngày dương; phần nhập Trung khí là quy đổi bảng sau khi người dùng xác minh mốc.
- **Hai tầng**: Cơ bản/Chuyên sâu là tầng trình bày; cùng một `buildDepth(input)` quyết định kết quả, không đổi thuật toán theo UI.

## Đường đi lập khóa

| Bước | Đầu vào/quy tắc | Kết quả | Ranh giới |
|---|---|---|---|
| 1 | 中氣 → 月將; 月將加占時 | Thiên Bàn chồng Địa Bàn, cố định 12 cung | Đầu vào trung khí đã xác minh, không thay bằng tháng âm |
| 2 | 干寄宮 + hai lớp khởi từ can, hai lớp từ chi | Tứ Khóa; phân biệt Hạ tặc Thượng/Thượng khắc Hạ | Không đồng nhất nhật Can với ký cung ở Khóa 1 |
| 3 | 下賊上 trước 上克下 | Nhánh Tặc Khắc | Thượng thần trùng lặp chỉ là một ứng viên |
| 4 | 比用: cùng âm/dương với nhật can | Nhánh Bỉ Dụng nếu duy nhất | Nếu vẫn nhiều: Thiệp Hại chưa chốt |
| 5 | 涉害: lộ trình, Mạnh–Trọng, đồng hạng | `unresolved`, kèm ứng viên/trace | Chưa chứng thực đếm lộ trình theo toàn bộ dị bản; tuyệt đối không suy Sơ |
| 6 | 遙克: không có trực khắc, xét xa | Nhánh Dao Khắc khi xác định duy nhất | Phân biệt thần khắc nhật và nhật khắc thần |
| 7 | 昴星, 別責, 八專 | Nhánh riêng tương ứng bốn / ba / hai khóa thực | Xét số khóa cấu trúc thay vì nhầm Can/Ký cung |
| 8 | 伏吟, 返吟 | Ngoại lệ hình / xung / Dịch Mã | Chỉ tính ngoại lệ đã kiểm, còn lại báo chưa quyết định |
| 9 | 天乙貴人; 十二天將 | 12 Thiên Tướng an thuận/nghịch trên Thiên–Địa bàn | Quý Nhân chỉ an khi đã định ngày/đêm |

## Cửu Tông Môn (phân nhánh độc lập)

1. **Tặc Khắc (賊克)**: ưu tiên hạ tặc thượng; nếu không có, dùng thượng khắc hạ.
2. **Bỉ Dụng (比用)**: phân xử ứng viên trùng quy tắc khắc bằng nhật can âm/dương, khi chỉ còn đúng một thần.
3. **Thiệp Hại (涉害)**: phân xử bằng số đường khắc; mã hiện đánh dấu `unresolved` nếu độ sâu/đồng hạng chưa đối chiếu. Không dùng lấy thần đầu tiên như một kết quả hợp lệ.
4. **Dao Khắc (遙克)**: xét tương khắc gián tiếp khi bốn khóa không trực khắc.
5. **Mão Tinh (昴星)**: đủ bốn khóa không khắc/dao, xét Dậu tùy âm/dương nhật.
6. **Biệt Trách (別責)**: ba khóa thực, phép can hợp/tam hợp tương ứng.
7. **Bát Chuyên (八專)**: Can Chi ký cung trùng nhau, còn hai khóa thực.
8. **Phục Ngâm (伏吟)**: thiên địa đồng vị; hình/xung và ngoại lệ đặc thù.
9. **Phản Ngâm (返吟)**: thiên địa đối xung; có khắc/không khắc xử lý khác nhau.

Đã có các trường hợp kiểm chứng số liệu ví dụ trong `tests/v11132-da-liu-ren-depth.test.cjs`. Các nhánh đầu ra ghi `verdict='derived-subroutine-only'` hoặc `verdict='unresolved'`; tuyệt đối không đặt nhãn “đã nghiệm thu dự đoán”.

## Kết nối sản phẩm

- Frontend `/dai-luc-nham`: giao diện nghiên cứu Đông Á, vòng bàn 12 cung, Tứ Khóa, Tam Truyền, 12 tướng, trace chi tiết, dữ kiện thủ công, Trung khí bảng chọn, JSON import/export.
- Thư phòng tài khoản: loại `dai-luc-nham`; migration 010 mở CHECK discipline, API chỉ lưu dữ kiện có thể tính lại, sao lưu/khôi phục hợp lệ, đường dẫn `?entry=UUID`; không lưu kết quả client gửi lên.
- Tầng kiểm định `tests/v11132-da-liu-ren-depth.test.cjs`: 16 ví dụ độc lập từ cổ điển + validation và toàn bộ 720 tổ hợp ngày Can Chi / Nguyệt Tướng với chi giờ cố định. Chỉ là kiểm thử tính nhất quán theo bảng đã chọn, **không** thay cho đối chiếu đầy đủ 720 ví dụ sách gốc.

## Tồn đọng ưu tiên V11.133

- Chuẩn hóa phép **Thiệp Hại**, số lộ trình và cả ba lớp xử lý đồng hạng: 見機, 察微, 綴瑕; so đối chứng từng ca đủ 720 sách gốc, phân tách biến thể.
- Bổ sung quan hệ Lục Thân, độn Can/旬空, năm mệnh, điền tướng theo nguồn lịch thiên văn; không đưa vào bộ chọn nếu chưa đủ nguồn.
- Kiểm thử tích hợp PostgreSQL migration, định tuyến khôi phục hồ sơ, phản hồi mobile bằng E2E trong môi trường đã chạy `npm ci` hoàn chỉnh.
