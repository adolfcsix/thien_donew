const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const crypto=require('node:crypto');
const ts=require('typescript');
const sourceFile=path.resolve(__dirname,'../apps/api/src/modules/auth/admin-mfa.service.ts');
const js=ts.transpileModule(fs.readFileSync(sourceFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,emitDecoratorMetadata:false}}).outputText;
class FakeError extends Error{constructor(message){super(message);this.status=this.constructor.name;}}
const common={Injectable:()=>target=>target,ForbiddenException:class ForbiddenException extends FakeError{},UnauthorizedException:class UnauthorizedException extends FakeError{},BadRequestException:class BadRequestException extends FakeError{},ServiceUnavailableException:class ServiceUnavailableException extends FakeError{},HttpException:class HttpException extends FakeError{},HttpStatus:{TOO_MANY_REQUESTS:429}};
const realTotpPath=path.resolve(__dirname,'../apps/api/src/modules/auth/totp.ts');
const totpModule=new Module(realTotpPath,module);totpModule.filename=realTotpPath;totpModule.paths=Module._nodeModulePaths(path.dirname(realTotpPath));totpModule._compile(ts.transpileModule(fs.readFileSync(realTotpPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,realTotpPath);
const loaded=new Module(sourceFile,module);loaded.filename=sourceFile;loaded.paths=Module._nodeModulePaths(path.dirname(sourceFile));
loaded.require=id=>id==='../admin-console/permissions'?require('./helpers-admin-permissions.cjs')(common):id==='@nestjs/common'?common:id==='./totp'?totpModule.exports:id==='./auth.service'?{AuthService:class FakeAuth{}}:id==='../../common/database.service'?{DatabaseService:class FakeDb{}}:require(id);
loaded._compile(js,sourceFile);
const {AdminMfaService}=loaded.exports;
const oldKey=process.env.ADMIN_MFA_ENCRYPTION_KEY;
process.env.ADMIN_MFA_ENCRYPTION_KEY=crypto.randomBytes(32).toString('base64');
const user={id:'b001eabc-e102-4bcc-af08-ccb203f2ab37',email:'owner@example.test'};
const req={headers:{cookie:'thiendo_session='+('a'.repeat(64))}};
function fake({role='owner',assurance=true}={}){
 const queries=[];
 const db={query:async(sql,params)=>{
  queries.push({sql,params});
  if(sql.includes('FROM admin_memberships'))return {rows:role?[{role}]:[]};
  if(sql.includes('FROM admin_session_assurance'))return {rows:assurance?[{one:1}]:[]};
  throw Error('Unexpected query: '+sql.slice(0,100));
 }};
 const auth={required:async()=>user,getToken:()=>('a'.repeat(64))};
 return {service:new AdminMfaService(db,auth),queries};
}
test('non-admin denied even with existing session',async()=>{
 const {service}=fake({role:null});
 await assert.rejects(service.requireAdmin(req),{status:'ForbiddenException'});
});
test('admin with no MFA assurance denied before reading admin resources',async()=>{
 const {service}=fake({role:'owner',assurance:false});
 await assert.rejects(service.requireAdmin(req),{status:'ForbiddenException'});
});
test('regular admin cannot impersonate either owner',async()=>{
 const {service}=fake({role:'admin'});
 await assert.rejects(service.requireAdmin(req,true),{status:'ForbiddenException'});
});
test('verified admin reads need 12 hours; writes require 10 minute step-up',async()=>{
 const {service,queries}=fake({role:'owner',assurance:true});
 assert.equal((await service.requireAdmin(req,true,false)).role,'owner');
 assert.equal((await service.requireAdmin(req,true,true)).role,'owner');
 assert.deepEqual(queries.filter(q=>q.sql.includes('FROM admin_session_assurance')).map(q=>q.params[2]),[720,10]);
});
test('database write guard requires session, MFA and recent verification in one SQL predicate',async()=>{
 const {service}=fake({role:'owner'});let sqlSeen='';
 const client={query:async sql=>{sqlSeen=sql;return {rows:[{role:'owner'}]};}};
 await service.assertWriteInTransaction(client,req,user.id,true);
 for(const fragment of ['admin_session_assurance','admin_mfa_credentials','FOR UPDATE OF s',"INTERVAL '10 minutes'",'account_blocks'])assert.ok(sqlSeen.includes(fragment),fragment);
 await assert.rejects(service.assertWriteInTransaction({query:async()=>({rows:[]})},req,user.id,true),{status:'ForbiddenException'});
});
test('missing encryption key must fail closed for every admin read',async()=>{
 delete process.env.ADMIN_MFA_ENCRYPTION_KEY;
 const {service}=fake({role:'owner',assurance:true});
 await assert.rejects(service.requireAdmin(req),{status:'ServiceUnavailableException'});
 process.env.ADMIN_MFA_ENCRYPTION_KEY=oldKey;
});
