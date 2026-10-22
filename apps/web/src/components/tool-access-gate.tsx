'use client';
import {Fragment,useEffect,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {useAuth} from './auth-provider';
import {requiresToolLogin,safeToolReturn} from '@/lib/tool-access.cjs';
export function ToolAccessGate({children}:{children:ReactNode}){
 const pathname=usePathname(),router=useRouter(),{user,loading}=useAuth();
 // AdminLayout owns its own authentication, role and MFA gates. Let it show
 // the dedicated sign-in prompt rather than redirecting to the generic tool login.
 // Privileged endpoints remain protected by the API's role/MFA guards.
 const adminRoute=pathname==='/admin'||pathname.startsWith('/admin/');
 const protectedRoute=requiresToolLogin(pathname)&&!adminRoute;
 useEffect(()=>{
  if(protectedRoute&&!loading&&!user){
   const next=safeToolReturn(window.location.pathname+window.location.search+window.location.hash);
   router.replace('/login?next='+encodeURIComponent(next));
  }
 },[protectedRoute,loading,user,router,pathname]);
 if(!protectedRoute)return children;
 if(user)return <Fragment key={user.id}>{children}</Fragment>;
 return <section className="page-heading" aria-live="polite"><h1 className="serif">{loading?'Đang kiểm tra tài khoản…':'Đăng nhập để sử dụng công cụ'}</h1><p>{loading?'Vui lòng chờ trong giây lát.':'Tài khoản miễn phí giúp bạn lập kết quả và tiếp tục nghiên cứu trong Thư phòng.'}</p></section>;
}
