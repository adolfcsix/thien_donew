'use client';

import type {ReactNode} from 'react';
import styles from './discipline-canvas.module.css';
import {hexRows, palaceCells, directionGroups} from './discipline-canvas.model.cjs';

/** V11.86: view-only visualizations of existing computations, never new chart engines. */
type Hexagram = {name:string; bits:string; number:number};
type Cast = {original:Hexagram; nuclear:Hexagram; transformed:Hexagram; changingLine:number};
type Palace = {number:number; direction:string; trigram:string; symbol:string};
type Sector = {name:string; han:string; center:number; direction:string};
type Direction = {facing:{name:string}; facingDegrees:number; sitting:{name:string}; sittingDegrees:number; boundaryDistance:number};

function Frame({variant,eyebrow,title,help,children}:{variant:string;eyebrow:string;title:string;help:string;children:ReactNode}){
 return <section className={`${styles.frame} ${styles[variant]}`} aria-label={title}>
  <div className={styles.heading}><div><span className={styles.eyebrow}>{eyebrow}</span><h2>{title}</h2></div><p>{help}</p></div>
  {children}
 </section>;
}

const COURTS=['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];
export function TuViCanvas({ready}:{ready:boolean}) {
 return <Frame variant="tuvi" eyebrow="BẢN ĐỒ NGHIÊN CỨU / TỬ VI" title="Mười hai lĩnh vực của lá số" help="Đây là danh mục 12 cung để định hướng cách đọc, không phải vị trí an cung của một lá số cụ thể.">
  <div className={styles.courtLayout}><ol className={styles.courts}>{COURTS.map((name,i)=><li key={name}><span>{String(i+1).padStart(2,'0')}</span><strong>{name}</strong></li>)}</ol>
  <div className={styles.courtAside}><span className={styles.pill}>{ready?'ĐÃ AN LÁ SỐ':'CHƯA LẬP LÁ SỐ'}</span><strong>Đi từ tổng thể đến từng cung</strong><p>Đầu tiên kiểm tra Mệnh – Thân, sau đó đối chiếu Tam phương Tứ chính, chính tinh, phụ tinh và vận hạn theo từng ngữ cảnh.</p><a href="#tuvi-workspace">{ready?'Mở bàn lá số thực tế':'Nhập ngày giờ để lập lá số'} <span aria-hidden="true">↗</span></a></div></div>
 </Frame>;
}

/** Bit order from the original engine is bottom-to-top; reverse only for display. */
function HexLines({bits,changingLine}:{bits:string;changingLine?:number}) {
 return <div className={styles.hexLines} role="img" aria-label={`Sáu hào từ trên xuống: ${bits.split('').reverse().map(bit=>bit==='1'?'dương':'âm').join(', ')}${changingLine?`; hào động ${changingLine}`:''}`}>
  {hexRows(bits,changingLine).map(({bit,position})=><div className={`${styles.line} ${changingLine===position?styles.changing:''}`} key={position} aria-hidden="true">
   <span className={bit==='1'?styles.yang:styles.yin}><i/><i/></span><small>{changingLine===position?'↻':String(position)}</small>
  </div>)}
 </div>;
}

export function MaiHoaCanvas({cast}:{cast:Cast|null}) {
 return <Frame variant="maihoa" eyebrow="TƯỢNG QUẺ / MAI HOA DỊCH SỐ" title="Quẻ chủ · hỗ quẻ · quẻ biến" help="Hình sáu hào đọc từ dưới lên; chỉ quẻ chủ đánh dấu hào động. Không suy luận kết quả ngoài dữ liệu khởi quẻ.">
  {cast?<div className={styles.triHex}>{([['01 · Quẻ chủ',cast.original,cast.changingLine],['02 · Hỗ quẻ',cast.nuclear,undefined],['03 · Quẻ biến',cast.transformed,undefined]] as const).map(([title,hex,line])=><article key={title} className={styles.hexCard}><span className={styles.smallLabel}>{title}</span><HexLines bits={hex.bits} changingLine={line}/><strong>{hex.name}</strong><small>Quẻ số {hex.number}</small></article>)}</div>:<div className={styles.empty} role="status">Chưa thể dựng sơ đồ khi đầu vào khởi quẻ không hợp lệ.</div>}
 </Frame>;
}

export function LucHaoCanvas({original,transformed,changing}:{original:Hexagram;transformed:Hexagram;changing:number[]}) {
 return <Frame variant="luchao" eyebrow="HÀO VỊ / LỤC HÀO" title="Sáu hào: trước và sau khi biến" help="Đối chiếu trực tiếp hai chuỗi hào do engine trả về. Hào động được khoanh theo số thứ tự tính từ dưới lên.">
  <div className={styles.lucLayout}><div className={styles.lucHex}><div><span className={styles.smallLabel}>QUẺ CHỦ</span><HexLines bits={original.bits}/><strong>{original.name}</strong></div><span className={styles.transition} aria-hidden="true">→</span><div><span className={styles.smallLabel}>QUẺ BIẾN</span><HexLines bits={transformed.bits}/><strong>{transformed.name}</strong></div></div>
  <div className={styles.lucAside}><span className={styles.pill}>ĐỘNG / TĨNH</span><div className={styles.lineKeys}>{Array.from({length:6},(_,i)=>6-i).map(n=><span key={n} data-moving={changing.includes(n)}><b>Hào {n}</b><small>{changing.includes(n)?'↻ Động':'Tĩnh'}</small></span>)}</div><p>Động hào chỉ thay đổi âm/dương trong quẻ biến. Nhật–Nguyệt, Nạp Giáp và Dụng Thần cần được xét ở những bảng riêng.</p></div></div>
 </Frame>;
}

export function KyMonCanvas({palaces,selected,onSelect}:{palaces:readonly Palace[];selected:number;onSelect:(n:number)=>void}) {
 const cells=palaceCells(palaces);
 const byId=new Map(cells.map(p=>[p.number,p]));
 return <Frame variant="kymon" eyebrow="CỬU CUNG / KỲ MÔN ĐỘN GIÁP" title="Bàn định vị Lạc Thư" help="Chọn cung để đồng bộ với bảng nghiên cứu bên dưới. Số cung là vị trí Lạc Thư, không phải đánh giá cát hung.">
  <div className={styles.kyLayout}><div className={styles.luoGrid} role="group" aria-label="Chọn một trong chín cung Lạc Thư">
   {cells.map(p=>{const number=p.number;return <button type="button" key={number} aria-pressed={selected===number} className={styles.luoCell} onClick={()=>onSelect(number)}><span>{number.toString().padStart(2,'0')}</span><b>{p?.symbol??'◉'}</b><small>{p?.direction??'Trung cung'}</small></button>;})}
  </div><div className={styles.kyAside}><span className={styles.pill}>ĐỊNH VỊ CUNG</span><strong>{byId.get(selected)?.direction??'Đang chọn cung'}</strong><p>{byId.get(selected)?.trigram??'Đối chiếu lại địa bàn'} · Cung {selected}</p><p>Vị trí chọn cũng cập nhật bảng địa bàn, Thiên bàn và Chuyển Bàn bên dưới khi có dữ kiện giờ hợp lệ.</p><a href="#ky-mon-workspace">Đến công cụ lập cục <span aria-hidden="true">↗</span></a></div></div>
 </Frame>;
}

export function PhongThuyCanvas({sectors,reading,onChoose}:{sectors:readonly Sector[];reading:Direction|null;onChoose:(angle:number)=>void}) {
 const groups=directionGroups(sectors);
 return <Frame variant="phongthuy" eyebrow="ĐỊA BÀN / PHONG THỦY" title="Thước 24 sơn · tám phương" help="Mỗi nút chọn tâm một sơn (cách nhau 15°). Kết quả dưới đây vẫn phụ thuộc số đo la bàn thực tế bạn nhập.">
  <div className={styles.directionOverview}><div className={styles.directionReadout}><span className={styles.pill}>TRỤC TỌA – HƯỚNG</span><strong>{reading?`${reading.facingDegrees.toFixed(1)}°`:'—'}</strong><span>Hướng: {reading?.facing.name??'chưa hợp lệ'} · Tọa: {reading?.sitting.name??'—'}</span><small>{reading?(reading.boundaryDistance<1?'Gần ranh giới sơn: nên đo lại.':`Cách ranh giới ${reading.boundaryDistance.toFixed(1)}°`):'Chưa có dữ liệu để xác định sơn.'}</small></div>
  <div className={styles.directionBands} role="group" aria-label="Chọn tâm sơn theo tám hướng">{groups.map(group=><div className={styles.directionBand} key={group.direction}><b>{group.direction}</b><div>{group.sectors.map(s=><button key={s.name} type="button" aria-pressed={reading?.facing.name===s.name} onClick={()=>onChoose(s.center)} title={`${s.name} · ${s.center}°`}>{s.name}<small>{s.center}°</small></button>)}</div></div>)}</div></div>
 </Frame>;
}
