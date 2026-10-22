# Phương pháp V11.89 — bảng Trung khí HKO 2025–2027

## Đầu vào, công thức và phạm vi

Nguyệt Tướng Đại Lục Nhâm lấy theo **12 Trung khí** (góc hoàng kinh Mặt Trời mỗi 30°) chứ không lấy các Tiết khí xen kẽ. Giữ nguyên phép xếp Thiên bàn lên Địa bàn của V11.88, chỉ thay nguồn Nguyệt Tướng: sử dụng **bảng thời điểm công bố** (HKO, UTC+08:00). Đây là thuật toán tra bảng và đối chiếu, **không phải tính thiên văn liên tục**.

- `resolveMonthGeneralAt({ instantIso: '2026-02-19T10:00:00+07:00' })`: kết quả `Hợi`, mốc cuối `Vũ Thủy`.
- `buildHeavenEarthPlatesAt({ instantIso: '2026-02-19T10:00:00+07:00', divinationHour: 'Ngọ' })`: dựng bàn nghiên cứu bằng `monthGeneral = Hợi`; chi giờ do người dùng nhập và kiểm chứng độc lập.
- `instantIso` bắt buộc có UTC offset (`Z` hoặc `±hh:mm`) để chống nhập nhằng múi giờ, kiểm tra ngày Gregory hợp lệ.
- **Giao tiết:** HKO công bố thời điểm đến phút. Bất cứ thời điểm nào nằm trong ±60 giây so với giờ in đều trả `boundary-needs-verification`, không lấy bên trước hay bên sau.
- **Ngoài dữ liệu:** các thời điểm trước mốc Đại Hàn 20/1/2025 hoặc từ 1/1/2028 sẽ trả `unsupported-date`; không nội suy/ngoại suy.
- Chỉ chạy trong module nghiên cứu, không bật API dịch vụ chính và không thay logic Bát Tự.

## Xác minh độc lập

**Nguồn chính:**
- 2025: https://www.hko.gov.hk/tc/gts/astron2025/files/2025SolarTerms24.pdf
- 2026: https://www.hko.gov.hk/en/gts/astron2026/files/2026SolarTerms24.pdf
- 2027: https://www.hko.gov.hk/tc/gts/astron2027/files/2027SolarTerms24.pdf
- HKO mô tả UTC+08:00: https://www.hko.gov.hk/en/gts/astronomy/Solar_Term.htm

**Đối chứng ngoài tổ chức:** bản USNO UTC (NWS tổng hợp): https://www.weather.gov/dvn/Climate_Astronomical_Seasons. Bốn mốc xuân phân, hạ chí, thu phân, đông chí 2026 chênh tối đa 1 phút do độ chính xác in bảng; **không có kiểm chứng ngoài HKO cho 32 mốc còn lại**.

## Chưa đủ điều kiện triển khai

- Độ chính xác đến giây tại thời điểm giao tiết; ephemeris được thẩm định độc lập; đa dạng lịch sử khi phương pháp xác định Nguyệt Tướng khác.
- Xác định chi giờ theo kinh độ địa phương, giờ pháp định, giờ mặt trời thực, giờ Tý theo trường phái.
- Tứ Khóa, Tam Truyền, Quý Nhân, Thiên Tướng, luận đoán và bảo chứng học thuật của bất kỳ trường phái nào.
- Cài dependencies/npm lockfile, Next/Nest build, PostgreSQL E2E: chưa được xác nhận.

**Cập nhật V11.90:** xem `dai-luc-nham-four-lessons.md` để tra Tứ Khóa, Tam Truyền một phần, với quy tắc từ chối các nhánh chưa đủ. Bộ tra Nguyệt Tướng và chặn ranh giới HKO vẫn giữ nguyên.
