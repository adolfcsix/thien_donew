# R44 — Tái hiện công thức nguồn trên dữ liệu giả lập

Nguồn khóa phiên bản: Renhuai123/ziwei-doushu@7922285d947b36610e7e31c232d8f1e2a0d0871d.

Đối chiếu tại lib/ziwei/patterns-dingpin.ts và lib/ziwei/patterns-dingza.ts:

1. 生不逢时: Mệnh có Liêm Trinh và một trong sáu nhãn Không Vong của nguồn.
2. 禄逢两杀: Mệnh có Lộc Tồn hoặc Hóa Lộc, một nhãn Không Vong và đồng thời cả Địa Không, Địa Kiếp.
3. 禄衰马困: tại mỗi đại hạn, có Thất Sát ở tam phương tứ chính; Lộc Tồn và Thiên Mã mỗi sao phải tọa cung có Không Vong nguồn. Hai sao không nhất thiết cùng cung.

Sáu tên nguồn: 旬空, 副旬, 截路, 截空, 空亡, 副截. Không đồng nhất chúng với Tuần/Triệt của Thiên Đồ.

Tệp source-void-formula-fixture.cjs chỉ nhận đối tượng SOURCE giả lập với kind = source-synthetic-fixture, đủ 12 cung và 12 địa chi đại hạn. Đây không phải bộ an sao thực tế. Nó không cho phép kết luận cách cục, không dùng làm quyền Pro, không xuất ra lá số và không làm thay đổi mốc 31/49. Kiểm thử cho phép kiểm tra công thức OR/AND và địa chi, nhưng chưa chứng minh vị trí an sáu sao hoặc khác biệt trường phái.

Để nâng ánh xạ, cần chạy engine nguồn đã khóa, kiểm tra lịch và cặp giờ Tý, lập corpus nguồn/Thiên Đồ có đủ trường phái, rồi thẩm định sai khác theo từng sao.
