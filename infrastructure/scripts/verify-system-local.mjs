/** Explicit, reproducible LOCAL software acceptance. Never implies production sign-off. */
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const npm=process.env.npm_execpath;
if(!npm)throw Error('Run through npm run check:system:local');
const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
const reportDir=resolve(root,'docs/reports/system-local-v'+version.replaceAll('.','_'));
mkdirSync(reportDir,{recursive:true});
const stages=[
 ['dependencies','npm','check:dependencies'],['lockfile','npm','check:lockfile'],
 ['source','npm','check:source'],['metadata','npm','audit:release-metadata'],
 ['architecture','npm','audit:architecture'],['css-baseline','npm','audit:css-dedupe'],
 ['typecheck','npm','typecheck'],['build','npm','build'],
 ['complete-regression','npm','test:sharded'],
 ['operations-security','node','--test','tests/production/operations.test.cjs','tests/production/security-runtime.test.cjs'],
 ['built-artifact-smoke','npm','check:production:smoke'],
 ['server-routes','npm','check:system:routes'],['account-sql','npm','test:account:sql'],
];
const checks=[];let stopped=false;
for(const [id,runner,...args] of stages){
 if(stopped){checks.push({id,status:'NOT_RUN',reason:'Earlier gate failed'});continue;}
 if(id==='account-sql'&&!process.env.THIENDO_SQL_TEST_MODULE){checks.push({id,status:'BLOCKED',reason:'Set THIENDO_SQL_TEST_MODULE to a pinned isolated PGlite runtime; see upgrade guide'});continue;}
 console.log('\nCHECK '+id);
 const start=Date.now();
 const result=spawnSync(process.execPath,runner==='npm'?[npm,'run',...args]:args,{cwd:root,env:process.env,stdio:'inherit',timeout:15*60*1000});
 const pass=result.status===0&&!result.error&&!result.signal;
 checks.push({id,status:pass?'PASS':'FAIL',exitCode:result.status,signal:result.signal||null,durationMs:Date.now()-start});
 if(!pass)stopped=true;
}
const ok=checks.every(c=>c.status==='PASS');
const report={version,time:new Date().toISOString(),status:ok?'LOCAL_SOFTWARE_PASS':'LOCAL_SOFTWARE_INCOMPLETE',productionAccepted:false,checks,notCovered:['native PostgreSQL/HTTP','browser hydration and responsive visuals','real OAuth/email','Docker/ingress','public DNS/TLS','offsite recovery/alerts/rollback','capacity/load']};
writeFileSync(resolve(reportDir,'results.json'),JSON.stringify(report,null,2)+'\n');
console.log('\n'+report.status+'; productionAccepted=false; evidence '+reportDir+'/results.json');
if(!ok)process.exitCode=1;
