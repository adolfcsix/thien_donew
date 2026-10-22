'use client';

import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import type {AstrologyHouse} from '@thiendo/shared-types';
import starDossiers from '@thiendo/knowledge/src/star-dossiers.json';
import criticalReadings from '@thiendo/knowledge/src/star-critical-readings.json';
import {StarFourCourtEvidence} from './star-four-court-evidence';
import starGuide from '@thiendo/knowledge/src/star-study-guide.json';
import primaryGuidance from '@thiendo/knowledge/src/primary-star-palace-guidance.json';
import {locateNatalStar, natalStarNames} from '../lib/palace-star-context';
import {starTone, toneLabels} from '../lib/star-visuals';

type Props = {house: AstrologyHouse; houses: readonly AstrologyHouse[]};
type Dossier = {interpretiveAxis?: string; workedReading?: string; counterEvidence?: string;
  practiceQuestion?: string; crossCheckStars?: string[]; boundary?: string};
type Guidance = {focus?: string; interpretation?: string; potential?: string};
type Guide = {motif?: string; study?: string; caution?: string; crossCheck?: string};
type Critical = {distinction:string;caseStudy:string;counterExample:string;inquiry:string};
const dossiers = starDossiers.profiles as Record<string,Dossier>;
const criticalNotes = criticalReadings.records as Record<string,Critical>;
const starGuides = starGuide.stars as Record<string,Guide>;
const primaryRecords = primaryGuidance.records as Record<string,Record<string,Guidance>>;

/** Inline study card makes the already-available editorial depth discoverable.
 * All chart-specific claims are deduced from existing calculated placements. */
export function StarContextExplorer({house,houses}:Props) {
  const names = useMemo(() => natalStarNames(house), [house]);
  const [query,setQuery]=useState('');
  const [selected,setSelected] = useState<string>(() => names[0] ?? '');
  useEffect(() => {setSelected(names[0] ?? '');setQuery('');}, [house.branchIndex]);
  const chosen = names.includes(selected) ? selected : (names[0] ?? '');
  const dossier = dossiers[chosen];
  const guide = starGuides[chosen];
  const critical = criticalNotes[chosen];
  const context = primaryRecords[chosen]?.[house.palace];
  const status = house.mainStarStrengths?.find(item => item.name === chosen);
  const references = dossier?.crossCheckStars ?? [];
  const related = references.flatMap(name => locateNatalStar(houses,name,house.branchIndex));
  const hasEditorial = Boolean(dossier || guide || context || critical);
  const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLocaleLowerCase('vi');
  const shown=names.filter(name=>fold(name).includes(fold(query.trim())));
  const colocation = names.filter(name => name !== chosen);
  return <section className="star-context-explorer" aria-label={`Tra cứu sao trong cung ${house.palace}`}>
    <div className="star-context-heading">
      <div><span className="eyebrow">HỒ SƠ SAO / THEO NGỮ CẢNH LÁ SỐ</span>
        <h3 className="serif">Đọc từng sao tại cung {house.palace}</h3>
        <p>Chọn một sao đã an để đọc nghĩa, điều kiện và các vị trí cần đối chiếu. Không tự thêm sao hoặc dự đoán kết quả.</p>
      </div><span className="star-context-count">{names.length} tên sao / gồm 3 vòng</span>
    </div>
    <label className="star-context-search">Tìm sao trong cung<input type="search" maxLength={70} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên sao có dấu hoặc không dấu…"/></label>
    <div className="star-context-layout">
      <div className="star-context-picker" role="group" aria-label="Chọn sao đang hiện diện">
        {shown.map(name => {
          const layer = house.cycleStars.thaiTue.includes(name) || house.cycleStars.bacSi.includes(name) || house.cycleStars.trangSinh.includes(name) ? 'cycle' : 'natal';
          const tone = starTone(name,layer);
          return <button type="button" key={name} className={`star-context-chip atlas-star-kind-${tone}`}
            aria-pressed={chosen === name} onClick={() => setSelected(name)} title={`${name} — ${toneLabels[tone]}`}>
            {name}{house.mainStarStrengths?.find(item => item.name === name)?.status ? <small>{house.mainStarStrengths?.find(item => item.name === name)?.status?.replace('D','Đ')}</small> : null}
          </button>;
        })}
        {!shown.length&&<p role="status">Không tìm thấy sao khớp tên trong cung này. Hãy đổi từ khóa hoặc chọn cung khác.</p>}
      </div>
      <article className="star-context-profile" aria-live="polite">
        {chosen ? <>
          <div className="star-context-profile-heading"><div><span className="eyebrow">SAO ĐANG XÉT · {house.stem} {house.branch}</span><h4>{chosen}</h4></div>
            <Link href={`/star-atlas?star=${encodeURIComponent(chosen)}&branch=${house.branchIndex}&palace=${encodeURIComponent(house.palace)}`}>Thư viện sao ↗</Link></div>
          {status && <p className="star-context-strength"><strong>Trạng thái theo bảng engine:</strong> {status.label} ({status.status === 'D' ? 'Đ' : status.status}). Không dùng một mình để kết luận cát/hung.</p>}
          <StarFourCourtEvidence houses={houses} branchIndex={house.branchIndex} star={chosen}/>
          {context && <div className="star-context-evidence"><b>Đọc tại cung {house.palace}</b>{context.focus&&<p><strong>Trọng tâm quan sát:</strong> {context.focus}</p>}<p>{context.interpretation}</p>{context.potential&&<p><strong>Khả năng cần đối chiếu:</strong> {context.potential}</p>}</div>}
          {guide?.motif && <div className="star-context-evidence"><b>Hình tượng truyền thống</b><p>{guide.motif}. {guide.study}</p></div>}
          {dossier?.interpretiveAxis && <div className="star-context-evidence"><b>Trục phân tích</b><p>{dossier.interpretiveAxis}</p></div>}
          {dossier?.workedReading && <details className="star-context-expand"><summary>Ví dụ cách lập luận và kiểm chứng</summary><p>{dossier.workedReading}</p></details>}
          {colocation.length > 0 && <div className="star-context-evidence"><b>Các sao tọa cùng cung (trích engine)</b><p>{colocation.join(' · ')}</p></div>}
          {references.length > 0 && <div className="star-context-evidence"><b>Đối chiếu các sao liên quan</b>
            {related.length ? <ul>{related.map((ref,i) => <li key={`${ref.name}-${ref.branchIndex}-${i}`}><strong>{ref.name}</strong> · {ref.palace} ({ref.branch}) · {ref.relation}</li>)}</ul> : <p>Chưa tìm thấy các sao đối chiếu này trong những lớp bản mệnh/vòng sao được an.</p>}
            {dossier?.counterEvidence && <p className="star-context-caution">Kiểm tra phản chứng: {dossier.counterEvidence}</p>}
          </div>}
          {guide?.crossCheck && <p className="star-context-caution"><strong>Nên xét thêm:</strong> {guide.crossCheck}</p>}
          {dossier?.practiceQuestion && <p className="star-context-caution"><strong>Câu hỏi đối chiếu:</strong> {dossier.practiceQuestion}</p>}
          {guide?.caution && <p className="star-context-caution">{guide.caution}</p>}
          {critical && <details className="star-context-expand star-context-critical">
            <summary>Đọc phản biện chuyên sâu · điều kiện và phản ví dụ</summary>
            <div className="star-context-evidence"><b>Phân biệt khái niệm</b><p>{critical.distinction}</p></div>
            <div className="star-context-evidence"><b>Tình huống nghiên cứu</b><p>{critical.caseStudy}</p></div>
            <div className="star-context-evidence"><b>Phản ví dụ</b><p>{critical.counterExample}</p></div>
            <div className="star-context-evidence"><b>Câu hỏi cần kiểm chứng</b><p>{critical.inquiry}</p></div>
          </details>}
          {dossier?.boundary && <small className="star-context-boundary">{dossier.boundary}</small>}
          {!hasEditorial && <p className="star-context-empty">Hiện có vị trí sao trên lá số nhưng chưa có chuyên khảo riêng đã biên tập. Không tự sinh luận giải để lấp khoảng trống dữ liệu.</p>}
        </> : <p>Chưa có sao tại cung được chọn.</p>}
      </article>
    </div>
    <p className="star-context-footnote">Sao lưu năm xem và Tứ Hóa được đối chiếu tại phần vận hạn riêng; màu là phân nhóm đọc nhanh, không phải kết luận sao tốt/xấu. Chuyên khảo là tài liệu nghiên cứu văn hóa, chưa được thẩm định độc lập.</p>
  </section>;
}
