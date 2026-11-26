'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');

// Harness for shell orchestration only; this does not exercise PostgreSQL or HTTP.
// The stub wait-for-* calls must wait for the corresponding setsid process
// to start. Otherwise cleanup can race setsid and miss the process group.
for(const fail of [false,true])test('CI API and library tests share disposable private storage; cleanup on '+(fail?'failure':'success'),{skip:process.platform==='win32'},()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-ci-shell-'));
 const trace=path.join(temp,'trace.jsonl');
 const live=[];
 try{
  const bin=path.join(temp,'bin');fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin,'node'),`#!${process.execPath}
const fs=require('node:fs');
const path=require('node:path');
const file=process.argv.at(-1),storage=process.env.BOOK_PRIVATE_STORAGE_DIR;
const root=process.env.CI_HARNESS_ROOT;
const service=file==='tests/wait-for-api.mjs'?'api':file==='tests/wait-for-next.mjs'?'web':null;
if(service){
 const ready=path.join(root,service+'.ready');
 const deadline=Date.now()+5000;
 const wait=new Int32Array(new SharedArrayBuffer(4));
 while(Date.now()<deadline){
  try{
   const record=JSON.parse(fs.readFileSync(ready,'utf8'));
   if(record.storage!==storage||!Number.isInteger(record.pid))process.exit(12);
   process.kill(record.pid,0);
   process.exit(0);
  }catch{Atomics.wait(wait,0,0,20);}
 }
 console.error('Harness server did not become ready: '+service);process.exit(13);
}
if(file==='tests/v11155-books-http.test.mjs'){
 if(!storage||!fs.existsSync(storage)||!storage.includes('thiendo-ci-private-books'))process.exit(8);
 fs.writeFileSync(path.join(storage,'fixture'),'test');
 fs.writeFileSync(process.env.CI_HARNESS_TRACE,JSON.stringify({storage}));
 if(process.env.CI_HARNESS_FAIL==='1')process.exit(9);
}
`,{mode:0o755});
  fs.writeFileSync(path.join(bin,'npm'),`#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');
const service=process.argv.includes('@thiendo/api')?'api':'web';
const root=process.env.CI_HARNESS_ROOT;
const ready=path.join(root,service+'.ready');
fs.writeFileSync(ready+'.tmp',JSON.stringify({pid:process.pid,storage:process.env.BOOK_PRIVATE_STORAGE_DIR}));
fs.renameSync(ready+'.tmp',ready);
setInterval(()=>{},1000);
`,{mode:0o755});
  const result=spawnSync('bash',['infrastructure/scripts/run-ci-http.sh'],{
   cwd:path.resolve(__dirname,'..'),env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,
    RUNNER_TEMP:temp,CI_HARNESS_ROOT:temp,CI_HARNESS_TRACE:trace,CI_HARNESS_FAIL:fail?'1':'0',
    THIENDO_QIMEN_BROWSER:'0',THIENDO_BROWSER_ACCEPTANCE:'0'},encoding:'utf8',timeout:20000});
  for(const service of ['api','web']){
   const f=path.join(temp,service+'.ready');
   if(fs.existsSync(f))live.push(JSON.parse(fs.readFileSync(f,'utf8')));
  }
  assert.equal(result.error,undefined,result.stderr);
  assert.equal(result.status,fail?9:0,result.stderr);
  assert.equal(live.length,2,'both isolated servers must have started');
  const record=JSON.parse(fs.readFileSync(trace,'utf8').trim());
  for(const server of live){
   assert.equal(server.storage,record.storage,'both servers use the same disposable storage');
   assert.throws(()=>process.kill(server.pid,0),{code:'ESRCH'},'server process must be reaped');
  }
  assert.equal(fs.existsSync(record.storage),false,'private files removed after servers stop');
 }finally{
  // Even a failed/timed-out test may not leave fake server processes running.
  for(const service of ['api','web']){
   try{
    const {pid}=JSON.parse(fs.readFileSync(path.join(temp,service+'.ready'),'utf8'));
    if(Number.isInteger(pid)&&pid>1)process.kill(pid,'SIGKILL');
   }catch{/* already stopped or never started */}
  }
  fs.rmSync(temp,{recursive:true,force:true});
 }
});

test('day/star audit creates its output directory in a fresh checkout',{skip:process.platform==='win32'},()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-star-audit-'));
 try{
  const dir=path.join(temp,'infrastructure/scripts');fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(path.join(__dirname,'../infrastructure/scripts/audit-star-jie-witness-v111496.cjs'),path.join(dir,'audit.cjs'));
  fs.symlinkSync(path.join(__dirname,'../packages'),path.join(temp,'packages'),'dir');
  const r=spawnSync(process.execPath,[path.join(dir,'audit.cjs'),'--write'],{encoding:'utf8',timeout:10000});
  assert.equal(r.status,0,r.stderr);
  const report=JSON.parse(fs.readFileSync(path.join(temp,'docs/reports/V11_149_6_JIE_AND_STARS_WITNESSES.json'),'utf8'));
  assert.equal(report.status,'SOURCE_EVIDENCE_PASS');assert.equal(report.calendar.verifiedMinuteInstants,0);assert.equal(report.stars.newlyApprovedNames,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
