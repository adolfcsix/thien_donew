'use client';
import type {StructuralReport,StructuralStatus} from './structural-signals.cjs';
import styles from './palace-evidence-panel.module.css';
const labels:Record<StructuralStatus,string>={present:'Có dấu cấu trúc',absent:'Không có dấu đang xét','out-of-scope':'Ngoài phạm vi Tam Kỳ','not-computed':'Chưa tính','not-represented':'Chưa biểu diễn Can ký',convention:'Quy ước Trung 5'};
export function StructuralEvidencePanel({report,selected,onSelect}:{report:StructuralReport;selected:number;onSelect:(number:number)=>void}){
 const entry=report.byPalace[selected];if(!entry)return null;
 return <section className={styles.panel} aria-label={`Dấu cấu trúc Môn Bách và Tam Kỳ Nhập Mộ tại cung ${selected}`}>
  <div className={styles.heading}><h3>Môn Bách · Tam Kỳ Nhập Mộ</h3><span>Đối chiếu cấu trúc</span></div>
  <p className={styles.context}>Cung {selected} · {entry.trigram} · {entry.direction}. Bàn nền Chai Bổ – Chuyển Bàn; quy ước nhận diện Diễn Nghĩa. Có dấu không phải kết luận cát hung.</p>
  <dl className={styles.fields}>{([['Môn Bách · Môn khắc cung',entry.door,'door'],['Tam Kỳ Nhập Mộ · Thiên Can',entry.grave,'grave']] as const).map(([title,observation,key])=><div className={styles.field} key={key} data-structural-kind={key} data-structural-state={observation.status}>
   <dt>{title}</dt><dd><div className={styles.value}><strong>{labels[observation.status]}</strong></div><p>{observation.explanation}</p>
    {key==='grave'&&observation.targetPalace!=null&&observation.targetPalace!==selected&&<button type="button" onClick={()=>onSelect(observation.targetPalace!)}>Đối chiếu cung mộ {observation.targetPalace} ↗</button>}
   </dd>
  </div>)}</dl>
  <p className={styles.note}>Phạm vi: Tam Kỳ Ất–Bính–Đinh. Dấu Nhập Mộ của Lục Nghi, Bát Môn và ngày/giờ chưa được xét trong lớp này. Quan hệ cung khắc Môn giữ nguyên tên chiều khắc.</p>
  <details className={styles.details}><summary>Độ phủ Tam Kỳ và Can chưa biểu diễn</summary><ul>{report.graveCoverage.map(item=><li key={item.stem}><b>{item.stem}: {labels[item.status]}.</b> {item.explanation}{item.palaceNumber!=null&&item.palaceNumber!==selected&&<> <button type="button" className={styles.sourceButton} onClick={()=>onSelect(item.palaceNumber!)}>Xem cung {item.palaceNumber}</button></>}</li>)}</ul></details>
  <details className={styles.details}><summary>Quy ước, nguồn và bảng đối chiếu độc lập</summary>
   <p>{report.profile.placementConvention}. {report.profile.structureConvention}. Nguồn là bản chép số; chưa kiểm chứng ảnh bản in hoặc chứng nhận dòng truyền thừa.</p>
   <ul>{report.profile.sources.map(source=><li key={source.id}><a href={source.revisionUrl??source.url} target="_blank" rel="noreferrer">{source.displayTitle}</a> · {source.displayLocators.join(' / ')}</li>)}</ul>
   <p>Định nghĩa được chọn: Môn khắc cung. Bí Kíp Đại Toàn dùng tên Môn Bách cho chiều cung khắc Môn; đây là dị bản tên gọi, chưa áp dụng. Tam Kỳ theo Diễn Nghĩa: Ất → Khôn 2; Bính → Càn 6; Đinh → Cấn 8. Bảo Giám dùng Đinh → Càn 6; không gộp hai bảng.</p>
   <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Bảng độc lập Môn Bách, có thể cuộn ngang"><table><caption>Quy chiếu bảng Giải thích Bách của Bảo Giám, đối chiếu chiều khắc Diễn Nghĩa. Bảng được nhập tay trước thuật toán.</caption><thead><tr><th>Môn</th><th>Hành</th><th>Cung có dấu</th></tr></thead><tbody>{[['Hưu','Thủy','Ly 9'],['Sinh','Thổ','Khảm 1'],['Thương','Mộc','Khôn 2 · Cấn 8'],['Đỗ','Mộc','Khôn 2 · Cấn 8'],['Cảnh','Hỏa','Càn 6 · Đoài 7'],['Tử','Thổ','Khảm 1'],['Kinh','Kim','Chấn 3 · Tốn 4'],['Khai','Kim','Chấn 3 · Tốn 4']].map(([door,element,palaces])=><tr key={door}><th scope="row">{door}</th><td>{element}</td><td>{palaces}</td></tr>)}</tbody></table></div>
   <p>64 tổ hợp Môn/cung ngoài: 13 có dấu, 51 không có dấu đang xét. Trung 5 là quy ước riêng. Kiểm tra bảng kỹ thuật không thay thế phản biện trường phái.</p>
  </details>
  <details className={styles.details}><summary>Phân biệt dấu cấu trúc và luận đoán</summary><p>Đối chiếu vị trí hoặc chiều khắc chỉ trả dấu cấu trúc. Luận đoán cần câu hỏi, dụng thần, vượng suy, chủ/khách và tương tác các lớp theo phương pháp đã chọn. Công cụ chưa đưa ra điểm cát hung, ứng kỳ hoặc kết luận sự kiện từ hai dấu này.</p></details>
 </section>;
}
