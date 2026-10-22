/** Runtime contracts for the two independent admin authorization APIs.
 * A TypeScript generic on api<T>() does not validate an HTTP JSON response.
 * Fail closed if a stale proxy / partial service response has wrong fields.
 */
export type AdminAccess = {isAdmin:boolean;isOwner:boolean};
export type AdminMfa = {configured:boolean;enabled:boolean;verified:boolean;stepUp:boolean;role:string;handle:string|null};

function record(value:unknown):value is Record<string,unknown> {
  return value!==null && typeof value==='object' && !Array.isArray(value);
}
export function parseAdminAccess(value:unknown):AdminAccess {
  if(!record(value) || typeof value.isAdmin!=='boolean' || typeof value.isOwner!=='boolean' || (value.isOwner&&!value.isAdmin))
    throw new Error('Phản hồi phân quyền quản trị không hợp lệ. Hãy kiểm tra lại phiên đăng nhập.');
  return {isAdmin:value.isAdmin,isOwner:value.isOwner};
}
export function parseAdminMfa(value:unknown,access:AdminAccess):AdminMfa {
  if(!record(value) || typeof value.configured!=='boolean' || typeof value.enabled!=='boolean' || typeof value.verified!=='boolean' || typeof value.stepUp!=='boolean' ||
    (value.role!=='admin'&&value.role!=='owner') || !(value.handle===null||typeof value.handle==='string') ||
    !access.isAdmin || access.isOwner!==(value.role==='owner') || (value.verified&&!value.enabled) || (value.stepUp&&!value.verified))
    throw new Error('Trạng thái xác thực quản trị không khớp. Hãy xác minh lại quyền và MFA.');
  return {configured:value.configured,enabled:value.enabled,verified:value.verified,stepUp:value.stepUp,role:value.role,handle:value.handle};
}
