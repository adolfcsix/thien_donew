'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/components/auth-provider';
import {studyApi} from '@/lib/api';
import type {StudyEntry} from '@/features/study-room/study-types';
import {compareStudyEntries} from '@/features/unified-room/study-comparison.cjs';
import styles from '@/features/study-room/study-room.module.css';
export default function StudyComparePage(){const {user,loading,open}=useAuth();
 if(loading)return <div role="status">Đang xác minh tài khoản…</div>;
 if(!user)return <div className={styles.panel}><h1>Đối chiếu Thư phòng</h1><p>Đăng nhập để mở các bản nghiên cứu riêng tư.</p><button onClick={() => open()} className={styles.primary}>Đăng nhập</button></div>;
 return <Comparison key={user.id}/>;
}
function Comparison(){const [entries,setEntries]=useState<StudyEntry[]>([]),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(true),[filter,setFilter]=useState('all');
 useEffect(()=>{const controller=new AbortController();setBusy(true);void studyApi.list(controller.signal).then(({entries:loaded})=>{
  if(controller.signal.aborted)return;setEntries(loaded);const requested=new URLSearchParams(window.location.search).get('ids')?.split(',')||[];
  setSelected([...new Set(requested)].filter(id=>loaded.some(entry=>entry.id===id)).slice(0,3));
 }).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[]);
 const selectedEntries=useMemo(()=>selected.map(id=>entries.find(e=>e.id===id)).filter((e):e is StudyEntry=>Boolean(e)),[selected,entries]);
 const comparison=selectedEntries.length>=2?compareStudyEntries(selectedEntries):null;
 const disciplines=[...new Set(entries.map(e=>e.discipline))];
 return <div className={styles.panel}><header className={styles.hero}><span className={styles.eyebrow}>THƯ PHÒNG / SO SÁNH</span><h1>Đối chiếu bản nghiên cứu</h1><p>Đặt 2–3 hồ sơ đã lưu cạnh nhau để nhận ra điểm giống và khác ở đầu vào, quy ước và dữ liệu. Không cộng điểm hoặc hòa trộn thuật toán các trường phái.</p><p><Link href="/study" className={styles.link}>← Thư phòng</Link></p></header>
 {error&&<p role="alert" className={styles.status}>{error}</p>}
 <section className={styles.panel}><div className={styles.toolbar}><label className={styles.field}><span>Lọc bộ môn</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả</option>{disciplines.map(d=><option key={d} value={d}>{d}</option>)}</select></label><p role="status" className={styles.muted}>Đã chọn {selected.length}/3 hồ sơ</p></div>
 {busy?<p>Đang tải…</p>:!entries.length?<p>Chưa có kết quả nghiên cứu đã lưu để so sánh.</p>:<div className={styles.cards}>{entries.filter(e=>filter==='all'||e.discipline===filter).map(e=><label className={styles.card} key={e.id}><span className={styles.eyebrow}>{e.discipline}</span><strong><input type="checkbox" checked={selected.includes(e.id)} disabled={!selected.includes(e.id)&&selected.length>=3} onChange={ev=>setSelected(prev=>ev.target.checked?[...prev,e.id]:prev.filter(id=>id!==e.id))}/> {e.title}</strong><span className={styles.muted}>{e.summary}</span></label>)}</div>}</section>
 {comparison?<section className={styles.panel} aria-label="Bảng so sánh"><h2>Kết quả đối chiếu</h2>
  <p>{comparison.sameDiscipline?'Cùng bộ môn.':'Khác bộ môn: chỉ nên đối chiếu về nguồn dữ liệu và quy ước, không suy ra sự đồng thuận.'} {comparison.sameMethod?'Cùng mã phương pháp đã lưu.':'Chưa xác minh cùng phương pháp; cần đọc lại nguồn và phiên bản.'}</p>
  <div className={styles.comparisonScroll}><table className={styles.compareTable}><thead><tr><th scope="col">Thuộc tính</th>{comparison.entries.map(e=><th scope="col" key={e.id}>{e.title}<small>{e.discipline}</small></th>)}</tr></thead><tbody>
    <tr><th scope="row">Bộ môn</th>{comparison.entries.map(e=><td key={e.id}>{e.discipline}</td>)}</tr>
    <tr><th scope="row">Mô tả</th>{comparison.entries.map(e=><td key={e.id}>{e.summary||'—'}</td>)}</tr>
    {comparison.fields.map(field=><tr key={field.key}><th scope="row">{field.key}{field.match?' · trùng':' · khác / thiếu'}</th>{field.values.map((value,i)=><td key={comparison.entries[i].id}>{value}</td>)}</tr>)}
   </tbody></table></div>
  <p className={styles.muted}>Chỉ đối chiếu các trường đầu vào nguyên thủy được hỗ trợ; không so sánh kết quả tính toán, dự báo hay tạo chỉ số tổng hợp. Hồ sơ đã lưu không tự cập nhật khi thay đổi ngày sinh nguồn.</p>
 </section>:<p role="status">Chọn ít nhất hai bản nghiên cứu để xem bảng đối chiếu.</p>}
 </div>;
}
