'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('./helpers-typeloader.cjs'),root=path.resolve(__dirname,'..');
function load(file,imports={}){
 const m={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,URLSearchParams,require:name=>{if(!(name in imports))throw Error(name);return imports[name]}});
 return m.exports;
}
const contract=load('apps/web/src/features/membership/admin-session-contract.ts');
const safe=require('../apps/web/src/lib/tool-access.cjs');
function destination(receipt){return load('apps/web/src/lib/login-destination.ts',{'./api':{api:async()=>{if(receipt instanceof Error)throw receipt;return receipt}},'./tool-access.cjs':safe,'@/features/membership/admin-session-contract':contract}).loginDestination;}
test('server-confirmed Admin and Owner land in admin regardless of public next parameter',async()=>{
 for(const isOwner of [false,true]){
  const go=destination({isAdmin:true,isOwner});assert.equal(await go('/login','?next=/chart'),'/admin');assert.equal(await go('/admin/finance',''),'/admin/finance');
 }
});
test('ordinary member leaves the admin login entry for the chart form',async()=>{assert.equal(await destination({isAdmin:false,isOwner:false})('/admin',''),'/chart');});
test('ordinary member retains a safe requested public tool',async()=>{assert.equal(await destination({isAdmin:false,isOwner:false})('/login','?next=/chart'),'/chart');});
test('external redirects never become a login destination',async()=>{const actual=await destination({isAdmin:false,isOwner:false})('/login','?next=https://attacker.invalid/admin');assert.equal(actual,safe.safeToolReturn('https://attacker.invalid/admin'));assert.ok(actual.startsWith('/'));});
test('malformed role receipts and outages fail closed without a destination',async()=>{
 for(const receipt of [{isAdmin:'true',isOwner:false},{isAdmin:false,isOwner:true},{},new Error('offline')])await assert.rejects(destination(receipt)('/login',''));
});
test('routing request forwards cancellation and a bounded timeout',async()=>{
 const controller=new AbortController();let observed;
 const go=load('apps/web/src/lib/login-destination.ts',{'./api':{api:async(url,options)=>{observed={url,options};return {isAdmin:false,isOwner:false}}},'./tool-access.cjs':safe,'@/features/membership/admin-session-contract':contract}).loginDestination;
 await go('/login','',controller.signal);assert.equal(observed.url,'/api/billing/access');assert.equal(observed.options.signal,controller.signal);assert.equal(observed.options.timeoutMs,15000);
});

test('homepage and plain login default to chart; explicit tool intent keeps query and hash',async()=>{
 const go=destination({isAdmin:false,isOwner:false});
 assert.equal(await go('/',''),'/chart');assert.equal(await go('/login',''),'/chart');
 assert.equal(await go('/login','?next='+encodeURIComponent('/tarot?spread=three#reading')),'/tarot?spread=three#reading');
});
