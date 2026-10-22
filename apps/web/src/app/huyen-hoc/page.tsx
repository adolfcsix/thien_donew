'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {publicStudyText} from '@/lib/public-study-text';
import disciplines from '@thiendo/knowledge/src/research-disciplines.json';
import {
  exploreMeta, explorationFamilies, familyName, filterDisciplines, learningJourneys,
  type ExploreAvailability, type ExploreJourneyId, type FamilyId,
} from '@/features/explore/catalog';
import styles from './huyen-hoc.module.css';
import {navigationItems, navigationCategory} from '@/lib/navigation';

const quickToolDescriptions: Readonly<Record<string, string>> = {
  '/western-symbols': 'Atlas 10 Sephirot, 22 chữ Hebrew, đối chiếu Tarot RWS – Marseille – Thoth và lớp biểu tượng.',
  '/tarot': 'Thư viện RWS 78 lá, trải một hoặc ba lá, cho phép lá ngược và lưu hồ sơ.',
  '/western-astrology': 'Natal tropical/địa tâm/Whole Sign, vị trí thiên thể và góc hợp có bảng số liệu.',
  '/numerology': 'Tính chỉ số Pythagoras, biểu đồ và chu kỳ với phép tính rõ từng bước.',
  '/chart': 'Lập lá số và khảo sát 12 cung, các lớp sao và vận hạn.',
  '/bazi': 'Bốn trụ Can Chi, Tàng Can và quan hệ Ngũ hành.',
  '/iching': 'Tra quẻ và mô phỏng cấu trúc sáu hào.',
  '/mai-hoa': 'Thử khởi quẻ, xem Thể–Dụng và quẻ biến.',
  '/luc-hao': 'Nạp Giáp, Thế–Ứng, Lục Thân và quan hệ theo hào.',
  '/dai-luc-nham': 'Lập Thiên–Địa bàn, Tứ Khóa, Tam Truyền và an Thập Nhị Thiên Tướng theo quy ước. ',
  '/thai-at': 'Tích niên, cục số, chủ–khách, Thiên Mục, Địa Mục và bảng 72 cục Âm/Dương.',
  '/ky-mon': 'Khảo sát cách lập cục và bố trí bàn theo quy ước.',
  '/phong-thuy': 'Xem 24 sơn tọa – hướng và các công cụ nghiên cứu.',
  '/ngu-hanh': 'Tương tác với năm hành và quan hệ sinh – khắc.',
  '/calendar': 'Tra ngày âm – dương, Can Chi và tiết khí.',
  '/good-days': 'Đối chiếu các lớp lịch khi tra ngày.',
};

const existing = navigationItems.filter(item => Object.hasOwn(quickToolDescriptions, item.href)).map(item => ({
  href: item.href, name: item.text, symbol: item.symbol,
  desc: quickToolDescriptions[item.href], label: navigationCategory(item.href),
}));

export default function KnowledgeHub() {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<FamilyId>('all');
  const [availability, setAvailability] = useState<ExploreAvailability>('all');
  const [journey, setJourney] = useState<ExploreJourneyId>('newcomer');
  const [showAllTools, setShowAllTools] = useState(false);
  const records = useMemo(() => filterDisciplines(disciplines.records, { search: query, family, availability }), [query, family, availability]);
  const journeySelected = learningJourneys.find(item => item.id === journey) ?? learningJourneys[0];
  const resetFilters = () => { setQuery(''); setFamily('all'); setAvailability('all'); };
  const hasFilters = Boolean(query.trim()) || family !== 'all' || availability !== 'all';
  const toolRecords = disciplines.records.filter(item => Boolean(item.route));
  const studyRecords = disciplines.records.length - toolRecords.length;

  return <div className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroText}>
        <span className="eyebrow">THIÊN ĐỒ · TRUNG TÂM KHÁM PHÁ</span>
        <h1 className="serif">Một kho tri thức.<br /><em>Nhiều con đường để hiểu.</em></h1>
        <p>Chọn bộ môn, tìm công cụ hoặc bắt đầu theo lộ trình phù hợp.</p>
        <div className={styles.heroActions}><a href="#hanh-trinh" className={styles.primaryLink}>Chọn hành trình <span aria-hidden="true">↗</span></a><a href="#bo-mon" className={styles.secondaryLink}>Duyệt các bộ môn ↓</a></div>
      </div>
      <div className={styles.heroSigil} aria-hidden="true"><div className={styles.ringOuter}><div className={styles.ringMiddle}><span>天</span><small>ĐẠO · HỌC · HÀNH</small></div></div><span className={styles.ornamentTop}>乾 ☰ 坤</span><span className={styles.ornamentBottom}>TƯ DUY · KHẢO CỨU · THỰC HÀNH</span></div>
    </header>

    <section className={styles.overview} aria-label="Quy mô nội dung hiện có">
      <div><strong>{disciplines.records.length}</strong><span>Hồ sơ bộ môn</span></div>
      <div><strong>{toolRecords.length}</strong><span>Hồ sơ có đường dẫn công cụ</span></div>
      <div><strong>{studyRecords}</strong><span>Chuyên đề chưa có engine</span></div>
      <div><strong>{existing.length}</strong><span>Điểm truy cập công cụ</span></div>
    </section>

    <section className={styles.journeySection} id="hanh-trinh" aria-labelledby="journey-title">
      <div className={styles.sectionHeading}><div><span className="eyebrow">I / ĐỊNH HƯỚNG</span><h2 id="journey-title" className="serif">Bạn muốn bắt đầu như thế nào?</h2></div><p>Chọn mục tiêu để xem ba bước tiếp theo. Bạn luôn có thể chuyển hướng mà không phải tạo tài khoản.</p></div>
      <div className={styles.journeyTabs} role="group" aria-label="Mục tiêu khám phá">
        {learningJourneys.map(item => <button type="button" key={item.id} className={styles.journeyOption} data-active={journey === item.id} aria-pressed={journey === item.id} onClick={() => setJourney(item.id)}><span aria-hidden="true">{item.symbol}</span><strong>{item.label}</strong><small>{item.subtitle}</small></button>)}
      </div>
      <div className={styles.journeySteps} aria-live="polite"><div className={styles.journeyIntro}><span className="eyebrow">LỘ TRÌNH ĐỀ XUẤT</span><h3 className="serif">{journeySelected.label}</h3><p>{journeySelected.subtitle}</p></div><ol>{journeySelected.steps.map((step, index) => <li key={step.href}><span className={styles.stepNumber}>{String(index + 1).padStart(2,'0')}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div><Link href={step.href} aria-label={`Mở ${step.label}`}>Mở <span aria-hidden="true">↗</span></Link></li>)}</ol></div>
    </section>

    <section className={styles.disciplineSection} id="bo-mon" aria-labelledby="disciplines-title">
      <div className={styles.sectionHeading}><div><span className="eyebrow">II / BẢN ĐỒ TRI THỨC</span><h2 id="disciplines-title" className="serif">Khám phá theo bộ môn</h2></div><p>Tìm nhanh không dấu, lọc theo truyền thống và xem chính xác phạm vi đang có.</p></div>
      <div className={styles.searchArea}><label htmlFor="explore-search">Tìm chủ đề, khái niệm hoặc phương pháp<input id="explore-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ví dụ: luc hao, cửu cung, bát tự, 24 sơn..." autoComplete="off" /></label><label htmlFor="explore-availability">Phạm vi triển khai<select id="explore-availability" value={availability} onChange={event => setAvailability(event.target.value as ExploreAvailability)}><option value="all">Tất cả hồ sơ</option><option value="tools">Có công cụ để mở</option><option value="study">Chưa có engine</option></select></label></div>
      <div className={styles.familyList} role="group" aria-label="Lọc truyền thống và nhóm môn">
        {explorationFamilies.map(item => <button type="button" key={item.id} aria-pressed={family === item.id} className={styles.familyButton} data-active={family === item.id} onClick={() => setFamily(item.id)}><span aria-hidden="true">{item.symbol}</span>{item.name}</button>)}
      </div>
      <div className={styles.resultLine}><p role="status">Hiển thị <strong>{records.length}</strong> / {disciplines.records.length} hồ sơ.</p>{hasFilters && <button type="button" onClick={resetFilters}>Xóa bộ lọc ↺</button>}</div>
      {records.length > 0 ? <div className={styles.cardGrid}>
        {records.map(item => { const meta = exploreMeta[item.id]; return <article className={styles.domainCard} key={item.id}>
          <div className={styles.domainTop}><span className={styles.domainSymbol} aria-hidden="true">{meta.symbol}</span><span className={styles.domainAvailability} data-available={Boolean(item.route)}>{item.route ? 'Có công cụ' : 'Chỉ có hồ sơ học tập'}</span></div>
          <span className={styles.domainFamily}>{familyName(meta.family)}</span>
          <h3 className="serif">{item.name}</h3><p>{item.focus}</p>
          <div className={styles.startingPoint}><small>BẮT ĐẦU TỪ</small><span>{meta.startingPoint}</span></div>
          <details className={styles.domainDetails}><summary>Tìm hiểu thêm</summary><dl><dt>Hướng học</dt><dd>{item.studyWorkflow}</dd><dt>Thử đối chiếu</dt><dd>{item.practiceExercise}</dd><dt>Phạm vi áp dụng</dt><dd>{publicStudyText(item.boundary)}</dd></dl></details>
          <div className={styles.domainFooter}>{item.route ? <Link href={item.route}>Mở công cụ đang có <span aria-hidden="true">↗</span></Link> : <Link href="/research">Đọc hồ sơ nghiên cứu <span aria-hidden="true">↗</span></Link>}</div>
        </article>; })}
      </div> : <div className={styles.noResults}><span aria-hidden="true">⌕</span><h3>Không tìm thấy hồ sơ phù hợp</h3><p>Thử từ khóa khác hoặc xóa bộ lọc.</p><button type="button" onClick={resetFilters}>Xem lại tất cả bộ môn</button></div>}
    </section>

    <section className={styles.toolSection} aria-labelledby="tools-title"><div className={styles.sectionHeading}><div><span className="eyebrow">III / BÀN THỰC HÀNH</span><h2 className="serif" id="tools-title">Đi thẳng đến công cụ</h2></div><p>Truy cập nhanh các công cụ hiện có.</p></div><div className={styles.toolGrid}>{(showAllTools ? existing : existing.slice(0, 6)).map(item => <Link className={styles.toolCard} href={item.href} key={item.href}><span aria-hidden="true">{item.symbol}</span><div><small>{item.label}</small><strong>{item.name}</strong><p>{item.desc}</p></div><b aria-hidden="true">↗</b></Link>)}</div><button className={styles.showAll} type="button" aria-expanded={showAllTools} onClick={() => setShowAllTools(value => !value)}>{showAllTools ? 'Thu gọn công cụ ↑' : `Xem tất cả ${existing.length} công cụ ↓`}</button></section>

    <aside className={styles.footer}><span className="eyebrow">GIỚI HẠN VÀ TRÁCH NHIỆM</span><p>Thông tin huyền học mang tính tham khảo, không thay thế tư vấn y tế, pháp lý hoặc tài chính.</p><Link href="/research/schools">Xem quy trình thẩm định ↗</Link></aside>
  </div>;
}
