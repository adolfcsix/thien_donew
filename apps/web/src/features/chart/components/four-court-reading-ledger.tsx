'use client';
import type {FourCourtReadingLedger} from '@thiendo/interpretation';
import styles from './four-court-reading-ledger.module.css';

/** Uses a single audited, natal-only reading object; never re-places stars. */
export function FourCourtReadingLedgerPanel({ledger}:{ledger:FourCourtReadingLedger}){
 if(ledger.status==='unavailable')return null;
 return <article className={`palace-reading-editorial ${styles.ledger}`} aria-label="Trình tự đọc tam phương tứ chính">
  <header><span className="eyebrow">PHƯƠNG PHÁP ĐỌC · LÁ SỐ GỐC</span><h4>Tổng hợp tam phương tứ chính · {ledger.palace}</h4>
   <p className="palace-reading-scope">Bốn cung được đối chiếu theo thứ tự tọa cung, hai tam hợp rồi đối cung. Chỉ liệt kê vị trí sao và điều kiện đã kiểm tra; không chấm điểm cát hung.</p></header>
  <div className={styles.summary}>
   <span><b>{ledger.summary.courtCount}</b> cung liên hệ</span><span><b>{ledger.summary.observedEntries}</b> bản ghi đã đối chiếu</span>
   <span><b>{ledger.summary.issues}</b> vấn đề cần kiểm tra</span>
  </div>
  <ol className={styles.courts}>{ledger.courts.map(court=><li key={court.branchIndex}>
   <span className={styles.relation}>{court.relation}</span><strong>{court.palace} · {court.branch}</strong>
   {court.isVoChinhDieu?<small>Vô chính diệu tại cung này</small>:<p><b>Chính tinh:</b> {court.groups.main.map(item=>`${item.star} (${item.strength})`).join(' · ')||'Chưa xác minh độ sáng/vị trí'}</p>}
   {court.groups.support.length>0&&<p><b>Sao trợ lực:</b> {court.groups.support.map(x=>x.star).join(' · ')}</p>}
   {court.groups.challenge.length>0&&<p><b>Sát tinh:</b> {court.groups.challenge.map(x=>x.star).join(' · ')}</p>}
   {court.groups.transformation.length>0&&<p><b>Tứ Hóa:</b> {court.groups.transformation.map(x=>`${x.transformation} (${x.star})`).join(' · ')}</p>}
   {court.groups.obstruction.length>0&&<p><b>Án ngữ:</b> {court.groups.obstruction.map(x=>x.star).join(' · ')}</p>}
   {court.issues.length>0&&<small>⚠ {court.issues.length} bản ghi cần kiểm tra; không tính chúng vào chứng cứ xác nhận.</small>}
  </li>)}</ol>
  <div className={styles.questions}>{ledger.questions.map(record=><details key={record.id} className="palace-reading-symbol">
   <summary><strong>{record.title}</strong><span>{record.status==='observed'?'Có dữ liệu đối chiếu':record.status==='needs-review'?'Cần kiểm tra':'Chưa có chứng cứ phù hợp'}</span></summary>
   <p>{record.question}</p>
   {record.evidence.length>0&&<ul className="palace-reading-evidence">{record.evidence.map((item,i)=><li key={`${item.star}-${item.branchIndex}-${i}`}><b>{'transformation' in item?`${item.transformation} (${item.star})`:item.star}</b> · {item.palace} ({item.branch}) · {item.relation}</li>)}</ul>}
   {record.missing.map(x=><p key={x}>{x}</p>)}
   {record.issues.length>0&&<div className="palace-reading-review"><strong>Dữ liệu chưa xác minh</strong><ul>{record.issues.map((issue,i)=><li key={`${issue.star}-${i}`}>{issue.star}: {issue.reason}</li>)}</ul></div>}
  </details>)}</div>
  <small>{ledger.notice}</small>
 </article>;
}
