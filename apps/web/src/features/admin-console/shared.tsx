'use client';
import {useCallback,useEffect,useState} from 'react';
import {api} from '@/lib/api';
import css from './console.module.css';
export function useConsoleData<T>(url:string){const [data,setData]=useState<T|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);const reload=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{const c=new AbortController();setLoading(true);setError('');setData(null);void api<T>(url,{signal:c.signal,timeoutMs:20000}).then(v=>{if(!c.signal.aborted)setData(v);}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[url,version]);return {data,loading,error,reload};}
export function ConsoleHero({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children?:React.ReactNode}){return <header className={css.hero}><div><span className={css.eyebrow}>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children&&<div className={css.heroActions}>{children}</div>}</header>;}
export function Feedback({error,notice}:{error?:string;notice?:string}){return <>{error&&<p className={css.notice} role="alert">{error}</p>}{notice&&<p className={css.notice} role="status">{notice}</p>}</>;}
export function Pagination({page,total,setPage}:{page:number;total:number;setPage:(v:number)=>void}){return <div className={css.pagination}><span>{total.toLocaleString('vi-VN')} kết quả · Trang {page}/{Math.max(1,Math.ceil(total/20))}</span><div className={css.actions}><button disabled={page<=1} onClick={()=>setPage(page-1)}>← Trước</button><button disabled={page*20>=total} onClick={()=>setPage(page+1)}>Tiếp →</button></div></div>;}
export const date=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
