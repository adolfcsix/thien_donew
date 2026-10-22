'use client';
import Link from 'next/link';
import type {PalaceArgumentMap} from '@thiendo/interpretation';
import styles from './palace-argument-map.module.css';

const verdict:Record<string,string>={
 observed:'Đủ dữ liệu để khảo sát',partial:'Thiếu một phần điều kiện',
 'no-data':'Chưa có chứng cứ phù hợp','needs-review':'Có dữ liệu cần kiểm tra lại'
};
const kind:Record<string,string>={main:'Chính tinh',support:'Trợ tinh',challenge:'Sát tinh',transformation:'Tứ Hóa năm sinh',obstruction:'Tuần / Triệt'};
/** This component receives a validated natal-only record. It never places stars. */
export function PalaceArgumentMapPanel({map}:{map:PalaceArgumentMap}){
 if(map.status==='unavailable')return null;
 return <article className={`palace-reading-editorial ${styles.section}`} aria-label="Lập luận phối hợp có phản chứng">
   <header><span className="eyebrow">ĐỌC SÂU · ĐIỀU KIỆN &amp; PHẢN CHỨNG</span>
     <h4>Bốn câu hỏi phối hợp · {map.palace}</h4>
     <p className="palace-reading-scope">Đây là bước <strong>lập giả thuyết sau khi kiểm tra vị trí sao</strong>, không phải một bảng đếm sao hoặc công cụ xác định số mệnh. Nhãn “đủ dữ liệu” chỉ có nghĩa đã khớp điều kiện khảo sát.</p>
   </header>
   <div className={styles.summary}><span><b>{map.summary?.observed??0}</b> nhóm có dữ liệu</span>
     <span><b>{map.summary?.partial??0}</b> nhóm còn thiếu điều kiện</span>
     <span><b>{map.summary?.needsReview??0}</b> nhóm cần kiểm lại</span></div>
   <div className={styles.entries}>{map.arguments.map((argument,index)=><details key={argument.id} className={styles.entry} open={index===0}>
     <summary><span className={styles.number}>{String(index+1).padStart(2,'0')}</span><span className={styles.header}><strong>{argument.title}</strong><small>{verdict[argument.status]??argument.status}</small></span></summary>
     <div className={styles.body}><p>{argument.overview}</p><p className={styles.question}>{argument.question}</p>
       <h5>Điều kiện cần</h5><ul className={styles.checks}>{argument.checks.map((check,i)=><li key={i}>
         <span aria-label={check.met?'Đã khớp':'Chưa khớp'}>{check.met?'✓':'○'}</span> {check.label}</li>)}</ul>
       {argument.evidence.length>0&&<><h5>Vị trí đã kiểm tra</h5><ul className={styles.evidence}>{argument.evidence.map((item,i)=><li key={`${item.kind}:${item.star}:${item.branchIndex}:${i}`}>
         <strong>{item.transformation?`${item.transformation} → ${item.star}`:item.star}</strong>
         <span>{kind[item.kind]} · {item.relation} · {item.palace} ({item.branch}){item.strength?` · độ sáng ${item.strength}`:''}</span>
         <Link href={`/star-atlas?star=${encodeURIComponent(item.star)}&palace=${encodeURIComponent(item.palace)}&branch=${item.branchIndex}`} aria-label={`Tra sao ${item.star} tại ${item.palace}`}>Tra sao ↗</Link>
       </li>)}</ul></>}
       {argument.missing.length>0&&<><h5>Điều kiện chưa đáp ứng</h5><ul>{argument.missing.map((s,i)=><li key={i}>{s}</li>)}</ul></>}
       {argument.issues.length>0&&<div className={styles.alert}><h5>Chứng cứ phải tạm loại</h5><ul>{argument.issues.map((issue,i)=><li key={`${issue.star}:${i}`}>{issue.star} · {issue.palace}: {issue.reason}</li>)}</ul></div>}
       <div className={styles.counter}><strong>Phản chứng / giới hạn</strong><p>{argument.counterexample}</p></div>
     </div>
   </details>)}</div>
   <small className={styles.footer}>{map.notice}</small>
 </article>;
}
