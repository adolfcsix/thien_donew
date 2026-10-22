/** LÀN MENU: đổi text/caption/keywords ở navigationItems bên dưới.
 * href là đường dẫn thật: đổi href cần tạo trang và cập nhật nhóm tương ứng.
 * Hướng dẫn từng bước: HUONG_DAN.md ở thư mục gốc.
 */
/** Một nguồn dữ liệu điều hướng cho sidebar, mobile và tìm nhanh. */
export type NavigationItem = {
  href: string;
  symbol: string;
  text: string;
  caption: string;
  keywords: string;
};

export const navigationItems: readonly NavigationItem[] = [
  { href: '/', symbol: '⌂', text: 'Tổng quan', caption: 'Trang chủ', keywords: 'trang chu bat dau huong dan' },
  { href: '/chart', symbol: '▦', text: 'Lập lá số', caption: 'Tử vi', keywords: 'tu vi an sao 12 cung dau so dai han tieu han' },
  { href: '/calendar', symbol: '◷', text: 'Lịch vạn niên', caption: 'Lịch', keywords: 'lich am duong tiet khi gio hoang dao' },
  { href: '/good-days', symbol: '✧', text: 'Xem ngày tốt', caption: 'Ngày tốt', keywords: 'cuoi hoi khai truong dong tho xuat hanh so sanh ngay' },
  { href: '/bazi', symbol: '☷', text: 'Bát Tự – Tứ Trụ', caption: 'Bát Tự', keywords: 'bat tu tu tru thap than tang can dai van can chi' },
  { href: '/huyen-giai', symbol: '✧', text: 'Thiên Đồ AI · Huyền Giải', caption: 'Gemini · Luận giải', keywords: 'gemini ai huyen giai hoi dap luan giai theo sao theo cung' },
  { href: '/huong-dan', symbol: '文', text: 'Hướng dẫn sử dụng', caption: '15 chuyên mục', keywords: 'huong dan hoc cach su dung tu vi mai hoa luc hao bat tu luan dan thanh toan' },
  { href: '/phap-ly', symbol: '§', text: 'Chính sách và pháp lý', caption: 'Điều khoản · dữ liệu', keywords: 'dieu khoan bao mat chinh sach ban quyen quyen rieng tu du lieu ca nhan' },
  { href: '/ho-tro', symbol: '✉', text: 'Trung tâm hỗ trợ', caption: 'Hỗ trợ · báo cáo', keywords: 'ho tro bao cao vi pham lien he' },
  { href: '/huyen-hoc', symbol: '◈', text: 'Trung tâm Khám phá', caption: 'Huyền học', keywords: 'trung tam kham pha huyen hoc nhieu bo mon kinh dich bat tu phong thuy mai hoa ky mon' },
  { href: '/iching', symbol: '☯', text: 'Kinh Dịch – 64 quẻ', caption: 'Kinh Dịch', keywords: 'kinh dich kinhdich 64 que bat quai gieo que 3 xu luc hao que bien hao dong' },
  { href: '/mai-hoa', symbol: '梅', text: 'Mai Hoa Dịch Số', caption: 'Tượng số', keywords: 'mai hoa dich so the dung ho que que bien hao dong' },
  { href: '/luc-hao', symbol: '爻', text: 'Lục Hào', caption: 'Sáu hào', keywords: 'luc hao gieo que nap giap the ung luc than nguyet kien' },
  { href: '/thai-at', symbol: '乙', text: 'Thái Ất Thần Số', caption: 'Tuế kế · Chủ Khách', keywords: 'thai at than so taiyi tuc nien cuc so chu khach tam nguyen ngu nguyen' },
  { href: '/dai-luc-nham', symbol: '壬', text: 'Đại Lục Nhâm', caption: 'Tứ Khóa · Tam Truyền', keywords: 'dai luc nham tu khoa tam truyen thien dia ban thap nhi thien tuong' },
  { href: '/ky-mon', symbol: '九', text: 'Kỳ Môn · Cửu cung', caption: 'Cửu cung · Chuyển bàn', keywords: 'ky mon don giap cuu cung lac thu tam ky luc nghi bat mon' },
  { href: '/phong-thuy', symbol: '坎', text: 'Phong thủy · La kinh', caption: '24 sơn', keywords: 'phong thuy la kinh 24 son toa huong compass' },
  { href: '/ngu-hanh', symbol: '木', text: 'Ngũ hành tương tác', caption: 'Ngũ hành', keywords: 'ngu hanh tuong sinh tuong khac moc hoa tho kim thuy sinh khac' },
  { href: '/star-atlas', symbol: '✶', text: 'Bảng tra 14 sao', caption: 'Miếu · Vượng', keywords: 'chinh tinh star atlas mieu vuong dac ham tu vi bang tra' },
  { href: '/ha-lac', symbol: '河', text: 'Hà Lạc lý số', caption: 'Hà đồ · Lạc thư', keywords: 'ha lac ha do lac thu tuong so' },
  { href: '/thiet-ban', symbol: '鐵', text: 'Thiết Bản Thần Số', caption: 'Phương pháp & Nguồn', keywords: 'thiet ban than so tra cuu' },
  { href: '/collection', symbol: '◫', text: 'Lá số của tôi', caption: 'Lưu trữ', keywords: 'tai khoan luu tru khoi phuc sao luu' },
  { href: '/numerology', symbol: '◇', text: 'Thần số học', caption: 'Pythagoras', keywords: 'than so hoc pythagoras duong doi bieu dat linh hon nhan cach nam ca nhan' },
  { href: '/tarot', symbol: '✦', text: 'Tarot · 78 lá', caption: 'Rider–Waite–Smith', keywords: 'tarot rider waite smith major minor arcana 78 la boi bai trai bai la nguoc' },
  { href: '/western-symbols', symbol: '✧', text: 'Kabbalah & Tarot đa hệ', caption: 'Biểu tượng phương Tây', keywords: 'kabbalah qabalah 10 sephirot 22 hebrew tarot marseille thoth golden dawn symbol so sanh' },
  { href: '/western-astrology', symbol: '☼', text: 'Chiêm tinh phương Tây', caption: 'Natal · Whole Sign', keywords: 'chiem tinh natal hoang dao hanh tinh transit synastry composite' },
  { href: '/research/development', symbol: '◈', text: 'Phạm vi chuyên môn', caption: 'Đông và Tây', keywords: 'lo trinh tarot rune kabbalah thiet ban ha lac luc nham thai at huyen khong dai quai' },
  { href: '/birth-profiles', symbol: '◎', text: 'Hồ sơ sinh', caption: 'Dùng chung', keywords: 'ho so sinh chung luu sinh nhat ngay gio noi sinh mui gio du lieu' },
  { href: '/study/compare', symbol: '⇄', text: 'So sánh nghiên cứu', caption: 'Đối chiếu', keywords: 'so sanh ket qua bo mon phuong phap ghi chu nhan' },
  { href: '/study', symbol: '✎', text: 'Thư phòng cá nhân', caption: 'Nhật ký', keywords: 'thu phong ca nhan ghi chu nghien cuu luu que sao luu tham so ghim' },
  { href: '/academy', symbol: '文', text: 'Học viện', caption: 'Học viện', keywords: 'hoc bai hoc co ban nhap mon' },
  { href: '/library', symbol: '◈', text: 'Từ điển thuật ngữ', caption: 'Tra cứu', keywords: 'tai lieu thuat ngu nguon quy tac' },
  { href: '/tinh-canh', symbol: '✺', text: 'Thập Bát Tinh Cảnh', caption: 'Tinh Văn · Danh Bảng', keywords: 'tinh van danh bang 18 canh gioi huy chuong rank diem hoc gia luan gia' },
  { href: '/books', symbol: '冊', text: 'Tàng Thư Các', caption: 'Thư viện sách', keywords: 'sach pdf epub tac gia tang thu cac thu vien doc sach' },
  { href: '/van-kho', symbol: '文', text: 'Văn Khố', caption: 'Tài liệu nghiên cứu', keywords: 'van kho tai lieu bai viet nghien cuu tac gia phan tich' },
  { href: '/research/star-audit', symbol: '審', text: 'Thẩm định sao', caption: 'Nguồn và dị bản', keywords: 'tham dinh sao tu vi 11 thieu 4 di danh thai phu phong cao quan sach tuong tinh van tinh tuan triet' },
  { href: '/research/star-system', symbol: '星', text: 'Ma trận hệ thống sao', caption: 'Chính · phụ · lưu tinh', keywords: 'ma tran he thong sao 104 14 chinh tinh 54 phu tinh 36 vong sao 12 luu tinh trang sinh tuan triet' },
  { href: '/research', symbol: '☰', text: 'Bách khoa huyền học', caption: 'Danh mục sao', keywords: '121 sao danh muc sao phu tinh huyền học mai hoa ky mon luc nham ha lac kinh dich thai at' },
];

/** Phân cấp sidebar: tất cả công cụ vẫn có trong navigationItems và tìm kiếm. */
export type NavigationGroup = {
  id: string;
  label: string;
  symbol: string;
  description: string;
  items: readonly NavigationItem[];
};

const navigationByHref = new Map(navigationItems.map(item => [item.href, item]));

function navigationLink(href: string): NavigationItem {
  const item = navigationByHref.get(href);
  if (!item) throw new Error(`Missing navigation route: ${href}`);
  return item;
}

export const navigationShortcuts: readonly NavigationItem[] =
  ['/', '/huyen-hoc', '/huyen-giai', '/study', '/birth-profiles', '/collection'].map(navigationLink);

export const navigationGroups: readonly NavigationGroup[] = [
  { id: 'menh-ly', label: 'Mệnh lý & Tử Vi', symbol: '命', description: 'Các bộ môn luận mệnh và hệ sao',
    items: ['/chart', '/bazi', '/thiet-ban', '/star-atlas', '/research/star-system'].map(navigationLink) },
  { id: 'dich-hoc', label: 'Dịch học & Tượng số', symbol: '☯', description: 'Kinh Dịch, quẻ và Ngũ hành',
    items: ['/iching', '/mai-hoa', '/luc-hao', '/ha-lac', '/ngu-hanh'].map(navigationLink) },
  { id: 'ky-mon-phong-thuy', label: 'Kỳ Môn & Phong thủy', symbol: '九', description: 'Kỳ bàn và không gian sống',
    items: ['/ky-mon', '/dai-luc-nham', '/thai-at', '/phong-thuy'].map(navigationLink) },
  { id: 'lich-phap', label: 'Lịch pháp & Ngày', symbol: '◷', description: 'Lịch vạn niên và chọn ngày',
    items: ['/calendar', '/good-days'].map(navigationLink) },
  { id: 'tay-phuong', label: 'Phương Tây & Biểu tượng', symbol: '✧', description: 'Các hệ quy ước độc lập', items: ['/numerology', '/western-astrology', '/tarot', '/western-symbols', '/research/development'].map(navigationLink) },
  { id: 'hoc-tap', label: 'Khám phá & Học tập', symbol: '文', description: 'Bộ môn, học viện, thư viện',
    items: ['/academy', '/library', '/books', '/van-kho', '/tinh-canh', '/research', '/research/star-audit', '/study/compare'].map(navigationLink) },
  { id: 'huong-dan-ho-tro', label: 'Hướng dẫn & Hỗ trợ', symbol: '文', description: 'Tài liệu hướng dẫn, pháp lý và liên hệ',
    items: ['/huong-dan', '/phap-ly', '/ho-tro'].map(navigationLink) },
];

/** Chuẩn hóa URL để cả liên kết trực tiếp và các trang con giữ đúng nhánh điều hướng. */
function navigationPath(href: string): string {
  const path = href.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  return path || '/';
}

/** Chỉ khớp ranh giới segment, tránh nhầm /research với /researcher. */
export function findNavigationParent(href: string): NavigationItem | undefined {
  const path = navigationPath(href);
  return navigationItems
    .filter(item => item.href === path || (item.href !== '/' && path.startsWith(item.href + '/')))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Trang con thuộc nhóm của trang gốc, kể cả khi không có liên kết riêng trên sidebar. */
export function findNavigationGroup(href: string): NavigationGroup | undefined {
  const parent = findNavigationParent(href);
  return parent ? navigationGroups.find(group => group.items.some(item => item.href === parent.href)) : undefined;
}

export function navigationCategory(href: string): string {
  const parent = findNavigationParent(href);
  return findNavigationGroup(href)?.label ?? (parent && navigationShortcuts.some(item => item.href === parent.href) ? 'Truy cập nhanh' : 'Công cụ');
}

/** Tiêu đề của các trang chuyên mục con có thật, không hiển thị nhầm tên thương hiệu. */
export function navigationPageTitle(href: string): string {
  const path = navigationPath(href);
  const subpages: Record<string, string> = {
    '/forum': 'Thiên Đồ Luận Đàn',
    '/articles': 'Thiên Đồ Tạp Chí',
    '/membership': 'Thành viên & Pro',
    '/consultation': 'Tư vấn riêng',
    '/pro/research': 'Báo cáo nghiên cứu',
    '/research/examples': 'Ví dụ thực hành',
    '/research/schools': 'Thẩm định trường phái',
  };
  if (subpages[path]) return subpages[path];
  if (path.startsWith('/academy/')) return 'Bài học';
  return findNavigationParent(path)?.text ?? 'Thiên Đồ';
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

export function searchNavigation(query: string): NavigationItem[] {
  const normalized = normalizeSearchText(query);
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (!parts.length) return [...navigationItems];
  const ranked = navigationItems.map((item, index) => {
    const title = normalizeSearchText(item.text);
    const caption = normalizeSearchText(item.caption);
    const keywords = normalizeSearchText(item.keywords);
    const group = normalizeSearchText(findNavigationGroup(item.href)?.label || '');
    const haystack = `${title} ${caption} ${keywords} ${group}`;
    if (!parts.every(part => haystack.includes(part))) return null;
    // Prefer an actual tool name over a cross-category keyword match.
    const score = title === normalized ? 0
      : title.startsWith(normalized) ? 1
      : title.includes(normalized) ? 2
      : caption === normalized ? 3
      : caption.includes(normalized) ? 4
      : group === normalized ? 5
      : group.includes(normalized) ? 6
      : keywords.includes(normalized) ? 7 : 8;
    return { item, score, index };
  }).filter((result): result is { item: NavigationItem; score: number; index: number } => result !== null);
  return ranked.sort((a, b) => a.score - b.score || a.index - b.index).map(result => result.item);
}
