'use client';
import type {MonthReport,MonthObservation} from './month-strength.cjs';
import styles from './palace-evidence-panel.module.css';
const relations:Record<string,string>={same:'Đồng hành với tháng','symbol-generates-month':'Biểu tượng sinh hành tháng','month-generates-symbol':'Hành tháng sinh biểu tượng','symbol-controls-month':'Biểu tượng khắc hành tháng','month-controls-symbol':'Hành tháng khắc biểu tượng'};
function Observation({title,item}:{title:string;item:MonthObservation}){
 return <div className={styles.field} data-month-kind={title} data-month-state={item.state??item.status}><dt>{title} · {item.symbol??'chưa biểu diễn'}</dt><dd><strong>{item.state??(item.status==='convention'?'Quy ước Trung 5':'Chưa tính')}</strong>{item.state&&<p>{item.element} · {relations[item.relation!]} · {item.rule==='baojian-star-month'?'Bảng Cửu Tinh Bảo Giám':'Bảng ngũ hành Môn/Can'}.</p>}</dd></div>;
}
export function MonthStrengthPanel({report,selected,onSelect}:{report:MonthReport;selected:number;onSelect:(number:number)=>void}){
 const cell=report.byPalace[selected];if(!cell)return null;
 return <section className={styles.panel} aria-label={`Vượng suy nguyệt lệnh tại cung ${selected}`}>
  <div className={styles.heading}><h3>Vượng suy theo nguyệt lệnh</h3><span>Chi tháng tiết khí</span></div>
  <p className={styles.context}>{report.month.term} → tháng {report.month.branch}, hành {report.month.element}. Cung {selected} · {cell.trigram}. Đối chiếu khí của biểu tượng thời bàn theo bảng đã chọn; chưa luận kết quả câu hỏi.</p>
  <dl className={styles.fields}><Observation title="Bát Môn" item={cell.door}/><Observation title="Thiên Can" item={cell.stem}/>{cell.stars.map(star=><Observation key={star.symbol} title={star.lodged?'Thiên Cầm ký':'Cửu Tinh'} item={star}/>)}</dl>
  {cell.status==='not-computed'&&<p className={styles.note}>Cần dữ kiện giờ và thời bàn hợp lệ. Không dùng sao/môn bản vị để thay thời bàn.</p>}
  {cell.status==='convention'&&<p className={styles.note}>Trung 5 không biểu diễn Can/Môn thời bàn riêng. {cell.lodgedStarHost!=null&&<button type="button" className={styles.sourceButton} onClick={()=>onSelect(cell.lodgedStarHost!)}>Xem Thiên Cầm ký tại cung {cell.lodgedStarHost}</button>}</p>}
  <details className={styles.details}><summary>Hai bảng nguyệt khí và dị bản</summary><p>Môn/Can: đồng hành tháng → Vượng; tháng sinh biểu tượng → Tướng; biểu tượng sinh tháng → Hưu; biểu tượng khắc tháng → Tù; tháng khắc biểu tượng → Tử.</p><p>Cửu Tinh Bảo Giám: sao sinh tháng → Vượng; đồng hành → Tướng; sao khắc tháng → Hưu; tháng khắc sao → Tù; tháng sinh sao → Phế.</p><p>Đoạn văn Cửu Tinh của Diễn Nghĩa dùng Vượng ở tháng đồng hành và Tướng ở tháng sao sinh; bảng chép tiếp đó có vấn đề căn cột. Dị bản này chưa áp dụng. Không dùng cùng một bảng cho mọi lớp.</p><ul>{report.profile.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></details>
  <details className={styles.details}><summary>Phạm vi tháng tiết khí và giới hạn</summary><p>Kế thừa tiết khí của bàn đã lập; không dùng tháng âm lịch/tháng dương lịch hoặc tháng tướng. Ở gần giao tiết, cần xác minh giờ nhập tiết theo luồng lịch pháp. Lớp này không tự tính thêm giờ giao tiết.</p><ul>{report.profile.limits.map(limit=><li key={limit}>{limit}</li>)}</ul><p>Bát Thần, trường sinh 12 vận và tư lệnh theo ngày chưa xét. Vượng suy không tự đổi dấu Môn Bách, Nhập Mộ, cách cục Can hoặc chứng cứ đọc câu hỏi.</p></details>
 </section>;
}
