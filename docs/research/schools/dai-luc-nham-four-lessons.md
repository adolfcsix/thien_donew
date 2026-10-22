# Đại Lục Nhâm V11.90 — 四課 / 三傳: hợp đồng thuật toán từng bước

**Trạng thái:** `research-only` / `partial-rule-coverage` — tuyệt đối **không** bật vào endpoint sản phẩm, không dùng suy đoán quy tắc thiếu.

Các phép tính biểu diễn quy ước thuật số Đông phương và khả năng tái hiện quy tắc văn bản; **không** có bằng chứng thực nghiệm về độ chính xác dự báo tương lai.

## Đầu vào chính xác, không được tự suy

- `dayStem`: một trong Giáp, Ất, Bính, Đinh, Mậu, Kỷ, Canh, Tân, Nhâm, Quý.
- `dayBranch`: một trong 12 chi Tý, Sửu, Dần, Mão, Thìn, Tỵ, Ngọ, Mùi, Thân, Dậu, Tuất, Hợi; bắt buộc đồng tính chẵn/lẻ với nhật can theo vòng 60 ngày.
- `monthGeneral` (Nguyệt Tướng) và `divinationHour` (chi giờ) phải cung cấp theo phương pháp nghiên cứu; riêng V11.89 hỗ trợ tra bảng HKO 2025–2027 với khối chặn giao Trung khí ±60 giây.
- Không suy nhật trụ / giờ trụ từ ngày sinh, không suy giờ mặt trời theo địa phương và không dùng ngày dương lịch làm bí danh của nhật can chi.

## I. Lập 四課 — Tứ Khóa

Bảng **Thập Can Ký Cung** (十干寄宫), kiểm tra từ 《大六壬详解》 / 《六壬神課入門》:

| Can | Giáp | Ất | Bính | Đinh | Mậu | Kỷ | Canh | Tân | Nhâm | Quý |
|---|---|---|---|---|---|---|---|---|---|---|
| Ký cung | Dần | Thìn | Tỵ | Mùi | Tỵ | Mùi | Thân | Tuất | Hợi | Sửu |

Thiên bàn `heavenAt(earth)` lấy từ `buildHeavenEarthPlates`:

1. Khóa 1: dưới = nhật can (thập can thực, **không** phải ngũ hành của ký cung), trên = `heavenAt(stemLodging[dayStem])`.
2. Khóa 2: dưới = trên của Khóa 1, trên = `heavenAt(dưới)`.
3. Khóa 3: dưới = nhật chi, trên = `heavenAt(dayBranch)`.
4. Khóa 4: dưới = trên của Khóa 3, trên = `heavenAt(dưới)`.

Ngũ hành ngữ nghĩa cho **khóa 1** lấy từ nhật **can**. Các khóa 2–4 dùng ngũ hành của địa **chi** dưới. Phân loại quan hệ: `lower-attacks-upper`, `upper-controls-lower`, `no-control`.

## II. Lập 三傳 — Tam Truyền, chỉ phủ các nhánh được xác nhận

Các điều kiện tiên quyết: bàn thông thường (`pattern=normal`), đủ bốn cặp khóa phân biệt, input đúng Can Chi.

1. Kiểm các khóa **hạ khắc thượng** (下贼上); nếu có, **chỉ** dùng nhóm này. Nếu không có, kiểm **thượng khắc hạ** (上克下).
2. Một ứng viên duy nhất → lấy **thượng thần** của khóa đó làm **Sơ Truyền**. Phân biệt `zei-ke-lower-attacks-upper` / `zei-ke-upper-controls-lower`.
3. Nếu có nhiều ứng viên trong nhóm ưu tiên: lọc **Bỉ Dụng** (比用), nhật can dương dùng chi dương, nhật can âm dùng chi âm. Chỉ khi **đúng một ứng viên** phù hợp mới phát Tam Truyền.
4. Với các nhánh đã được chọn đúng: **Sơ** = thượng thần đã chọn, **Trung** = `heavenAt(Sơ)`, **Mạt** = `heavenAt(Trung)` (相因法).
5. Mọi trường hợp còn lại → `verdict=unresolved`, `transmissions=null`, trả lại các ứng viên và nguyên nhân; **không** tạo kết quả bằng mặc định ảo.

**Chưa đủ điều kiện:** Thiệp Hại (涉害), Dao Khắc (遥克), Mão Tinh (昴星), Biệt Trách (别责), Bát Chuyên (八专), Phục Ngâm (伏吟), Phản Ngâm (反吟), thứ tự ngoại lệ theo các truyền bản; tổng hợp Thần Tướng/Lục Thân, phân tích cục và luận đoán. Chưa kiểm định bao phủ toàn bộ 720 khóa hay tỷ lệ phân loại theo dị bản.

## III. Ca thực hành đối chứng độc lập

Tệp `tests/fixtures/v1190-classical-liuren-cases.json` chép **kết quả kỳ vọng độc lập** từ nguồn đọc, không tính lại từ cùng công thức rồi gọi là đáp án:

- 丙戌日 子将酉时 → trên của 4 khóa `[Thân,Hợi,Sửu,Thìn]`; Tam Truyền `Thân→Hợi→Dần` (hạ khắc thượng).
- 丁丑日 亥将卯时 → `[Mão,Hợi,Dậu,Tỵ]`; Tam Truyền `Tỵ→Sửu→Dậu` (thượng khắc hạ).
- 壬辰日 辰将巳时 → `[Tuất,Dậu,Mão,Dần]`; Tam Truyền `Tuất→Dậu→Thân` (Bỉ Dụng).
- 戊寅日 巳将子时 → `[Tuất,Mão,Mùi,Tý]`; Tam Truyền `Tý→Tỵ→Tuất` (Bỉ Dụng).
- 甲子日 亥将卯时 → `[Tuất,Ngọ,Thân,Thìn]` (chỉ đối chứng Tứ Khóa).

Không suy rộng 5 ca thành bằng chứng tính đúng cho toàn bộ 9 Tông Môn. Bảng kiểm tra 8.640 tổ hợp chỉ chứng minh tính xác định của chương trình, **không** tự cung cấp bằng chứng lịch sử độc lập.

## IV. Nguồn phương pháp (ghi trong tài liệu kỹ thuật, không rải trích dẫn trên UI)

- 《御定六壬直指》 起例 — https://www.shidianguji.com/book/SDZJ0728/chapter/1kg328b67xgcr
- 《大六壬详解》 十干寄宫与四课的排法 — https://www.zhaosir.online/Books/BookChapterDetail.aspx?did=890
- 《六壬指南》 比用课 ví dụ — https://www.guoyitang.com.cn/lrzn/1759.html
- 徐伟刚 bài minh họa bốn khóa — https://forum.shusquare.com/forum.php?mod=viewthread&tid=18021
- Bài giảng ví dụ 甲子 — https://kknews.cc/zh-sg/education/gvjk29l.html

**Mức chứng cứ còn thiếu:** bản in/ảnh chụp thư tịch có số trang xác nhận, kiểm chứng dị bản bằng chuyên gia độc lập và phép so khớp từ nguồn lịch pháp ngày giờ đã thẩm định. Các URL hiện là bản phiên chép hoặc bài giảng trực tuyến, không được coi là ấn bản học thuật cuối cùng.

## V. API nội bộ và kiểm soát trạng thái

- `buildFourLessons({monthGeneral,divinationHour,dayStem,dayBranch})` → 4 khóa có dấu vết ngũ hành, kèm bảng gốc.
- `deriveThreeTransmissions(sameInput)` → `derived-subroutine-only` hoặc `unresolved`, không trả một bộ ba khi thiếu căn cứ.
- `resolveStudyAt({instantIso,divinationHour,dayStem,dayBranch})` → kế thừa bộ chặn giao Trung khí 2025–2027, kết quả nghiên cứu có trạng thái rõ ràng.
- Không expose `@thiendo/api`; chưa sửa engine Tử Vi hoặc công cụ hiện có.
