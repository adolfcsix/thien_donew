'use client';
import {useState} from 'react';
import {api} from '@/lib/api';
import {EmailVerification} from '@/features/community-hub/email-verification';
import {useAuth} from '@/components/auth-provider';
import {useAdminTask} from '@/features/admin/use-admin-task';
import styles from './membership.module.css';
type Status={configured:boolean;enabled:boolean;verified:boolean;stepUp:boolean;role:string;handle:string|null};
export default function AdminMfaGate({status,onVerified}:{status:Status;onVerified:()=>void}){
 const {open}=useAuth();
 const [password,setPassword]=useState(''),[code,setCode]=useState(''),[key,setKey]=useState(''),[uri,setUri]=useState('');
 const [trustDevice,setTrustDevice]=useState(false);
 const [emailVerified,setEmailVerified]=useState<boolean|null>(null);
 const {pending:busy,error,run}=useAdminTask();
 async function enroll(){await run(async signal=>{
  const result=await api<{manualKey:string;otpauthUrl:string}>('/api/auth/mfa/setup',{method:'POST',body:{password},signal});
  if(signal.aborted)return;
  setKey(result.manualKey);setUri(result.otpauthUrl);setPassword('');
 });}
 async function verify(){await run(async signal=>{
  await api<{verified:true}>('/api/auth/mfa/'+(key?'confirm':'verify'),{method:'POST',body:{code,trustDevice},signal});
  if(signal.aborted)return;
  setCode('');setKey('');setUri('');onVerified();
 });}
 return <main className={styles.page} style={{width:'100%',boxSizing:'border-box',padding:'24px 16px'}}><section className={styles.card} style={{width:'100%',maxWidth:640,boxSizing:'border-box',margin:'24px auto'}}>
  <h1 className="serif">Bảo vệ khu vực quản trị</h1>
  <p>Đăng nhập tài khoản chỉ là bước đầu. Quyền quản trị cần mã xác thực từ ứng dụng Authenticator riêng của bạn.</p>
  <p>Quyền: <strong>{status.role}</strong>{status.handle?' · '+status.handle:''}</p>
  {status.configured&&!status.enabled&&<section aria-label="Bước 1 · Xác minh email"><h2>Bước 1 · Xác minh email</h2><EmailVerification onVerified={()=>setEmailVerified(true)} onStatus={setEmailVerified}/></section>}
  {status.configured&&!status.enabled&&<p>Lần đầu: xác minh email ở bước 1, nhập mật khẩu tại bước 2 để lấy khóa, sau đó nhập mã 6 chữ số từ ứng dụng Authenticator tại bước 3. <strong>Mã email và mã Authenticator là hai mã khác nhau.</strong></p>}<button type="button" disabled={busy} onClick={()=>open()}>Mở Hồ sơ &amp; Bảo mật</button>
  {!status.configured&&<><h2>Chưa thể xác minh · Thiếu cấu hình máy chủ</h2><p role="alert">Máy chủ chưa cấu hình khóa mã hóa MFA. Người vận hành cần cấu hình ADMIN_MFA_ENCRYPTION_KEY và khởi động lại backend theo HUONG_DAN.md. Mọi API quản trị vẫn bị khóa.</p><p>{status.enabled?'Tài khoản này đã liên kết Authenticator. Cần khôi phục đúng khóa mã hóa máy chủ đã dùng trước đây từ bản sao lưu .env. Chưa thể nhận mã cho đến khi cấu hình được khôi phục.':'Chưa thể liên kết Authenticator cho đến khi người vận hành hoàn thành cấu hình bên dưới.'}</p><details open><summary>{status.enabled?'Khôi phục cấu hình MFA đã có':'Thiết lập lần đầu trên máy local'}</summary>{!status.enabled&&<ol><li>Mở Terminal trong thư mục dự án và chạy <code>npm.cmd run admin:mfa:init</code>.</li><li>Khởi động lại backend hoặc chạy lại <code>npm.cmd run dev</code>.</li><li>Bấm “Kiểm tra lại cấu hình”, xác minh email, rồi nhập mật khẩu để lấy khóa liên kết Authenticator.</li></ol>}<p>Nếu đã từng thiết lập MFA, cần dùng lại khóa trong bản sao lưu .env; không tạo khóa mới thay khóa cũ.</p><p>Gửi mã email cần cấu hình dịch vụ email. Nếu chỉ kiểm tra trên máy local, xem hướng dẫn xác nhận email Owner trong HUONG_DAN.md.</p><button type="button" disabled={busy} onClick={onVerified}>Kiểm tra lại cấu hình</button></details></>}
  {status.configured&&!status.enabled&&!key&&<form className={styles.form} onSubmit={e=>{e.preventDefault();if(emailVerified===true)void enroll();}}>
   <h2>Bước 2 · Liên kết ứng dụng Authenticator</h2>
   <p role="status">{emailVerified===null?'Đang kiểm tra trạng thái email…':emailVerified?'Email đã xác minh. Nhập mật khẩu để tạo khóa liên kết.':'Cần hoàn thành xác minh email ở bước 1 trước khi thiết lập MFA.'}</p>
   <label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" required disabled={busy||emailVerified!==true} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button disabled={busy||emailVerified!==true}>Thiết lập MFA</button>
  </form>}
  {key&&<><h2>Bước 3 · Thêm khóa vào ứng dụng xác thực</h2><p>Nhập khóa sau vào ứng dụng xác thực trên thiết bị của bạn. <strong>Không gửi khóa này cho người khác.</strong></p>
   <output style={{overflowWrap:'anywhere',display:'block',fontFamily:'monospace'}}>{key}</output>
   <p className={styles.muted}>Định dạng: TOTP · 6 chữ số · 30 giây. URI dùng cho ứng dụng Authenticator: <code style={{overflowWrap:'anywhere'}}>{uri}</code></p></>}
  {status.configured&&status.enabled&&<><h2>Nhập mã Authenticator để vào Bàn điều hành</h2><p>Mở ứng dụng Authenticator đã liên kết với Thiên Đồ để lấy mã. Mỗi mã chỉ dùng một lần; nếu vừa dùng, đợi mã mới. Nếu máy chủ vừa đổi khóa MFA hoặc bạn mất thiết bị, xem quy trình khôi phục trong HUONG_DAN.md.</p></>}
  {status.configured&&(status.enabled||!!key)&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void verify();}}>
   <label>Mã Authenticator 6 chữ số (không phải mã email)<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
   <label className={styles.trustedBrowser}><input type="checkbox" checked={trustDevice} onChange={e=>setTrustDevice(e.target.checked)}/>Ghi nhớ trình duyệt tin cậy trong 30 ngày; những lần đăng nhập sau không cần OTP để xem Bàn điều hành. Không dùng trên thiết bị chung. Thao tác quản trị thay đổi dữ liệu vẫn yêu cầu mã mới.</label>
   <button disabled={busy||code.length!==6}>{key?'Xác nhận thiết lập':'Xác minh và vào Bàn điều hành'}</button>
  </form>}
  {status.configured&&status.enabled&&<p className={styles.muted}>Trên máy đã ghi nhớ trước đó, đăng nhập sẽ tự mở Bàn điều hành. Nếu chưa mở được, nhập mã Authenticator tại đây. Bạn có thể chuyển sang ứng dụng xác thực rồi quay lại mà không mất bước đang làm.</p>}
  {status.configured&&<button type="button" disabled={busy} onClick={onVerified}>Kiểm tra lại trạng thái MFA</button>}
  {error&&<p role="alert" className={styles.notice}>{error}</p>}
 </section></main>;
}
