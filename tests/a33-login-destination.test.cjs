'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('./helpers-typeloader.cjs'),root=path.resolve(__dirname,'..'),safe=require('../apps/web/src/lib/tool-access.cjs');
function destination(receipt,observe=()=>{}){
 const m={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'apps/web/src/lib/login-destination.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,URLSearchParams,require:name=>{
  if(name==='./api')return {api:async(url,options)=>{observe(url,options);if(receipt instanceof Error)throw receipt;return receipt;}};
  if(name==='./tool-access.cjs')return safe;throw Error(name);
 }});return m.exports.loginDestination;
}
test('server-selected admin landing ignores public next and preserves real admin subroutes',async()=>{
 const go=destination({destination:'/admin'});assert.equal(await go('/login','?next=/chart'),'/admin');assert.equal(await go('/admin/finance',''),'/admin/finance');
});
test('a member cannot use admin next paths, query or fragments as its landing area',async()=>{
 const go=destination({destination:'/chart'});for(const next of ['/admin','/admin/finance','/admin?tab=users','/admin#owner'])assert.equal(await go('/login','?next='+encodeURIComponent(next)),'/chart');assert.equal(await go('/admin',''),'/chart');
});
test('safe explicit tool intent keeps query and fragment; default login and home use chart',async()=>{
 const go=destination({destination:'/chart'});assert.equal(await go('/',''),'/chart');assert.equal(await go('/login',''),'/chart');assert.equal(await go('/login','?next='+encodeURIComponent('/tarot?spread=three#reading')),'/tarot?spread=three#reading');
});
test('untrusted external, protocol, encoded and login-loop return values never escape app tools',async()=>{
 const go=destination({destination:'/chart'});for(const next of ['https://attacker.invalid/admin','//attacker.invalid','/\\attacker.invalid','javascript:alert(1)','/login?next=/admin','/%2f%2fattacker.invalid','/admin/../login','/tarot\nLocation:attacker'])assert.equal(await go('/login','?next='+encodeURIComponent(next)),'/chart');
});
test('malformed destination receipts and auth outages fail closed without a route',async()=>{
 for(const receipt of [{destination:true},{destination:'https://attacker.invalid'},{destination:'/admin/finance'},{isAdmin:true,isOwner:true},{},null,new Error('offline')])await assert.rejects(destination(receipt)('/login',''));
});
test('existing session routing calls auth destination with cancellation and a bounded timeout',async()=>{
 const controller=new AbortController();let observed;await destination({destination:'/chart'},(url,options)=>observed={url,options})('/login','',controller.signal);assert.equal(observed.url,'/api/auth/destination');assert.equal(observed.options.signal,controller.signal);assert.equal(observed.options.timeoutMs,15000);
});
test('a confirmed login receipt routes immediately even when subsequent APIs are unavailable',async()=>{
 const go=destination(new Error('API unavailable'),()=>assert.fail('A successful POST receipt must not need another role request'));
 assert.equal(await go('/login','?next=/chart',undefined,'/admin'),'/admin');assert.equal(await go('/login','',undefined,'/chart'),'/chart');
});
test('login receipt metadata accepts only two fixed local targets',async()=>{
 const go=destination(new Error('must not fetch'));for(const target of ['//evil.invalid','/admin?owner=true','/chart#x','owner',true,null,{}])await assert.rejects(go('/login','',undefined,target));
});
test('a prefix lookalike never becomes an admin destination',async()=>{
 const go=destination({destination:'/admin'});for(const pathname of ['/administrator','/admin-portal','/admin%2ffoo','//evil.invalid'])assert.equal(await go(pathname,''),'/admin');
});
