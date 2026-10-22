'use client';
import {downloadBlobFile} from '@/lib/download-blob';
import {useState} from 'react';
import Link from 'next/link';
import {workbookMarkdown} from './workbook-format.cjs';
import type {ResearchWorkbook} from './workbooks.cjs';
import styles from './workbook.module.css';
export function WorkbookPanel({report}:{report:ResearchWorkbook}){
 const [message,setMessage]=useState('');
 function download(){try{downloadBlobFile(new Blob([workbookMarkdown(report)],{type:'text/markdown;charset=utf-8'}),`thien-do-${report.discipline}-ho-so.md`);setMessage('Đã xuất hồ sơ đối chiếu. Tệp không chứa nội dung câu hỏi riêng tư.');}catch{setMessage('Hồ sơ chưa sẵn sàng để xuất.');}}
 return <section className={styles.panel} aria-label={`Hồ sơ nghiên cứu ${report.discipline}`} data-workbook-status={report.status}>
  <div className={styles.header}><div><span>THIÊN ĐỒ / HỒ SƠ CÓ CĂN CỨ</span><h3>{report.title}</h3></div><button type="button" disabled={report.status!=='ready'} onClick={download}>Tải hồ sơ Markdown</button></div>
  <p>{report.notice}</p>
  <p><Link href={{'mai-hoa':'/academy/mai-hoa-tu-phep-so-den-the-dung','ky-mon':'/academy/ky-mon-doc-ba-lop-va-nguon','luc-hao':'/academy/luc-hao-tu-luc-than-den-ung-vien'}[report.discipline]}>Học cách đọc và phản kiểm hồ sơ này ↗</Link></p>
  {report.sections.map((section,index)=><details className={styles.section} key={section.id} open={index===0}><summary>{String(index+1).padStart(2,'0')} · {section.title}</summary><dl>{section.facts.map((fact,i)=><div className={styles.fact} key={`${fact.label}-${i}`}><dt>{fact.label}</dt><dd><strong>{fact.value}</strong><small>Căn cứ: {fact.origin}</small></dd></div>)}</dl><p>{section.explanation}</p><h4>Câu hỏi cần kiểm tra</h4><ul>{section.questions.map(q=><li key={q}>{q}</li>)}</ul></details>)}
  <details className={styles.section}><summary>Điều còn thiếu và giới hạn phương pháp</summary><ul>{report.gaps.map((g,i)=><li key={i}>{g}</li>)}</ul></details>
  <details className={styles.section}><summary>Nguồn tham khảo và đối chiếu</summary><ul>{report.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul><p>Nguồn cổ là bản chép số; không đồng nghĩa đã kiểm chứng ảnh bản in hoặc được chuyên gia thẩm định.</p></details>
  {message&&<p role="status" aria-live="polite">{message}</p>}
 </section>;
}
