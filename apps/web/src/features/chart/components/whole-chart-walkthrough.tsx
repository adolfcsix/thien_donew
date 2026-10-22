'use client';
import {useMemo,useState} from 'react';
import type {AstrologyResult} from '@thiendo/shared-types';
import {buildWholeChartWalkthrough} from '@thiendo/interpretation/src/chart-reading.cjs';
import styles from './whole-chart-walkthrough.module.css';
import {DeepChartReadingPanel} from './deep-chart-reading';

const label:Record<string,string>={
 'fully-observed':'Đủ bốn nhóm chứng cứ',
 'partly-observed':'Cần đối chiếu thêm',
 'needs-review':'Chứng cứ cần kiểm tra lại',
 'no-data':'Chưa đủ dữ liệu',
 observed:'Đã khớp điều kiện khảo sát',partial:'Khớp một phần'
};
/** Lazy-mounted only after reader requests the whole-chart walkthrough. */
export function WholeChartWalkthroughPanel({chart,annualYear}:{chart:AstrologyResult;annualYear?:number}){
 const report=useMemo(()=>buildWholeChartWalkthrough(chart),[chart]);
 const [filter,setFilter]=useState<'all'|'review'>('all');
 const steps=filter==='review'?report.steps.filter(step=>step.status==='needs-review'||step.status==='partly-observed'||step.status==='no-data'):report.steps;
 return <section className={styles.root} aria-label="Bài đọc toàn lá số 12 cung">
  {annualYear!==undefined&&<DeepChartReadingPanel chart={chart} year={annualYear}/>}
  <details><summary>Sổ kiểm chứng bản mệnh: 12 cung và 48 điều kiện khảo sát</summary>
  <header className={styles.head}>
   <span className="eyebrow">THƯ VIỆN THỰC HÀNH</span>
   <h3>Bài đọc toàn lá số: 12 cung, một mạch lập luận</h3>
   <p>Từng đoạn lấy từ địa bàn bản mệnh đã kiểm tra; không cộng sao thành điểm tốt/xấu, không dùng sao lưu năm và không coi bộ sao khớp hình học là một cách cục đã thẩm định.</p>
  </header>
  <div className={styles.stats} role="status"><span><b>{report.summary.palaceCount}</b> cung</span>
   <span><b>{report.summary.threadCount}</b> tuyến đối chiếu</span>
   <span><b>{report.summary.needsReview}</b> cung cần kiểm tra dữ liệu</span></div>
  <section className={styles.threads} aria-label="Những tuyến đối chiếu xuyên cung"><h4>Ba tuyến đọc liên kết</h4>
   {report.threads.map(thread=><details className={styles.entry} key={thread.id}>
    <summary><strong>{thread.title}</strong><small>{label[thread.status]}</small></summary>
    <div className={styles.body}><p>{thread.question}</p>
      <p>{thread.geometry==='thematic'?'So sánh chủ đề, không mặc định quan hệ tam hợp/xung chiếu.':
       thread.geometryVerified?'Quan hệ hình học đã đối chiếu từ địa chi thực tế.':'Quan hệ hình học cần kiểm tra lại, chưa được xác nhận.'}</p>
      <ul>{thread.steps.map(part=><li key={part.palace}><strong>{part.palace} ({part.branch})</strong>: {part.localMain.length?part.localMain.join(', '):'Không có chính tinh đã kiểm chứng tại cung'} · {label[part.status]}</li>)}</ul>
      <small>{thread.caution}</small>
    </div>
   </details>)}
  </section>
  <div className={styles.toolbar}>
   <h4>Đọc tuần tự từng cung</h4>
   <label htmlFor="whole-chart-filter">Hiển thị</label>
   <select id="whole-chart-filter" value={filter} onChange={e=>setFilter(e.target.value as 'all'|'review')}>
    <option value="all">Đủ 12 cung</option><option value="review">Cung cần bổ sung chứng cứ</option>
   </select>
  </div>
  <div className={styles.list}>
   {steps.length===0&&<p>Không có cung nào thiếu chứng cứ theo bộ điều kiện hiện tại. Kết quả này không xác nhận cách cục hoặc luận đoán.</p>}
   {steps.map(step=><details className={styles.entry} key={step.palace} open={step.order===1&&filter==='all'}>
    <summary><span className={styles.number}>{String(step.order).padStart(2,'0')}</span>
      <strong>{step.palace} · {step.title}</strong><small>{label[step.status]}</small></summary>
    <div className={styles.body}>
     {step.paragraphs.map((paragraph,i)=><p key={i}>{paragraph}</p>)}
     <div className={styles.geometry}>Tam hợp: {step.geometry.triad.join(' · ')} · Đối cung: {step.geometry.opposite}</div>
     {step.cases.map(item=><details key={item.id} className={styles.case}>
       <summary><strong>{item.title}</strong><small>{label[item.status]??'Chưa đủ dữ liệu'}</small></summary>
       <div className={styles.body}><p>{item.question}</p>
         <ul>{item.checks.map((check,i)=><li key={i}>{check.met?'✓':'○'} {check.label}</li>)}</ul>
         {item.evidence.length>0&&<p><strong>Chứng cứ:</strong> {item.evidence.map(e=>`${e.star} (${e.palace} · ${e.relation})`).join('; ')}</p>}
         {item.missing.length>0&&<p><strong>Điều kiện chưa đủ:</strong> {item.missing.join('; ')}</p>}
         {item.issues.length>0&&<p className={styles.warning}><strong>Không dùng dữ liệu bị nghi vấn:</strong> {item.issues.map(e=>`${e.star} (${e.palace}): ${e.reason}`).join('; ')}</p>}
         <p><strong>Phản chứng:</strong> {item.counterexample}</p>
       </div>
     </details>)}
     {step.issues.length>0&&<p className={styles.warning}>Cần kiểm tra: {step.issues.join('; ')}</p>}
     <p className={styles.reflection}>{step.reflection}</p>
    </div>
   </details>)}
  </div>
  <p className={styles.notice}>{report.notice}</p>
  </details>
 </section>;
}
