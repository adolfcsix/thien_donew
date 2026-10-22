'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {execFileSync}=require('node:child_process');
const file=path.resolve(__dirname,'../apps/api/src/modules/billing/admin.service.ts');
function typescript(){try{return require('typescript');}catch{}return require(path.join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}
const ts=typescript();
const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
class Invalid extends Error {constructor(msg='Invalid'){super(msg);this.status=409;}}
const common={Injectable:()=>target=>target,ForbiddenException:Invalid,ConflictException:Invalid,NotFoundException:Invalid,BadRequestException:Invalid};
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));
mod.require=(id)=>{
 if(id==='@nestjs/common')return common;
 if(id==='../admin-console/permissions')return require('./helpers-admin-permissions.cjs')(common);
 if(id==='../../common/identifiers')return {assertChartId:x=>{if(typeof x!=='string'||!/^[0-9a-f-]{36}$/.test(x))throw new Invalid();return x;}};
 if(id==='./billing.service')return {FEATURES:[],object:x=>x,text:x=>x,integer:x=>x};
 if(id==='../../common/database.service'||id==='../auth/auth.service'||id==='../auth/admin-mfa.service')return {};
 return require(id);
};
mod._compile(js,file);
const {AdminService}=mod.exports;
const owner='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222';
function fixture(previousRole=null){
 const data={roles:new Map([[owner,'owner']]),sessions:new Map([[target,['old_session_token']]]),trusted:new Map([[target,['trusted_browser']],[owner,['owner_browser']]]),security:[],audit:[]};
 if(previousRole)data.roles.set(target,previousRole);
 const order=[];
 let failRevocation=false;
 const client={async query(sql,args=[]){order.push({sql,args});
  if(sql.startsWith('SELECT pg_advisory_xact_lock'))return {rows:[]};
  if(sql.startsWith('SELECT role FROM admin_memberships'))return {rows:data.roles.has(args[0])?[{role:data.roles.get(args[0])}]:[]};
  if(sql.startsWith('SELECT user_id FROM account_blocks'))return {rows:[]};
  if(sql.startsWith('SELECT id FROM users'))return {rows:[{id:args[0]}]};
  if(sql.startsWith('INSERT INTO admin_permission_sets'))return {rows:[]};
  if(sql.startsWith('INSERT INTO admin_memberships')){data.roles.set(args[0],'admin');return {rows:[]};}
  if(sql.startsWith('DELETE FROM admin_memberships')){data.roles.delete(args[0]);return {rows:[]};}
  if(sql.startsWith('DELETE FROM sessions')){if(failRevocation)throw new Error('database refused session revocation');data.sessions.delete(args[0]);return {rowCount:1};}
  if(sql.startsWith('DELETE FROM admin_trusted_devices')){data.trusted.delete(args[0]);return {rowCount:1};}
  if(sql.startsWith('INSERT INTO account_security_events')){data.security.push(args);return {rows:[]};}
  if(sql.startsWith('INSERT INTO admin_audit')){data.audit.push(args);return {rows:[]};}
  throw Error('Unexpected SQL: '+sql);
 }};
 const db={async transaction(fn){const before={roles:new Map(data.roles),sessions:new Map(data.sessions),trusted:new Map(data.trusted),security:data.security.slice(),audit:data.audit.slice()};try{return await fn(client);}catch(err){data.roles=before.roles;data.sessions=before.sessions;data.trusted=before.trusted;data.security=before.security;data.audit=before.audit;throw err;}}};
 const mfa={requireAdmin:async()=>({id:owner,role:'owner'}),assertWriteInTransaction:async()=>{}};
 return {service:new AdminService(db,{},mfa),data,order,fail:()=>{failRevocation=true;}};
}
test('promoting a member revokes previous browser sessions atomically and records security event',async()=>{
 const f=fixture(),result=await f.service.role({},target,{role:'admin'});
 assert.ok(f.order.some(q=>q.sql.startsWith('INSERT INTO admin_permission_sets')),'role transition updates scope revision atomically');
 assert.equal(result.updated,true);assert.equal(result.sessionsRevoked,true);assert.equal(f.data.trusted.has(target),false);assert.equal(f.data.trusted.has(owner),true);
 assert.equal(f.data.roles.get(target),'admin');assert.equal(f.data.sessions.has(target),false);
 assert.deepEqual(f.data.security,[[target,'admin.role.changed']]);assert.equal(f.data.audit.length,1);
 const change=f.order.findIndex(q=>q.sql.startsWith('INSERT INTO admin_memberships'));
 const revoked=f.order.findIndex(q=>q.sql.startsWith('DELETE FROM sessions'));
 assert.ok(change>=0&&revoked>change,'revocation must happen before audit transaction completion');
});
test('demoting an admin revokes MFA-bearing sessions so later promotion requires fresh login and MFA',async()=>{
 const f=fixture('admin'),result=await f.service.role({},target,{role:'member'});
 assert.equal(result.sessionsRevoked,true);assert.equal(f.data.roles.has(target),false);assert.equal(f.data.sessions.has(target),false);
 assert.ok(f.order.some(q=>q.sql.startsWith('DELETE FROM sessions')));
});
test('failed session revocation rolls back role changes and their audit records',async()=>{
 const f=fixture('admin');f.fail();
 await assert.rejects(()=>f.service.role({},target,{role:'member'}),/database refused session revocation/);
 assert.equal(f.data.roles.get(target),'admin');assert.equal(f.data.sessions.has(target),true);
 assert.equal(f.data.security.length,0);assert.equal(f.data.audit.length,0);assert.equal(f.data.trusted.has(target),true);
});
test('owner role cannot be altered through ordinary admin role endpoint',async()=>{
 const f=fixture('owner');await assert.rejects(()=>f.service.role({},target,{role:'member'}),{status:409});
 assert.equal(f.data.sessions.has(target),true);
});
