# Đại Lục Nhâm — Thiên/Địa bàn thử nghiệm (V11.88)

## Giới hạn chính xác

**CÓ:** xếp 12 chi Thiên bàn lên địa bàn theo Nguyệt Tướng được nhập thủ công và chi giờ được nhập thủ công; có ma trận 12×12 ca tổ hợp; có nhãn Phục Ngâm/Phản Ngâm chỉ theo độ lệch vòng.

**CHƯA CÓ:** tính đúng thời điểm Trung khí theo thiên văn, múi giờ/địa phương, Tứ Khóa, Tam Truyền, Quý Nhân, Thiên Tướng, hành niên, ứng nghiệm, luận đoán và các trường phái khác.

## Định nghĩa toán học

Theo quy tắc tham khảo *月将加占时* trong 《六壬指南》卷一, đặt vòng địa chi không đổi `B = [Tý, Sửu, Dần, Mão, Thìn, Tỵ, Ngọ, Mùi, Thân, Dậu, Tuất, Hợi]`. Đặt `m = index(Nguyệt Tướng)` và `h = index(Chi giờ)`, đánh chỉ số từ 0.

```text
offset = (m - h + 12) mod 12
heaven[earthIndex] = B[(earthIndex + offset) mod 12]
```

Hệ quả có thể kiểm chứng: `heaven[h] = B[m]`, 12 vị trí Thiên bàn là một hoán vị vòng của 12 chi; `offset=0` là đồng vị (Phục Ngâm), `offset=6` là đối vị (Phản Ngâm). Nhãn này chỉ mô tả hình học, **không suy ra cát/hung**.

Ví dụ văn bản tham khảo: `Hợi` gia `Ngọ` thì tại địa bàn `Ngọ` có `Hợi`, sau đó tại `Mùi` có `Tý`, tại `Thân` có `Sửu`. Có bài thử cố định cho ví dụ này.

## Nhập Nguyệt Tướng

`monthGeneralAfterZhongQi('Vũ Thủy') -> 'Hợi'`. 12 Trung khí chỉ được nhập dưới dạng **tên Trung khí**, không tự xác định từ ngày tháng. Không đánh đồng ranh giới Trung khí (đổi Nguyệt Tướng) với 12 Tiết khí dùng cho trụ tháng Bát Tự.

## API nghiên cứu thuần

```js
const {buildHeavenEarthPlates} = require('./packages/astrology-engine/src/da-liu-ren-plates.cjs');
const result = buildHeavenEarthPlates({monthGeneral:'Hợi',divinationHour:'Ngọ'});
// result.positions.find(x=>x.earth==='Ngọ').heaven === 'Hợi'
// result.status === 'deterministic-subroutine-only'
```

Đã chủ động **không nối** API này vào tính toán Tử Vi, Bát Tự hay công cụ công khai cho tới khi xong giao thức thẩm định. Xem `docs/research/schools/dai-luc-nham-yuejiang.md`.

## Nguồn kiểm tra

1. 《六壬指南》卷一, đoạn “月将加占时之上”: https://zh.wikisource.org/zh-hans/六壬指南/1
2. Volkov (2013), DOI: https://doi.org/10.4000/extremeorient.282 — lịch sử Đại Lục Nhâm, không phải nguồn kiểm chứng công thức.
