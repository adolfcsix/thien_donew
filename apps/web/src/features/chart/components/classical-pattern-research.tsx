'use client';

import {useMemo, useState} from 'react';
import type {AstrologyResult} from '@thiendo/shared-types';
import {auditClassicalPatternCandidates} from '@thiendo/interpretation/src/classical-pattern-research.cjs';
import {summarizeClassicalCatalog,filterClassicalCatalog} from '@thiendo/interpretation/src/classical-pattern-catalog.cjs';
import type {ClassicalCatalogFilterStatus} from '@thiendo/interpretation/src/classical-pattern-catalog.cjs';
import styles from './conditional-pattern-evidence.module.css';

const stateText={
  'structural-match':'Khớp điều kiện vị trí',
  'not-met':'Chưa khớp điều kiện',
  'needs-review':'Cần thẩm định thêm'
} as const;
const checkText={met:'Đã quan sát', 'not-met':'Chưa đáp ứng',unknown:'Chưa thể xác minh'} as const;
const methodText={derivable:'Nguồn: có thể kiểm tra',disputed:'Nguồn: còn tranh luận',unreachable:'Nguồn: chưa thể suy ra'} as const;
type Filter='relevant'|'all';

/**
 * Research-only extension of the existing conditional evidence workbench.
 * Shown only for Menh in expert view; does not add a redundant navigation tab.
 */
export function ClassicalPatternResearch({chart}:{chart:AstrologyResult}){
  const data=useMemo(()=>auditClassicalPatternCandidates(chart),[chart]);
  // Distinguish an implemented position check from the source's methodological category.
  const catalog=useMemo(()=>summarizeClassicalCatalog(data.records.map(record=>record.id)),[data]);
  const [filter,setFilter]=useState<Filter>('relevant');
  const [catalogQuery,setCatalogQuery]=useState('');
  const [catalogStatus,setCatalogStatus]=useState<ClassicalCatalogFilterStatus>('all');
  const localizedTitles=useMemo(()=>Object.fromEntries(data.records.map(r=>[r.id,r.title])),[data]);
  const catalogView=useMemo(()=>filterClassicalCatalog(catalog,{query:catalogQuery,status:catalogStatus,localizedTitles}),[catalog,catalogQuery,catalogStatus,localizedTitles]);
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
    {visible.map(record=><details key={record.id} id={'tuvi-classical-'+record.id} className={'palace-reading-symbol '+styles.record}>
      <summary><strong>{record.title}</strong><span>{record.group} · {stateText[record.status]}</span></summary>
      <p>{record.interpretation}</p>
      <ul className={styles.checks}>{record.checks.map((condition,i)=><li key={record.id+'-'+i} data-met={condition.state==='met'}>
        <strong>{checkText[condition.state]}:</strong> {condition.label}. <span>{condition.detail}</span>
      </li>)}</ul>
      <p><strong>Tư liệu:</strong> {record.reference}. <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">Xem quy tắc đối chiếu</a>.</p>
      {record.status==='needs-review'&&<p className="palace-reading-review">{record.extra}</p>}
      <small>{record.caution}</small>
    </details>)}
    <details className={styles.catalog} aria-label="Danh mục nghiên cứu 49 cách cục cổ điển">
      <summary>Danh mục nghiên cứu 49 cách cục · {catalog.assessed} mục có điều kiện đối chiếu</summary>
      <p>{catalog.notice} Trạng thái “có thể kiểm tra” do nguồn phân loại không có nghĩa Thiên Đồ đã triển khai hoặc xác nhận thành cách.</p>
      <p>{catalog.distribution.derivable} mục nguồn đánh giá có thể kiểm tra · {catalog.distribution.disputed} còn tranh luận · {catalog.distribution.unreachable} chưa thể suy ra từ quy tắc nguồn.</p>
      <div className={styles.catalogControls} role="search" aria-label="Tìm kiếm cách cục trong danh mục">
        <label>Tìm theo tên gốc, tên Việt hoặc mã cách cục
          <input type="search" maxLength={100} value={catalogQuery} onChange={event=>setCatalogQuery(event.target.value)} placeholder="Ví dụ: Thất Sát, 七杀, dinh-quy-11"/>
        </label>
        <label>Trạng thái nghiên cứu
          <select value={catalogStatus} onChange={event=>setCatalogStatus(event.target.value as ClassicalCatalogFilterStatus)}>
            <option value="all">Tất cả 49 mục</option>
            <option value="assessed">Đã ánh xạ điều kiện</option>
            <option value="pending">Có thể kiểm tra · chưa ánh xạ</option>
            <option value="disputed">Nguồn còn tranh luận</option>
            <option value="unreachable">Nguồn chưa thể suy ra</option>
          </select>
        </label>
      </div>
      <p className={styles.catalogCount} role="status" aria-live="polite">Hiển thị {catalogView.matches}/{catalog.referenceTotal} mục theo bộ lọc đang chọn.</p>
      {catalogView.matches===0&&<p role="status">Không tìm thấy cách cục phù hợp. Hãy thử tên gốc, tên tiếng Việt đã đối chiếu hoặc chọn trạng thái khác.</p>}
      <div className={styles.catalogGrid}>
        {catalogView.groups.map(group=><section key={group.key} className={styles.catalogGroup}>
          <h5>{group.name} · {group.assessed}/{group.total} đã ánh xạ</h5>
          {group.key==='dinh-tap'&&<p>Nhóm khảo sát vận hạn; không tự lấy điều kiện từ bản mệnh để thay thế.</p>}
          <ol>{group.entries.map(entry=><li key={entry.id}>
            <span className={styles.catalogName}><strong>{entry.assessed?localizedTitles[entry.id]||entry.title:entry.title}</strong> {entry.assessed&&localizedTitles[entry.id]!==entry.title&&<small lang="zh">({entry.title})</small>} <small>({entry.id})</small></span>
            <span className={styles.catalogState}>{entry.assessed?'Thiên Đồ đã ánh xạ điều kiện':methodText[entry.sourceStatus]}</span>
            {entry.assessed&&<a href={'#tuvi-classical-'+entry.id} aria-label={'Chuyển tới điều kiện đối chiếu của '+(localizedTitles[entry.id]||entry.title)}>Điều kiện</a>}
            <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={'Đọc quy tắc nguồn '+entry.title}>Nguồn</a>
          </li>)}</ol>
        </section>)}
      </div>
    </details>
    <small>{data.notice} Bộ này chưa được chuyên gia độc lập thẩm định. Các nhóm định bần và định tạp chưa được kích hoạt; riêng định tạp thuộc nghiên cứu vận hạn, không gộp nhầm vào bản mệnh.</small>
  </article>;
}
