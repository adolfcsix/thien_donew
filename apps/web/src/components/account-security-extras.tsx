'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {api} from '@/lib/api';
import {publishLogout,replaceWithOpening} from '@/lib/session-exit';

type Session={id:string;createdAt:string;expiresAt:string;deviceLabel:string;current:boolean};
type EmailStatus={verified:boolean;verifiedAt:string|null};
type SecurityEvent={id:string;event:string;createdAt:string};

export function AccountSecurityExtras({onBusyChange}: {onBusyChange?: (busy:boolean)=>void}){
 const [sessions,setSessions]=useState<Session[]>([]);
 const [events,setEvents]=useState<SecurityEvent[]>([]);
 const [email,setEmail]=useState<EmailStatus|null>(null);
 const [code,setCode]=useState('');
 const [challengeId,setChallengeId]=useState('');
 const [working,setWorking]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const busyRef=useRef(false);
 // Track the latest server snapshot: an old mount/focus GET must not undo a
 // subsequently confirmed session revocation or email verification.
 const readGeneration=useRef(0);
 const mounted=useRef(false);

 async function reload(){
  const generation=++readGeneration.current;
  try {
   const [s,e,a]=await Promise.all([
    api<{sessions:Session[]}>('/api/auth/sessions'),
    api<EmailStatus>('/api/auth/email/status'),
    api<{events:SecurityEvent[]}>('/api/auth/security/events'),
   ]);
   if(!mounted.current || generation!==readGeneration.current)return;
   setSessions(s.sessions);
   setEmail(e);
   setEvents(a.events);
  }catch(reason){
   // A retired request must not show an error or update a newer session.
   if(mounted.current && generation===readGeneration.current)throw reason;
  }
 }
 useEffect(()=>{
  mounted.current=true;
  void reload().catch(reason=>{if(mounted.current)setError(reason instanceof Error?reason.message:'Không thể tải thông tin bảo mật.');});
  return()=>{
   mounted.current=false;++readGeneration.current;
   // Release parent dialog lock when another tab revokes this identity and
   // the security panel is retired during an in-flight mutation.
   if(busyRef.current){busyRef.current=false;onBusyChange?.(false);}
  };
 },[]);

 async function perform(action:()=>Promise<string|null>){
  // The ref prevents rapid double-clicks before React propagates `working`.
  if(busyRef.current || !mounted.current)return;
  busyRef.current=true;
  ++readGeneration.current; // Invalidate GETs begun before this mutation.
  onBusyChange?.(true);
  setWorking(true);setError('');setNotice('');
  try{
   const success=await action();
   if(!mounted.current || success===null)return; // Current session already redirected.
   // Mutations are already committed. A failed GET cannot safely be treated
   // as a failed POST: never invite users to send another email OTP/revoke.
   try{await reload();if(mounted.current)setNotice(success);}
   catch{if(mounted.current)setNotice(`${success} Thông tin đã cập nhật, nhưng chưa tải lại được danh sách. Hãy kiểm tra kết nối.`);}
  }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:'Không thể hoàn tất yêu cầu.');}
  finally{busyRef.current=false;if(mounted.current){setWorking(false);onBusyChange?.(false);}}
 }

 const send=()=>perform(async()=>{
  const result=await api<{sent:boolean;challengeId:string;alreadyVerified?:boolean}>('/api/auth/email/send',{method:'POST'});
  if(result.alreadyVerified){setEmail({verified:true,verifiedAt:null});return 'Email đã xác minh.';}
  if(!result.sent || !result.challengeId)throw Error('Máy chủ chưa xác nhận việc gửi mã email.');
  setChallengeId(result.challengeId);
  return 'Đã gửi mã đến email của bạn.';
 });
 const verify=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  void perform(async()=>{
   const result=await api<{verified:true}>('/api/auth/email/verify',{method:'POST',body:{challengeId,code}});
   if(result.verified!==true)throw Error('Máy chủ chưa xác nhận email đã được xác minh.');
   setEmail({verified:true,verifiedAt:null});
   setCode('');setChallengeId('');
   return 'Email đã được xác minh.';
  });
 };
 const revoke=(session:Session)=>{
  if(busyRef.current || !confirm(session.current?'Đăng xuất phiên hiện tại?':'Đăng xuất thiết bị đã chọn?'))return;
  void perform(async()=>{
   const result=await api<{revoked:boolean;currentSession:boolean}>('/api/auth/sessions/revoke',{method:'POST',body:{sessionId:session.id}});
   if(result.currentSession){
    // Return to the opening page rather than reloading a revoked protected route.
    // The storage signal also prevents old account UI persisting in other tabs.
    publishLogout();replaceWithOpening();return null;
   }
   if(!result.revoked)return 'Phiên đăng nhập này đã được thu hồi trước đó.';
   return 'Đã thu hồi phiên đăng nhập.';
  });
 };
 return <>
  <section className="account-section"><h3>Xác minh email</h3><p>{email?.verified?'Đã xác minh email':'Email chưa được xác minh. Xác minh trước khi kích hoạt tài khoản quản trị.'}</p>
   {email&&!email.verified&&!challengeId&&<button type="button" className="btn secondary" disabled={working} onClick={()=>void send()}>Gửi mã xác minh email</button>}
   {email&&!email.verified&&challengeId&&<form className="account-form-stack" onSubmit={verify}><label>Mã gồm 6 chữ số
    <input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} disabled={working}/></label>
    <button className="btn gold" type="submit" disabled={working||code.length!==6}>Xác minh email</button>
   </form>}
  </section>
  <section className="account-section"><h3>Phiên đăng nhập và thiết bị</h3><p className="account-section-description">Bạn có thể thu hồi từng phiên đăng nhập. Khóa phiên không bao giờ hiển thị.</p>
   <button className="btn secondary" type="button" disabled={working} onClick={()=>void perform(async()=>{
    const result=await api<{revoked:number}>('/api/auth/logout/others',{method:'POST'});
    return `Đã đăng xuất ${result.revoked} thiết bị khác.`;
   })}>Đăng xuất khỏi thiết bị khác</button>
   <ul>{sessions.map(session=><li key={session.id} style={{marginTop:12}}><strong>{session.current?'Thiết bị này':'Thiết bị khác'}</strong> · {session.deviceLabel}<div className="account-control-hint">Đăng nhập: {new Date(session.createdAt).toLocaleString('vi-VN')}</div>
    <button className="link-button" type="button" disabled={working} onClick={()=>revoke(session)}>{session.current?'Đăng xuất phiên này':'Thu hồi phiên'}</button></li>)}</ul>
  </section>
  <section className="account-section"><h3>Lịch sử bảo mật</h3>
   {events.length?<ul>{events.slice(0,12).map(event=><li key={event.id}>{event.event} · {new Date(event.createdAt).toLocaleString('vi-VN')}</li>)}</ul>:<p className="account-control-hint">Chưa có nhật ký trong phạm vi hiển thị.</p>}
  </section>
  {notice&&<p role="status" className="account-success">{notice}</p>}{error&&<p role="alert" className="error">{error}</p>}
 </>;
}
