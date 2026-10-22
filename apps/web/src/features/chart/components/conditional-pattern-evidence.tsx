'use client';

import {useState} from 'react';
import type {ConditionalPatternEvidence} from '@thiendo/interpretation';
import styles from './conditional-pattern-evidence.module.css';

const labels={matched:'Đủ điều kiện vị trí',partial:'Khớp một phần',unmet:'Chưa khớp', 'needs-review':'Cần kiểm tra dữ liệu'} as const;
type Filter='relevant'|'matched'|'all';

/** Distinguishes observed natal predicates from undecidable/absent conditions. */
export function ConditionalPatternEvidencePanel({data}:{data:ConditionalPatternEvidence}){
  const [filter,setFilter]=useState<Filter>('relevant');
  const visible=data.records.filter(item=>filter==='all'||(filter==='matched'?item.status==='matched':item.status!=='unmet'));
  return <article className={`palace-reading-editorial ${styles.panel}`} aria-label="Kiểm chứng điều kiện các tổ hợp sao">
    <div className={styles.head}>
      <div><h4>Bộ kiểm chứng tổ hợp sao</h4><p className="palace-reading-scope">{data.assessed} mẫu đang hỗ trợ: {data.matched} đạt điều kiện vị trí, {data.partial} một phần, {data.needsReview} cần xem dữ liệu.</p></div>
      <div className={styles.filters} role="group" aria-label="Lọc kết quả đối chiếu">
        <button type="button" aria-pressed={filter==='relevant'} onClick={()=>setFilter('relevant')}>Liên quan</button>
        <button type="button" aria-pressed={filter==='matched'} onClick={()=>setFilter('matched')}>Đã khớp</button>
        <button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Tất cả</button>
      </div>
    </div>
    {visible.length===0&&<p>Chưa có điều kiện nào khớp trong bộ lọc này. Chọn “Tất cả” để xem nguyên nhân từng mẫu chưa khớp; đây không phải kết luận lá số không có cách cục.</p>}
    {visible.map(item=><details key={item.id} className={`palace-reading-symbol ${styles.record}`}>
      <summary><strong>{item.title}</strong><span>{item.scope} · {labels[item.status]}</span></summary>
      <p><strong>Điều kiện sao:</strong> {item.required.join(' · ')}</p>
      <ul className={styles.checks}>{item.conditions.map((check,i)=><li key={i} data-met={check.met}>{check.met?'✓':'–'} {check.label}</li>)}</ul>
      {item.observed.length>0&&<><p><strong>Chứng cứ từ lá số:</strong></p>
        <ul className="palace-reading-evidence">{item.observed.map(place=><li key={`${place.star}-${place.branchIndex}`}>
          <strong>{place.star}</strong> · {place.palace} ({place.branch}), {place.relation}
          {place.strength?` · ${place.strength}`:''}.
          {place.mainStars.length>0&&<span> Chính tinh ở cung: {place.mainStars.join(', ')}.</span>}
          {place.obstructions.length>0&&<span> Án ngữ: {place.obstructions.join(' · ')}.</span>}
        </li>)}</ul></>}
      {item.excluded.length>0&&<div className="palace-reading-review"><strong>Điều kiện chưa được tính</strong>
        <ul>{item.excluded.map((x,i)=><li key={`${x.star}-${x.reason}-${i}`}><b>{x.star}:</b> {x.detail}{x.positions.length>0?` (chi số ${x.positions.join(', ')})`:''}</li>)}</ul>
      </div>}
      {item.status==='matched'&&<p><strong>Hướng đọc của quy tắc:</strong> {item.interpretation}</p>}
      <small>{item.caution}</small>
    </details>)}
    <small>{data.notice}</small>
  </article>;
}
