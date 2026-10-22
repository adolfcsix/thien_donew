'use client';

import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';
import styles from './view-mode.module.css';

/** Presentation preference only. Engines and persisted chart data are mode-independent. */
export type ViewMode = 'basic' | 'expert';
export const VIEW_MODE_STORAGE_KEY = 'thiendo-view-mode';
export function normalizeViewMode(value: string | null | undefined): ViewMode {
  return value === 'expert' ? 'expert' : 'basic';
}

type ContextValue = {mode: ViewMode; setMode: (mode: ViewMode) => void};
const ViewModeContext = createContext<ContextValue | null>(null);

export function ViewModeProvider({children}: {children: ReactNode}) {
  // Use a server-safe initial value, restoring the preference after hydration.
  const [mode, setMode] = useState<ViewMode>('basic');
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try { setMode(normalizeViewMode(window.localStorage.getItem(VIEW_MODE_STORAGE_KEY))); }
    catch { /* Storage may be unavailable in private sessions. */ }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode); }
    catch { /* Preference is nonessential. */ }
  }, [mode, restored]);
  const value = useMemo(() => ({mode, setMode}), [mode]);
  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode(): ContextValue {
  const value = useContext(ViewModeContext);
  if (!value) throw new Error('useViewMode must be used inside ViewModeProvider');
  return value;
}

export type ModeDiscipline = 'tu-vi'|'bat-tu'|'kinh-dich'|'mai-hoa'|'luc-hao'|'ky-mon'|'phong-thuy'|'ngu-hanh'|'lich-phap'|'chon-ngay';
const guide: Record<ModeDiscipline, {title: string; basic: string; expert: string; next: string; caution: string}> = {
  'tu-vi': {title:'Đọc lá số Tử Vi', basic:'Bắt đầu với Mệnh, Thân và 14 chính tinh. Chọn một cung để xem ý nghĩa, không cần đọc mọi sao cùng lúc.', expert:'Mở các lớp sao phụ, Tứ Hóa, vận hạn, quan hệ tam phương và chứng cứ luận giải tại từng cung.', next:'Lập lá số rồi chọn một cung muốn tìm hiểu.', caution:'Các nhận định là đối chiếu quy tắc truyền thống, không phải tiên đoán được kiểm chứng.'},
  'bat-tu': {title:'Đọc bốn trụ Bát Tự', basic:'Nhìn Can ngày (Nhật Chủ) trước, sau đó so sánh bốn trụ Năm – Tháng – Ngày – Giờ.', expert:'Đọc Tàng Can, Thập Thần, tổ hợp Can Chi, phép tính Đại Vận và cảnh báo gần chuyển tiết.', next:'Nhập ngày giờ rồi xem Nhật Chủ và bốn trụ.', caution:'Ba phép xét Dụng thần ở chế độ nghiên cứu chỉ là so sánh chứng cứ, không có Dụng thần được xác nhận. Bảng Jie 2025–2027 không bao phủ mọi năm sinh.'},
  'kinh-dich': {title:'Đọc sáu hào của quẻ Dịch', basic:'Nhập sáu hào theo thứ tự từ dưới lên; quan sát quẻ chủ, quẻ biến và câu hỏi tự chiêm nghiệm.', expert:'Tra đủ 64 quẻ, đối chiếu thượng/hạ quái, hào động và quy ước xác suất gieo xu.', next:'Thử sáu hào mẫu, sau đó chỉnh một hào.', caution:'Chỉ là tra cấu trúc quẻ và mô phỏng; không suy đoán sự kiện chắc chắn.'},
  'mai-hoa': {title:'Đọc quẻ Mai Hoa', basic:'Tập trung quẻ chủ, hỗ quẻ, quẻ biến và vai trò của hào động. Thể là quái không động, Dụng là quái có động.', expert:'Xem bảng bốn lớp Thể–Dụng và vết tính sáu hào, gồm phép chia dư theo từng quy ước.', next:'Chọn phương pháp khởi quẻ và xem ba hình tượng.', caution:'Tháng nhuận và cách chọn số có dị bản; không sử dụng làm kết luận dự báo.'},
  'luc-hao': {title:'Đọc quẻ Lục Hào', basic:'Nhập sáu hào từ dưới lên; nhận diện hào động và sự khác nhau giữa quẻ chủ và quẻ biến.', expert:'Mở Nạp Giáp, Bát Cung, Thế–Ứng, Nhật/Nguyệt, Tuần Không và bảng đối chiếu Lục Thân.', next:'Quan sát sáu hào trước khi mở đối chiếu lịch pháp.', caution:'Chưa tự chọn Dụng Thần hoặc kết luận vượng suy và ứng kỳ.'},
  'ky-mon': {title:'Đọc địa bàn Kỳ Môn', basic:'Đầu tiên xác nhận tiết khí và cục số; sau đó đọc vị trí chín cung của địa bàn.', expert:'Mở chi tiết từng cung, Chuyển Bàn theo giờ, Trực Phù/Trực Sử, môn–tinh–thần và dấu vết phép an.', next:'Nhập ngày giờ hoặc nạp ví dụ đã xác nhận.', caution:'Chưa tự kết luận cách cục; giờ chuyển tiết và dị bản cần kiểm tra.'},
  'phong-thuy': {title:'Đọc phương vị phong thủy', basic:'Nhập góc đo thực tế (Bắc 0°, Đông 90°) rồi xem hướng, tọa và một trong 24 sơn.', expert:'Mở Phi Tinh, Bát Trạch, chín cung và thông số nền để đối chiếu độc lập.', next:'Thử góc 180°, sau đó thay bằng góc bạn đo được.', caution:'Không thay thế khảo sát thực địa hay tư vấn an toàn công trình.'},
  'ngu-hanh': {title:'Hiểu Ngũ hành', basic:'Chọn hai hành, xem chiều tương sinh hoặc tương khắc và đọc lý do không tự đồng nhất sinh = tốt, khắc = xấu.', expert:'Mở ma trận 5×5 để truy ngược chiều tác động và kiểm tra từng cặp hành.', next:'Thử đổi chỗ hai hành trong bộ chọn.', caution:'Ngũ hành là mô hình biểu tượng; chưa tính vượng suy theo tiết khí.'},
  'lich-phap': {title:'Tra lịch âm dương', basic:'Chọn một ngày để đọc âm lịch, Can Chi và tiết khí; nhận biết mốc cần đối chiếu thêm.', expert:'Xem thêm Trực ngày, 28 Tú, giờ Hoàng Đạo và cảnh báo sát thời điểm chuyển tiết.', next:'Chọn ngày trên lịch tháng.', caution:'Các mốc tiết khí gần biên là ước tính; không dùng riêng nhãn ngày để quyết định việc hệ trọng.'},
  'chon-ngay': {title:'Đối chiếu ngày theo việc', basic:'Chọn công việc, tháng và xem dữ liệu từng ngày. Không có một điểm may mắn tổng hợp.', expert:'Lọc đa lớp, so sánh tối đa ba ngày và xuất bảng CSV cùng dấu vết phương pháp.', next:'Chọn việc rồi mở chi tiết một ngày.', caution:'Phân loại truyền thống không bảo đảm kết quả thực tế.'},
};

/** Same research results, different amounts of explanation and evidence on screen. */
export function ModeIntroduction({discipline, summary}: {discipline: ModeDiscipline; summary?: string}) {
  const {mode, setMode} = useViewMode();
  const entry = guide[discipline];
  const expert = mode === 'expert';
  return <section className={styles.intro} aria-label={`Hướng dẫn ${expert ? 'chuyên sâu' : 'cơ bản'}: ${entry.title}`}>
    {summary && <p className={styles.liveSummary}><b>Đang xem:</b> {summary}</p>}
    <details className={styles.guide}>
      <summary>{entry.title} <span className={styles.kicker}>· {expert ? 'Chuyên sâu' : 'Cơ bản'}</span></summary>
      <p>{expert ? entry.expert : entry.basic}</p>
      <p>{expert ? 'Lưu ý phương pháp:' : 'Bước tiếp theo:'} {expert ? entry.caution : entry.next}</p>
      <button type="button" onClick={() => setMode(expert ? 'basic' : 'expert')}>{expert ? 'Chuyển về Cơ bản' : 'Khám phá Chuyên sâu'} <span aria-hidden="true">↗</span></button>
    </details>
  </section>;
}

/** Replace dense evidence panels with an explicit, accessible route to them in basic mode. */
export function ExpertOnly({title, children}: {title: string; children: ReactNode}) {
  const {mode, setMode} = useViewMode();
  return <>
    {mode !== 'expert' && <div className={styles.teaser}>
      <span>{title}</span><button type="button" onClick={() => setMode('expert')} aria-label={`Mở Chuyên sâu: ${title}`}>Xem chi tiết <span aria-hidden="true">↗</span></button>
    </div>}
    {/* Keep mounted stateful tools (e.g. Feng Shui floorplan) across mode changes. */}
    <div className={styles.expertRegion} hidden={mode !== 'expert'}>{children}</div>
  </>;
}
