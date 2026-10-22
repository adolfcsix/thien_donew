/** Run all CJS source tests with temporary links to LOCAL npm workspaces only.
 * No npm, no install, no code/db change. BLOCKED if any tests fail or modules missing.
 * Example: node infrastructure/scripts/offline-workspace-tests.mjs --out=docs/reports
 */
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createWorkspaceOverlay,testEnvironment,summarizeNodeTap,listOfflineTestFiles} from './lib/offline-workspace-tests.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const arg=process.argv.find(x=>x.startsWith('--out='));
if(process.argv.some(x=>x.startsWith('--')&&!x.startsWith('--out=')))throw Error('Unknown option');
const out=arg?resolve(arg.slice(6)):join(root,'docs/reports/offline-workspace');
const temp=mkdtempSync(join(tmpdir(),'thiendo-source-workspaces-'));
try{
  const names=createWorkspaceOverlay(root,temp);
  const tests=listOfflineTestFiles(root);
  const child=spawnSync(process.execPath,['--test','--test-concurrency=4',...tests],{
    cwd:root,encoding:'utf8',env:testEnvironment(process.env,temp),timeout:180000,
    maxBuffer:16*1024*1024,shell:false,
  });
  const logs=(child.stdout||'')+'\n'+(child.stderr||'')+'\n'+(child.error?.message||'');
  const summary=summarizeNodeTap(logs,child.error?null:child.status);
  if(child.error)summary.status='INCOMPLETE';
  summary.workspacesLinkedTemporarily=names.length;
  summary.testFiles=tests.length;
  summary.suites=['tests','tests/compat/tests'];
  summary.ambientNodePathsIgnored=true;
  summary.generated=new Date().toISOString();
  summary.method='NODE_PATH isolated temporary workspace overlay; CJS and compat suites; no npm install or dependency substitution';
  mkdirSync(out,{recursive:true});
  writeFileSync(join(out,'node-tap.log'),logs);
  writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(`${summary.status}: ${summary.passed??'?'} / ${summary.tests??'?'} tests; ${summary.failed??'?'} failed`);
  console.log(`Temporary local workspace links: ${names.length}; missing modules: ${JSON.stringify(summary.modules)}`);
  console.log(`Evidence: ${out}/summary.json, node-tap.log`);
  console.log('This cannot satisfy npm ci, build, typecheck, database E2E or provider acceptance gates.');
  process.exitCode=summary.status==='PASS'?0:2;
}finally{
  rmSync(temp,{recursive:true,force:true});
}
