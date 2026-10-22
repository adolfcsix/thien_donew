/** V11.164: CI receipts are recorded only after a real command exits successfully.
 * This is a build gate, not a tamper-proof certificate against a compromised runner.
 */
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const gates=['source','install','build','regression','security','database','restore','live'];
const root=process.cwd();
const dir=resolve(process.env.V11164_EVIDENCE_DIR||join(root,'verification/v11164/evidence'));
const args=process.argv.slice(2);
function stop(message){console.error('BLOCKED V11.164:',message);process.exit(2);}
const identity=()=>({commit:process.env.GITHUB_SHA,run:process.env.GITHUB_RUN_ID,lockSha256:createHash('sha256').update(readFileSync(join(root,'package-lock.json'))).digest('hex')});
function requireCI(){if(process.env.CI!=='true'||!process.env.GITHUB_SHA||!process.env.GITHUB_RUN_ID)stop('CI SHA and run identity required; a local run cannot qualify a release');}
if(args[0]==='run'){
 requireCI();const gate=args[1],sep=args.indexOf('--');
 if(!gates.includes(gate)||sep!==2||sep>=args.length-2)stop('run <known-gate> -- <command> [args]');
 const file=join(dir,gate+'.json');if(existsSync(file))stop('Gate evidence already exists: '+gate);
 const [command,...commandArgs]=args.slice(sep+1);mkdirSync(dir,{recursive:true});
 const start=Date.now();console.log(`V11.164 ${gate}: BEGIN`);
 const child=spawn(command,commandArgs,{cwd:root,env:process.env,stdio:'inherit',shell:false});
 child.on('error',e=>stop('Command failed to start: '+e.message));
 child.on('exit',(code,signal)=>{
  if(code!==0||signal){console.error(`BLOCKED V11.164 ${gate}: code=${code} signal=${signal}`);process.exitCode=code||1;return;}
  const receipt={schema:'v11164-gate-v1',gate,status:'PASS',...identity(),completedAt:new Date().toISOString(),durationMs:Date.now()-start};
  writeFileSync(file,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('PASS V11.164:',gate);
 });
}else if(args[0]==='finalize'){
 requireCI();const done=[];
 for(const gate of gates){const file=join(dir,gate+'.json');if(!existsSync(file))stop('Missing gate: '+gate);
  const x=JSON.parse(readFileSync(file,'utf8'));
  if(x.schema!=='v11164-gate-v1'||x.gate!==gate||x.status!=='PASS'||!x.completedAt)stop('Invalid receipt: '+gate);
  for(const [key,value] of Object.entries(identity()))if(x[key]!==value)stop('Stale '+gate+' receipt: '+key);
  done.push({gate,completedAt:x.completedAt,durationMs:x.durationMs});
 }
 const result={release:'V12.0-rc.0',verdict:'TECHNICAL_GATES_PASSED_NOT_PRODUCTION_APPROVAL',...identity(),gates:done,
 pending:['External Gemini/PayOS sandbox checks and expert evaluation','Legal approval and privacy impact assessment','Manual security and production release approval'],finishedAt:new Date().toISOString()};
 mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'technical-release-candidate.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log('PASS: all eight evidence gates. Production approval is separate.');
}else stop('run <gate> -- command OR finalize');
