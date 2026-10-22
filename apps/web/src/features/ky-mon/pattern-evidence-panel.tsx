'use client';
import type {PatternReport,PatternState} from './pattern-signals.cjs';
import styles from './palace-evidence-panel.module.css';
const labels:Record<PatternState,string>={present:'Khớp điều kiện Can',absent:'Không khớp cặp Can đang xét','not-computed':'Chưa tính thời bàn',convention:'Quy ước Trung 5','not-represented':'Chưa biểu diễn Can ký'};
export function PatternEvidencePanel({report,selected,onSelect}:{report:PatternReport;selected:number;onSelect:(number:number)=>void}){
 const cell=report.byPalace[selected];if(!cell)return null;
 return <section className={styles.panel} aria-label={`Cách cục Can tại cung ${selected}`}>
  <div className={styles.heading}><h3>Thanh Long · Phi Điểu</h3><span>Đối chiếu cách cục Can</span></div>
  <p className={styles.context}>Cung {selected} · {cell.trigram}. Thiên {cell.heavenStem??'chưa biểu diễn'} / Địa {cell.earthStem}. {report.xunHead?`${report.xunHead}, Giáp ẩn dưới ${report.hiddenStem}.`:'Cần dữ kiện giờ.'} Khớp điều kiện Can chưa phải kết luận cát hung.</p>
  <dl className={styles.fields}>{report.patterns.map(pattern=><div key={pattern.id} className={styles.field} data-pattern-kind={pattern.id} data-pattern-state={cell[pattern.id]}><dt>{pattern.name}</dt><dd><strong>{labels[cell[pattern.id]]}</strong><p>Điều kiện đang xét: Thiên {pattern.heavenStem??'Giáp tuần giờ'} gia Địa {pattern.earthStem??'Giáp tuần giờ'}.</p><p>Toàn bàn: {labels[pattern.status]}.{pattern.palaceNumber!=null&&` Thiên Can cần xét đang ở cung ${pattern.palaceNumber}.`}</p>{pattern.palaceNumber!=null&&pattern.palaceNumber!==selected&&<button type="button" onClick={()=>onSelect(pattern.palaceNumber!)}>Xem cung {pattern.palaceNumber}</button>}</dd></div>)}</dl>
  <details className={styles.details}><summary>Phương pháp và nguồn cách cục</summary><p>Thời gia Chai Bổ – Chuyển Bàn. Đối chiếu Diễn Nghĩa: mục Thanh Long Hồi Thủ và Phi Điểu Điệt Huyệt. Dùng Giáp của tuần giờ cho hai dấu theo quy ước nghiên cứu; không cố định mọi Giáp thành Mậu. Trung 5 không tự ký thêm Thiên Can.</p><p><a href={report.sourceUrl} target="_blank" rel="noreferrer">Độn Giáp Diễn Nghĩa · bản cố định</a></p><ul>{report.limits.map(limit=><li key={limit}>{limit}</li>)}</ul><p>Nguồn là bản chép số, chưa kiểm chứng ảnh bản in. Hai dấu không được tự đưa vào chứng cứ thuận của phần đọc câu hỏi.</p></details>
 </section>;
}
