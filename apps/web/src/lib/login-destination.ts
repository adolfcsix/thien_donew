import {api} from './api';
import {safeToolReturn} from './tool-access.cjs';
import {parseAdminAccess} from '@/features/membership/admin-session-contract';

/** Server decides role; routing never grants administrative privileges. */
export async function loginDestination(pathname:string,search:string,signal?:AbortSignal) {
  const access=parseAdminAccess(await api<unknown>('/api/billing/access',{signal,timeoutMs:15000}));
  if(access.isAdmin)return pathname.startsWith('/admin')?pathname:'/admin';
  if(pathname==='/login') {
    const next=safeToolReturn(new URLSearchParams(search).get('next'));
    return next.startsWith('/admin')?'/chart':next;
  }
  return '/chart';
}
