/**
 * V11.53: central release metadata contract and safe version preparation.
 * Does not fabricate dependency locks or validate astronomical formulas.
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const ITEMS=Object.freeze([
 ['package.json','version'],
 ['packages/knowledge/src/star-identity-registry.json','release'],
 ['packages/knowledge/src/school-review-registry.json','edition'],
 ['packages/knowledge/src/school-validation-protocols.json','edition'],
]);
const json = p => JSON.parse(readFileSync(p,'utf8'));
export const validVersion=v=>typeof v==='string'&&/^\d+\.\d+\.\d+$/.test(v);
export function auditReleaseMetadata(root=ROOT){
 const versions=[],errors=[];
 for(const [file,key] of ITEMS){
  try {const value=json(resolve(root,file))[key];versions.push({file,key,value});
    if(!validVersion(value))errors.push(`${file} invalid ${key}`);
  } catch(e){errors.push(`${file} unreadable: ${e.message}`);}
 }
 const reference=versions.find(x=>x.file==='package.json')?.value;
 for(const item of versions)if(reference&&item.value!==reference) errors.push(`${item.file}: ${item.key}=${item.value} != ${reference}`);
 return {status:errors.length?'FAIL':'PASS',version:reference,items:versions,errors};
}
export function prepareRelease(root,nextVersion,{apply=false,regenerate=false,runGenerator}={}){
 if(!validVersion(nextVersion))throw Error('Version must be numeric MAJOR.MINOR.PATCH');
 const before=ITEMS.map(([file,key])=>({file,key,abs:resolve(root,file),data:readFileSync(resolve(root,file),'utf8')}));
 // Keep an existing resolved dependency lock in the same rollback boundary.
 // Version preparation never creates a lock or changes package resolution.
 const lockPath=resolve(root,'package-lock.json');
 if(existsSync(lockPath)){
  const data=readFileSync(lockPath,'utf8'), lock=JSON.parse(data);
  if(!lock.packages?.[''] || lock.name!==JSON.parse(before[0].data).name)
   throw Error('Existing package-lock.json has an invalid root; resolve dependencies before preparing a release');
  before.push({file:'package-lock.json',key:'version',abs:lockPath,data});
 }
 const changes=before.filter(x=>{const value=JSON.parse(x.data);return value[x.key]!==nextVersion || x.file==='package-lock.json' && value.packages[''].version!==nextVersion;}).map(x=>x.file);
 if(!apply)return {status:'DRY_RUN',nextVersion,changes};
 // Transaction boundary includes the generated star snapshot, not just metadata.
 // A generator failure must never leave a half-updated release on disk.
 const snapshot = resolve(root,'packages/knowledge/src/star-identity-registry.json');
 const snapshotBefore = readFileSync(snapshot,'utf8');
 const touched=[];
 try{
  for(const item of before){
   const value=JSON.parse(item.data);value[item.key]=nextVersion;
   if(item.file==='package-lock.json')value.packages[''].version=nextVersion;
   writeFileSync(item.abs,JSON.stringify(value,null,2)+'\n');touched.push(item);
  }
  if(regenerate){
   const result=runGenerator ? runGenerator(root) : spawnSync(process.execPath,['infrastructure/scripts/build-star-registry.cjs','--write'],{cwd:root,encoding:'utf8',timeout:30000});
   if(result.status!==0||result.error)throw Error(`Star registry generation blocked: ${result.stderr||result.error?.message||'unknown error'}`);
  }
  const audit=auditReleaseMetadata(root);
  if(audit.status!=='PASS')throw Error(audit.errors.join('; '));
  return {status:'APPLIED',nextVersion,changes,validated:ITEMS.length};
 }catch(e){
   // Restore in reverse order, including generator output that may have already
   // overwritten the snapshot before throwing or exiting nonzero.
   for(const item of touched.reverse())writeFileSync(item.abs,item.data);
   writeFileSync(snapshot,snapshotBefore);
   throw e;
 }
}
