'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const Module=require('node:module');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function getTs(){try{return require('typescript')}catch{};try{return require(path.join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}catch{return null;}}
const ts=getTs();
if(!ts){test('Deep auth/pool tests require TypeScript compiler',{skip:true},()=>{});}
else {
 const originalLoad=Module._load, originalTs=require.extensions['.ts'];
 const nest={Logger:{warn(){}},Injectable:()=>()=>{},BadRequestException:class extends Error{status=400},ConflictException:class extends Error{status=409},UnauthorizedException:class extends Error{status=401},HttpException:class extends Error{constructor(msg,status){super(msg);this.status=status}},HttpStatus:{TOO_MANY_REQUESTS:429}};
 let poolFactory=()=>{throw Error('Unexpected pool')};
 Module._load=function(name,parent,isMain){if(name==='@nestjs/common')return nest;if(name==='pg')return {Pool:class {constructor(){return Object.assign({on(){}},poolFactory())}}};return originalLoad.apply(this,arguments);};
 require.extensions['.ts']=function(mod,file){const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,esModuleInterop:true}});mod._compile(out.outputText,file)};
 const {AuthService}=require(path.join(root,'apps/api/src/modules/auth/auth.service.ts'));
 const {DatabaseService}=require(path.join(root,'apps/api/src/common/database.service.ts'));
 require.extensions['.ts']=originalTs;Module._load=originalLoad;
 function db(){const users=[], sessions=[];return {users,sessions,async query(sql,args=[]){if(sql.startsWith('SELECT id FROM users WHERE email'))return {rows:users.filter(x=>x.email===args[0])};if(sql.startsWith('INSERT INTO account_security_events'))return {rowCount:1,rows:[]};if(sql.startsWith('INSERT INTO users')){users.push({id:args[0],email:args[1],password_hash:args[2],salt:args[3]});return {rowCount:1,rows:[]}};if(sql.startsWith('INSERT INTO sessions')){sessions.push({token_hash:args[0],user_id:args[1]});return {rowCount:1,rows:[]}};if(sql.startsWith('SELECT id FROM users WHERE id=$1 AND password_hash=$2'))return {rows:users.filter(x=>x.id===args[0]&&x.password_hash===args[1])};if(sql.startsWith('SELECT id,email,password_hash,salt'))return {rows:users.filter(x=>x.email===args[0])};if(sql.startsWith('DELETE FROM sessions'))return {rowCount:1,rows:[]};throw Error('Unrecognized SQL: '+sql)}, async transaction(fn){return fn({query:this.query.bind(this)})}}}
 const req={headers:{cookie:''}};function response(){return{cookies:[],cookie(n,v){this.cookies.push([n,v])}}}
 test('15+ legitimate logins for same account do not exhaust failed-login throttle',async()=>{const storage=db(),auth=new AuthService(storage),email='valid-logins-deep@example.test',password='complex password A!';await auth.register({email,password},req,response());for(let i=0;i<15;i++){const r=await auth.login({email,password},req,response());assert.equal(r.user.email,email);}assert.equal(storage.sessions.length,16);});
 test('12 invalid passwords lock next attempt but correct credential previously resets failure streak',async()=>{const storage=db(),auth=new AuthService(storage),email='failed-logins-deep@example.test',password='complex password B!';await auth.register({email,password},req,response());for(let i=0;i<5;i++)await assert.rejects(()=>auth.login({email,password:'not-correct'},req,response()),e=>e.status===401);await auth.login({email,password},req,response());for(let i=0;i<12;i++)await assert.rejects(()=>auth.login({email,password:'wrong-credential'},req,response()),e=>e.status===401);await assert.rejects(()=>auth.login({email,password},req,response()),e=>e.status===429);});
 test('malformed password payload never consumes failed-login budget',async()=>{const storage=db(),auth=new AuthService(storage),email='malformed-budget-deep@example.test',password='complex password C!';await auth.register({email,password},req,response());for(let i=0;i<20;i++)await assert.rejects(()=>auth.login({email,password:[]},req,response()),e=>e.status===400);await auth.login({email,password},req,response());});
 test('KDF protects the process against dozens of simultaneous unique-email requests',async()=>{
   const storage=db(),auth=new AuthService(storage);
   const operations=Array.from({length:64},(_,i)=>auth.login({email:`load-${i}@deep.test`,password:'fake password'},req,response()));
   const outcomes=await Promise.allSettled(operations);
   const blocked=outcomes.filter(x=>x.status==='rejected'&&x.reason.status===429).length;
   const unauth=outcomes.filter(x=>x.status==='rejected'&&x.reason.status===401).length;
   assert.ok(blocked>=20,`Expected overload protection, got ${blocked} rejected out of 64`);
   assert.ok(unauth>0,'Accepted work must still reject invalid credentials as 401');
   assert.equal(blocked+unauth,64,'No hanging or unexpected error path');
   const email='post-load@example.test',password='CorrectPasswordForLoad!';
   await auth.register({email,password},req,response());
   assert.equal((await auth.login({email,password},req,response())).user.email,email,'Queue recovers after overload');
 });
 test('DatabaseService discards PostgreSQL connection if ROLLBACK fails and preserves original error',async()=>{const original=new Error('original write failure');let released=[];poolFactory=()=>({connect:async()=>({query:async(sql)=>{if(sql==='BEGIN')return{};if(sql==='ROLLBACK')throw Error('dead socket');throw original;},release:(discard)=>released.push(discard)}),end:async()=>{}});const dbs=new DatabaseService();await assert.rejects(()=>dbs.transaction(async c=>c.query('INSERT FAILS')),e=>e===original);assert.deepEqual(released,[true]);});
 test('DatabaseService reuses healthy connection after successful rollback',async()=>{const original=new Error('write rejected');let released=[];poolFactory=()=>({connect:async()=>({query:async(sql)=>{if(sql==='BEGIN'||sql==='ROLLBACK')return{};throw original},release:(discard)=>released.push(discard)}),end:async()=>{}});const dbs=new DatabaseService();await assert.rejects(()=>dbs.transaction(async c=>c.query('BAD SQL')),e=>e===original);assert.deepEqual(released,[false]);});
}
