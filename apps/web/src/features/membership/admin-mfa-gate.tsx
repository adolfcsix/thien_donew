'use client';
import {useState} from 'react';
import {api} from '@/lib/api';
import {EmailVerification} from '@/features/community-hub/email-verification';
import {useAdminTask} from '@/features/admin/use-admin-task';
import styles from './membership.module.css';
type Status={configured:boolean;enabled:boolean;verified:boolean;stepUp:boolean;role:string;handle:string|null};
export default function AdminMfaGate({status,onVerified}:{status:Status;onVerified:()=>void}){
 const [password,setPassword]=useState(''),[code,setCode]=useState(''),[key,setKey]=useState('');
 const [trustDevice,setTrustDevice]=useState(false);
 const [emailVerified,setEmailVerified]=useState<boolean|null>(null);
 const {pending:busy,error,run}=useAdminTask();
 async function enroll(){await run(async signal=>{
  const result=await api<{manualKey:string;otpauthUrl:string}>('/api/auth/mfa/setup',{method:'POST',body:{password},signal});
  if(signal.aborted)return;
  setKey(result.manualKey);setPassword('');
 });}
 async function verify(){await run(async signal=>{
  await api<{verified:true}>('/api/auth/mfa/'+(key?'confirm':'verify'),{method:'POST',body:{code,trustDevice},signal});
  if(signal.aborted)return;
  setCode('');setKey('');onVerified();
 });}
 return <main className={styles.page} style={{width:'100%',boxSizing:'border-box',padding:'24px 16px'}}><section className={styles.card} style={{width:'100%',maxWidth:640,boxSizing:'border-box',margin:'24px auto'}}>
  <h1 className="serif">Xác thực quản trị</h1>
  {!status.configured&&<><p role="alert">Xác thực quản trị chưa sẵn sàng. Cần kiểm tra cấu hình MFA trên máy chủ.</p><a href="https://github.com/adolfcsix/thien_donew/blob/main/HUONG_DAN.md#admin-mfa" target="_blank" rel="noreferrer">Hướng dẫn cấu hình</a><div className={styles.actions}><button type="button" disabled={busy} onClick={onVerified}>Kiểm tra lại cấu hình</button></div></>}
  {status.configured&&!status.enabled&&!key&&<section aria-label="Bước 1 · Xác minh email"><h2>Xác minh email</h2><EmailVerification onVerified={()=>setEmailVerified(true)} onStatus={setEmailVerified}/></section>}
  {status.configured&&!status.enabled&&!key&&<form className={styles.form} onSubmit={e=>{e.preventDefault();if(emailVerified===true)void enroll();}}>
   <h2>Liên kết Authenticator</h2>
   <p role="status">{emailVerified===null?'Đang kiểm tra trạng thái email…':emailVerified?'Email đã xác minh. Nhập mật khẩu để tạo khóa liên kết.':'Cần hoàn thành xác minh email ở bước 1 trước khi thiết lập MFA.'}</p>
   <label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" required disabled={busy||emailVerified!==true} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button disabled={busy||emailVerified!==true}>Thiết lập MFA</button>
  </form>}
  {key&&<><h2>Thêm vào Authenticator</h2><p>Dùng khóa này để thêm tài khoản trong ứng dụng Authenticator, rồi nhập mã 6 số bên dưới. Không chia sẻ khóa.</p>
   <output style={{overflowWrap:'anywhere',display:'block',fontFamily:'monospace'}}>{key}</output>
   </>}
  {status.configured&&(status.enabled||!!key)&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void verify();}}>
   <label>Mã Authenticator 6 chữ số<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
   <label className={styles.trustedBrowser}><input type="checkbox" checked={trustDevice} onChange={e=>setTrustDevice(e.target.checked)}/>Ghi nhớ trình duyệt này trong 30 ngày (chỉ dùng trên thiết bị riêng).</label>
   <button disabled={busy||code.length!==6}>{key?'Xác nhận thiết lập':'Xác minh và vào Bàn điều hành'}</button>
  </form>}
  <p className={styles.muted}><a href="https://github.com/adolfcsix/thien_donew/blob/main/HUONG_DAN.md#admin-mfa" target="_blank" rel="noreferrer">Trợ giúp xác thực</a></p>
  {error&&<p role="alert" className={styles.notice}>{error}</p>}
 </section></main>;
}
