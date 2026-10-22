# THIÊN ĐỒ V11.19 — Kiểm kê toàn bộ sao đang triển khai

> **NỘI BỘ ĐỘI PHÁT TRIỂN.** Báo cáo đọc trực tiếp kết quả Astrology Engine. Không phải bảng thẩm định độ đúng Tử Vi và không hiển thị lên trang đọc lá số.

## Kết quả chính

- **104** tên sao gốc và vòng sao, không trùng giữa 14 nhóm.
- **104/104** có hồ sơ giải nghĩa; trong đó 14 chính tinh và 90 hồ sơ sao khác.
- **12** sao lưu theo năm, **2** dấu án ngữ Tuần/Triệt, **4** Tứ Hóa gốc và **4** Lưu Tứ Hóa. Các lớp này **không cộng vào số sao gốc/vòng sao**.
- Đã đối chiếu tính ổn định danh mục sao với **22** đầu vào mẫu; đây là baseline nội bộ, chưa phải kiểm chứng chuyên gia.
- Backlog đề xuất **0** sao gốc và **1** sao lưu — *không phải* mẫu số của bộ sao truyền thống.
- **0** hồ sơ luận giải riêng 12 cung được *kiểm chứng độc lập* trong kiểm toán này; **không** có nghĩa ứng dụng không có nội dung luận giải tổng hợp.

## Thống kê từng nhóm đã chạy trong engine

| Nhóm | Số tên |
|---|---:|
| 14 chính tinh | 14 |
| Phụ tinh cơ bản | 9 |
| Sao theo chi năm sinh | 5 |
| Sao bổ sung theo tháng/ngày | 7 |
| Không–Kiếp, Hỏa–Linh | 4 |
| Phụ tinh V11.13 | 11 |
| Phụ tinh V11.14 | 3 |
| Đức · Giải V11.16 | 4 |
| La–Võng · Thương–Sứ V11.17 | 4 |
| Thiên Trù · Lưu Hà · Thiên Không · Đẩu Quân V11.19 | 4 |
| Tài · Thọ · Đường Phù V11.18 | 3 |
| Vòng Thái Tuế | 12 |
| Vòng Bác Sĩ | 12 |
| Vòng Tràng Sinh | 12 |

## Backlog đề xuất — sao gốc

| Tên sao | Ưu tiên | Việc cần thẩm định |
|---|---|---|

## Backlog đề xuất — sao lưu theo năm

| Tên sao | Ưu tiên | Việc cần thẩm định |
|---|---|---|
| Lưu Thiên Không | low | Cần kiểm chứng nếu được sử dụng trong trường phái đã chọn. |

## Phạm vi còn thiếu ngoài sao

- Lưu nguyệt, lưu nhật, lưu thời chưa có hệ thống hoàn chỉnh.
- Luận giải theo từng cung, từng vị trí sao, hội hợp, cách cục và hạn chưa được thẩm định toàn diện.
- Các công thức có dị bản cần lựa chọn trường phái và lá số đối chứng độc lập.
- Build Next.js/NestJS và PostgreSQL E2E là bài toán kiểm thử khác, không nằm trong báo cáo kiểm kê này.

## Quy trình bảo trì

1. Thêm phép an sao vào `packages/astrology-engine` và mirror vào 12 cung nếu là sao gốc.
2. Thêm hồ sơ giải nghĩa trong `packages/knowledge` hoặc kho chính tinh, kiểm chứng nội dung độc lập.
3. Xóa mục đã làm trong `packages/star-audit/src/pending-candidates.json`, kèm quyết định dị bản trong docs nội bộ.
4. Chạy `npm run audit:stars` và `npm test`; kiểm tra CSV/JSON, xác nhận không trùng và đủ hồ sơ.
5. Cập nhật benchmark chuyên gia và test giao diện/xuất lá số khi cần.

## Giới hạn phương pháp

- Các con số là kiểm kê thực tế của engine V11.19, không phải tỷ lệ hoàn thiện Tử Vi nói chung.
- Dữ liệu 22 lá số nền do chính engine tạo ra; chưa được chuyên gia xác minh độc lập.
- Một hồ sơ giải nghĩa không đồng nghĩa đã có 12 bài luận giải chuyên biệt hay luận hạn hoàn chỉnh.
- Tuần/Triệt là hai dấu án ngữ cặp cung, Tứ Hóa là nhãn chuyển hóa, không tính là sao gốc độc lập.
- Các đề xuất thiếu chỉ là backlog ưu tiên, không phải danh sách sao chuẩn của mọi trường phái.
