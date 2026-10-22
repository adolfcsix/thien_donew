/** Repeatable UI acceptance only. HTTP account/storage fixtures never certify PostgreSQL. */
import {spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {localTestOrigin} from './e2e-http.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
const origin=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const suites=['tool-login','tarot','natal','timezone','storage','system-depth','star-source','star-system','deep-reading','tarot-depth','tarot-spreads','complete-chart','western-depth','relationship','mai-hoa-depth','luc-hao-depth','qimen-depth','bazi-naoj'];
const started=new Date().toISOString(),checks=[];
const dir=resolve(process.env.THIENDO_BROWSER_REPORT_DIR||resolve(root,'docs/reports'),`browser-v${version.replaceAll('.','_')}`);
mkdirSync(dir,{recursive:true});
try{
 const response=await fetch(origin+'/tarot',{signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!response.ok)throw Error(`Next returned HTTP ${response.status}`);
 for(const name of suites){
  const result=spawnSync(process.execPath,[`tests/${name}-browser-smoke.mjs`],{cwd:root,env:process.env,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
  writeFileSync(resolve(dir,`${name}.log`),(result.stdout||'')+'\n'+(result.stderr||''));
  const status=result.status===0&&!result.error?'PASS':'FAIL';
  checks.push({name,status,exit:result.status,error:result.error?.code||null});console.log(`[${status}] ${name}`);
 }
}catch(error){checks.push({name:'Browser prerequisites',status:'BLOCKED',error:error.message});}
const verdict=checks.length===suites.length&&checks.every(c=>c.status==='PASS')?'PASS':'BLOCKED';
writeFileSync(resolve(dir,'results.json'),JSON.stringify({version,started,completed:new Date().toISOString(),verdict,checks,scope:'Production Next and Chromium at 390/1440px; account/storage HTTP mocked. Does not certify native PostgreSQL, provider delivery, Windows or Safari.'},null,2)+'\n');
console.log(`${verdict}: UI acceptance only. Evidence: ${dir}`);
if(verdict!=='PASS')process.exitCode=1;
