'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useAuth} from './auth-provider';
import {api} from '@/lib/api';
import {parseAdminAccess} from '@/features/membership/admin-session-contract';
export function AdminNavLink(){
 const {user}=useAuth(),[allowed,setAllowed]=useState(false);
 useEffect(()=>{
  setAllowed(false);if(!user)return;
  let active:AbortController|null=null;
  const refresh=()=>{
   if(document.visibilityState==='hidden'||(active&&!active.signal.aborted))return;
   const controller=new AbortController();active=controller;
   void api<unknown>('/api/billing/access',{signal:controller.signal,timeoutMs:10000})
    .then(result=>{const access=parseAdminAccess(result);if(!controller.signal.aborted)setAllowed(access.isAdmin);})
    .catch(()=>{if(!controller.signal.aborted)setAllowed(false);})
    .finally(()=>{if(active===controller)active=null;});
  };
  refresh();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active?.abort();window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[user?.id]);
 return allowed?<Link href="/admin" title="Quản trị" className="nav-item"><span aria-hidden="true">⚙</span>Quản trị</Link>:null;
}
