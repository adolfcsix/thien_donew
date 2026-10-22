import {ForbiddenException} from '@nestjs/common';
export const ADMIN_DOMAINS=['overview','content','members','library','community','ranks','finance','ai','portal','audit'] as const;
export const ADMIN_CAPABILITIES=[...ADMIN_DOMAINS.flatMap(domain=>domain==='overview'||domain==='audit'?[domain+'.read']:[domain+'.read',domain+'.write']),'content.publish','content.delete'];
export function effectiveCapabilities(role:string,stored:unknown):string[]{
 if(!['owner','admin'].includes(role))throw new ForbiddenException('Vai trò quản trị không hợp lệ');
 if(role==='owner'||stored===null||stored===undefined)return [...ADMIN_CAPABILITIES];
 if(!Array.isArray(stored)||!stored.every(c=>typeof c==='string'&&ADMIN_CAPABILITIES.includes(c)))throw new ForbiddenException('Cấu hình quyền quản trị không hợp lệ');
 return stored;
}
/** Express's original URL is authoritative. Match complete route segments. */
export function requestCapability(req:{originalUrl?:string;url?:string;method?:string}):string|null{
 const path=(req.originalUrl||req.url||'').split('?')[0].toLowerCase().replace(/\/+$/,'');
 if(!path)return null; // Internal callers without an HTTP route still require membership/MFA.
 if(/^\/api\/admin\/console\/(session|identity|profile|team)(\/|$)/.test(path) || /^\/api\/auth\/mfa\/trusted-devices\/revoke$/.test(path))return null;
 let domain='';
 if(/^\/api\/admin\/console\/(pro|premium-sections)(\/|$)/.test(path))return 'finance.'+(['GET','HEAD'].includes((req.method||'GET').toUpperCase())?'read':'write');
 if(/^\/api\/admin\/console\/message-reports(\/|$)/.test(path))return 'community.'+(['GET','HEAD'].includes((req.method||'GET').toUpperCase())?'read':'write');
 if(/^\/api\/admin\/console\/posts\/[^/]+\/(publish|unpublish)$/.test(path))return 'content.publish';
 if(/^\/api\/admin\/console\/posts\/[^/]+\/(delete|restore)$/.test(path))return 'content.delete';
 if(/^\/api\/admin\/console\/posts(\/|$)/.test(path)||/^\/api\/admin\/posts(\/|$)/.test(path))domain='content';
 else if(/^\/api\/admin\/console\/members(\/|$)/.test(path)||/^\/api\/admin\/users(\/|$)/.test(path))domain='members';
 else if(/^\/api\/admin\/(console\/audit|audit)(\/|$)/.test(path))domain='audit';
 else if(/^\/api\/(books|van-kho)\/admin(\/|$)/.test(path))domain='library';
 else if(/^\/api\/forum\/(?:admin|moderation)(\/|$)/.test(path))domain='community';
 else if(/^\/api\/tinh-canh\/admin(\/|$)/.test(path))domain='ranks';
 else if(/^\/api\/huyen-giai\/admin(\/|$)/.test(path))domain='ai';
 else if(/^\/api\/portal\/admin(\/|$)/.test(path))domain='portal';
 else if(/^\/api\/admin\/insights\/(chat|conversations|questions|query)(\/|$)/.test(path))domain='overview';
 else if(/^\/api\/admin\/(overview|insights)(\/|$)/.test(path))domain='overview';
 else if(/^\/api\/admin\/(finance|orders|plans|entitlements|consultations|consultation-config)(\/|$)/.test(path))domain='finance';
 if(!domain)return '__owner_only__';
 if(domain==='overview')return 'overview.read';
 return domain+'.'+(['GET','HEAD','OPTIONS'].includes((req.method||'GET').toUpperCase())?'read':'write');
}

/** Publishing live content is separate from drafting, including old save APIs. */
export async function assertContentPublishing(client:{query:Function},actor:string){
 const r=await client.query('SELECT m.role,p.capabilities FROM admin_memberships m LEFT JOIN admin_permission_sets p ON p.user_id=m.user_id WHERE m.user_id=$1',[actor]);
 const row=r.rows[0];if(!row||!effectiveCapabilities(row.role,row.capabilities).includes('content.publish'))throw new ForbiddenException('Bạn chưa được cấp quyền xuất bản hoặc thay đổi bài đang công khai');
}
