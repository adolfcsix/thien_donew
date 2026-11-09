'use client';

import {useMemo, useState} from 'react';
import type {AstrologyResult} from '@thiendo/shared-types';
import {auditClassicalPatternCandidates} from '@thiendo/interpretation/src/classical-pattern-research.cjs';
import styles from './conditional-pattern-evidence.module.css';

const stateText={
  'structural-match':'Khớp điều kiện vị trí',
  'not-met':'Chưa khớp điều kiện',
  'needs-review':'Cần thẩm định thêm'
} as const;
const checkText={met:'Đã quan sát', 'not-met':'Chưa đáp ứng',unknown:'Chưa thể xác minh'} as const;
type Filter='relevant'|'all';

/**
 * Research-only extension of the existing conditional evidence workbench.
 * Shown only for Menh in expert view; does not add a redundant navigation tab.
 */
export function ClassicalPatternResearch({chart}:{chart:AstrologyResult}){
  const data=useMemo(()=>auditClassicalPatternCandidates(chart),[chart]);
  const [filter,setFilter]=useState<Filter>('relevant');
  const visible=data.records.filter(record=>filter==='all'||record.status!=='not-met');
  return <article className={'palace-reading-editorial '+styles.panel} aria-label="Đối chiếu cách cục cổ điển có nguồn">
    <div className={styles.head}>
      <div>
        <h4>Đối chiếu cách cục cổ điển</h4>
        <p className="palace-reading-scope">Đã ánh xạ {data.assessed}/{data.referenceTotal} chỉ mục tham khảo · {data.matched} khớp cấu trúc · {data.needsReview} cần thẩm định.</p>
      </div>
      <div className={styles.filters} role="group" aria-label="Lọc đối chiếu cách cục">
        <button type="button" aria-pressed={filter==='relevant'} onClick={()=>setFilter('relevant')}>Liên quan</button>
        <button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Tất cả</button>
      </div>
    </div>
    <p>Tham khảo phương pháp kiểm tra điều kiện từ bộ định phú và định quý. Bản này chỉ so sánh sao bản mệnh, không tự xác nhận thành cách hay đưa ra dự báo.</p>
    {visible.length===0&&<p>Chưa có mẫu nào khớp hoặc cần xem lại. Chọn “Tất cả” để thấy từng điều kiện chưa đạt.</p>}
    {visible.map(record=><details key={record.id} className={'palace-reading-symbol '+styles.record}>
      <summary><strong>{record.title}</strong><span>{record.group} · {stateText[record.status]}</span></summary>
      <p>{record.interpretation}</p>
      <ul className={styles.checks}>{record.checks.map((condition,i)=><li key={record.id+'-'+i} data-met={condition.state==='met'}>
        <strong>{checkText[condition.state]}:</strong> {condition.label}. <span>{condition.detail}</span>
      </li>)}</ul>
      <p><strong>Tư liệu:</strong> {record.reference}. <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">Xem quy tắc đối chiếu</a>.</p>
      {record.status==='needs-review'&&<p className="palace-reading-review">{record.extra}</p>}
      <small>{record.caution}</small>
    </details>)}
    <small>{data.notice} Bộ này chưa được chuyên gia độc lập thẩm định. Các nhóm định bần và định tạp chưa được kích hoạt; riêng định tạp thuộc nghiên cứu vận hạn, không gộp nhầm vào bản mệnh.</small>
  </article>;
}
