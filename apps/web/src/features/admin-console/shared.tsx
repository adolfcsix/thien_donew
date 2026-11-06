'use client';
import {useCallback,useEffect,useState} from 'react';
import {api} from '@/lib/api';
import css from './console.module.css';
export function useConsoleData<T>(url:string){
 const [snapshot,setSnapshot]=useState<{url:string;version:number;data:T|null;error:string;loading:boolean}|null>(null);
 const [version,setVersion]=useState(0);
 const reload=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{
  const c=new AbortController();
  setSnapshot({url,version,data:null,error:'',loading:true});
  void api<T>(url,{signal:c.signal,timeoutMs:20000}).then(data=>{
   if(!c.signal.aborted)setSnapshot({url,version,data,error:'',loading:false});
  }).catch(e=>{
   if(!c.signal.aborted)setSnapshot({url,version,data:null,error:e.message,loading:false});
  });
  return()=>c.abort();
 },[url,version]);
 // Effects run after render. Never expose a previous resource even for that render.
 const current=snapshot?.url===url&&snapshot.version===version?snapshot:null;
 return {data:current?.data??null,loading:current?.loading??true,error:current?.error??'',reload};
}
export function ConsoleHero({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children?:React.ReactNode}){return <header className={css.hero}><div><span className={css.eyebrow}>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children&&<div className={css.heroActions}>{children}</div>}</header>;}
export function Feedback({error,notice}:{error?:string;notice?:string}){return <>{error&&<p className={css.notice} role="alert">{error}</p>}{notice&&<p className={css.notice} role="status">{notice}</p>}</>;}
export function Pagination({page,total,setPage}:{page:number;total:number;setPage:(v:number)=>void}){return <div className={css.pagination}><span>{total.toLocaleString('vi-VN')} kết quả · Trang {page}/{Math.max(1,Math.ceil(total/20))}</span><div className={css.actions}><button disabled={page<=1} onClick={()=>setPage(page-1)}>← Trước</button><button disabled={page*20>=total} onClick={()=>setPage(page+1)}>Tiếp →</button></div></div>;}
export const date=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
