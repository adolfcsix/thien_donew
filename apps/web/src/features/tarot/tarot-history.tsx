'use client';
import {downloadBlobFile} from '@/lib/download-blob';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {TarotSnapshot} from '@thiendo/astrology-engine/src/tarot-rws.cjs';
import {validateSpreadSnapshot} from '@thiendo/astrology-engine/src/tarot-rws.cjs';
import {describeTarotMethod} from '@thiendo/astrology-engine/src/tarot-spreads.cjs';
import {compareTarotSnapshots} from '@thiendo/interpretation/src/tarot-comparison.cjs';
import {useAuth} from '@/components/auth-provider';
import {studyApi} from '@/lib/api';
import styles from './tarot-depth.module.css';
interface Candidate {id:string;title:string;createdAt:string;snapshot:TarotSnapshot;source:'account'|'session'}
export function TarotHistoryPanel({current,refresh}:{current:TarotSnapshot|null;refresh:number}){
 const {user,loading}=useAuth(),owner=user?.id??'anonymous';
 const [saved,setSaved]=useState<{owner:string;items:Candidate[];invalid:number}>({owner:'',items:[],invalid:0});
 const [session,setSession]=useState<{owner:string;items:Candidate[]}>({owner:'',items:[]});
 const [picked,setPicked]=useState<string[]>([]),[state,setState]=useState<{owner:string;message:string;busy:boolean}>({owner:'',message:'',busy:false});
 const [reload,setReload]=useState(0);const request=useRef(0),localId=useRef(0),ownerRef=useRef(owner);ownerRef.current=owner;
 useEffect(()=>{
  const epoch=++request.current,controller=new AbortController();setPicked([]);
  if(loading||!user){setSaved({owner,items:[],invalid:0});setState({owner,message:'',busy:false});return()=>controller.abort();}
  setState({owner,message:'',busy:true});
  void studyApi.list(controller.signal).then(data=>{
   if(controller.signal.aborted||request.current!==epoch||ownerRef.current!==owner)return;
   const items:Candidate[]=[];let invalid=0;
   for(const entry of data.entries.filter(e=>e.discipline==='tarot')){try{items.push({id:'account:'+entry.id,title:entry.title,createdAt:entry.createdAt,snapshot:validateSpreadSnapshot(entry.snapshot),source:'account'});}catch{invalid++;}}
   items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));setSaved({owner,items,invalid});setState({owner,message:'',busy:false});
  }).catch(e=>{if(!controller.signal.aborted&&request.current===epoch&&ownerRef.current===owner){setSaved({owner,items:[],invalid:0});setState({owner,message:e instanceof Error?e.message:'Không tải được lịch sử.',busy:false});}});
  return()=>controller.abort();
 },[user?.id,loading,refresh,reload]);
 const visibleSaved=saved.owner===owner?saved.items:[],visibleSession=session.owner===owner?session.items:[];
 const candidates=[...visibleSession,...visibleSaved],selected=candidates.filter(e=>picked.includes(e.id));
 const comparison=useMemo(()=>selected.length>=2?compareTarotSnapshots(selected.map(e=>e.snapshot)):null,[selected]);
 function addCurrent(){if(!current||visibleSession.length>=4||selected.length>=4)return;const snapshot=validateSpreadSnapshot(current),id='session:'+ ++localId.current;const item:Candidate={id,title:`Trải ${visibleSession.length+1} · ${describeTarotMethod(snapshot).name}`,createdAt:new Date().toISOString(),snapshot,source:'session'};setSession({owner,items:[...visibleSession,item]});setPicked(ids=>[...ids.filter(id=>candidates.some(e=>e.id===id)),id].slice(-4));}
 function toggle(id:string){setPicked(ids=>ids.includes(id)?ids.filter(x=>x!==id):ids.length<4?[...ids,id]:ids);}
 function exportComparison(){if(!comparison)return;downloadBlobFile(new Blob([JSON.stringify(comparison,null,2)+'\n'],{type:'application/json;charset=utf-8'}),'THIEN_DO_TAROT_SO_SANH_V11_125.json');}
 return <section className={styles.root} aria-label="Lịch sử và so sánh trải Tarot"><h2>Lịch sử & bàn so sánh</h2>
  <p>Hồ sơ tài khoản được sắp theo ngày tạo, tối đa 200 hồ sơ chung của Thư phòng. Mỗi lần lưu tạo một hồ sơ riêng; đổi bố cục hoặc bối cảnh rồi lưu sẽ giữ cả hai lần.</p>
  <div className={styles.toolbar}><button className={styles.button} type="button" disabled={!current||visibleSession.length>=4||selected.length>=4} onClick={addCurrent}>Thêm trải hiện tại vào bàn so sánh</button><button className={styles.button} type="button" disabled={!visibleSession.length} onClick={()=>{setSession({owner,items:[]});setPicked(ids=>ids.filter(id=>id.startsWith('account:')));}}>Dọn bàn so sánh của phiên này</button>{user&&<button className={styles.button} type="button" disabled={state.owner===owner&&state.busy} onClick={()=>setReload(n=>n+1)}>Tải lại lịch sử Tarot</button>}</div>
  <p className={styles.note}>Bàn phiên này giữ tối đa bốn trải do bạn chủ động thêm trong bộ nhớ; tải lại trang sẽ mất bàn. Lịch sử lâu dài dùng nút “Lưu hồ sơ nghiên cứu” và tài khoản chung.</p>
  {!user&&!loading&&<p>Đăng nhập để xem lịch sử đã lưu. Bạn vẫn có thể so sánh các trải đã thêm vào bàn trong phiên này.</p>}
  {state.owner===owner&&state.busy&&<p role="status">Đang tải lịch sử Tarot…</p>}{state.owner===owner&&state.message&&<p role="alert">{state.message}</p>}
  {saved.owner===owner&&saved.invalid>0&&<p role="alert">Có {saved.invalid} hồ sơ chưa đọc được phiên bản; đang giữ nguyên, không đổi phương pháp hoặc xóa hồ sơ.</p>}
  <p className={styles.note} role="status">{visibleSaved.length} hồ sơ tài khoản · {visibleSession.length} trải trong bàn phiên · {selected.length} / 4 đang chọn</p>
  <div>{candidates.map(e=>{const m=describeTarotMethod(e.snapshot);return <article key={e.id}><label><input type="checkbox" aria-label={`So sánh ${e.title}`} checked={picked.includes(e.id)} disabled={!picked.includes(e.id)&&selected.length>=4} onChange={()=>toggle(e.id)}/> <strong>{e.title}</strong></label><p>{m.name} · {e.snapshot.draw.length} lá · {m.legacy?'hồ sơ cũ':e.snapshot.version===2?e.snapshot.context:''} · {new Date(e.createdAt).toLocaleString('vi-VN')}</p>{e.source==='account'&&<a href={'/tarot?entry='+e.id.slice(8)}>Mở đúng trải đã lưu ↗</a>}</article>;})}</div>
  {!candidates.length&&user&&!(state.owner===owner&&state.busy)&&<p>Chưa có trải Tarot trong danh sách này. Lưu một trải rồi tải lại lịch sử.</p>}
  {comparison&&<section aria-label="Kết quả so sánh Tarot"><h3>{comparison.readingCount} trải · {comparison.positionsAligned?'cùng định nghĩa vị trí':'khác bố cục hoặc phương pháp'}</h3><p>{comparison.notice}</p>
   {comparison.contexts.some(c=>c!==comparison.contexts[0])&&<p>Các bối cảnh khác nhau; cần đối chiếu ý nghĩa theo từng bối cảnh trước khi so sánh.</p>}
   {comparison.positionsAligned&&<div style={{maxWidth:'100%',overflowX:'auto'}}><table aria-label="So sánh theo vị trí Tarot"><thead><tr><th>Vị trí</th>{selected.map((e,i)=><th key={e.id}>Trải {i+1}</th>)}</tr></thead><tbody>{comparison.rows.map(r=><tr key={r.index}><th>{r.index+1}. {r.label}</th>{r.cards.map(c=><td key={c.readingIndex}>{c.name} · {c.reversed?'ngược':'xuôi'}</td>)}</tr>)}</tbody></table></div>}
   <h4>Lá cùng xuất hiện</h4>{comparison.shared.length?comparison.shared.map(c=><p key={c.id}><strong>{c.name}:</strong> {c.occurrences.map(o=>`trải ${o.readingIndex+1}, vị trí ${o.position+1} (${o.reversed?'ngược':'xuôi'})`).join('; ')}{c.changedOrientation?' · có đổi chiều':''}</p>):<p>Không có lá chung trong các trải đã chọn; không suy rằng hoàn cảnh đã đổi hoàn toàn.</p>}<p className={styles.note}>{comparison.limit}</p><button className={styles.button} type="button" onClick={exportComparison}>Xuất so sánh JSON</button>
  </section>}
 </section>;
}
