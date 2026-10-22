'use client';
import type {ReadingQualityReport} from './quality.cjs';
import {useViewMode} from '@/components/view-mode';
import styles from './quality-panel.module.css';

const labels={observed:'Đã đối chiếu cấu trúc','needs-check':'Cần bổ sung','blocked':'Không đạt kiểm tra'} as const;
/** One shared visual convention across systems. No prediction, score or invented expert approval. */
export function ReadingQualityPanel({report}:{report:ReadingQualityReport}){
 const {mode}=useViewMode();
 return <section className={styles.root} aria-label={`Kiểm chứng luận giải ${report.discipline}`}>
  <div className={styles.head}>
   <span className={styles.eyebrow}>THIÊN ĐỒ · LUẬN GIẢI CÓ ĐIỀU KIỆN</span>
   <h2>Trước khi luận: kiểm tra chứng cứ</h2>
   <p>{report.notice}</p>
   <p className={styles.method}><b>Quy ước đang dùng:</b> {report.method}</p>
  </div>
  <ol className={styles.ledger}>
   {report.items.map((item,index)=><li key={item.id} className={styles.item}>
    <div className={styles.row}><span className={styles.number}>{String(index+1).padStart(2,'0')}</span><strong>{item.label}</strong><span data-status={item.status} className={styles.status}>{labels[item.status]}</span></div>
    <p className={styles.evidence}>{item.evidence}</p>
    {mode==='expert'&&<p className={styles.meaning}><b>Cơ sở/giới hạn:</b> {item.meaning}</p>}
   </li>)}
  </ol>
  {mode==='expert'&&<div className={styles.deep}>
   <h3>Câu hỏi phản biện trước khi diễn giải</h3>
   <ol>{report.questions.map(question=><li key={question}>{question}</li>)}</ol>
  </div>}
  <div className={styles.notice}><b>Phạm vi:</b> {report.limits.join(' ')}</div>
 </section>;
}
