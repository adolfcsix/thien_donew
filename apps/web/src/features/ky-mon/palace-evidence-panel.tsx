'use client';
import type {PalaceLedger} from './palace-ledger.cjs';
import styles from './palace-evidence-panel.module.css';
const statusLabel={present:'Hiện diện',absent:'Không có dấu','not-computed':'Chưa tính',convention:'Quy ước ký cung'} as const;
export function PalaceEvidencePanel({ledger,selected,onSelect}:{ledger:PalaceLedger;selected:number;onSelect:(number:number)=>void}){
 const palace=ledger.byPalace[selected];
 if(!palace)return null;
 return <section className={styles.panel} aria-label={`Bảng đối chiếu chuyên sâu cung ${selected}`}>
  <div className={styles.heading}><h3>Các lớp tại cung {selected}</h3><span>{ledger.status==='earth-only'?'Chỉ có địa bàn':'Chai Bổ · Chuyển Bàn'}</span></div>
  <p className={styles.context}>{palace.trigram} · {palace.direction} · {palace.element}. {palace.chiefStarLanding?'Đích Trực Phù sao. ':''}{palace.chiefDoorLanding?'Đích Trực Sử. ':''}{palace.lodgedTianQin?'Thiên Cầm ký cùng Thiên Nhuế tại đây.':''}</p>
  <dl className={styles.fields}>{palace.fields.map(field=><div key={field.key} className={styles.field} data-evidence-state={field.status}>
   <dt>{field.label}</dt><dd><div className={styles.value}><strong>{field.value??(field.status==='convention'?'Không an riêng':'—')}</strong><span className={styles.state}>{statusLabel[field.status]}</span></div><p>{field.explanation}</p>
    {field.sourcePalace!==null&&field.sourcePalace!==selected&&<button type="button" onClick={()=>onSelect(field.sourcePalace!)} aria-label={`Đối chiếu ${field.label} tại cung ${field.sourcePalace}`}>Đối chiếu cung {field.sourcePalace} ↗</button>}
   </dd>
  </div>)}</dl>
  <p className={styles.note}>{ledger.note}</p>
  <details className={styles.details}><summary>Từng bước an bàn và quy ước ký cung</summary><ol>{ledger.steps.map((step,index)=><li key={index}>{step}</li>)}</ol><p>Mốc nhập tiết, Can Chi ngày/giờ và trường phái vẫn cần được xác nhận. Đường truy nguyên này giải thích phép dựng hiện có.</p></details>
  <details className={styles.details}><summary>Đối chiếu chín cung trên cùng bàn</summary>
   <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Bảng chín cung, có thể cuộn ngang"><table><caption>Địa Can và các lớp thời bàn; Trung 5 giữ quy ước ký cung.</caption><thead><tr><th scope="col">Cung</th><th scope="col">Địa Can</th><th scope="col">Thiên Can</th><th scope="col">Tinh</th><th scope="col">Môn</th><th scope="col">Thần</th><th scope="col">Dấu cấu trúc</th></tr></thead><tbody>{ledger.entries.map(entry=>{
    const value=(key:string)=>{const field=entry.fields.find(f=>f.key===key);return field?.value??(field?.status==='convention'?'Không an riêng':'Chưa tính');};
    const signals=entry.fields.filter(f=>['void','hourHorse','dayHorse','striking'].includes(f.key)&&f.status==='present').map(f=>f.label);
    return <tr key={entry.number} aria-current={selected===entry.number?'true':undefined}><th scope="row"><button type="button" aria-pressed={selected===entry.number} onClick={()=>onSelect(entry.number)}>Cung {entry.number} · {entry.direction}</button></th><td>{value('earth')}</td><td>{value('heaven')}</td><td>{value('star')}{entry.lodgedTianQin?' + Thiên Cầm':''}</td><td>{value('door')}</td><td>{value('deity')}</td><td>{ledger.status==='earth-only'?'Chưa tính':signals.join(' · ')||'Không có dấu đang xét'}</td></tr>;
   })}</tbody></table></div>
  </details>
 </section>;
}
