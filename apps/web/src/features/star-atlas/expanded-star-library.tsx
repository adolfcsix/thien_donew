'use client';

import {useEffect, useMemo, useState} from 'react';
import symbols from '@thiendo/knowledge/src/star-symbols.json';
import identityRegistry from '@thiendo/knowledge/src/star-identity-registry.json';
import dossierCatalogue from '@thiendo/knowledge/src/star-dossiers.json';
import cycleStudy from '@thiendo/knowledge/src/star-cycle-study.json';
import criticalCatalogue from '@thiendo/knowledge/src/star-critical-readings.json';
import {normalizeSearchText} from '@/lib/navigation';
import styles from './expanded-star-library.module.css';

type DeepDossier = {
  interpretiveAxis: string;
  workedReading: string;
  crossCheckStars: string[];
  counterEvidence: string;
  practiceQuestion: string;
  boundary: string;
  editorialLevel?: 'guided-structure-not-independent-review';
};

type CriticalReading = {
  distinction:string; caseStudy:string; counterExample:string; inquiry:string;
  reviewStatus:'editorial-unreviewed';
};
const criticalReadings: Record<string, CriticalReading | undefined> = criticalCatalogue.records as Record<string,CriticalReading>;
const dossiers: Record<string, DeepDossier | undefined> = dossierCatalogue.profiles as Record<string, DeepDossier | undefined>;
const cycleEntries = cycleStudy.cycles.flatMap(cycle => cycle.orderedNames.map((name, index) => ({
  name, cycle: cycle.name, note: cycle.methodology, order: index + 1,
  previous: cycle.orderedNames[(index + 11) % 12],
  next: cycle.orderedNames[(index + 1) % 12],
})));
const cyclesByName = new Map(cycleEntries.map(item => [item.name, item]));
const entries = Object.entries(symbols.records).map(([name, profile]) => {
  const identity = identityRegistry.records.find(row =>
    row.name === name && (row.layer === 'natal' || row.layer === 'cycle')
  ) ?? null;
  return {name, profile, identity, dossier: dossiers[name], criticalReading: criticalReadings[name]};
}).sort((a, b) => a.name.localeCompare(b.name, 'vi'));

const groups = ['Tất cả', ...new Set(entries.map(row => row.profile.family))]
  .sort((a, b) => a === 'Tất cả' ? -1 : b === 'Tất cả' ? 1 : a.localeCompare(b, 'vi'));
const deepCount = entries.filter(row => row.dossier).length;
const guidedCount = entries.filter(row => row.dossier?.editorialLevel).length;
const bespokeCount = deepCount - guidedCount;

/** Editorial knowledge only: the star/branch placement engine is not touched here. */
export function ExpandedStarLibrary() {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('Tất cả');
  const [kind, setKind] = useState<'all'|'cycle'|'standalone'>('all');
  const [selected, setSelected] = useState('Lộc Tồn');
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('star');
    if (requested && entries.some(row => row.name === requested)) {
      setSelected(requested);
      document.getElementById('sao-phu-tinh')?.scrollIntoView({block:'start'});
    }
  }, []);

  const filtered = useMemo(() => entries.filter(row =>
    (family === 'Tất cả' || row.profile.family === family) &&
    (kind === 'all' || (kind === 'cycle') === cyclesByName.has(row.name)) &&
    (!normalizeSearchText(query) || normalizeSearchText([
      row.name, row.profile.family, row.profile.motif, row.profile.context,
      row.dossier?.interpretiveAxis ?? '', row.dossier?.workedReading ?? '',
      row.dossier?.crossCheckStars.join(' ') ?? '',
      row.criticalReading?.distinction ?? '', row.criticalReading?.caseStudy ?? '',
      row.criticalReading?.counterExample ?? '', row.criticalReading?.inquiry ?? ''
    ].join(' ')).includes(normalizeSearchText(query)))
  ), [family, query, kind]);
  const chosen = filtered.find(row => row.name === selected) ?? filtered[0] ?? null;
  const chosenDossier = chosen?.dossier;
  const chosenCritical = chosen?.criticalReading;
  const selectedCycle = chosen ? cyclesByName.get(chosen.name) : undefined;

  function goToRelatedStar(name: string) {
    if (!entries.some(row => row.name === name)) return;
    setQuery('');
    setFamily('Tất cả');
    setKind('all');
    setSelected(name);
    document.getElementById('sao-phu-tinh')?.scrollIntoView({block:'start', behavior:'smooth'});
  }

  return <section id="sao-phu-tinh" className={styles.shell} aria-label="Tra cứu sao phụ và vòng sao">
    <header className={styles.head}>
      <div>
        <span className="eyebrow">THIÊN ĐỒ · TỪ ĐIỂN SAO MỞ RỘNG</span>
        <h2 className="serif">Phụ tinh, sát tinh và ba vòng sao</h2>
        <p>Có {entries.length} hồ sơ sao: {bespokeCount} bài biên soạn riêng và {guidedCount} bài mở rộng theo khung học tập. Ba vòng sao được trình bày theo thứ tự 12 nhịp, có nút chuyển giữa các nhịp. 66 bài theo khung có thêm ghi chú phản biện biên soạn riêng: điểm phân biệt, ví dụ và phản ví dụ. Nội dung chưa được thẩm định chuyên gia và không phải phép an sao hay dự báo.</p>
      </div>
      <strong className={styles.count}>{entries.length} hồ sơ · {bespokeCount} riêng · {guidedCount} theo khung</strong>
    </header>
    <div className={styles.filters}>
      <label>Tìm tên sao hoặc nội dung<input type="search" placeholder="Kình Dương, Hồng Loan, Tràng Sinh…" value={query} onChange={e => setQuery(e.target.value)}/></label>
      <label>Nhóm sao<select value={family} onChange={e => setFamily(e.target.value)}>{groups.map(g => <option value={g} key={g}>{g}</option>)}</select></label>
      <label>Loại sao<select value={kind} onChange={e => setKind(e.target.value === 'cycle' ? 'cycle' : e.target.value === 'standalone' ? 'standalone' : 'all')}>
        <option value="all">Tất cả loại sao</option><option value="cycle">Sao trong ba vòng</option><option value="standalone">Các sao còn lại</option>
      </select></label>
    </div>
    <p className={styles.status} role="status">{filtered.length} / {entries.length} hồ sơ phù hợp · {bespokeCount} chuyên khảo riêng · {guidedCount} bài học theo khung</p>
    <div className={styles.content}>
      <div className={styles.list} aria-label="Danh sách sao">
        {filtered.map(row => <button type="button" key={row.name} aria-pressed={row.name === chosen?.name}
          onClick={() => setSelected(row.name)} className={row.name === chosen?.name ? styles.active : undefined}>
          <strong>{row.name}</strong><small>{row.profile.family}{cyclesByName.has(row.name) ? ' · Vòng 12 nhịp' : row.dossier?.editorialLevel ? ' · Bài học theo khung' : row.dossier ? ' · Chuyên khảo riêng' : ' · Nền tảng'}</small>
        </button>)}
        {!filtered.length && <p>Không có sao phù hợp. Thử bỏ bộ lọc hoặc thay đổi từ khóa.</p>}
      </div>
      {chosen ? <article className={styles.profile} aria-label={`Hồ sơ sao ${chosen.name}`}>
        <small>{chosen.profile.family} · {chosenDossier ? chosenDossier.editorialLevel ? 'Bài học có cấu trúc, chưa thẩm định' : 'Chuyên khảo biên soạn riêng' : 'Hồ sơ nền tảng'}</small>
        <h3 className="serif">{chosen.name}</h3>
        {selectedCycle && <section className={styles.cycleStudy} aria-label={`Vị trí ${chosen.name} trong ${selectedCycle.cycle}`}>
          <div className={styles.cycleHeader}><strong>{selectedCycle.cycle}</strong><span>Nhịp {selectedCycle.order} / 12</span></div>
          <p>{selectedCycle.note}</p>
          <div className={styles.cycleNavigation}>
            <button type="button" onClick={() => goToRelatedStar(selectedCycle.previous)} aria-label={`Nhịp trước: ${selectedCycle.previous}`}>← {selectedCycle.previous}</button>
            <strong aria-current="step">{selectedCycle.order}. {chosen.name}</strong>
            <button type="button" onClick={() => goToRelatedStar(selectedCycle.next)} aria-label={`Nhịp tiếp: ${selectedCycle.next}`}>{selectedCycle.next} →</button>
          </div>
          <small>Các nút mô tả thứ tự truyền thống trong vòng, không phải vị trí địa chi của lá số đang xem.</small>
        </section>}
        <h4>Hình tượng</h4><p>{chosen.profile.motif}</p>
        <h4>Đọc trong bối cảnh</h4><p>{chosen.profile.context}</p>
        {chosenDossier ? <section className={styles.deep} aria-label={`Chuyên khảo ${chosen.name}`}>
          <div className={styles.deepHead}><strong>{chosenDossier.editorialLevel ? 'HỌC THEO KHUNG' : 'ĐỌC SÂU'} · {chosen.name}</strong><span>Đã biên tập · chưa thẩm định chuyên gia</span></div>
          <h4>Trục phân tích</h4><p>{chosenDossier.interpretiveAxis}</p>
          <h4>Tình huống đọc cung minh họa</h4><p>{chosenDossier.workedReading}</p>
          <h4>Sao cần đối chiếu trên lá số thật</h4>
          <div className={styles.relatedStars}>{chosenDossier.crossCheckStars.map(name =>
            <button type="button" key={name} onClick={() => goToRelatedStar(name)} aria-label={`Đọc hồ sơ sao ${name}`}>{name} ↗</button>
          )}</div>
          <h4>Phản chứng và trường hợp không đủ điều kiện</h4><p>{chosenDossier.counterEvidence}</p>
          {chosenCritical && <section className={styles.cycleStudy} aria-label={`Đọc phản biện ${chosen.name}`}>
            <div className={styles.cycleHeader}><strong>GÓC ĐỌC PHẢN BIỆN</strong><span>Ghi chú riêng, chưa thẩm định</span></div>
            <h4>Điểm cần phân biệt</h4><p>{chosenCritical.distinction}</p>
            <h4>Tình huống học tập tại một cung</h4><p>{chosenCritical.caseStudy}</p>
            <h4>Ví dụ không đủ để chứng minh</h4><p>{chosenCritical.counterExample}</p>
            <h4>Câu hỏi tự kiểm tra</h4><p>{chosenCritical.inquiry}</p>
            <small>Không dùng ví dụ giả định làm dữ liệu lá số thực; hãy tra đúng vị trí sao tại phòng lập lá số.</small>
          </section>}
          <h4>Bài tập đọc lá số</h4><p>{chosenDossier.practiceQuestion}</p>
          <div className={styles.boundary}><strong>Không được suy ra</strong><p>{chosenDossier.boundary}</p></div>
        </section> : <div className={styles.limited}><strong>Hồ sơ hiện ở mức nền tảng</strong>
          <p>Chưa có chuyên khảo riêng về tình huống, phản chứng và bộ sao liên hệ. Không tự suy luận mở rộng từ nội dung tóm lược này.</p>
        </div>}
        <h4>Giới hạn diễn giải</h4><p>{chosen.profile.caution}</p>
        <div className={styles.note}>
          <strong>Trạng thái dữ liệu</strong>
          <p>{chosen.identity
            ? chosen.identity.layer === 'cycle'
              ? 'Có định danh trong lớp vòng sao; vị trí phụ thuộc vòng và quy tắc an của lá số.'
              : 'Có định danh trong lớp sao bản mệnh của engine; cần tra lá số thật để xác định cung tọa.'
            : 'Chưa đối chiếu được định danh an sao tương ứng. Không tự gán vị trí hoặc công thức.'}</p>
          <p>Nội dung nghiên cứu chưa được chuyên gia độc lập xác nhận. Xem sao đồng cung và các liên cung trước khi vận dụng.</p>
        </div>
      </article> : <p className={styles.status}>Chưa có hồ sơ để hiển thị với bộ lọc hiện tại.</p>}
    </div>
  </section>;
}
