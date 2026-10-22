# V11.109 — Chốt phương pháp trước thuật toán

Quyết định ngày 12/10/2026, lập trước khi viết bộ nhận diện mới. Phạm vi: **dấu Môn Bách và Tam Kỳ Nhập Mộ trên thời bàn đã dựng**, trạng thái nghiên cứu.

## Trường phái và quy ước
Bộ dựng hiện có: **Thời gia Chai Bổ – Chuyển Bàn**, tám cung ngoài; Trung 5 không có Thiên Can/Môn riêng, Thiên Cầm ký cùng Thiên Nhuế theo quy ước V11.78. Tầng nhận diện dùng quy ước được chọn từ **Độn Giáp Diễn Nghĩa**, ID `thien-do-qimen-yanyi-structure-v11109`. Đây là cấu hình nghiên cứu của Thiên Đồ, không phải chứng nhận dòng truyền thừa hoặc triển khai toàn bộ sách. Không đổi phép khởi cục, an sao/môn/thần hay thuật toán lịch.

## Nguồn đã mở và đối chiếu
1. [遁甲演義 — Độn Giáp Diễn Nghĩa](https://zh.wikisource.org/zh-hant/遁甲演義): mục **門迫宮迫** mở bằng “宮制其門不為迫，門制其宮是迫雄”; mục **三奇入墓**, đoạn dẫn 王璋 nêu Ất tại 2, Bính tại 6, Đinh tại 8. Một số câu/đoạn khác của bản chép có nội dung không thống nhất; không lấy mọi câu làm một quy tắc đồng nhất.
2. [奇門寶鑑御定 — Bảo Giám Ngự Định](https://zh.wikisource.org/zh-hant/奇门宝鉴御定): **釋迫** cho danh sách đầy đủ tám Môn; **釋奇墓奇制與日時干墓同凶** dùng Ất 2, Bính/Đinh 6. Đây là đối chiếu có sai khác ở Đinh, không phải nguồn xác nhận Đinh 8.
3. [奇門遁甲秘笈大全 — 門迫宮迫](https://www.shidianguji.com/zh/book/SDZJ0630/chapter/1lx9g2ky1kugj): tên gọi đảo chiều — cung khắc Môn là 門迫. Ghi làm dị bản thuật ngữ; không đưa vào phép nhận diện mặc định.

Phiên bản chép được ghim: Diễn Nghĩa `oldid=2082234`, Bảo Giám `oldid=2353651`; panel mở liên kết cố định tương ứng. Bí Kíp Đại Toàn chưa có mã phiên bản cố định công khai trong dữ liệu đã đọc.

Các trang trên là bản chép số của tác phẩm cổ, đã đọc các mục liên quan. **Chưa kiểm chứng ảnh bản in, chưa có phản biện độc lập của chuyên gia**. CText trả 403 khi mở, nên kết quả tìm kiếm tại đó không được dùng làm bằng chứng đã đọc toàn văn. Tác giả/niên đại gán trên website không được xem là đã xác minh thư mục học.

## Bảng độc lập — Môn khắc cung

| Môn | Ngũ hành | Cung có dấu | Chiều kiểm tra |
|---|---|---|---|
| Hưu | Thủy | Ly 9 | Thủy khắc Hỏa |
| Sinh | Thổ | Khảm 1 | Thổ khắc Thủy |
| Thương | Mộc | Khôn 2, Cấn 8 | Mộc khắc Thổ |
| Đỗ | Mộc | Khôn 2, Cấn 8 | Mộc khắc Thổ |
| Cảnh | Hỏa | Càn 6, Đoài 7 | Hỏa khắc Kim |
| Tử | Thổ | Khảm 1 | Thổ khắc Thủy |
| Kinh | Kim | Chấn 3, Tốn 4 | Kim khắc Mộc |
| Khai | Kim | Chấn 3, Tốn 4 | Kim khắc Mộc |

64 tổ hợp tám Môn × tám cung ngoài: **13 ô có dấu, 51 ô không có dấu theo định nghĩa đã chọn**. Cung khắc Môn vẫn có thể được trình bày dưới đúng chiều khắc; không gán cùng nhãn Môn Bách mặc định. Không suy Môn Bách từ Môn bản vị: phải đọc Môn đã chuyển theo giờ.

## Bảng độc lập — Tam Kỳ Nhập Mộ

| Tam Kỳ | Quy ước Diễn Nghĩa được chọn | Đối chiếu Bảo Giám | Trạng thái |
|---|---|---|---|
| Ất | Mùi → Khôn 2 | Khôn 2 | Đồng quy chiếu |
| Bính | Tuất → Càn 6 | Càn 6 | Đồng quy chiếu |
| Đinh | Sửu → Cấn 8 | Tuất → Càn 6 | Có dị bản; dùng Cấn 8 trong V11.109 |

Tra **Thiên Can thời bàn đang được biểu diễn**; không lấy Can địa bàn làm bằng chứng. Đây là quy tắc Tam Kỳ cụ thể, không suy tổng quát từ bảng mười Can/12 trường sinh: bản thân cách giải thích mộ của Ất có dị bản. Chưa triển khai Lục Nghi/giờ/ngày/Bát Môn nhập mộ.

Nếu một Tam Kỳ nằm ở Địa Can Trung 5 mà bộ dựng hiện tại không biểu diễn Can ký trên Thiên bàn, ghi **chưa biểu diễn**, không ghi “không nhập mộ” và không tự gửi Can đó sang cung đang có Thiên Nhuế. Cung 5 ghi quy ước trung cung, không áp dụng ma trận tám cung ngoài.

## Tính độc lập và tiêu chí nghiệm thu
`tests/fixtures/qimen-v11109-independent.json` được nhập tay từ các bảng trên trước thuật toán. Ma trận kỳ vọng không import hằng số sản xuất và không lấy đầu ra hàm nhận diện để tạo expected. Đây là kiểm chứng độc lập về bảng/kỹ thuật, **không đồng nghĩa hai bản chép cùng chứng nhận toàn bộ phép an bàn hoặc có người thứ hai phản biện**.

Bộ kiểm thử phải bao phủ toàn bộ 64 ô Môn và 24 ô Tam Kỳ, hai chiều khắc, khác biệt Đinh 6/8, Trung 5/Can không biểu diễn, tắt giờ, đầu vào giả và bất biến dữ liệu. Đối chiếu trên nhiều bàn Âm/Dương, tiết khí/ngày/giờ; ghi rõ đây là kiểm chứng lớp nhận diện dựa trên bộ dựng hiện có, không chứng minh bộ dựng đúng mọi trường phái.

## Dấu cấu trúc và luận đoán
“Có dấu” chỉ là điều kiện bảng vị trí/quan hệ khắc được thỏa mãn. “Không có dấu” chỉ phủ định đúng điều kiện ấy trên dữ liệu hiện có. “Ngoài phạm vi”, “chưa tính”, “chưa biểu diễn” và “quy ước Trung 5” phải phân biệt.

Không tạo điểm cát/hung, xác suất, khuyến nghị hành động hoặc kết luận sự kiện từ một dấu. Luận đoán còn phụ thuộc câu hỏi, dụng thần, vượng suy, chủ/khách, tầng tương tác và quy ước riêng; V11.109 không có mô-đun luận đoán cho hai dấu này. Những câu luận đoán của sách là ngữ cảnh lịch sử, không chuyển thành kết luận trong giao diện.
