/** Read-only, fail-closed HTTP probe. It never submits forms, writes accounts or runs migrations. */
export function stagingOrigin(text) {
 try {
  const url = new URL(text);
  if (url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.port) return null;
  if(!/^(staging|preprod|preview)\.[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname))return null;
  if(url.hostname.endsWith('.invalid')||url.hostname.endsWith('.localhost'))return null;
  return url.origin;
 } catch {return null;}
}
export async function checkStagingHttp(origin,fetchFn=fetch) {
 const base=stagingOrigin(origin),checks=[];
 if(!base)return {status:'NO_GO',checks:[{id:'origin',status:'BLOCKED',reason:'Explicit non-local staging HTTPS origin required'}]};
 const specs=[
  {id:'landing',path:'/',expected:200,headers:['strict-transport-security','x-content-type-options','x-frame-options']},
  {id:'readiness',path:'/api/health/ready',expected:200},
  {id:'anonymous-study-denied',path:'/api/study',expected:401,headers:['cache-control']},
 ];
 for(const spec of specs){
  try {
   const r=await fetchFn(new URL(spec.path,base),{method:'GET',redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(10000),headers:{'accept':'application/json, text/html;q=0.9'}});
   const wrong=(r.status!==spec.expected)||r.redirected||r.url && new URL(r.url).origin!==base;
   const missing=(spec.headers||[]).filter(h=>!r.headers.get(h));
   checks.push({id:spec.id,status:wrong||missing.length?'FAIL':'PASS',httpStatus:r.status,missingHeaders:missing});
   // Do not save or log response bodies which may contain private information.
   if(r.body)await r.body.cancel();
  }catch(error){checks.push({id:spec.id,status:'BLOCKED',error:error.name||'network'});}
 }
 return {status:checks.every(c=>c.status==='PASS')?'READ_ONLY_HTTP_PASS':'NO_GO',checks,
  scope:'GET-only. Does not attest Google OAuth, OTP, PostgreSQL mutations, disaster recovery, monitoring or rollback.'};
}
