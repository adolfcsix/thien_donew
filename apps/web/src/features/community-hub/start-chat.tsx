'use client';
import {useRouter,usePathname} from 'next/navigation';
import {useAuth} from '@/components/auth-provider';
import {api} from '@/lib/api';
import {useAdminTask} from '@/features/admin/use-admin-task';
export function StartChat({peer}:{peer:string}){const {user,open}=useAuth(),router=useRouter(),pathname=usePathname(),task=useAdminTask();if(user?.id===peer)return null;return <div><button type="button" disabled={task.pending} onClick={()=>{if(!user){open('login');return;}void task.run(async signal=>{const r=await api<{id:string}>('/api/community/conversations/'+peer,{method:'POST',body:{},signal,timeoutMs:15000});router.push((pathname.startsWith('/admin')?'/admin/messages':'/messages')+'?conversation='+encodeURIComponent(r.id));})}}>{task.pending?'Đang mở hội thoại…':'✉ Trò chuyện riêng ↗'}</button>{task.error&&<p role="alert">{task.error}</p>}</div>;}
