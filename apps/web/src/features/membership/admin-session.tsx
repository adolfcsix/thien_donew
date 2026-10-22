'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useAuth} from '@/components/auth-provider';
import {api} from '@/lib/api';
import {accountError} from '@/lib/account-error';
import {useVisibleRefresh} from '@/lib/use-visible-refresh';
import AdminMfaGate from './admin-mfa-gate';
import {parseAdminAccess,parseAdminMfa,type AdminAccess,type AdminMfa} from './admin-session-contract';
import styles from './membership.module.css';
import {AdminWorkspaceFrame} from '@/features/admin-console/frame';
import {parseWorkspace,type AdminIdentity} from '@/features/admin-console/model';

type Access=AdminAccess;
type Mfa=AdminMfa;
type Session={access:Access;mfa:Mfa;identity:AdminIdentity;capabilities:string[];applyIdentity:(patch:Pick<AdminIdentity,'badgeStyle'|'badgeTone'|'motto'|'showcaseLevels'>)=>void;reloadMfa:()=>void;reverify:()=>void};
const Context=createContext<Session|null>(null);
export function useAdminSession(){const value=useContext(Context);if(!value)throw Error('Verified admin session required');return value;}

export function AdminSession({children}:{children:ReactNode}){
 const {user,loading,open}=useAuth();
 if(!user)return <section className={`${styles.page} ${loading?styles.sessionPlaceholder:''}`}><h1>Khu vực quản trị</h1><p role="status">{loading?'Đang kiểm tra phiên đăng nhập…':'Chưa xác minh được phiên đăng nhập trên trình duyệt này. Hãy đăng nhập bằng tài khoản đã được cấp quyền Admin hoặc Owner.'}</p>{!loading&&<><p>Trang quản trị sử dụng tài khoản Thiên Đồ và yêu cầu xác minh MFA. Tạo tài khoản mới không tự cấp quyền quản trị.</p><button type="button" onClick={()=>open('login')}>Đăng nhập quản trị</button><p>Nếu vẫn không vào được sau khi đăng nhập, hãy kiểm tra phiên đăng nhập và liên hệ người vận hành để xác minh quyền trong cơ sở dữ liệu.</p></>}</section>;
 return <VerifiedSession key={user.id}>{children}</VerifiedSession>;
}
function VerifiedSession({children}:{children:ReactNode}){
 const {user,open}=useAuth();
 const pathname=usePathname();
 const [access,setAccess]=useState<Access|null>(null),[mfa,setMfa]=useState<Mfa|null>(null),[error,setError]=useState('');
 const [workspace,setWorkspace]=useState<ReturnType<typeof parseWorkspace>|null>(null);
 const active=useRef<AbortController|null>(null);
 const refresh=useCallback(()=>{
  // Revalidation must close the privileged UI immediately. Otherwise an old
  // verified MFA state can render a new admin route until both requests finish.
  active.current?.abort();const controller=new AbortController();active.current=controller;
  setAccess(null);setMfa(null);setWorkspace(null);setError('');
  void (async()=>{
   try{
    const a=parseAdminAccess(await api<unknown>('/api/billing/access',{signal:controller.signal,timeoutMs:15000}));
    if(controller.signal.aborted)return;
    if(!a.isAdmin){setError('Tài khoản này không có quyền quản trị.');setAccess(a);return;}
    let status=parseAdminMfa(await api<unknown>('/api/auth/mfa/status',{signal:controller.signal,timeoutMs:15000}),a);
    if(status.configured&&status.enabled&&!status.verified){
     // Trusted access is decided only by backend, with HttpOnly cookie and DB token.
     const trusted=await api<{restored:boolean}>('/api/auth/mfa/trusted-session',{method:'POST',body:{},signal:controller.signal,timeoutMs:15000});
     if(trusted.restored)status=parseAdminMfa(await api<unknown>('/api/auth/mfa/status',{signal:controller.signal,timeoutMs:15000}),a);
    }
    const own=status.configured&&status.verified?parseWorkspace(await api<unknown>('/api/admin/console/session',{signal:controller.signal,timeoutMs:15000})):null;
    if(own&&((own.identity.role==='owner')!==a.isOwner))throw Error('Danh tính quản trị không khớp');
    if(!controller.signal.aborted){setAccess(a);setMfa(status);setWorkspace(own);setError('');}
   }catch(reason){if(!controller.signal.aborted){setAccess(null);setMfa(null);setError(accountError(reason));}}
  })();
 },[]);
 useEffect(()=>{refresh();return()=>active.current?.abort();},[pathname,refresh]);
 useVisibleRefresh(refresh);
 if(error)return <section className={styles.page}><h1>Khu vực quản trị</h1><p role="alert">{error}</p>{access&&!access.isAdmin&&<><p>Đang dùng: <strong>{user?.displayName||user?.username||user?.email}</strong>. Quyền Admin/Owner được cấp riêng, không đi kèm gói dịch vụ.</p><p>Nếu đây là máy chủ mới, người vận hành cần kiểm tra tài khoản Owner đã được khởi tạo đúng database theo hướng dẫn HUONG_DAN.md.</p><button type="button" onClick={()=>open()}>Mở hồ sơ để kiểm tra hoặc đổi tài khoản</button></>}<div className={styles.actions}><button onClick={refresh}>Kiểm tra lại quyền</button><Link href="/membership">Về trang thành viên</Link></div></section>;
 if(!access||!mfa)return <p className={styles.sessionPlaceholder} role="status">Đang xác minh quyền và MFA…</p>;
 if(!mfa.configured||!mfa.verified)return <AdminMfaGate status={mfa} onVerified={refresh}/>;
 if(!workspace)return <p role="status">Đang tải không gian quản trị…</p>;
 return <Context.Provider value={{access,mfa,identity:workspace.identity,capabilities:workspace.capabilities,applyIdentity:patch=>setWorkspace(current=>current?{...current,identity:{...current.identity,...patch}}:current),reloadMfa:refresh,reverify:()=>setMfa({...mfa,verified:false})}}>
  <AdminWorkspaceFrame>
  {children}
  </AdminWorkspaceFrame>
 </Context.Provider>;
}
