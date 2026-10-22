/** V11.83 · Presentation taxonomy only; the knowledge registry owns domain records.
 * This layer never claims a discipline's engine is complete or expert-reviewed.
 */
import { normalizeSearchText } from '@/lib/navigation';

export const explorationFamilies = [
  { id: 'all', name: 'Tất cả', symbol: '◈' },
  { id: 'menh-ly', name: 'Mệnh lý', symbol: '命' },
  { id: 'dich-hoc', name: 'Dịch học', symbol: '☯' },
  { id: 'lich-phap', name: 'Lịch pháp', symbol: '曆' },
  { id: 'ky-mon', name: 'Tam thức', symbol: '九' },
  { id: 'phong-thuy', name: 'Phong thủy', symbol: '坎' },
  { id: 'tay-phuong', name: 'Phương Tây', symbol: '✧' },
] as const;
export type FamilyId = (typeof explorationFamilies)[number]['id'];
export type ExploreAvailability = 'all' | 'tools' | 'study';
export type ExploreJourneyId = 'newcomer' | 'practice' | 'research';

export type ResearchDiscipline = Readonly<{
  id: string; name: string; focus: string; studyWorkflow: string;
  practiceExercise: string; boundary: string; route: string | null;
  implementation: string; reviewStatus: string;
}>;

export type ExploreMeta = Readonly<{
  family: Exclude<FamilyId, 'all'>;
  symbol: string;
  searchAliases: string;
  startingPoint: string;
}>;

/** Exactly one presentation mapping per research-discipline ID. No duplicate shadow catalogue. */
export const exploreMeta: Readonly<Record<string, ExploreMeta>> = {
  'tu-vi': { family: 'menh-ly', symbol: '紫', searchAliases: 'tu vi dau so laso 12 cung an sao', startingPoint: 'Đọc 12 cung và phân biệt chính tinh – phụ tinh.' },
  'bat-tu': { family: 'menh-ly', symbol: '☷', searchAliases: 'bat tu tu tru ngũ hành thập thần', startingPoint: 'Tách Nhật chủ, thiên can, địa chi và tiết khí.' },
  'lich-phap': { family: 'lich-phap', symbol: '曆', searchAliases: 'lich am duong can chi tiet khi', startingPoint: 'Đối chiếu ngày âm, múi giờ và ranh giới tiết khí.' },
  'kinh-dich': { family: 'dich-hoc', symbol: '䷀', searchAliases: 'kinh dich 64 que gieo que bat quai', startingPoint: 'Nhận biết bát quái, sáu hào và quẻ biến.' },
  'mai-hoa': { family: 'dich-hoc', symbol: '梅', searchAliases: 'mai hoa dich so the dung tuong so', startingPoint: 'Thử một phép khởi quẻ và đọc vết tính.' },
  'luc-hao': { family: 'dich-hoc', symbol: '爻', searchAliases: 'luc hao nap giap the ung dung than', startingPoint: 'Nắm hào động, Bát Cung, Thế–Ứng rồi so Nhật/Nguyệt.' },
  'ha-lac': { family: 'dich-hoc', symbol: '河', searchAliases: 'ha lac ly so ha do lac thu thien so dia so nguyen duong', startingPoint: 'Lập Thiên số – Địa số và đối chứng quẻ với nguồn.' },
  'thiet-ban': { family: 'menh-ly', symbol: '鐵', searchAliases: 'thiet ban than so dieu van khao khac', startingPoint: 'Đọc các dị bản, chia giờ và kiểm số điều theo thư tịch.' },
  'ky-mon': { family: 'ky-mon', symbol: '九', searchAliases: 'ky mon don giap cuu cung chuyen ban phi ban', startingPoint: 'Nhận biết chín cung, địa bàn và quy ước khởi cục.' },
  'thai-at': { family: 'ky-mon', symbol: '乙', searchAliases: 'thai at than so tam thuc', startingPoint: 'Khởi đầu Tuế kế và bảng 72 cục Âm/Dương theo truyền bản xác định.' },
  'luc-nham': { family: 'ky-mon', symbol: '壬', searchAliases: 'dai luc nham tu khoa tam truyen', startingPoint: 'Phân biệt Tứ khóa, Tam truyền và địa–thiên bàn.' },
  'numerology': { family: 'tay-phuong', symbol: '✦', searchAliases: 'than so hoc than so so chu dao pythagoras nang cao truong thanh so thieu thang ca nhan', startingPoint: 'Thử Pythagoras, xem phép tính và đối chiếu quy ước.' },
  'tarot': { family: 'tay-phuong', symbol: '✦', searchAliases: 'tarot rws rider waite smith 78 la major minor arcana trai bai marseille thoth kabbalah qabalah hebrew 22 sephirot', startingPoint: 'Tra cứu 78 lá và thực hành suy ngẫm với trải một hoặc ba lá.' },
  'astrology-western': { family: 'tay-phuong', symbol: '☼', searchAliases: 'chiem tinh phuong tay ban do sao hoang dao', startingPoint: 'Phân biệt vị trí thiên văn và diễn giải biểu tượng.' },
  'phong-thuy': { family: 'phong-thuy', symbol: '坎', searchAliases: 'phong thuy la kinh 24 son bat trach phi tinh', startingPoint: 'Xác định hướng, tọa và cách dùng la kinh.' },
};

export function familyName(id: FamilyId): string {
  return explorationFamilies.find(family => family.id === id)?.name ?? 'Khác';
}

export function filterDisciplines<T extends ResearchDiscipline>(
  records: readonly T[],
  { search = '', family = 'all', availability = 'all' }: { search?: string; family?: FamilyId; availability?: ExploreAvailability },
): T[] {
  const terms = normalizeSearchText(search).split(/\s+/).filter(Boolean);
  return records.filter(item => {
    const extra = exploreMeta[item.id];
    if (!extra) return false;
    if (family !== 'all' && extra.family !== family) return false;
    if (availability === 'tools' && !item.route) return false;
    if (availability === 'study' && item.route) return false;
    if (!terms.length) return true;
    const source = normalizeSearchText([item.name, item.focus, item.studyWorkflow, item.practiceExercise,
      extra.searchAliases, familyName(extra.family), extra.startingPoint].join(' '));
    // Whole-token prefix matching avoids false positives across unrelated words
    // (e.g. "trích lục" + "khảo" previously matched the query "Lục Hào").
    const words = source.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    return terms.every(term => words.some(word => word.startsWith(term)));
  });
}

export function validateExploreCatalogue(records: readonly ResearchDiscipline[]): string[] {
  const errors: string[] = [];
  const ids = records.map(item => item.id);
  const seen = new Set<string>();
  for (const item of records) {
    if (seen.has(item.id)) errors.push(`Duplicate ID: ${item.id}`);
    seen.add(item.id);
    if (!exploreMeta[item.id]) errors.push(`Missing presentation metadata: ${item.id}`);
    if (item.route && !item.route.startsWith('/')) errors.push(`Invalid route: ${item.id}`);
    if (!item.studyWorkflow || !item.boundary) errors.push(`Missing learning boundary: ${item.id}`);
  }
  for (const id of Object.keys(exploreMeta)) if (!ids.includes(id)) errors.push(`Orphan presentation metadata: ${id}`);
  return errors;
}

/** Journeys link to real routes, never to unimplemented calculators. */
export const learningJourneys: readonly {
  id: ExploreJourneyId; label: string; subtitle: string; symbol: string;
  steps: readonly { label: string; href: string; detail: string }[];
}[] = [
  { id: 'newcomer', label: 'Tôi mới bắt đầu', subtitle: 'Hiểu thuật ngữ trước khi thử các phép tính.', symbol: '文',
    steps: [
      { label: 'Học bài nhập môn', href: '/academy', detail: 'Địa bàn, Can Chi, sao và 12 cung' },
      { label: 'Tra thuật ngữ', href: '/library', detail: 'Tìm khái niệm chưa rõ' },
      { label: 'Thử Ngũ hành', href: '/ngu-hanh', detail: 'Quan sát sinh – khắc với dữ liệu mẫu' },
    ] },
  { id: 'practice', label: 'Tôi muốn thực hành', subtitle: 'Mở công cụ có thật, xem từng bước và ghi nhận giới hạn.', symbol: '☯',
    steps: [
      { label: 'Khởi quẻ Mai Hoa', href: '/mai-hoa', detail: 'Xem quẻ chủ, hỗ và quẻ biến' },
      { label: 'Đối chiếu Lục Hào', href: '/luc-hao', detail: 'Theo dõi Thế–Ứng, Lục Thân' },
      { label: 'Khám phá Kỳ Môn', href: '/ky-mon', detail: 'Kiểm cách an bàn và dữ liệu đầu vào' },
    ] },
  { id: 'research', label: 'Tôi muốn nghiên cứu', subtitle: 'Đọc phương pháp, dị bản và những gì chưa được kiểm chứng.', symbol: '卷',
    steps: [
      { label: 'Bách khoa huyền học', href: '/research', detail: 'Danh mục sao và chuyên đề' },
      { label: 'Ví dụ thực hành', href: '/research/examples', detail: 'Đối chiếu các tình huống mẫu' },
      { label: 'Thẩm định trường phái', href: '/research/schools', detail: 'Tách chứng cứ khỏi diễn giải' },
    ] },
] as const;
