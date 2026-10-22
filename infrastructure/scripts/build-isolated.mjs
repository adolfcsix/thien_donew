/** Build a fresh immutable source snapshot outside synchronized project folders.
 * No symlink dependencies, live artifact overwrite, credentials or DB copying.
 * Keep the successful snapshot for local preview/tests; clean it explicitly later.
 */
import {cpSync,mkdtempSync,readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const destination=mkdtempSync(join(tmpdir(),'thiendo-isolated-'));
const excluded=new Set(['node_modules','.next','dist','.git','reports','.rsync-tmp']);
const allowed=path=>{
 const rel=relative(root,path),parts=rel.split(/[\\/]/),name=parts.at(-1);
 return !parts.some(p=>excluded.has(p)||p.startsWith('.qa-web-'))&&
  !(parts[0]==='docs'&&parts[1]==='reports')&&
  !(/^\.env(?:\.|$)/.test(name)&&!['.env.example','.env.e2e.example'].includes(name))&&
  !/\.(?:zip|log|tsbuildinfo|pem|key|p12|pfx|db|sqlite)$/i.test(name)&&
  !['.build-isolated.json','.npmrc','id_rsa','id_ed25519'].includes(name)&&
  !['private','backups','backup','upload'].includes(parts[0]);
};
cpSync(root,destination,{recursive:true,filter:allowed});
function manifest(dir,prefix=''){
 const result={};for(const entry of readdirSync(join(dir,prefix),{withFileTypes:true})){const rel=join(prefix,entry.name);if(!allowed(join(root,rel)))continue;
  if(entry.isSymbolicLink())throw Error('Source symlink requires explicit review: '+rel);
  if(entry.isDirectory())Object.assign(result,manifest(dir,rel));else if(entry.isFile())result[rel.replaceAll('\\','/')]=createHash('sha256').update(readFileSync(join(dir,rel))).digest('hex');
 }return result;
}
const sourceManifest=manifest(destination);
// Check every source byte against the input before any dependency/build writes.
for(const [file,hash] of Object.entries(sourceManifest))if(createHash('sha256').update(readFileSync(join(root,file))).digest('hex')!==hash)throw Error('Source changed while snapshotting: '+file);
const npm=process.platform==='win32'?'npm.cmd':'npm';
const evidence={status:'IN_PROGRESS',root:destination,node:process.version,platform:process.platform,sourceFiles:sourceManifest,commands:[]};
const evidencePath=join(destination,'isolated-build-evidence.json');
for(const args of [['ci','--no-audit','--no-fund'],['run','build']]){
 const started=new Date().toISOString();const result=spawnSync(npm,args,{cwd:destination,env:{...process.env,THIENDO_ISOLATED_BUILD:'1'},stdio:['ignore','pipe','pipe'],encoding:'utf8',maxBuffer:16*1024*1024,shell:process.platform==='win32'});
 const phase=args[0]==='ci'?'ci':'compile',stdoutLog='isolated-'+phase+'.stdout.log',stderrLog='isolated-'+phase+'.stderr.log';
 // Keep complete closed streams beside the isolated artifact. A synchronized
 // parent workspace may overwrite a redirected log while it is still growing.
 writeFileSync(join(destination,stdoutLog),result.stdout||'');writeFileSync(join(destination,stderrLog),result.stderr||'');
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
 evidence.commands.push({command:['npm',...args],started,exitCode:result.status,error:result.error?.message,stdoutLog,stderrLog});
 evidence.status=result.status===0?'IN_PROGRESS':'FAILED';writeFileSync(evidencePath,JSON.stringify(evidence,null,2));
 if(result.status!==0){console.error('Isolated build failed; diagnostic snapshot retained: '+destination);process.exit(result.status||1);}
}
statSync(join(destination,'apps/web/.next/standalone/apps/web/server.js'));
evidence.status='PASS';writeFileSync(evidencePath,JSON.stringify(evidence,null,2));
writeFileSync(join(root,'.build-isolated.json'),JSON.stringify({root:destination,evidence:evidencePath,status:'PASS'},null,2));
console.log('ISOLATED_BUILD_ROOT='+destination);
console.log('Successful artifact retained; do not rebuild it while testing or serving.');
