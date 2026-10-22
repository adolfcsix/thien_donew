'use client';
import {useCallback,useEffect,useState,type ReactNode} from 'react';
import {useAuth} from '@/components/auth-provider';
import {api} from '@/lib/api';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useVisibleRefresh} from '@/lib/use-visible-refresh';
function usePremiumRefresh(){const pathname=usePathname(),[revision,setRevision]=useState(0),refresh=useCallback(()=>setRevision(x=>x+1),[]);useVisibleRefresh(refresh);useEffect(()=>{window.addEventListener('thiendo:access-changed',refresh);const timer=setInterval(()=>{if(!document.hidden)refresh()},60000);return()=>{window.removeEventListener('thiendo:access-changed',refresh);clearInterval(timer)}},[refresh]);return {pathname,revision};}

export function PremiumLock({href}:{href:string}){const {user}=useAuth(),{pathname,revision}=usePremiumRefresh(),scope=(user?.id||'guest')+':'+pathname+':'+href,[status,setStatus]=useState<{scope:string;unlocked:boolean}|null>(null),unlocked=status?.scope===scope?status.unlocked:null;useEffect(()=>{const c=new AbortController();api<{sections:{path:string;enabled:boolean}[];unlocked:boolean}>('/api/community/premium-sections',{signal:c.signal,timeoutMs:12000}).then(r=>{if(!c.signal.aborted)setStatus({scope,unlocked:r.unlocked||r.sections.find(s=>s.path===href)?.enabled===false})}).catch(()=>{if(!c.signal.aborted)setStatus({scope,unlocked:false})});return()=>c.abort()},[user?.id,href,pathname,revision,scope]);return <span className="hub-lock" aria-label={unlocked?'Pro đã mở khóa':unlocked===null?'Đang kiểm tra quyền Pro':'Nội dung cần Pro'} title={unlocked?'Đã mở khóa':'Nội dung Pro'}><svg viewBox="0 0 16 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d={unlocked?'M5 8V5a3 3 0 0 1 6 0':'M5 8V5a3 3 0 0 1 6 0v3'}/><rect x="2.5" y="8" width="11" height="8" rx="2"/><path d="M8 11v2"/></svg></span>;}
export function PremiumGate({path,children}:{path:string;children:ReactNode}){
 const {user,loading,open}=useAuth(),{revision}=usePremiumRefresh(),scope=(user?.id||'guest')+':'+path,[grant,setGrant]=useState<string|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(true),[retry,setRetry]=useState(0),allowed=!!user&&grant===scope;
 useEffect(()=>{setError('');setPending(true);if(!user){setGrant(null);setPending(false);return;}const c=new AbortController();api<{allowed:boolean}>('/api/community/premium-access?path='+encodeURIComponent(path),{signal:c.signal,timeoutMs:15000}).then(r=>{if(!c.signal.aborted)setGrant(r.allowed===true?scope:null)}).catch(e=>{if(!c.signal.aborted){setGrant(null);setError(e.message)}}).finally(()=>{if(!c.signal.aborted)setPending(false)});return()=>c.abort()},[user?.id,path,retry,revision,scope]);
 if(loading||pending&&!allowed)return <p role="status">Đang kiểm tra quyền chuyên sâu…</p>;
 if(!allowed)return <section className="hub-hero"><h1>Không gian nghiên cứu Pro</h1><p>{error||'Đăng nhập để kiểm tra quyền truy cập. Quyền Pro được quản trị cấp hoặc kích hoạt qua thanh toán đã xác minh.'}</p>{!user&&<button onClick={()=>open('login')}>Đăng nhập</button>}<Link href="/membership">Xem gói Pro ↗</Link><button onClick={()=>setRetry(x=>x+1)}>Kiểm tra lại quyền</button></section>;
 return <>{children}</>;
}
