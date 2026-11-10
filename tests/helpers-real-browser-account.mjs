/** Live HTTP acceptance only: disposable user and real session cookie.
 * Run only against the CI-local endpoint with a disposable database.
 * Never reuse a production account or use this helper in mocked UI-only suites.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';

export async function registerBrowserAcceptanceAccount(context,base,scope){
 const origin=localTestOrigin(base);
 if(!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin)){
  throw new Error('Browser acceptance registration requires an explicit loopback test origin.');
 }
 if(!/^[a-z][a-z0-9-]{0,30}$/.test(scope))throw new Error('Invalid disposable account scope');
 const password='QA!'+randomUUID();
 const email=scope+'-'+randomUUID()+'@example.invalid';
 const registered=await context.request.post(origin+'/api/auth/register',{data:{email,password}});
 assert.equal(registered.status(),201,'Disposable '+scope+' registration must succeed over the actual HTTP API');
 const response=await context.request.get(origin+'/api/auth/me');
 assert.equal(response.status(),200,'New session cookie must be accepted');
 const id=(await response.json()).user?.id;
 assert.ok(typeof id==='string'&&id.length>0,'Registered test identity must be confirmed by server');
 let disposed=false;
 return async function cleanup(){
  if(disposed)return;
  const deletion=await context.request.delete(origin+'/api/auth/account',{data:{password}});
  assert.equal(deletion.status(),200,'Delete only disposable '+scope+' account after browser acceptance');
  disposed=true;
 };
}
