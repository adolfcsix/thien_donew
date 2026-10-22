# Thái Ất — Tuế kế theo 《太乙金鏡式經》 quyển một

**Trạng thái:** `deterministic-subroutine-only` · **Phạm vi tích hợp:** `isolated-research-only` · **Ưu tiên:** P1.

> Đây là việc tái lập công thức số học trong một truyền thống lịch sử. Không có cơ sở khoa học được xác lập để coi kết quả là dự đoán chính xác về số phận hoặc sự kiện.

## Đầu vào và quy ước

- `traditionalYear`: năm dương lịch CE được nhà nghiên cứu dùng để **định danh** năm truyền thống, số nguyên 1–9999. Không cho phép số năm BCE hoặc tự suy từ timestamp.
- `calendarBoundaryResolved: true`: người gọi đã xác định năm truyền thống theo quy ước lập bàn đang dùng. Nếu chưa xác định, mô-đun phải trả `boundary-unresolved`.
- `methodId: 'taiyi-jinjing-annual-724'`: chỉ chọn một phép được mô tả theo quyển I; không tự nhập epoch từ truyền bản khác.

## Phép tính tái hiện được

Quyển I (mục 推上元積年) nêu năm 開元十二年, tức **724**, tích niên `1.937.281` và quy tắc mỗi năm cộng/trừ một. Trong phạm vi các năm CE sau khi đã xác nhận năm truyền thống:

`A = 1.937.281 + (traditionalYear - 724)`.

Quyển I (mục 推入六紀三元法 và 積太乙所在法) mô tả bước giảm theo 360, 72, 24 và 3. Mô-đun biểu thị số dư **1–N** qua `r_N = ((A - 1) mod N) + 1`, tránh nhầm lẫn giữa dư 0 và năm cuối chu kỳ. Các giá trị báo cáo gồm:

- `yearIn360Cycle`, `jiIndexOneBased` (1–6), `yearIn60Ji` (1–60);
- `yearIn72Cycle`, `yearIn24Cycle`;
- `palaceIndexOneBased` (1–8), `taiyiPalace`, `yearInPalace` (1–3).

Thái Ất đi tám cung **1, 2, 3, 4, 6, 7, 8, 9**; cung trung tâm 5 không đi qua; mỗi cung ba năm. Quyển II cung cấp cách diễn giải thứ tự cung và xác nhận ba năm chuyển một cung.

**Ca đối chiếu:** 724 → tích niên 1.937.281, dư chu kỳ 24 = 1, cung 1, năm thứ 1; 784 → cung 6. Dữ kiện 2026 (năm đã xác nhận): tích niên 1.938.583, cung 3, năm thứ 1 — đây là *kết quả công thức nghiên cứu*, không phải chứng nhận độ đúng của việc chuyển năm lịch hiện đại sang năm truyền thống.

## Chưa đủ điều kiện triển khai

- Chưa giải quyết ranh giới năm lịch (Tết, Lập Xuân hay Đông Chí) theo từng truyền bản; không truyền vào ngày giờ tùy ý.
- Chưa đối chiếu từng ô của bảng 72 cục với bản chép gốc và một bản độc lập.
- Chưa tính Thiên Mục, Kế Thần, Chủ toán, Khách toán; chưa có bàn Thái Ất hoàn chỉnh.
- Chưa triển khai Nguyệt kế, Nhật kế, Thời kế, dự báo hoặc luận đoán.
- Dị bản tích niên và chuyển cung trong sách khác phải có `methodId` riêng, không được ghi đè mốc 724.

## Đối chiếu thư tịch và giới hạn nguồn

1. Văn bản chính: 《太乙金鏡式經》(四庫全書本), quyển 1 — mục **推上元積年**, **推入六紀三元法**, **積太乙所在法**: https://zh.wikisource.org/zh/太乙金鏡式經_(四庫全書本)/卷01
2. Quyển 2 — **推太乙所在法**, **推九宮所主法**: https://zh.wikisource.org/zh/太乙金鏡式經_(四庫全書本)/卷02
3. Bản số hóa tra cứu cùng tác phẩm: https://ctext.org/wiki.pl?if=gb&res=264226 (không tính là nguồn thuật toán độc lập).

## Kiểm định và nguồn mã

- `packages/astrology-engine/src/taiyi-annual-research.cjs`: module thuần, không phụ thuộc API/DB.
- `tests/v1191-taiyi-annual.test.cjs`: mốc lịch sử, chu kỳ, dữ liệu xấu, ranh giới năm, cô lập quyền thực thi.
- `infrastructure/scripts/audit-taiyi-annual.cjs`: quét 9.999 năm được hỗ trợ để phát hiện rò cung 5 và sai chu kỳ.
- `packages/knowledge/src/phase2-school-methods.json`: chỉ cho phép `isolated-research-only`, không tự bật engine sản xuất.
