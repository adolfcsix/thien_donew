'use client';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useEffect,useState,useRef,type ReactNode} from 'react';
import {useAuth} from '@/components/auth-provider';
import {useAdminSession} from '@/features/membership/admin-session';
import {adminLinks,resolveAdminLink} from './model';
import {AdminRoleBadge} from './role-badge';
import css from './console.module.css';
export function AdminWorkspaceFrame({children}:{children:ReactNode}){
 const {access,identity,capabilities,reverify}=useAdminSession(),{user}=useAuth(),pathname=usePathname();
 const search=useSearchParams(),route=resolveAdminLink(pathname,search.toString());
 const [menu,setMenu]=useState(false),[query,setQuery]=useState(''),[narrow,setNarrow]=useState(false);
 const toggle=useRef<HTMLButtonElement>(null),aside=useRef<HTMLElement>(null);
 useEffect(()=>{const mq=window.matchMedia('(max-width:900px)');const sync=()=>{setNarrow(mq.matches);if(!mq.matches)setMenu(false);};sync();mq.addEventListener('change',sync);return()=>mq.removeEventListener('change',sync);},[]);
 useEffect(()=>{if(!menu)return;const previous=document.activeElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';aside.current?.querySelector<HTMLElement>('a,button,input')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();setMenu(false);}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);if(previous instanceof HTMLElement)previous.focus();};},[menu]);
 useEffect(()=>setMenu(false),[pathname,search]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{
  const target=e.target as HTMLElement|null,typing=target?.matches('input,textarea,select,[contenteditable="true"]');
  if(document.querySelector('.modal-backdrop'))return;
  if(((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')||(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey)){
   e.preventDefault();if(narrow)setMenu(true);requestAnimationFrame(()=>aside.current?.querySelector<HTMLInputElement>('input')?.focus());
  }
 };document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[narrow]);
 const allowed=adminLinks.filter(l=>!l.cap||l.cap==='owner'?(!l.cap||access.isOwner):capabilities.includes(l.cap));
 const denied=!!route?.cap&&(route.cap==='owner'?!access.isOwner:!capabilities.includes(route.cap));
 const links=allowed.filter(l=>l.label.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
 function theme(){const next=document.documentElement.dataset.thiendoTheme==='light'?'dark':'light';try{localStorage.setItem('thiendo-theme',next);}catch{}window.dispatchEvent(new StorageEvent('storage',{key:'thiendo-theme'}));}
 return <div className={css.console} data-admin-workspace="true">
  <a className="skip-link" href="#admin-content">Đến nội dung quản trị</a>
  <aside className={`${css.sidebar} ${menu?css.open:''}`} aria-label="Menu quản trị" id="admin-sidebar" ref={aside} inert={narrow&&!menu} role={narrow&&menu?'dialog':undefined} aria-modal={narrow&&menu?true:undefined} onKeyDown={e=>{if(!menu||e.key!=='Tab')return;const nodes=[...e.currentTarget.querySelectorAll<HTMLElement>('a[href],button,input')];const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}>
   <Link href="/admin" className={css.brand}><span className="thien-mon-approved-icon"/><span>THIÊN ĐỒ<small>TRUNG TÂM ĐIỀU HÀNH</small></span></Link>
   <div className={css.operator}><AdminRoleBadge identity={identity} size={64}/><div><strong>{user?.displayName||user?.username||'Quản trị'}</strong><small>{access.isOwner?'CHỦ HỆ THỐNG':'QUẢN TRỊ VIÊN'} · MFA</small></div></div>
   <label className={css.navSearch}>Tìm phân hệ<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nội dung, thành viên…"/></label>
   <nav aria-label="Điều hướng quản trị">{['ĐIỀU HÀNH','NỘI DUNG','VẬN HÀNH','HỆ THỐNG','TRỢ GIÚP'].filter(group=>links.some(l=>l.group===group)).map(group=><section key={group}><h2>{group}</h2>{links.filter(l=>l.group===group).map(l=><Link key={l.href} href={l.href} onClick={()=>setMenu(false)} aria-current={route?.href===l.href?'page':undefined}><span aria-hidden="true">{l.symbol}</span>{l.label}</Link>)}</section>)}</nav>
   <Link className={css.returnLink} href="/study">↗ Mở giao diện người dùng</Link>
  </aside>
  {menu&&<button type="button" className={css.shade} aria-label="Đóng menu quản trị" onClick={()=>setMenu(false)}/>}
  <div className={css.workArea} inert={narrow&&menu}>
   <header className={css.topbar}><div className={css.topTitle}><button type="button" className={css.menuToggle} ref={toggle} aria-expanded={menu} aria-controls="admin-sidebar" onClick={()=>setMenu(!menu)} aria-label={menu?'Đóng menu quản trị':'Mở menu quản trị'}>☰</button><div><span>KHÔNG GIAN QUẢN TRỊ</span><strong>{route?.label||'Bàn điều hành'}</strong></div></div><div className={css.topActions}><button type="button" onClick={theme} aria-label="Đổi sáng tối quản trị">☼</button><button type="button" onClick={reverify}>Xác minh MFA</button><Link href="/admin/profile">Hồ sơ quản trị</Link></div></header>
   <div id="admin-content" tabIndex={-1} className={css.content}>{denied?<section role="alert"><h1>Phân hệ chưa được cấp quyền</h1><p>Chủ hệ thống chưa phân công quyền truy cập phân hệ này cho tài khoản của bạn.</p><Link href="/admin">Về bàn điều hành</Link></section>:children}</div>
   <footer className={css.footer}>THIÊN ĐỒ · Mọi quyền được xác minh tại máy chủ. Thay đổi nhạy cảm được ghi nhật ký.</footer>
  </div>
 </div>;
}
