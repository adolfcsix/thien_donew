/** Read-only classifier for Node TAP logs. This is NOT a test runner or a waiver. */
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export function classifyTap(log){
 const failEntries=[...log.matchAll(/^not ok (\d+) - (.+)$/gm)].map(x=>({number:Number(x[1]),title:x[2]}));
 const modules=Object.create(null);
 for(const match of log.matchAll(/Cannot find module '([^']+)'/g))modules[match[1]]=(modules[match[1]]||0)+1;
 const summary=Object.fromEntries([...log.matchAll(/^# (tests|pass|fail|cancelled|skipped) (\d+)$/gm)].map(x=>[x[1],Number(x[2])]));
 const missingTotal=Object.values(modules).reduce((a,b)=>a+b,0);
 return {summary,failEntries,missingModules:modules,missingOccurrences:missingTotal,
  unresolvedWithoutModuleEvidence:Math.max(0,failEntries.length-missingTotal),
  integrityOk:summary.fail===failEntries.length && summary.tests===summary.pass+summary.fail+(summary.cancelled||0)+(summary.skipped||0)};
}
export function missingRuntimeDependencies(root=ROOT){
 const read=(file)=>JSON.parse(readFileSync(resolve(root,file),'utf8'));
 const lock=read('package-lock.json');
 const names=['astronomy-engine','@nestjs/common','pg','moment-timezone','react'];
 const modulePaths={
  'astronomy-engine':'packages/astrology-engine/package.json',
  '@nestjs/common':'apps/api/package.json',
  'pg':'apps/api/package.json',
  'moment-timezone':'packages/astrology-engine/package.json',
  'react':'apps/web/package.json',
 };
 return names.map(name=>{
  const from=modulePaths[name];let installed=false;
  try{installed=Boolean(createRequire(resolve(root,from)).resolve(name));}catch{}
  return {name,locked:Boolean(lock.packages?.['node_modules/'+name]),installed,workspace:from};
 });
}
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 if(!process.argv[2]){console.error('Usage: node infrastructure/scripts/classify-node-test-failures.mjs <TAP-log>');process.exitCode=2;}
 else{
  const log=readFileSync(resolve(process.argv[2]),'utf8');const report=classifyTap(log);
  console.log('Node TAP:',JSON.stringify(report.summary));
  console.log(`Fail entries: ${report.failEntries.length}, missing-module occurrences: ${report.missingOccurrences}, other failures to investigate: ${report.unresolvedWithoutModuleEvidence}`);
  for(const [name,n] of Object.entries(report.missingModules).sort((a,b)=>b[1]-a[1]))console.log(`${name}: ${n}`);
  for(const item of missingRuntimeDependencies())console.log(`[${item.installed?'INSTALLED':'MISSING'}] ${item.name} ${item.locked?'(lockfile present)':'(LOCKFILE MISSING!)'} — ${item.workspace}`);
  if(!report.integrityOk||!report.summary.fail)console.error('WARNING: Unexpected TAP summary or no failures; review log format and suite completeness.');
  if(!report.integrityOk)process.exitCode=1;
 }
}
