'use client';
import {StudyTabs} from '@/components/study-tabs/study-tabs';
import {useMemo,useState} from 'react';
import type {WesternStudy} from '@thiendo/interpretation/src/western-depth.cjs';
import {TOPICS,buildNatalTopic} from './natal-topic.cjs';
import {downloadBlobFile} from '@/lib/download-blob';
import styles from './study-workbench.module.css';
export function NatalStudyWorkbench({report,onSelect,busy=false}:{report:WesternStudy;onSelect:(body:string)=>void;busy?:boolean}){
 const [topic,setTopic]=useState('self'),[view,setView]=useState('planets');
 const data=useMemo(()=>buildNatalTopic(report,topic),[report,topic]);
 function download(){downloadBlobFile(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),'thien-do-natal-chu-de.json');}
 return <section className={styles.root} aria-label="Bàn đọc Natal theo chủ đề"><h3>Bàn đọc Natal theo chủ đề</h3><p>Chọn vấn đề để nối hành tinh, lĩnh vực nhà và góc hợp thật trong lá số. Đổi chủ đề chỉ đổi cách đọc, không tính lại vị trí.</p><label>Chủ đề đọc Natal<select value={topic} disabled={busy} onChange={e=>setTopic(e.target.value)}>{TOPICS.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><p>{data.question}</p>
 <StudyTabs label="Lớp dữ kiện Natal" items={[{id:'planets',label:'Hành tinh'},{id:'houses',label:'Lĩnh vực nhà'},{id:'aspects',label:'Góc hợp liên quan'}]} value={view} onChange={setView}>
 {view==='planets'&&<div className={styles.grid}>{data.planets.map(p=><article key={p.body}><h4>{p.name} · {p.sign} · nhà {p.house}</h4><p>{p.reading}</p><p><strong>Thử trong thực tế:</strong> {p.practice}</p><p>{p.question}</p><p className={styles.muted}>{p.caution}</p><button type="button" disabled={busy} onClick={()=>onSelect(p.body)}>Chọn {p.name} trên bản đồ sao</button></article>)}</div>}
 {view==='houses'&&<div className={styles.grid}>{data.houses.map(h=><article key={h.number}><h4>Nhà {h.number} · {h.area}</h4><p>{h.sign} · chủ tinh {h.ruler.name} ở {h.ruler.sign}, nhà {h.ruler.house}.</p><p>{h.occupants.length?'Thiên thể: '+h.occupants.map(b=>report.planets.find(p=>p.body===b)?.profile.name||b).join(', '):'Nhà không có thiên thể trong bộ 10 đang tính; vẫn có cung và chủ tinh để xem xét.'}</p><p>{h.question}</p><button type="button" disabled={busy} onClick={()=>onSelect(h.ruler.body)}>Xem chủ tinh nhà {h.number}</button></article>)}</div>}
 {view==='aspects'&&<><p role="status">{data.aspects.length} góc có hành tinh thuộc chủ đề này; không phải toàn bộ góc trong lá số.</p>{data.aspects.map(a=><details key={a.first+':'+a.second}><summary>{a.firstName} ↔ {a.secondName} · {a.name} · orb {a.orb.toFixed(3)}°</summary><p>{a.reading}</p><p>{a.question}</p><p>{a.notice}</p><button type="button" disabled={busy} onClick={()=>onSelect(a.first)}>Chọn {a.firstName}</button> <button type="button" disabled={busy} onClick={()=>onSelect(a.second)}>Chọn {a.secondName}</button></details>)}{!data.aspects.length&&<p>Không có góc trong phạm vi đã chọn; không tự thêm một góc từ sự giống nhau của nguyên tố.</p>}</>}
 </StudyTabs>
 <div className={styles.exercise}><h4>Bài tập gắn với chủ đề</h4><p>{data.exercise}</p><p><strong>Cách hiểu khác cần giữ:</strong> {data.counter}</p></div><p className={styles.muted}>{data.scope}</p><button type="button" onClick={download}>Xuất bàn đọc chủ đề JSON</button><p className={styles.muted}>Bản xuất bỏ tên/ngày/nơi sinh gốc. Tọa độ vẫn có thể gợi thời điểm sinh; xem trước khi chia sẻ. Chủ đề/lớp hiện chưa lưu riêng vào hồ sơ Thư phòng.</p></section>;
}
