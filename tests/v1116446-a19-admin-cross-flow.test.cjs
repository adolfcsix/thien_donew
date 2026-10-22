'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
function typescript(){try{return require('typescript');}catch{return require(path.join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}}
const ts=typescript();
const file=path.join(root,'apps/web/src/features/membership/admin-session-contract.ts');
const source=fs.readFileSync(file,'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod._compile(compiled.outputText,file);
const {parseAdminAccess,parseAdminMfa}=mod.exports;
const admin={isAdmin:true,isOwner:false};
const good={configured:true,enabled:true,verified:true,stepUp:false,role:'admin',handle:null};
test('admin access accepts only real boolean privileges, not truthy strings',()=>{
 assert.deepEqual(parseAdminAccess(admin),admin);
 assert.deepEqual(parseAdminAccess({isAdmin:true,isOwner:true}),{isAdmin:true,isOwner:true});
 for(const input of [{isAdmin:'true',isOwner:false},{isAdmin:true},{isAdmin:null,isOwner:false},{isAdmin:false,isOwner:true},null,[],{}])
  assert.throws(()=>parseAdminAccess(input),/không hợp lệ/);
});
test('admin MFA fails closed for incomplete, inconsistent or stale JSON',()=>{
 assert.deepEqual(parseAdminMfa(good,admin),good);
 for(const input of [{...good,verified:'true'},{...good,role:'owner'},{...good,handle:{}},{...good,enabled:false},{...good,stepUp:true,verified:false},{...good,configured:'false'},{...good,stepUp:null},null,{}])
  assert.throws(()=>parseAdminMfa(input,admin),/không khớp/);
 assert.throws(()=>parseAdminMfa(good,{isAdmin:false,isOwner:false}),/không khớp/);
});
test('admin page revokes previous verified UI on each request, including focus and path changes',()=>{
 const frontend=fs.readFileSync(path.join(root,'apps/web/src/features/membership/admin-session.tsx'),'utf8');
 const start=frontend.indexOf('const refresh=useCallback('),end=frontend.indexOf('},[]);',start);
 const body=frontend.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.ok(body.indexOf('setAccess(null);setMfa(null);setError(\'\');')<body.indexOf('await api<unknown>'), 'clear old privilege before async request');
 assert.match(body,/if\(controller\.signal\.aborted\)return;/);
 assert.match(body,/parseAdminMfa\(await api<unknown>/);
 assert.match(frontend,/\[pathname,refresh\]/);
 assert.match(frontend,/useVisibleRefresh\(refresh\)/);
 assert.match(frontend,/if\(!access\|\|!mfa\)return/);
 assert.match(frontend,/if\(!mfa\.configured\|\|!mfa\.verified\)return/);
});
