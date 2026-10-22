# THIÊN ĐỒ V11.6 — kiểm chứng an sao mở rộng và giới hạn vận hạn

## Phạm vi thực hiện

Mã nguồn V11.5 có 14 chính tinh, 9 phụ tinh cơ bản, 5 sao theo chi năm, 7 sao bổ sung, ba vòng 12 vị trí và một lớp Tiểu hạn theo năm. V11.6 **giữ nguyên toàn bộ các nhóm cũ**, thêm đúng **4 sao có vị trí độc lập**: Địa Không, Địa Kiếp, Hỏa Tinh, Linh Tinh; thêm **2 dấu án ngữ cặp cung**: Tuần, Triệt. Cặp Tuần/Triệt được tính là *hai loại dấu*, mỗi loại hiển thị ở hai cung, tuyệt đối không cộng thành bốn sao.

Mã mới nằm tại `packages/astrology-engine/src/advanced-placements.js`, xuất `calculate` và `RULESET=advanced-placements-tam-hop-v11.6.0`. Các dữ liệu mới được tách trong `chart.advancedStars` / `chart.obstructionMarkers`, và mỗi `house.advancedStars` / `house.obstructionMarkers`; không trộn vào `additionalStars` cũ (7 sao). Điều này cũng giúp đọc dữ liệu, đối chiếu và kiểm chứng độc lập.

## Quy tắc vị trí, chỉ số chi

Mọi địa chi dùng index Tý=0, Sửu=1, Dần=2, Mão=3, Thìn=4, Tỵ=5, Ngọ=6, Mùi=7, Thân=8, Dậu=9, Tuất=10, Hợi=11.

- **Địa Kiếp:** khởi Hợi cho giờ Tý, đếm thuận theo chi giờ sinh: `(11 + hourBranch) mod 12`.
- **Địa Không:** khởi Hợi cho giờ Tý, đếm nghịch: `(11 - hourBranch) mod 12`.
- **Hỏa/Linh**: khởi [Hỏa, Linh] lần lượt [Sửu, Mão] cho Dần/Ngọ/Tuất; [Dần, Tuất] cho Thân/Tý/Thìn; [Mão, Tuất] cho Tỵ/Dậu/Sửu; [Dậu, Tuất] cho Hợi/Mão/Mùi. Dương nam/âm nữ thì Hỏa thuận, Linh nghịch; âm nam/dương nữ thì Hỏa nghịch, Linh thuận. Giờ Tý ở điểm khởi. Những quy tắc này **có dị bản giữa các trường phái**.
- **Tuần:** xác định tuần Giáp của năm sinh, hai chi bị khuyết: Giáp Tý => Tuất/Hợi; Giáp Tuất => Thân/Dậu; Giáp Thân => Ngọ/Mùi; Giáp Ngọ => Thìn/Tỵ; Giáp Thìn => Dần/Mão; Giáp Dần => Tý/Sửu.
- **Triệt:** thiên can năm Giáp/Kỷ => Thân/Dậu; Ất/Canh => Ngọ/Mùi; Bính/Tân => Thìn/Tỵ; Đinh/Nhâm => Dần/Mão; Mậu/Quý => Tý/Sửu.

**Nguồn công khai được dùng để đối chiếu quy tắc** (tài liệu nghiên cứu truyền thống, không có giá trị chứng minh dự đoán khoa học):

1. Tuần: https://khoahoctuvi.vn/post/tuan-triet-la-gi và https://tuvikieuoanhtran.com/blog/dia-kiep-dia-khong-manh-chu-than-chu-va-tuan-triet
2. Triệt: https://hocvienlyso.org/triet-lo-khong-vong.html và https://tuvixemtuong.net/hoc-tu-vi/sao-triet
3. Không/Kiếp: https://tuvisaigon.vn/tu-hoc-tu-vi-bai-14-cac-sao-theo-gio-sinh.html
4. Hỏa/Linh: https://tracuutuvi.com/an-sao-tu-vi.html và https://lyso.vn/xem-tu-vi/an-sao-hoa-linh-the-nao-cho-dung-t111887/

Đối chiếu Lưu Đào Hoa, Lưu Hồng Loan, Lưu Thiên Hỷ: https://thayungkhiem.vn/sao-dao-hoa và https://horos.vn/blog/post/sao-hong-loan-la-gi-y-nghia-cach-an-va-luan-hy-su . Bốn sao lưu chi năm được xây từ hàm an năm sinh `year-stars.js` đã có; Lưu Hoa Cái theo cùng bảng chi năm. Nguồn 4 chứa ghi nhận nhiều dị bản (không được phép trình bày các phiên bản như một quy luật phổ quát). Không tự suy diễn vận mệnh, tai họa, bệnh tật hay tương lai.

## Những gì vẫn thiếu ở V11.6

**Chưa đầy đủ bộ sao Tử Vi:** các sao phụ và tạp tinh khác trên lá số mẫu cần bảng quy tắc xác minh riêng. **Vận hạn:** Đại hạn 12 cung và Tiểu hạn theo một dị bản (tam hợp tuổi, nam thuận/nữ nghịch) giữ nguyên; lớp Lưu Tứ Hóa và 4 lưu tinh cũ được bổ sung **4 sao lưu chi năm** (Lưu Đào Hoa, Lưu Hoa Cái, Lưu Hồng Loan, Lưu Thiên Hỷ), nâng lên **8 lưu tinh**. `coverage.fullLuuNien` vẫn là `false`; chưa có bộ Lưu nguyệt, Lưu nhật, Lưu thời. Chưa bổ sung quy tắc định vị Tiểu hạn khác phái vì chưa đủ nguồn đối chiếu.

## Kiểm tra tự động

- Bảng 60 năm Can Chi liên tục cho Tuần / Triệt.
- Địa Không / Địa Kiếp đủ 12 chi giờ.
- Bảng Hỏa / Linh gồm 4 tam hợp, hai giới tính, 12 giờ cho mỗi nhóm.
- Kiểm tra miền giá trị và tính tương hợp âm dương của Can/Chi.
- Test tích hợp 18 lá số ở các năm, giờ, giới tính; bảo toàn 7 sao bổ sung cũ.
- Verifier độc lập so sánh vị trí sao / dấu Tuần Triệt với dữ liệu đầu vào, cố ý sửa sai phải phát hiện.
- Lưu tinh đổi theo chi năm xem, năm cách nhau 12 chu kỳ trả về cùng chi sao lưu; giữ nguyên Tứ Hóa năm xem.
- Mẫu SVG xuất ảnh chứa tên các sao mới và các cặp án ngữ; danh mục hình ảnh giới hạn kích thước vẫn có `<desc>` đầy đủ cho dữ liệu tham chiếu.

### Giới hạn kiểm chứng

Bộ unit test **chỉ xác nhận chương trình áp dụng đúng quy tắc đã chọn**; không chứng minh đúng với tất cả trường phái, không thay thế so sánh hàng chục lá số chuyên gia hoặc build/e2e PostgreSQL thực tế. Loader HTML ngoại tuyến đời cũ không tự tải module mới; nó vẫn hoạt động với lớp sao cũ và có cảnh báo thiếu lớp V11.6, không tự giả vờ đã an các sao đó.

### Lệnh chạy

```sh
npm test
npm run check:source
npm run check:release:source
```

`npm run build` và E2E full-stack chỉ nên đánh dấu PASS nếu môi trường đã thực sự cài được dependencies và kết nối được cơ sở dữ liệu thử nghiệm.
