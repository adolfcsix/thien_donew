# Tarot 78 lá — bộ hình gốc và bộ hiện đại

## Bộ sử dụng được trong Thiên Đồ

- **Rider–Waite–Smith (1909)** — hình lịch sử Pamela Colman Smith. Mặc định để các hồ sơ cũ không thay đổi hiển thị ngoài ý muốn. Công cụ tải: `TAI_78_ANH_TAROT_WINDOWS.bat`.
- **Gearberry Tarot WebP** — 78 hình bộ bài mới hơn, chuẩn WebP 848 × 1264 theo [repository của nhà phát hành](https://github.com/reginanka/tarot-cards). Công bố [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), phải giữ liên kết ghi công tới Gearberry, repo và giấy phép. Chọn ở mục **Bộ hình minh họa**. A44 đã có đủ bộ local, CDN/GitHub là phương án dự phòng khi tệp lỗi. Khi cần phục hồi bộ nguồn, chạy `TAI_78_ANH_TAROT_HIEN_DAI_WINDOWS.bat` (hoặc `npm run tarot:images:modern`) trong thư mục dự án.

## Chênh lệch thứ tự truyền thống

Hồ sơ rút và bản giải nghĩa vẫn theo chuẩn RWS: **Strength VIII**, **Justice XI**. Bộ Gearberry công bố **Justice VIII**, **Strength XI**, vì vậy mapping đổi có chủ đích `major-08 -> m11.webp`, `major-11 -> m08.webp`; phần còn lại theo mã chuẩn. Không hoán đổi ý nghĩa, tọa độ trải bài, hồ sơ hay thứ tự lưu trữ.

## Những bộ tìm được nhưng chưa tích hợp hình ảnh

- [Soimoi Tarot (Mike Koz, 2025)](https://github.com/mixvlad/TarotCards) — tác giả công bố 78 ảnh mới theo CC BY 4.0. Cần kiểm thử đủ 78 đường dẫn, thứ tự lá và hình ảnh thực trước khi bật lựa chọn trong ứng dụng.
- [Woodcut Tarot (CC0)](https://github.com/SONDLecT/woodcut-tarot) — bộ SVG vẽ lại theo Jean Noblet, có hệ số Justice VIII/Strength XI nên cần quy tắc ánh xạ, không được nối ảnh trực tiếp vào engine RWS.

Các bộ thương mại hiện đại như Light Seer's, Modern Witch không thể tự sao chép toàn bộ ảnh vào website nếu chưa được chủ sở hữu cấp phép phân phối kỹ thuật số. Việc mua một bộ bài vật lý không đồng nghĩa quyền tải và phát hành ảnh 78 lá.

## Chất lượng và giới hạn

- Khung lá cố định tỷ lệ 3:5, ảnh dùng `object-fit: contain`, `object-position: center`, không cắt viền và không ép ảnh méo. Các bộ có tỷ lệ nguyên gốc khác nhau sẽ có khoảng đệm cân xứng trong khung.
- Sơ đồ trải bài, ảnh thu nhỏ và lá xuôi/ngược dùng cùng mã ảnh; lá ngược xoay 180° đúng tâm.
- Nếu mất mạng và chưa tải offline, ảnh có thể không tải được; frontend thử máy chủ dự phòng, sau đó dùng khung dự phòng cùng kích thước; không tự trộn các bộ ảnh vì dễ khiến thư viện trông thiếu nhất quán.
- Script tải offline kiểm tra danh sách đúng 78 ảnh WebP, chữ ký RIFF/WEBP, kích thước/độ phân giải cơ bản và chỉ bật trạng thái nội bộ khi đủ bộ.
- A44 đóng gói đủ 78 ảnh mỗi bộ, có kiểm SHA/giải mã và kiểm thử browser offline trong báo cáo hiện hành. Danh mục dùng thumbnail dẫn xuất; ảnh lá rút vẫn bản gốc. License Gearberry giữ nguyên tại `docs/licenses/tarot-gearberry.txt`; cần chủ thể phụ trách duyệt quyền xuất bản, không tự coi kiểm kỹ thuật là phê duyệt pháp lý.
