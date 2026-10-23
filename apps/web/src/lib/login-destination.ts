import {api} from './api';
import {safeToolReturn} from './tool-access.cjs';

function confirmedTarget(value:unknown):'/chart'|'/admin' {
  if(value!=='/chart'&&value!=='/admin')throw new Error('Phản hồi điều hướng tài khoản không hợp lệ.');
  return value;
}
/** Backend selects the landing area. A route or client-side hint never grants admin rights. */
export async function loginDestination(pathname:string,search:string,signal?:AbortSignal,confirmedDestination?:unknown) {
  let target:'/chart'|'/admin';
  if(confirmedDestination!==undefined)target=confirmedTarget(confirmedDestination);
  else {
    const receipt=await api<unknown>('/api/auth/destination',{signal,timeoutMs:15000});
    target=confirmedTarget(receipt&&typeof receipt==='object'&&!Array.isArray(receipt)?(receipt as Record<string,unknown>).destination:undefined);
  }
  if(target==='/admin')return pathname==='/admin'||pathname.startsWith('/admin/')?pathname:'/admin';
  if(pathname==='/login') {
    const next=safeToolReturn(new URLSearchParams(search).get('next'));
    return next==='/admin'||next.startsWith('/admin/')||next.startsWith('/admin?')||next.startsWith('/admin#')?'/chart':next;
  }
  return '/chart';
}
