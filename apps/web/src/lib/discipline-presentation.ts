/** Presentation only: route identity never selects an engine or a school. */
export const disciplinePresentations = [
  { path: '/chart', id: 'tu-vi', family: 'Mệnh lý Đông phương', motif: '紫', label: 'Tử Vi', caption: '12 cung · Hệ sao · Vận hạn' },
  { path: '/bazi', id: 'bat-tu', family: 'Mệnh lý Đông phương', motif: '命', label: 'Bát Tự', caption: 'Bốn trụ · Can Chi · Thập Thần' },
  { path: '/iching', id: 'kinh-dich', family: 'Dịch học', motif: '☯', label: 'Kinh Dịch', caption: '64 quẻ · Thượng hạ quái' },
  { path: '/mai-hoa', id: 'mai-hoa', family: 'Dịch học', motif: '梅', label: 'Mai Hoa Dịch Số', caption: 'Quẻ chủ · Thể–Dụng · Hỗ–Biến' },
  { path: '/luc-hao', id: 'luc-hao', family: 'Dịch học', motif: '爻', label: 'Lục Hào', caption: 'Sáu hào · Thế–Ứng · Nạp Giáp' },
  { path: '/ky-mon', id: 'ky-mon', family: 'Tam thức', motif: '九', label: 'Kỳ Môn Độn Giáp', caption: 'Cửu cung · Môn–Tinh–Thần' },
  { path: '/dai-luc-nham', id: 'luc-nham', family: 'Tam thức', motif: '壬', label: 'Đại Lục Nhâm', caption: 'Tứ Khóa · Tam Truyền' },
  { path: '/thai-at', id: 'thai-at', family: 'Tam thức', motif: '乙', label: 'Thái Ất Thần Số', caption: 'Tuế kế · Chủ–Khách' },
  { path: '/phong-thuy', id: 'phong-thuy', family: 'Không gian & Phương vị', motif: '坎', label: 'Phong thủy', caption: 'La kinh · 24 sơn · Tọa–Hướng' },
  { path: '/ngu-hanh', id: 'ngu-hanh', family: 'Nền tảng Đông phương', motif: '木', label: 'Ngũ hành', caption: 'Tương sinh · Tương khắc' },
  { path: '/calendar', id: 'lich-phap', family: 'Lịch pháp', motif: '◷', label: 'Lịch vạn niên', caption: 'Âm–Dương · Can Chi · Tiết khí' },
  { path: '/good-days', id: 'chon-ngay', family: 'Lịch pháp', motif: '✧', label: 'Xem ngày tốt', caption: 'Công việc · Lọc · Đối chiếu' },
  { path: '/ha-lac', id: 'ha-lac', family: 'Tượng số Đông phương', motif: '河', label: 'Hà Lạc', caption: 'Hà đồ · Lạc thư · Quy ước' },
  { path: '/thiet-ban', id: 'thiet-ban', family: 'Mệnh lý Đông phương', motif: '鐵', label: 'Thiết Bản', caption: 'Tra cứu · Phương pháp · Nguồn' },
  { path: '/western-astrology', id: 'western', family: 'Chiêm tinh phương Tây', motif: '☉', label: 'Chiêm tinh', caption: 'Natal · Góc hợp · Quan hệ' },
  { path: '/tarot', id: 'tarot', family: 'Biểu tượng phương Tây', motif: '✦', label: 'Tarot', caption: '78 lá · Trải bài · Nhật ký' },
  { path: '/numerology', id: 'numerology', family: 'Thần số học phương Tây', motif: '◇', label: 'Thần số học', caption: 'Pythagoras · Chỉ số · Chu kỳ' },
  { path: '/western-symbols', id: 'western-symbols', family: 'Biểu tượng phương Tây', motif: '✧', label: 'Kabbalah & Tarot đa hệ', caption: 'Biểu tượng · Nguồn · Đối chiếu' },
] as const;

export function getDisciplinePresentation(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  return disciplinePresentations.find(item => path === item.path || path.startsWith(item.path + '/'));
}
