'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {subscribeVisibleRefresh}=require('../apps/web/src/lib/visible-refresh.cjs');
const ts=require('./helpers-typeloader.cjs');
function events(){const windowTarget=new EventTarget(),documentTarget=new EventTarget();documentTarget.visibilityState='visible';let time=1000,calls=0;const stop=subscribeVisibleRefresh(windowTarget,documentTarget,()=>calls++,250,()=>time);return {windowTarget,documentTarget,stop,get calls(){return calls},time(value){time=value},focus(){windowTarget.dispatchEvent(new Event('focus'))},visibility(value){documentTarget.visibilityState=value;documentTarget.dispatchEvent(new Event('visibilitychange'))}}}
test('paired visibility/focus is coalesced but repeated focus can request fresh data immediately',()=>{const s=events();s.visibility('visible');assert.equal(s.calls,1);s.focus();assert.equal(s.calls,1);s.time(1001);s.focus();assert.equal(s.calls,2);s.time(1251);s.visibility('visible');assert.equal(s.calls,3);s.stop()});
test('hidden tabs do not fetch; a rapid genuine return is never suppressed',()=>{const s=events();s.focus();s.visibility('hidden');s.focus();assert.equal(s.calls,1);s.time(1001);s.visibility('visible');assert.equal(s.calls,2);s.focus();assert.equal(s.calls,2);s.stop()});
test('clock rollback cannot leave revalidation stuck, cleanup removes both listeners',()=>{const s=events();s.focus();s.time(500);s.focus();assert.equal(s.calls,2);s.stop();s.time(3000);s.focus();s.visibility('visible');assert.equal(s.calls,2)});
test('independent subscribers retain independent lifecycles',()=>{const a=events(),b=events();a.focus();assert.equal(a.calls,1);assert.equal(b.calls,0);a.stop();b.focus();assert.equal(b.calls,1);b.stop()});
const source=fs.readFileSync(path.join(__dirname,'../apps/web/src/lib/api.ts'),'utf8');
function apiReply(payload){const mod={exports:{}};const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','fetch',code)(mod,mod.exports,async()=>({ok:true,json:async()=>payload}));return mod.exports.api}
test('MFA cannot advance on false or partial success receipts',async()=>{for(const route of ['confirm','verify'])for(const payload of [{ok:true},{verified:false,mfaEnabled:true},{verified:true},{verified:true,mfaEnabled:false}])await assert.rejects(()=>apiReply(payload)('/api/auth/mfa/'+route,{method:'POST',body:{code:'123456'}}),/Phản hồi máy chủ không hợp lệ/)});
test('valid MFA receipts remain accepted',async()=>{for(const route of ['confirm','verify'])assert.deepEqual(await apiReply({verified:true,mfaEnabled:true})('/api/auth/mfa/'+route),{verified:true,mfaEnabled:true})});
test('setup requires a complete matching TOTP secret and URI',async()=>{
 const manualKey='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',otpauthUrl='otpauth://totp/Thien%20Do:test?secret='+manualKey+'&issuer=Thien%20Do';
 const good={manualKey,otpauthUrl};assert.deepEqual(await apiReply(good)('/api/auth/mfa/setup'),good);
 for(const bad of [{},{manualKey,otpauthUrl:'javascript:bad'},{manualKey,otpauthUrl:otpauthUrl.replace(manualKey,'A'.repeat(32))},{manualKey:'short',otpauthUrl},{manualKey,otpauthUrl:'not a URL'}])await assert.rejects(()=>apiReply(bad)('/api/auth/mfa/setup'),/Phản hồi máy chủ không hợp lệ/);
});
