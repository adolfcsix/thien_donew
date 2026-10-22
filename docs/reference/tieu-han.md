# THIÊN ĐỒ V8.7 — Tiểu hạn, niên hạn và kiểm thử tham chiếu

## 1. Quy tắc mới (chỉ một dị bản)

Bộ quy tắc: `tieu-han-tu-mo-nam-thuan-nu-nghich-v1`.

| Địa chi năm sinh | Khởi Tiểu hạn (tuổi mụ = 1) |
|---|---|
| Dần, Ngọ, Tuất | Thìn |
| Thân, Tý, Thìn | Tuất |
| Tỵ, Dậu, Sửu | Mùi |
| Hợi, Mão, Mùi | Sửu |

- Nam: mỗi năm tính thuận 1 cung theo thứ tự Tý → Sửu → … → Hợi.
- Nữ: mỗi năm tính nghịch 1 cung.
- Năm xem là **năm âm lịch**, đổi theo Tết chứ không phải ngày 1/1 dương lịch.
- Chỉ hiển thị cung/địa chi Tiểu hạn; **không dự đoán sự kiện**, không tự nhận đã tính Lưu niên đầy đủ.
- Một số sách/website dùng quy tắc theo Âm/Dương năm sinh và giới tính, hoặc khởi từ cung Mệnh: **chúng không tương đương**. Không được trộn các bộ quy tắc. Người quản lý chuyên môn phải xác nhận bộ an sao trước khi sử dụng vào dịch vụ trả phí.

## 2. Bằng chứng tham khảo

- `https://www.huyenhocvietnam.vn/upload/attach/hhvn2021728112853ko16Iu.pdf` — giáo trình lý số lưu hành từ 2012; bảng năm sinh → cung khởi; nam thuận/nữ nghịch. **Chưa có kiểm định học thuật độc lập từ nguồn này.**
- `https://tuvisonkhiem.vn/tieu-van/` — bảng tam hợp chi năm sinh → Tứ Mộ, ví dụ nam tuổi Tý và nữ tuổi Ngọ.
- `https://chieumenh.vn/blog/tieu-han-la-gi-cach-an-va-luan-tieu-han` — cách khởi tuổi 1 và tuần hoàn 12 năm.
- `https://mdj.com.vn/blogs/chia-se/cach-tinh-tieu-han-trong-tu-vi/` — **quy ước khác**; dùng để đánh dấu dị bản chứ không xác nhận thuật toán hiện tại.

Nguồn là tài liệu huyền học truyền thống, không phải bằng chứng khoa học về năng lực dự đoán. Cần đối chiếu độc lập với ít nhất 20 lá số được chuyên gia đồng ý về trường phái.

## 3. Ca đối chiếu V8.7

- Nam Giáp Tý (1984): năm 1984 = Tuất, 1985 = Hợi, 1986 = Tý, 1996 = Tuất.
- Nữ Canh Ngọ (1990): 1990 = Thìn, 1991 = Mão, 1992 = Dần, 2002 = Thìn.
- Trước Tết 2026 (01/02/2026) vẫn đang ở năm âm 2025; tại 17:00 UTC ngày 16/02/2026 (00:00 tại Việt Nam ngày 17/02) chuyển sang năm âm 2026.
- Vị trí Tiểu hạn phải lặp lại sau 12 năm; hợp lệ với mọi năm sinh/giới tính trong tập dữ liệu thử nghiệm.

## 4. Ranh giới kỹ thuật

- Test tự động kiểm tra tính nhất quán của **đúng dị bản đã cài**, không chứng minh phù hợp mọi phái.
- Dữ liệu phân tích lá số vẫn ở giai đoạn nghiên cứu; còn thiếu lưu tứ hóa, lưu sao, lưu niên và đối chiếu astro chuyên gia.
- Bộ khởi giờ Tý và tháng nhuận vẫn cần xử lý đa phương pháp theo trường phái. Kết quả lá số gốc giữ nguyên (V6).
