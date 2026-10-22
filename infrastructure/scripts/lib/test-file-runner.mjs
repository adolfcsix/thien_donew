import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
export const FILE_TIMEOUT_MS=90000;
export const RUN_TIMEOUT_MS=600000;
export function isolationFlag(version=process.versions.node){
 const [major,minor]=version.split('.').map(Number);
 if(!Number.isInteger(major)||!Number.isInteger(minor)||major<22||major===22&&minor<13)throw new RangeError('Node.js 22.13+ required');
 return major>23||major===23&&minor>=6?'--test-isolation=none':'--experimental-test-isolation=none';
}
export function parseTap(stdout){
 const value=field=>{const matches=[...stdout.matchAll(new RegExp(`^# ${field} (\\d+)\\s*$`,'gm'))];return matches.length===1?Number(matches[0][1]):null;};
 const counts=Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(k=>[k,value(k)]));
 return {...counts,valid:Number.isInteger(counts.tests)&&counts.tests>0&&counts.pass===counts.tests&&counts.fail===0&&counts.cancelled===0&&counts.skipped===0&&counts.todo===0};
}
function stopTree(child){
 if(!child?.pid)return;
 if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',timeout:5000});
 else try{process.kill(-child.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}
}
export async function runTestFiles(files,{cwd,reportDir,concurrency=2,exclusiveFiles=[],timeoutMs=FILE_TIMEOUT_MS,runTimeoutMs=RUN_TIMEOUT_MS,log=console.log,command=process.execPath,argsForFile}={}){
 if(!Array.isArray(files)||!files.length||files.some(f=>typeof f!=='string'||!f)||new Set(files).size!==files.length)throw new TypeError('Nonempty unique test files required');
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)throw new RangeError('Concurrency must be 1..4');
 if(!Number.isInteger(timeoutMs)||timeoutMs<50||!Number.isInteger(runTimeoutMs)||runTimeoutMs<timeoutMs)throw new RangeError('Invalid test deadlines');
 if(!cwd||!reportDir)throw new TypeError('cwd and reportDir required');
 mkdirSync(reportDir,{recursive:true});
 // Progress and a completed verdict are different artifacts. Never repeatedly
 // overwrite results.json with partial snapshots: external readers/sync layers
 // may otherwise retain progress as the final result. Preserve the prior run.
 const resultPath=resolve(reportDir,'results.json');
 if(existsSync(resultPath))renameSync(resultPath,resolve(reportDir,`previous-results-${Date.now()}.json`));
 const startedAt=new Date().toISOString(),started=Date.now(),results=new Array(files.length),active=new Set(),abortTimers=new Set(),exclusive=new Set(exclusiveFiles),waiting=[];let next=0,abortReason=null,activeJobs=0,exclusiveActive=false;
 const notify=()=>{for(const wake of waiting.splice(0))wake();};
 const acquire=async()=>{for(;;){if(abortReason||next>=files.length)return null;const file=files[next],isExclusive=exclusive.has(file);if(exclusiveActive||isExclusive&&activeJobs>0){await new Promise(wake=>waiting.push(wake));continue;}const index=next++;activeJobs++;if(isExclusive)exclusiveActive=true;return {index,file,isExclusive};}};
 const abort=reason=>{abortReason??=reason;notify();for(const child of active){try{stopTree(child);}catch{child.kill('SIGKILL');}const timer=setTimeout(()=>{abortTimers.delete(timer);if(active.has(child)){if(process.platform==='win32')stopTree(child);else try{process.kill(-child.pid,'SIGKILL');}catch{}}},1000);abortTimers.add(timer);}};
 const signalHandler=()=>abort('Interrupted');process.once('SIGTERM',signalHandler);process.once('SIGINT',signalHandler);
 const globalTimer=setTimeout(()=>abort('Overall test deadline exceeded'),runTimeoutMs);
 const flag=isolationFlag();
 const execute=async(file,index)=>new Promise(done=>{
  const began=Date.now(),rawPath=resolve(reportDir,`${String(index+1).padStart(3,'0')}.tap.log`);
  let stdout='',stderr='',timedOut=false,outputExceeded=false,spawnError=null,killTimer=null,closed=false;
  const child=spawn(command,argsForFile?argsForFile(file):['--test',flag,'--test-reporter=tap',file],{cwd,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});active.add(child);
  const kill=()=>{try{stopTree(child);}catch(error){stderr+='\nCleanup: '+error.message;child.kill('SIGKILL');}killTimer=setTimeout(()=>{if(!closed){if(process.platform==='win32')stopTree(child);else try{process.kill(-child.pid,'SIGKILL');}catch{}}},1000);};
  const timer=setTimeout(()=>{timedOut=true;kill();},timeoutMs);
  const append=(kind,data)=>{if(outputExceeded)return;const chunk=data.toString();if(kind==='stdout')stdout+=chunk;else stderr+=chunk;if(Buffer.byteLength(stdout)+Buffer.byteLength(stderr)>16*1024*1024){outputExceeded=true;kill();}};
  child.stdout.on('data',b=>append('stdout',b));child.stderr.on('data',b=>append('stderr',b));child.on('error',error=>{spawnError=error.message;});
  child.on('close',(code,signal)=>{closed=true;clearTimeout(timer);clearTimeout(killTimer);active.delete(child);writeFileSync(rawPath,stdout+'\n--- STDERR ---\n'+stderr);
   const tap=parseTap(stdout);const ok=code===0&&!timedOut&&!outputExceeded&&!spawnError&&!abortReason&&tap.valid;
   done({file,status:ok?'PASS':'FAIL',code,signal,timedOut,outputExceeded,spawnError,elapsedMs:Date.now()-began,logFile:rawPath,...tap});
  });
 });
 const persist=()=>writeFileSync(resolve(reportDir,'progress.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),elapsedMs:Date.now()-started,expectedFiles:files,results:results.filter(Boolean),abortReason},null,2)+'\n');
 try{
  await Promise.all(Array.from({length:Math.min(concurrency,files.length)},async()=>{for(;;){const job=await acquire();if(!job)return;const {index,file,isExclusive}=job;log(`START ${index+1}/${files.length} ${file}${isExclusive?' [exclusive]':''}`);try{const result=await execute(file,index);results[index]=result;persist();log(`${result.status} ${file}: ${result.pass??0}/${result.tests??0} (${result.elapsedMs}ms)${result.timedOut?' TIMEOUT':''}`);}finally{activeJobs--;if(isExclusive)exclusiveActive=false;notify();}}}));
 }finally{clearTimeout(globalTimer);for(const timer of abortTimers)clearTimeout(timer);process.removeListener('SIGTERM',signalHandler);process.removeListener('SIGINT',signalHandler);}
 for(let i=0;i<files.length;i++)if(!results[i])results[i]={file:files[i],status:'BLOCKED',reason:abortReason||'Not executed'};
 const report={startedAt,completedAt:new Date().toISOString(),elapsedMs:Date.now()-started,expectedFiles:files,results,abortReason,verdict:abortReason||results.some(r=>r.timedOut||r.spawnError||r.status==='BLOCKED')?'BLOCKED':results.every(r=>r.status==='PASS')?'PASS':'FAIL',tests:results.reduce((n,r)=>n+(r.tests||0),0),passed:results.reduce((n,r)=>n+(r.pass||0),0)};
 writeFileSync(resultPath,JSON.stringify(report,null,2)+'\n');return report;
}
