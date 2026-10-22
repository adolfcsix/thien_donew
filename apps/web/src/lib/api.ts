import type { AuthUser, ChartInput, AstrologyResult, SavedChart } from '@thiendo/shared-types';
// First-party API routes are proxied by Next.js; no public backend URL or cross-origin cookie.
const ROOT = '';
// Authentication requests should never leave the account form spinning forever.
// Keep long-running calculation/export routes outside this timeout policy.
const ACCOUNT_TIMEOUT_MS = 20_000;
/** Correlates sanitized HTTP errors with server logs; the ID is non-secret. */
class ApiHttpError extends Error {
  constructor(message: string, readonly status: number, readonly requestId?: string) { super(message); }
}
class InvalidApiResponse extends Error {
  constructor() { super('Phản hồi máy chủ không hợp lệ. Hãy kiểm tra dữ liệu đã lưu trước khi thử lại.'); }
}
function responseObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Object.keys(raw).length) throw new InvalidApiResponse();
  return raw as Record<string, unknown>;
}
function authUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === 'string' && !!user.id && typeof user.email === 'string' && !!user.email;
}
function validMfaSetup(payload: Record<string, unknown>): boolean {
  if (typeof payload.manualKey !== 'string' || !/^[A-Z2-7]{32}$/.test(payload.manualKey) || typeof payload.otpauthUrl !== 'string') return false;
  try {
    const uri = new URL(payload.otpauthUrl);
    return uri.protocol === 'otpauth:' && uri.hostname === 'totp' && !uri.username && !uri.password && uri.searchParams.get('secret') === payload.manualKey;
  } catch { return false; }
}
// Never infer a session or a committed mutation from an empty/partial response.
function validateAccountResponse(path: string, payload: Record<string, unknown>): void {
  let valid = true;
  switch (path) {
    case '/api/auth/me': valid = payload.user === null || authUser(payload.user); break;
    case '/api/auth/login': case '/api/auth/register': valid = authUser(payload.user); break;
    case '/api/auth/logout': valid = payload.ok === true; break;
    case '/api/auth/logout/all': valid = payload.revoked === true; break;
    case '/api/auth/account': valid = payload.deleted === true; break;
    case '/api/auth/password': valid = payload.updated === true && payload.otherSessionsRevoked === true; break;
    case '/api/auth/password/reset': case '/api/auth/avatar': valid = payload.updated === true; break;
    case '/api/auth/profile': valid = payload.updated === true && typeof payload.displayName === 'string'; break;
    case '/api/auth/password/forgot': valid = payload.requested === true && typeof payload.challengeId === 'string' && !!payload.challengeId; break;
    case '/api/auth/google/config': valid = typeof payload.enabled === 'boolean' && (payload.enabled ? typeof payload.clientId === 'string' && !!payload.clientId : payload.clientId === null || typeof payload.clientId === 'string'); break;
    case '/api/auth/google/nonce': valid = typeof payload.nonce === 'string' && !!payload.nonce; break;
    case '/api/auth/google/start': valid = typeof payload.challengeId === 'string' && !!payload.challengeId && typeof payload.email === 'string' && !!payload.email && (payload.purpose === 'login' || payload.purpose === 'delete') && typeof payload.expiresInSeconds === 'number' && Number.isFinite(payload.expiresInSeconds) && payload.expiresInSeconds > 0; break;
    case '/api/auth/google/verify': valid = payload.deleted === true || authUser(payload.user); break;
    case '/api/auth/mfa/setup': valid = validMfaSetup(payload); break;
    case '/api/auth/mfa/confirm': case '/api/auth/mfa/verify': valid = payload.verified === true && payload.mfaEnabled === true; break;
  }
  if (!valid) throw new InvalidApiResponse();
}
const STORAGE_TIMEOUT_MS = 30_000;
const IMPORT_TIMEOUT_MS = 60_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function objectValue(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function identifier(value: unknown): value is string { return typeof value === 'string' && UUID.test(value); }
function sameIdentifier(left: unknown, right: unknown): boolean { return identifier(left) && identifier(right) && left.toLowerCase() === right.toLowerCase(); }
function count(value: unknown, max: number): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max; }
function studyRecord(value: unknown): boolean {
  return objectValue(value) && identifier(value.id) && ['general','mai-hoa','luc-hao','ky-mon','dai-luc-nham','thai-at','phong-thuy','ha-lac','thiet-ban','lich-phap','numerology','western-astrology','tarot','bazi'].includes(String(value.discipline)) &&
    typeof value.title === 'string' && typeof value.summary === 'string' && typeof value.notes === 'string' &&
    Array.isArray(value.tags) && value.tags.every(tag => typeof tag === 'string') && objectValue(value.snapshot) &&
    typeof value.pinned === 'boolean' && (value.birthProfileId===undefined||value.birthProfileId===null||identifier(value.birthProfileId)) && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string';
}
function chartRecord(value: unknown): boolean {
  return objectValue(value) && identifier(value.id) && typeof value.label === 'string' && typeof value.date === 'string' &&
    Number.isInteger(value.hour) && Number(value.hour) >= 0 && Number(value.hour) <= 23 && Number.isInteger(value.minute) && Number(value.minute) >= 0 && Number(value.minute) <= 59 &&
    ['solar','lunar'].includes(String(value.calendar)) && typeof value.leap === 'boolean' && ['Nam','Nữ'].includes(String(value.gender)) && typeof value.ruleSet === 'string' && (value.birthProfileId===undefined||value.birthProfileId===null||identifier(value.birthProfileId)) && typeof value.createdAt === 'string';
}
function birthProfileRecord(value:unknown):boolean {
  return objectValue(value) && identifier(value.id) && typeof value.name==='string' && typeof value.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    (value.hour===null||count(value.hour,23)) && (value.minute===null||count(value.minute,59)) && (value.hour===null)===(value.minute===null) &&
    ['solar','lunar'].includes(String(value.calendar)) && typeof value.leap==='boolean' && (value.gender===null||['Nam','Nữ'].includes(String(value.gender))) &&
    typeof value.timeZone==='string' && typeof value.birthPlace==='string' && (value.latitude===null||typeof value.latitude==='number') &&
    (value.longitude===null||typeof value.longitude==='number') && ['exact','estimated','unknown'].includes(String(value.timeAccuracy)) &&
    typeof value.notes==='string' && typeof value.createdAt==='string' && typeof value.updatedAt==='string';
}
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(item => typeof item === 'string'); }
function chartResult(value: unknown): boolean {
  if (!objectValue(value) || typeof value.ruleSet !== 'string' || !count(value.hour,23) || !count(value.minute,59) || !['Nam','Nữ'].includes(String(value.gender)) ||
    !objectValue(value.solar) || !objectValue(value.lunar) || !objectValue(value.cuc) || typeof value.cuc.name !== 'string' || typeof value.cuc.number !== 'number' ||
    !strings(value.warnings) || !objectValue(value.coverage) || !Array.isArray(value.houses) || value.houses.length !== 12) return false;
  for (const key of ['menh','than','thanPalace','yearCanChi','hourBranch']) if (typeof value[key] !== 'string') return false;
  for (const date of [value.solar,value.lunar]) if (!Number.isInteger(date.year) || !count(date.month,12) || date.month < 1 || !count(date.day,31) || date.day < 1) return false;
  return typeof value.lunar.leap === 'boolean' && new Set(value.houses.map(house => objectValue(house) ? house.branchIndex : undefined)).size === 12 && value.houses.every(house =>
    objectValue(house) && count(house.branchIndex,11) && Number.isInteger(house.cell) && typeof house.branch === 'string' && typeof house.stem === 'string' && typeof house.palace === 'string' && typeof house.isThan === 'boolean' &&
    strings(house.stars) && strings(house.auxiliaryStars) && strings(house.yearStars) && Array.isArray(house.tuHoa) && house.tuHoa.every(item => objectValue(item) && typeof item.name === 'string' && typeof item.star === 'string') &&
    objectValue(house.cycleStars) && ['thaiTue','bacSi','trangSinh'].every(key => strings((house.cycleStars as Record<string,unknown>)[key])));
}
// A JSON object is insufficient proof that a save/delete/import committed.
// Match durable receipt identifiers to the request before clearing retry state.
function validateStorageResponse(path: string, method: string, body: unknown, payload: Record<string, unknown>): void {
  let valid = true;
  const fields = objectValue(body) ? body : {};
  const profileId = path.match(/^\/api\/birth-profiles\/([^/]+)$/)?.[1];
  const studyId = path.match(/^\/api\/study\/([^/]+)$/)?.[1];
  const chartId = path.match(/^\/api\/charts\/([^/]+)$/)?.[1];
  const receiptId = path.match(/^\/api\/study\/import\/([^/]+)$/)?.[1];
  if (path === '/api/birth-profiles' && method === 'GET') valid = Array.isArray(payload.profiles) && payload.profiles.length<=100 && payload.profiles.every(birthProfileRecord);
  else if (path === '/api/birth-profiles' && method === 'POST') valid=identifier(payload.id);
  else if (profileId && identifier(decodeURIComponent(profileId))) {
    if(method==='GET')valid=birthProfileRecord(payload.profile)&&objectValue(payload.profile)&&sameIdentifier(payload.profile.id,decodeURIComponent(profileId));
    else if(method==='PATCH')valid=payload.updated===true;
    else if(method==='DELETE')valid=payload.deleted===true;
  }
  else if (path === '/api/study' && method === 'GET') valid = Array.isArray(payload.entries) && payload.entries.length <= 200 && payload.entries.every(studyRecord);
  else if (path === '/api/charts' && method === 'GET') valid = Array.isArray(payload.charts) && payload.charts.length <= 100 && payload.charts.every(chartRecord);
  else if (path === '/api/study' && method === 'POST') valid = identifier(payload.id);
  else if (path === '/api/charts' && method === 'POST') valid = identifier(payload.id) && payload.verified === true;
  else if (path === '/api/study/import' && method === 'POST') valid = sameIdentifier(payload.importId, fields.importId) && count(payload.imported,200) && Array.isArray(fields.entries) && payload.imported === fields.entries.length && payload.imported > 0 && typeof payload.replayed === 'boolean';
  else if (path === '/api/charts/import' && method === 'POST') valid = count(payload.imported,100) && count(payload.skipped,100) && count(payload.total,100) && Array.isArray(fields.charts) && payload.imported + payload.skipped === fields.charts.length && payload.total >= payload.imported;
  else if (receiptId && method === 'GET') valid = sameIdentifier(payload.importId, decodeURIComponent(receiptId)) && payload.committed === true && count(payload.imported,200) && payload.imported > 0;
  else if (studyId && studyId !== 'import' && identifier(decodeURIComponent(studyId))) {
    if (method === 'GET') valid = studyRecord(payload.entry) && objectValue(payload.entry) && sameIdentifier(payload.entry.id, decodeURIComponent(studyId));
    else if (method === 'PATCH') valid = payload.updated === true;
    else if (method === 'DELETE') valid = payload.deleted === true;
  } else if (chartId && chartId !== 'import' && identifier(decodeURIComponent(chartId))) {
    if (method === 'GET') valid = chartRecord(payload.chart) && objectValue(payload.chart) && sameIdentifier(payload.chart.id, decodeURIComponent(chartId)) && chartResult(payload.result) && typeof payload.outdated === 'boolean';
    else if (method === 'DELETE') valid = payload.deleted === true;
  }
  if (!valid) throw new InvalidApiResponse();
}
/** Validate chat receipts/windows before callers mutate drafts or render lists.
 * A 2xx status alone is not acknowledgement of a committed send/read. */
function messageId(value:unknown,allowZero=false):value is string {
  return typeof value==='string' && (allowZero&&value==='0' || /^[1-9][0-9]{0,18}$/.test(value)&&BigInt(value)<=9223372036854775807n);
}
function chatTime(value:unknown):value is string {
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value));
}
function chatCounts(value:Record<string,unknown>):boolean {
  return count(value.unread,Number.MAX_SAFE_INTEGER)&&count(value.readCount,Number.MAX_SAFE_INTEGER)&&Number.isSafeInteger(value.unread+value.readCount);
}
function chatMessage(value:unknown):value is Record<string,unknown>&{id:string} {
  return objectValue(value)&&messageId(value.id)&&identifier(value.senderId)&&identifier(value.clientId)&&
    typeof value.body==='string'&&value.body.length>0&&value.body.length<=2000&&chatTime(value.createdAt);
}
function validateCommunityResponse(path:string,method:string,payload:Record<string,unknown>):void {
  const route=path.split('?')[0];let valid=true;
  if(route==='/api/community/conversations'&&method==='GET'){
    const rows=payload.conversations;
    valid=Array.isArray(rows)&&rows.length<=30&&rows.every(row=>objectValue(row)&&identifier(row.id)&&identifier(row.peerId)&&
      typeof row.name==='string'&&row.name.trim().length>0&&row.name.length<=150&&
      (row.preview===null||typeof row.preview==='string'&&row.preview.length<=2000)&&chatCounts(row)&&chatTime(row.updatedAt)&&messageId(row.latestMessageId,true))&&
      new Set(rows.map(row=>row.id)).size===rows.length&&(payload.nextOffset===null||count(payload.nextOffset,Number.MAX_SAFE_INTEGER));
  }else if(/^\/api\/community\/conversations\/[^/]+\/messages$/.test(route)){
    if(method==='POST')valid=payload.sent===true&&messageId(payload.id);
    else if(method==='GET'){
      const rows=payload.messages;
      valid=Array.isArray(rows)&&rows.length<=50&&rows.every(chatMessage)&&rows.every((row,index)=>!index||BigInt(rows[index-1].id)<BigInt(row.id))&&
        identifier(payload.peerId)&&typeof payload.blocked==='boolean'&&typeof payload.blockedByMe==='boolean'&&(!payload.blockedByMe||payload.blocked)&&
        (payload.nextBefore===null||messageId(payload.nextBefore)&&rows.length>0&&rows[0].id===payload.nextBefore);
    }
  }else if(/^\/api\/community\/conversations\/[^/]+\/read$/.test(route)&&method==='PATCH')valid=payload.updated===true&&chatCounts(payload);
  else if(/^\/api\/community\/conversations\/[^/]+$/.test(route)&&method==='POST')valid=identifier(payload.id);
  else if(/^\/api\/community\/blocks\/[^/]+$/.test(route)&&method==='PATCH')valid=payload.updated===true;
  else if(/^\/api\/community\/reports\/[^/]+$/.test(route)&&method==='POST')valid=payload.reported===true;
  if(!valid)throw new InvalidApiResponse();
}
function validateExpertBookResponse(path:string,method:string,payload:Record<string,unknown>):void {
 const route=path.split('?')[0];let valid=true;
 if(route==='/api/books/expert/mine'&&method==='GET'){
  const rows=payload.books;
  valid=Array.isArray(rows)&&rows.length<=200&&rows.every(row=>objectValue(row)&&identifier(row.id)&&
    ['slug','title','author','publisher','synopsis','subject','licenseName','licenseProof'].every(key=>typeof row[key]==='string')&&strings(row.tags)&&
    ['free','member','pro'].includes(String(row.accessLevel))&&['draft','published','hidden'].includes(String(row.status))&&
    ['draft','pending','reviewed'].includes(String(row.submissionStatus))&&typeof row.featured==='boolean'&&
    (row.publishedYear===null||Number.isInteger(row.publishedYear))&&(row.format===null||['pdf','epub'].includes(String(row.format))))&&
    new Set(rows.map(row=>row.id)).size===rows.length;
 }else if(route==='/api/books/expert'&&method==='POST')valid=identifier(payload.id);
 else {const update=route.match(/^\/api\/books\/expert\/([^/]+)$/);if(update&&method==='PATCH')valid=sameIdentifier(payload.id,update[1]);
  else if(/^\/api\/books\/expert\/[^/]+\/submit$/.test(route)&&method==='POST')valid=payload.submitted===true;
 }
 if(!valid)throw new InvalidApiResponse();
}
export async function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
  if (options.timeoutMs !== undefined && (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 120_000)) throw new RangeError('Invalid request deadline');
  const commerceDeadline = /^\/api\/(?:billing|admin|articles)(?:\/|$)/.test(path) ? ACCOUNT_TIMEOUT_MS : 0;
  const deadline = options.timeoutMs ?? (path.startsWith('/api/auth/') ? ACCOUNT_TIMEOUT_MS : commerceDeadline);
  const timeout = deadline ? new AbortController() : null;
  const timer = timeout ? setTimeout(() => timeout.abort(), deadline) : null;
  const cancel = () => timeout?.abort(options.signal?.reason);
  if (timeout && options.signal) {
    if (options.signal.aborted) cancel();
    else options.signal.addEventListener('abort', cancel, { once: true });
  }
  let response: Response;
  let payload: Record<string, unknown>;
  try {
    response = await fetch(`${ROOT}${path}`, {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include', cache: 'no-store', signal: timeout?.signal ?? options.signal,
    });
    const raw: unknown = await response.json().catch(error => {
      // A timed-out response body is not an empty JSON payload.
      if (timeout?.signal.aborted || options.signal?.aborted) throw error;
      if (response.ok) throw new InvalidApiResponse();
      return {};
    });
    payload = response.ok ? responseObject(raw) : raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  } catch (error) {
    if (error instanceof InvalidApiResponse || options.signal?.aborted) throw error;
    if (timeout?.signal.aborted) throw new Error(path.startsWith('/api/auth/') ? 'Yêu cầu tài khoản quá thời gian chờ. Hãy kiểm tra trạng thái tài khoản và kết nối trước khi thử lại.' : 'Yêu cầu dữ liệu quá thời gian chờ. Hãy kiểm tra dữ liệu đã lưu trước khi thử lại; tác vụ trên máy chủ có thể đã hoàn tất.');
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new Error('Không kết nối được API. Hãy kiểm tra Next.js và backend.');
  } finally {
    if (timer !== null) clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
  if (!response.ok) {
    const message = typeof payload.message === 'string' ? payload.message : Array.isArray(payload.message) ? payload.message.join('; ') : typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
    const requestId = typeof payload.requestId === 'string' && /^[a-zA-Z0-9-]{16,64}$/.test(payload.requestId) ? payload.requestId : undefined;
    throw new ApiHttpError(message, response.status, requestId);
  }
  validateAccountResponse(path, payload);
  validateStorageResponse(path, (options.method || 'GET').toUpperCase(), options.body, payload);
  validateCommunityResponse(path, (options.method || 'GET').toUpperCase(), payload);
  validateExpertBookResponse(path, (options.method || 'GET').toUpperCase(), payload);
  return payload as unknown as T;
}
export const accountApi = {
  async me() {
    try { return await api<{user:AuthUser|null}>('/api/auth/me'); }
    catch (error) {
      // Only this read is safe to retry after a dropped connection/5xx.
      // A valid guest response, 4xx or malformed identity is authoritative.
      if (error instanceof InvalidApiResponse || error instanceof ApiHttpError && error.status < 500) throw error;
      return api<{user:AuthUser|null}>('/api/auth/me');
    }
  },
  login: (email: string, password: string, remember = true) => api<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: { email, password, remember } }),
  register: (email: string, password: string, username?: string) => api<{ user: AuthUser }>('/api/auth/register', { method: 'POST', body: { email, password, username } }),
  logout: () => api<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  logoutAll: () => api<{revoked:true}>('/api/auth/logout/all',{method:'POST'}),
  remove: (password: string) => api<{ deleted: true }>('/api/auth/account', { method: 'DELETE', body: { password } }),
  requestPasswordReset: (email:string) => api<{requested:true;challengeId:string}>('/api/auth/password/forgot',{method:'POST',body:{email}}),
  confirmPasswordReset: (challengeId:string,code:string,newPassword:string) => api<{updated:true}>('/api/auth/password/reset',{method:'POST',body:{challengeId,code,newPassword}}),
  changePassword: (currentPassword: string, newPassword: string) => api<{updated:true;otherSessionsRevoked:true}>('/api/auth/password', {method:'POST', body:{currentPassword,newPassword}}),
  updateProfile: (displayName:string) => api<{updated:true;displayName:string}>('/api/auth/profile',{method:'PATCH',body:{displayName}}),
  removeAvatar: () => api<{updated:true}>('/api/auth/avatar',{method:'DELETE'}),
  async uploadAvatar(image:Blob) {
    // The image was already resized client-side. A hanging upload must not
    // leave the crop dialog locked in a permanent loading state.
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), 25_000);
    let response:Response;
    let data: Record<string, unknown>;
    try {
      response=await fetch('/api/auth/avatar',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:image,credentials:'include',cache:'no-store',signal:timeout.signal});
      const raw: unknown = await response.json().catch(error => { if (timeout.signal.aborted) throw error; if (response.ok) throw new InvalidApiResponse(); return {}; });
      data = response.ok ? responseObject(raw) : raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    } catch (error) {
      if (error instanceof InvalidApiResponse) throw error;
      if (timeout.signal.aborted) throw new Error('Tải ảnh lên quá thời gian chờ. Vui lòng kiểm tra hồ sơ trước khi thử lại.');
      throw new Error('Không kết nối được máy chủ tải ảnh');
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('; ') : typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : `HTTP ${response.status}`);
    validateAccountResponse('/api/auth/avatar', data);
    return data as unknown as {updated:true};
  },
  googleConfig: () => api<{enabled:boolean;clientId:string|null}>('/api/auth/google/config'),
  googleNonce: () => api<{nonce:string}>('/api/auth/google/nonce'),
  googleStart: (credential:string,purpose:'login'|'delete'='login') => api<{challengeId:string;email:string;purpose:'login'|'delete';expiresInSeconds:number}>('/api/auth/google/start',{method:'POST',body:{credential,purpose}}),
  googleVerify: (challengeId:string,code:string) => api<{user:AuthUser}|{deleted:true}>('/api/auth/google/verify',{method:'POST',body:{challengeId,code}}),
};
export const chartApi = {
  save: (input: ChartInput & {birthProfileId?:string|null}, signal?:AbortSignal) => api<{ id: string; verified: boolean }>('/api/charts', { method: 'POST', body: input, signal, timeoutMs: STORAGE_TIMEOUT_MS }),
  list: (signal?: AbortSignal) => api<{ charts: SavedChart[] }>('/api/charts', { signal, timeoutMs: STORAGE_TIMEOUT_MS }),
  importBackup: (body: unknown, signal?: AbortSignal) => api<{ imported: number; skipped: number; total: number }>('/api/charts/import', { method:'POST', body, signal, timeoutMs: IMPORT_TIMEOUT_MS }),
  get: (id: string, signal?: AbortSignal) => api<{ chart: SavedChart; result: AstrologyResult; outdated: boolean }>(`/api/charts/${encodeURIComponent(id)}`, { signal, timeoutMs: STORAGE_TIMEOUT_MS }),
  remove: (id: string, signal?:AbortSignal) => api<{ deleted: boolean }>(`/api/charts/${encodeURIComponent(id)}`, { method: 'DELETE', signal, timeoutMs: STORAGE_TIMEOUT_MS })
};

import type {BirthProfile,BirthProfileDraft} from '@/features/birth-profiles/types';
import type { StudyDraft, StudyEntry } from '@/features/study-room/study-types';
export const birthProfileApi={
 list:(signal?:AbortSignal)=>api<{profiles:BirthProfile[]}>('/api/birth-profiles',{signal,timeoutMs:STORAGE_TIMEOUT_MS}),
 get:(id:string,signal?:AbortSignal)=>api<{profile:BirthProfile}>(`/api/birth-profiles/${encodeURIComponent(id)}`,{signal,timeoutMs:STORAGE_TIMEOUT_MS}),
 create:(draft:BirthProfileDraft,signal?:AbortSignal)=>api<{id:string}>('/api/birth-profiles',{method:'POST',body:draft,signal,timeoutMs:STORAGE_TIMEOUT_MS}),
 update:(id:string,draft:BirthProfileDraft,signal?:AbortSignal)=>api<{updated:true}>(`/api/birth-profiles/${encodeURIComponent(id)}`,{method:'PATCH',body:draft,signal,timeoutMs:STORAGE_TIMEOUT_MS}),
 remove:(id:string,signal?:AbortSignal)=>api<{deleted:true}>(`/api/birth-profiles/${encodeURIComponent(id)}`,{method:'DELETE',signal,timeoutMs:STORAGE_TIMEOUT_MS}),
};
export const studyApi = {
  list: (signal?: AbortSignal) => api<{entries:StudyEntry[]}>('/api/study',{signal,timeoutMs:STORAGE_TIMEOUT_MS}),
  get: (id:string,signal?:AbortSignal) => api<{entry:StudyEntry}>(`/api/study/${encodeURIComponent(id)}`,{signal,timeoutMs:STORAGE_TIMEOUT_MS}),
  create: (draft:StudyDraft, signal?:AbortSignal) => api<{id:string}>('/api/study',{method:'POST',body:draft,signal,timeoutMs:STORAGE_TIMEOUT_MS}),
  importBackup: (entries: Array<StudyDraft & {pinned:boolean}>, importId: string) => api<{importId:string;imported:number;replayed:boolean}>('/api/study/import',{method:'POST',body:{format:'thien-do.study-export',version:1,importId,entries},timeoutMs:IMPORT_TIMEOUT_MS}),
  importStatus: (importId: string) => api<{importId:string;imported:number;committed:true}>(`/api/study/import/${encodeURIComponent(importId)}`,{timeoutMs:STORAGE_TIMEOUT_MS}),
  update: (id:string,patch:{title?:string;notes?:string;tags?:string[];pinned?:boolean;birthProfileId?:string|null}) => api<{updated:boolean}>(`/api/study/${encodeURIComponent(id)}`,{method:'PATCH',body:patch,timeoutMs:STORAGE_TIMEOUT_MS}),
  remove: (id:string) => api<{deleted:boolean}>(`/api/study/${encodeURIComponent(id)}`,{method:'DELETE',timeoutMs:STORAGE_TIMEOUT_MS}),
};
