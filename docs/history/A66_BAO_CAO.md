# THIÊN ĐỒ — V11.164.93 / A66

**NO-GO.** Lượt này sửa sâu vòng đời tương tác của ánh sáng Tử Vi và việc giữ theme khi storage tạm lỗi. Không gọi toàn bộ hệ thống/3D hoàn hảo. Giữ V11, 36 migration bất biến và 11 gate OPEN.

## Nguồn và checkpoint

Nền đầy đủ là `THIEN_DO_V11_164_92_A65_FONT_MOTION_SOURCE_NO_GO.zip`, SHA256 `0eea651596246fbb3e3e4956500f267ae932b69038779402a3eef53ad9a8e02d`, 98.542.406 byte. Tiếp tục chính source đã xác minh trong workspace; không chuyển xuống A43 hay phục dựng ZIP A57 nguyên gốc. Báo cáo A65 nguyên văn lưu ở `docs/history/A65_BAO_CAO.md`.

Checkpoint A66 source đầy đủ đã được lưu thành công sau khi build/typecheck/Node và browser mục tiêu đạt, trong lúc hồi quy rộng còn chạy. SHA256 checkpoint `137946301d03e0e7dc90382d554a19777af586779a4f9f5deb98a4747183fc9f`. Bản cuối bổ sung kết quả sau đó; checkpoint không phải bản cuối.

## Phát hiện, bằng chứng trước/sau và cách sửa

| ID / mức | Tái hiện trước sửa trên A65 production | Sửa và tiêu chí đạt trên A66 |
|---|---|---|
| A66-MOTION-01 / P2 | 20 pointermove cùng frame đọc getBoundingClientRect20 lần | Chỉ lưu tọa độ cuối trong handler, đọc geometry trong rAF; đo còn1 lần, tọa độ25%/75% giữ đúng |
| A66-MOTION-02 / P2 | pointercancel, touch trên máy lai, đổi coarse pointer, blur để lại biến ánh sáng | Hủy frame và dọn biến ở các đường kết thúc; chặn touch hover, nghe pointer capability change; cả4 nhánh đạt |
| A66-THEME-01 / P2 | getItem lỗi khi tab hoạt động lại khiến theme vừa chọn đổi sang OS default ở390/1440 | Khởi tạo vẫn dùng OS fallback; lỗi đọc về sau giữ lựa chọn RAM. Sự kiện storage sau phục hồi đồng bộ lại; cả2 viewport đạt |
| A66-QA-01 / P2 | Visual đầu timeout15s khi chụp Tarot vì phần tử chưa ổn định | Chỉ thêm diagnostic khi timeout, không đổi assertion/timeout/hiệu ứng app; chạy riêng lại23 nhóm đạt. Lần lỗi thuộc harness Next wrapper cũ; nguyên nhân chưa xác định, giữ OPEN |
| A66-PERF-01 / P1 | Ngân sách tương tác/LCP A65 chưa đạt | Đo mới A66 riêng bên dưới; chưa đủ để đóng gate |

A66-QA-02 / P2: suite visual/performance trước đó dùng Next custom server từ bản build sao chép, sinh cảnh báo standalone và không kiểm đúng entrypoint bàn giao. Đã chuyển hai suite sang chính `server.js` standalone như candidate, có readiness và dừng child trước trả cổng. Không đổi assertion, protocol lấy mẫu hay ngưỡng. Cả hai được chạy lại sau sửa harness.

Đường sửa runtime: `apps/web/src/features/chart/components/chart-scene.tsx`, `apps/web/src/components/shell.tsx`. Test mới: `tests/helpers-a66-pointer-browser.cjs`, nối vào bootstrap production `tests/candidate.browser.cjs`. `tests/visual.browser.cjs` bổ sung diagnostic khi screenshot timeout; visual/performance cũng đổi bootstrap kiểm thử sang standalone. Runtime ứng dụng không đổi vì bước này.

Baseline đúng cùng bài browser mới trên artifact A65: 7 assertion lỗi (5 pointer và2 storage), 4 đúng; collector baseline exit0 để thu kết quả, không là nghiệm thu. Sau sửa: 12 nhóm mục tiêu PASS, gồm7 pointer,1 vòng toggle/SPA cleanup và4 storage. Ba vòng bật/tắt không tăng số subscriber; rời trang SPA còn0. Không suy phép kiểm listener này thành chứng nhận không rò bộ nhớ toàn hệ thống.

Hai lần chạy fixture sau sửa ban đầu sai selector (chọn tất cả nút trong chart) và giả định chỉ một media-query subscriber. Đã đối chiếu Scene cùng ChartBoard, sửa fixture để kiểm không tăng subscriber và unmount về0; giữ log thất bại riêng, không gọi là lỗi ứng dụng hoặc cộng vào PASS.

## Kiểm chứng hiện hành

Linux, Node24.19.0/npm11.9.0, Chromium153 headless/GPU disabled, Playwright1.58.2, PGlite0.5.10, dữ liệu QA tổng hợp. Không provider thật. Lệnh và exit code đầy đủ trong `verification/`.

- `npm run typecheck`: FE/BE PASS, exit0.
- `npm run build:isolated`: snapshot riêng, npm ci375 package từ lockfile, build FE/BE/standalone PASS, exit0; không symlink dependency hoặc rebuild đè artifact đang test.
- `npm test`: **3110/3110 trong353 tệp**, PASS, exit0. Đây là phép chạy mới A66; không tái sử dụng số A65 làm PASS mới.
- `npm run audit:migration-chain`: 36 migration liên tục và SHA256 đóng băng PASS; không kết nối DB native.
- `npm run audit:architecture`: 566 tệp,2189 import,0 vi phạm.
- `npm run audit:handover`: guide/metadata/link/11 gate OPEN nhất quán.

| Suite browser | Nhóm | Exit code |
|---|---:|---:|
| pointer | 12 | 0 |
| theme | 2 | 0 |
| visual | 23 | 0 |
| candidate | 28 | 0 |
| performance | 2 | 0 |

Số nhóm là bản ghi theo suite, không phải số ca duy nhất để cộng quảng cáo. Các lần thất bại và baseline nằm riêng. Suite cuối không có uncaught page error. Browser dùng Next/Nest production và DB PGlite QA qua HTTP; không phải suite PostgreSQL native/concurrency/upgrade production. Không lấy118 SQL của A64 làm kết quả DB mới.

Visual kiểm lại Natal với output/tọa độ/aspect thật, chọn/filter/pause/zoom và Tarot; candidate kiểm scope session/chat/quyền/admin/artwork/motion hiện có. Các tính năng ngoài scope của suite không tự được đánh dấu đã nghiệm thu chỉ vì code giữ nguyên.

## Hiệu năng A66 đo mới trên standalone

Lượt wrapper trước đó ghi12/18 vượt200ms, max952ms, LCP max1684ms; giữ nguyên JSON tại `verification/performance-next-wrapper/`. Không trộn lượt này với lượt standalone cuối hoặc suy khác biệt thành cải thiện do code.

Sau build/Node/hồi quy browser và upload checkpoint đã hoàn tất, chạy collector riêng, cùng protocol3 lượt ×2 viewport390/1440 ×3 route `/tarot`, `/western-astrology`, `/chart`, mỗi quan sát3 lần đổi theme cách1 giây. Có8 quan sát60-frame Tử Vi/Natal đã tính ×normal/reduced motion ×2 viewport.

- LCP: 156.0–1364.0ms; CLS tối đa0.007955.
- 9/18 quan sát có EventTiming >200ms; lớn nhất480ms.
- Event lớn nhất: input delay0.60ms, processing1.00ms, presentation478.40ms.
- Giữ mục tiêu LCP≤2500ms, CLS≤0.1, tương tác≤200ms. Collector PASS chỉ nói thu đủ dữ liệu, không nói mọi ngân sách đạt.

Giảm20→1 lần đọc geometry là kết quả trên burst pointer cụ thể; không suy thành giảm95%CPU, INP hay nhanh hơn toàn site. A65 trước đó11/18 vượt200ms, max1400ms, LCP max4852ms là dữ liệu lịch sử, không đối chứng nguyên nhân nhân quả cho A66. Trace A65 gợi chi phí style/raster nhưng chưa có tối ưu được chứng minh ổn định để ship. Không bỏ artwork, tắt toàn bộ hiệu ứng, đổi ngưỡng hoặc thêm thư viện3D nặng.

Đây là lab Chromium/Linux/GPU disabled không throttle, không phải field INP/percentile production, Windows, Safari iPhone hay thiết bị đồ họa thật. Không từ8 đoạn60-frame kết luận pin/nhiệt/GPU hoặc không rò bộ nhớ.

## Tính toàn vẹn, giới hạn và bàn giao

820 tệp API/package/migration/public asset/lock hiện có giữ nguyên byte so với ZIP A65. Không thay engine/tri thức/ảnh/font/giấy phép, quyền backend, MFA, thanh toán hoặc schema. Runtime cuối khớp artifact đã build; tài liệu/metadata và helper/diagnostic test cập nhật sau snapshot được liệt kê tại `verification/final-source-parity.json`.

Giữ nguyên các thành quả A53–A65: tranh chat, 12 cung Tử Vi, Natal chính xác, bảng thiên thể/ma trận aspect, manual pause, font local và palette đã sửa. Natal/luận Natal/Synastry/Composite giữ ranh giới server; Tử Vi/Tarot còn logic client. Không hứa chống sao chép tuyệt đối.

Native PostgreSQL/trống/upgrade/concurrency/backup restore, Windows Chrome/Edge, Safari iPhone/keyboard thật, provider email/OAuth/Gemini/PayOS, staging/load/TLS/private storage và phê duyệt pháp lý vẫn chưa đủ bằng chứng. Tiếp tục ghi BLOCKED/NOT_RUN theo từng gate; không bỏ MFA hoặc tự ký duyệt. Hiệu năng và timeout ảnh Tarot còn OPEN, nên chưa đủ điều kiện GO/V12.

ZIP cuối chứa source đầy đủ và evidence JSON/log, manifest SHA256 từng file; kiểm ZIP CRC/toàn bộ manifest trước bàn giao. Không có node_modules/.next/dist/cache/QA DB/credential/backup/ZIP lồng hay screenshot riêng tư. Hướng dẫn cài Windows/production local/vận hành hiện hành ở `HUONG_DAN.md`; npm package version vẫn11.164.0, nhãn bàn giao làV11.164.93/A66.
