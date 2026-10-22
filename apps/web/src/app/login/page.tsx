'use client';

import Link from 'next/link';
import { useEffect, useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import {loginDestination} from '@/lib/login-destination';
import styles from './login-entry.module.css';

type EntryScreen = 'login' | 'register' | 'recover';
function requestedScreen(): EntryScreen {
  const mode = new URLSearchParams(window.location.search).get('mode');
  return mode === 'register' || mode === 'recover' ? mode : 'login';
}

export default function LoginPage() {
  const { user, loading, open, close } = useAuth();
  const router = useRouter();
  const opened = useRef(false);
  const returning = useRef(false);
  const [routingError,setRoutingError]=useState('');
  const [retry,setRetry]=useState(0);

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (returning.current) return;
      returning.current = true;
      const controller=new AbortController();setRoutingError('');
      void loginDestination('/login',window.location.search,controller.signal).then(destination=>{
        if(controller.signal.aborted)return;close();router.replace(destination);
      }).catch(()=>{if(!controller.signal.aborted){returning.current=false;setRoutingError('Chưa kiểm tra được quyền tài khoản. Hãy thử lại.');}});
      return ()=>{controller.abort();returning.current=false;};
    } else if (!opened.current) {
      opened.current = true;
      open(requestedScreen());
    }
  }, [user, loading, open, close, router,retry]);

  return <section className={`page-heading ${styles.landing} thien-mon-login-landing`} aria-labelledby="login-page-title">
    <div className="eyebrow">THIÊN ĐỒ · TÀI KHOẢN</div>
    <h1 id="login-page-title" className="serif">Không gian nghiên cứu của bạn</h1>
    <p>Đăng nhập để lập và lưu lá số, hoặc tạo tài khoản miễn phí. Tài khoản người dùng mở không gian nghiên cứu; tài khoản được cấp quyền quản trị tự chuyển đến trung tâm điều hành và xác minh MFA.</p>
    {routingError&&<p role="alert">{routingError} <button type="button" onClick={()=>setRetry(value=>value+1)}>Thử lại</button></p>}
    <div className={styles.actions} aria-label="Các cách truy cập tài khoản">
      <button type="button" className="button primary" disabled={loading || Boolean(user)} onClick={() => open('login')}>
        {loading ? 'Đang kiểm tra tài khoản…' : user ? 'Đang trở về công cụ…' : 'Đăng nhập'}
      </button>
      <button type="button" className="button" disabled={loading || Boolean(user)} onClick={() => open('register')}>Tạo tài khoản</button>
      <button type="button" className={styles.recovery} disabled={loading || Boolean(user)} onClick={() => open('recover')}>Quên mật khẩu?</button>
    </div>
    <p className={styles.links}><Link href="/">Trang chủ</Link><span aria-hidden="true">·</span><Link href="/huyen-hoc">Khám phá các bộ môn</Link></p>
  </section>;
}
