# Bát Tự V11.95 — Nguyệt Lệnh, Thập Thần, Tàng Can và bằng chứng Nhật Chủ

**Trạng thái:** `deterministic-subroutine-only` · **Phạm vi:** `isolated-research-only` · **Phân nhánh:** Zi Ping / quan sát cấu trúc, **không cấp chứng nhận quyết định vượng/nhược, cách cục hay Dụng Thần**.

## Đầu vào

Chỉ nhận kết quả `bazi-hko-jie-calendar-research-v11.94` đủ bốn trụ, `referenceJie.status = RESOLVED`, có Nhật Can đối chiếu. Công cụ `evaluateSeasonEvidence(input)` dùng nguyên bộ đầu vào V11.94 (`date`, `hour`, `minute`, `utcOffsetMinutes`, `longitudeDeg`, tùy chọn `timeMode`, `dayBoundary`). Với `BOUNDARY_REVIEW` hoặc `OUT_OF_COVERAGE`, toàn bộ bằng chứng cấu trúc trả `BLOCKED` và `monthCommand = null`, không tự điền từ công thức gần đúng.

## Quy tắc số học đã triển khai

1. **Bảng Thập Thần có sẵn từ v9.6.** Không dựng bảng sao chép. Với Nhật Can `d` và Can cần xét `x`, gọi `bazi.js: tenGod(d,x)`, đối chiếu nhóm: Tỷ/Kiếp; Thiên/Chính Ấn; Thực/Thương; Thiên/Chính Tài; Thất Sát/Chính Quan.
2. **Tàng Can theo bảng tồn tại v9.6** `HIDDEN_STEM_INDICES` (12 Địa Chi). Thứ tự là *quy ước dữ liệu hiện hành*: chính khí → khí phụ → dư khí. Ví dụ Tỵ có `Bính, Canh, Mậu` trong bảng này, trong khi một số văn bản trình bày `Bính, Mậu, Canh`. Không gán trọng số mùa, số ngày chấp lệnh, % khí hoặc hòa hợp.
3. **Nguyệt Lệnh** trỏ tới Địa Chi tháng và 12 Jie từ V11.94; khí chính tháng được coi là **ứng viên luận cách**. Các tàng can cùng cung được so với Nhật Can để xuất Thập Thần và quan hệ âm–dương. Kiểm tra **thấu can** ở đủ bốn trụ, ghi rõ vị trí thay vì kết luận khí đã biến hóa.
4. **Dấu hiệu gốc rễ**: có hay không tàng can **cùng ngũ hành** với Nhật Can trong từng Chi; có hay không **đúng Nhật Can**. Đây là *tồn tại ký hiệu*, không phải điểm đắc địa hoặc xác nhận căn khí hợp thành.
5. **Dấu hiệu trợ lực thiên can**: ngoài chính Nhật Can, ghi những Can có quan hệ Tỷ/Kiếp hoặc Ấn. Không cộng với dấu hiệu tàng can hoặc dùng một ngưỡng điểm để xác định thân mạnh/thân yếu.
6. **So sánh phương pháp:** lens Zi Ping đặt Nguyệt Lệnh và thấu can làm trọng tâm; lens kiểm kê cấu trúc chỉ thống kê các dấu hiệu quan sát. Hai lens đều trả `CANDIDATE_ONLY` / `EVIDENCE_ONLY`. Các trường kết luận `dayMasterStrength`, `pattern`, `usefulGod` **luôn null**.

## Đầu ra và giới hạn

`bazi-season-evidence.cjs` trả `PROVISIONAL`, `REVIEW_REQUIRED` hoặc `BLOCKED`. Có `monthCommand`, `visibleTenGods`, `hiddenByPillar`, `rootEvidence`, `visibleSupport`, `supportCounts`, `methodComparisons` và `decision` chưa quyết định. Số quan hệ âm dương, số nhánh có gốc và khí chính Nguyệt Lệnh **không thể thay thế** kiểm tra hành khí, táo thấp, hàn noãn, hợp/xung/hình/hại, vượng suy theo từng môn phái, hệ Thập Nhị Trường Sinh, đại vận hoặc vấn đề nhật can.

**Chưa đủ điều kiện:** tự luận cách cục, cân điểm ngũ hành, tự chọn Dụng Thần; đánh giá thành cách/biến cách; hợp hội hóa cục; lịch pháp đã thẩm định theo bản gốc và kiểm tra múi giờ lịch sử. Không tự bật trong trang `/bazi`, API hay kết quả dự đoán.

## Kiểm định và tính truy nguyên

- `tests/v1195-bazi-season-evidence.test.cjs` kiểm tra 100 cặp Thập Thần, 120 cặp Địa Chi–Nhật Can, đủ 4 trụ, ca sát Jie, ca ngoài phạm vi, các payload cố tình sai dữ liệu và cổng trường phái.
- `infrastructure/scripts/audit-bazi-season-evidence.cjs`: chạy các mốc Jie trước/sau, kiểm tra không tự điền kết luận mạnh/yếu, 100 cặp Can, 120 tổ hợp Tàng Can.
- Quy tắc ngày/giờ kế thừa V11.93; bảng Jie V11.94 chỉ 2025–2027, độ chính xác công bố **phút**, metadata vẫn ghi nhận sử dụng các bảng đối chiếu thứ cấp.

## Hồ sơ thư tịch nội bộ (không chèn nguồn thô lên giao diện người dùng)

- *Tử Bình Chân Thuyên*, quyển I, “Luận Dụng Thần” và “Luận Dụng Thần Biến Hóa”: https://www.donglishuzhai.net/chapter/3723.html
- Bản văn và mô tả Nguyệt Lệnh: https://libokang.com/zh-hant/guji/bazi/%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE%E5%8E%9F%E6%96%87/
- Bảng Thập Thần và tương tác âm dương dùng đối chiếu: https://yuanzizhiyi.com/en/wiki/bazi/ten-gods
- Báo cáo nội bộ V9.6: `docs/RULES_BAZI_V9_6.md`; V11.93: `docs/research/schools/bat-tu-tiet-khi.md`.
