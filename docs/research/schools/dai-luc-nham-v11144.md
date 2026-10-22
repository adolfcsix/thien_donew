# V11.144 · Đại Lục Nhâm — sổ nghiên cứu Thiệp Hại

## Nguồn và cách chọn truyền bản

Nguồn chính: 袁树珊《大六壬探原》推演篇·上, đường dẫn https://shuyuan.zhiming.life/read/大六壬探原(推演篇)-上/0 và https://shuyuan.zhiming.life/read/大六壬探原(推演篇)-上/1 . Bản tổng tập ca được chép tại https://luckclub.cn/daliuren/003/002/ . Không hợp nhất phép Mạnh/Trọng giản lược của những truyền bản khác thành phép của tác giả. Đây là lịch sử biểu tượng/truyền thống huyền học, không phải khoa học thực nghiệm.

## Đơn vị đếm và stop condition

1. Chỉ chạy khi nhóm tương khắc có >=2 Thượng thần **khác nhau** và Bỉ Dụng không phân xử duy nhất. Đặt ưu tiên Hạ tặc Thượng trên Thượng khắc Hạ.
2. Với ứng viên Thượng thần `U`, lấy cung địa bàn `E` mà Thiên Bàn đang chở `U`. Đi thuận từ `E` qua tối đa 12 cung đến địa chi bản vị `U` **bao gồm cả cung đầu/cuối**.
3. Tại mỗi cung `B`, xét địa chi `B` và từng can ký tại `B` theo Can ký cung chính thức. Nếu khóa Hạ tặc Thượng thì đếm thành phần nào *khắc U*; nếu Thượng khắc Hạ thì đếm thành phần nào *bị U khắc*. Phần tử không tương khắc không tính.
4. Chọn độ sâu cao nhất. Chỉ khi hòa điểm mới xét cung gia vào Mạnh (Dần–Thân–Tỵ–Hợi), rồi Trọng (Tý–Ngọ–Mão–Dậu). Còn bằng nhau thì kiểm tra nhóm khóa Can (1/2) cho nhật dương hoặc khóa Chi (3/4) cho nhật âm; chỉ định nếu chính xác một ứng viên còn lại.
5. Một ngoại lệ có chứng bản rõ: hai ngày Mậu Thìn/Mậu Tuất tại Phản Ngâm, can thượng Hợi; hai đường Thiệp Hại đều 4, cùng Mạnh, lấy Hợi–Tỵ–Hợi. Kiểm tra cấu trúc chính xác trước khi sử dụng, không suy rộng cho bất kỳ ca Phản Ngâm đồng hạng nào.

## Kiểm chứng tay theo sách

- Giáp Thìn (can thượng Tuất): khóa Tuất gia Dần chịu 4 lần khắc so với Tý gia Thìn 5 lần; Tam Truyền Tý–Thân–Thìn.
- Giáp Thìn (can thượng Tý): Tuất gia Tý 2 lần so với Dần gia Thìn 6 lần; Tam Truyền Dần–Tý–Tuất.
- Bính Tý (can thượng Tý): hai ứng viên đều 4; chọn Tý gia Tỵ (Mạnh) trước Dần gia Mùi (Quý), Tam Truyền Tý–Mùi–Dần.
- Mậu Thìn, Mậu Tuất (Phản Ngâm, can thượng Hợi): Tam Truyền Hợi–Tỵ–Hợi; trace 4/4, cùng Mạnh.
- Tổng 27 fixture đầu vào và Tam Truyền kỳ vọng được chép độc lập trong `tests/fixtures/v11144-yuanshushan-shehai.json`; không phát sinh expected bằng hàm tính.

## Các cổng chưa đạt

- So khớp **toàn bộ 720 bảng định sẵn** từ sách: CHƯA. Engine tính được 720 tổ hợp nhưng tổng phân loại chênh 1 ca (338/75 so với 337/76). Cần bản dữ liệu có quyền sử dụng/nguồn chính xác để kiểm từng ca, tránh sửa một kết quả tùy tiện chỉ để khớp tổng.
- PostgreSQL E2E, browser, Nest/Next build: CHƯA, thiếu runtime dependencies trong môi trường tạo source.
- V11.132 giữ nguyên như một snapshot engine; không tự tính lại hồ sơ cũ theo V11.144. Không đổi schema DB hay logic Tứ Khóa/Tướng.
