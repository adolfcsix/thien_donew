'use client';
import type {TarotReading,TarotLayout,TarotPosition} from '@thiendo/astrology-engine/src/tarot-rws.cjs';
import {getSpreadRegistry} from '@thiendo/astrology-engine/src/tarot-spreads.cjs';
import styles from './spread-layout.module.css';
import {tarotArtworkSrc,recoverTarotArtwork,type TarotDeckId} from './tarot-artwork';
import {TarotCloth} from './tarot-cloth';
const registry=getSpreadRegistry();
export function TarotLayoutEditor({layout,onChange}:{layout:TarotLayout;onChange:(layout:TarotLayout)=>void}){
 const patch=(index:number,values:Partial<TarotPosition>)=>onChange({...layout,positions:layout.positions.map((p,i)=>i===index?{...p,...values}:p)});
 const count=(n:number)=>{
  const positions=layout.positions.slice(0,n),cells=new Set(positions.map(p=>p.x+':'+p.y));
  for(let i=positions.length;i<n;i++){let cell=0;while(cells.has((cell%5)+':'+Math.floor(cell/5)))cell++;cells.add((cell%5)+':'+Math.floor(cell/5));positions.push({id:'p'+(i+1),label:'Vị trí '+(i+1),role:'focus',prompt:registry.roles.focus.guidance,x:cell%5,y:Math.floor(cell/5),rotation:0});}
  onChange({...layout,positions});
 };
 return <section className={styles.editor} aria-label="Thiết kế bố cục Tarot tự chọn"><h3>Đặt câu hỏi cho từng vị trí</h3><p>Chọn 1–16 vị trí trên lưới 5 cột × 8 hàng. Thứ tự dòng là thứ tự rút; tọa độ là nơi đặt lá. Các ô và nhãn phải khác nhau.</p>
  <div className={styles.controls}><label>Tên bố cục<input aria-label="Tên bố cục tự chọn" value={layout.name} maxLength={60} onChange={e=>onChange({...layout,name:e.target.value})}/></label><label>Số vị trí<select aria-label="Số vị trí tự chọn" value={layout.positions.length} onChange={e=>count(+e.target.value)}>{Array.from({length:16},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label></div>
  {layout.positions.map((p,i)=><fieldset key={p.id}><legend>{i+1} · {p.id}</legend><div className={styles.controls}>
   <label>Nhãn<input aria-label={`Nhãn vị trí ${i+1}`} value={p.label} maxLength={60} onChange={e=>patch(i,{label:e.target.value})}/></label>
   <label>Vai trò<select aria-label={`Vai trò vị trí ${i+1}`} value={p.role} onChange={e=>patch(i,{role:e.target.value,prompt:registry.roles[e.target.value].guidance.slice(0,160)})}>{Object.entries(registry.roles).map(([key,r])=><option key={key} value={key}>{r.label}</option>)}</select></label>
   <label>Cột<select aria-label={`Cột vị trí ${i+1}`} value={p.x} onChange={e=>patch(i,{x:+e.target.value})}>{[0,1,2,3,4].map(x=><option key={x} value={x}>{x+1}</option>)}</select></label>
   <label>Hàng<select aria-label={`Hàng vị trí ${i+1}`} value={p.y} onChange={e=>patch(i,{y:+e.target.value})}>{[0,1,2,3,4,5,6,7].map(x=><option key={x} value={x}>{x+1}</option>)}</select></label>
  </div><label>Câu hỏi vị trí<textarea aria-label={`Câu hỏi vị trí ${i+1}`} rows={2} value={p.prompt} maxLength={160} onChange={e=>patch(i,{prompt:e.target.value})}/></label></fieldset>)}
 </section>;
}
export function TarotSpreadMap({result,deck='rws-1909'}:{result:TarotReading;deck?:TarotDeckId}){
 if(result.version!==2||!['celtic-cross','custom'].includes(result.spread))return null;
 const layout=result.layout,cols=Math.max(...layout.positions.map(p=>p.x))+1,rows=Math.max(...layout.positions.map(p=>p.y))+1;
 return <TarotCloth><section className={styles.map} aria-label="Sơ đồ bố cục Tarot"><h3>{layout.name} · {result.draw.length} lá</h3>
  <div className={styles.grid} style={{gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,gridTemplateRows:`repeat(${rows},minmax(40px,auto))`}}>
   {layout.positions.map((p,i)=><div key={p.id} className={`${styles.card} ${p.rotation===90?styles.crossing:result.spread==='celtic-cross'&&i===0?styles.center:''}`} style={{gridColumn:p.x+1,gridRow:p.y+1}}><strong>{i+1}. {p.label}</strong><img key={`${deck}:${result.positions[i].card.id}`} className={`${styles.mapArtwork} ${result.draw[i].reversed?styles.mapReversed:''}`} src={tarotArtworkSrc(result.positions[i].card.id,deck)} onError={event=>recoverTarotArtwork(event,result.positions[i].card.id,deck)} alt={`Minh họa ${result.positions[i].card.nameVi}`} width={78} height={130} loading="lazy" decoding="async"/><b>{result.positions[i].card.nameVi}</b><small>{result.draw[i].reversed?'Ngược':'Xuôi'}{p.rotation===90?' · đặt ngang':''}</small></div>)}
  </div><p>Lá đặt ngang ở vị trí 2 là quy ước bố cục; chiều xuôi/ngược luôn đọc theo nhãn riêng. Trên màn hình nhỏ, các vị trí hiển thị thành danh sách có số để dễ đọc.</p>
  {result.spread==='celtic-cross'&&<details><summary>Quy ước Celtic Cross đang dùng</summary><p>{registry.celticSource.convention}</p><p>{registry.celticSource.adaptation}</p><a href={registry.celticSource.url} target="_blank" rel="noreferrer">Nguồn Waite · Part III §7 ↗</a></details>}
 </section></TarotCloth>;
}
