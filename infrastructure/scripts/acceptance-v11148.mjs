/** V11.148 read-only evidence collector for source gates and explicit production blockers.
 * Source checks are executable; production claims require running separate real environments.
 * No npm install, database writes, account activity, publication or host mutation.
 */
import {spawnSync} from 'node:child_process';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectDependencyInstallation} from './dependency-install-check.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const PRODUCTION_GATES=Object.freeze([
  ['typecheck','NestJS + Next.js full typecheck'],
  ['build','Next.js + NestJS production build'],
  ['migrations','Disposable native PostgreSQL migrations 001–014 twice'],
  ['http_e2e','Live Next proxy → Nest → PostgreSQL HTTP E2E'],
  ['browser','Chromium mobile + desktop browser acceptance'],
  ['oauth_otp','Live Google OAuth and email OTP delivery with approved test account'],
  ['backup_restore','Native PostgreSQL backup and isolated restore drill'],
  ['security','Dependency audit and production security review'],
  ['infrastructure','Domain, HTTPS, monitoring, DNS, alerts and rollback rehearsal'],
]);
export function assessReadiness(sourceChecks, runtimeChecks) {
  const source = sourceChecks.length>0 && sourceChecks.every(x=>x.status==='PASS')?'SOURCE_PASS':'SOURCE_BLOCKED';
  const required = PRODUCTION_GATES.map(([id])=>runtimeChecks.find(x=>x.id===id));
  // Source results alone never establish deployability; manual/prod evidence cannot
  // be inferred from static code, configuration, or a previous version's report.
  return {source,production:source==='SOURCE_PASS' && required.every(x=>x?.status==='PASS')?'EVIDENCE_COMPLETE':'NO_GO',missing:PRODUCTION_GATES.filter((_,i)=>required[i]?.status!=='PASS').map(([id])=>id)};
}
export function runtimePlaceholder() {
  return PRODUCTION_GATES.map(([id,name])=>({id,name,status:'NOT_VERIFIED',note:'Requires current-version external/staging execution; not inferred from source tests'}));
}
function run(label,args,timeout=120000){
  const r=spawnSync(process.execPath,args,{cwd:root,env:process.env,encoding:'utf8',timeout,maxBuffer:6*1024*1024});
  const status=r.status===0&&!r.error?'PASS':'FAIL';
  const output=(r.stdout||'')+'\n'+(r.stderr||'');
  const result={id:label,status,exitCode:r.status,error:r.error?.code??null,detail:output.slice(-2500).trim()};
  console.log(`[${status}] ${label}`);
  return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(!process.argv.includes('--source')){
    console.error('Usage: node infrastructure/scripts/acceptance-v11148.mjs --source (read-only)');
    process.exitCode=2;
  } else {
    const started=new Date().toISOString();
    const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
    const sourceChecks=[
      run('lockfile',['infrastructure/scripts/validate-lockfile.mjs']),
      run('source_imports',['infrastructure/scripts/check-source.mjs'],180000),
      run('architecture',['infrastructure/scripts/audit-architecture.cjs']),
      run('production_operations_static',['--test','tests/production/operations.test.cjs'],90000),
      run('v11148_contracts',['--test','tests/v11148-production-readiness.test.cjs'],90000),
    ];
    const dependencyIssues=inspectDependencyInstallation(root);
    const dependencies={id:'dependencies',status:dependencyIssues.length?'BLOCKED':'PRESENT_UNVERIFIED',
      note:dependencyIssues.length?`Missing ${dependencyIssues.length} package/CLI dependencies; npm ci not attempted`:'Packages resolvable; npm ci and build still need independent execution',
      missing:dependencyIssues};
    const runtimeChecks=runtimePlaceholder();
    const securityGate=runtimeChecks.find(x=>x.id==='security');
    securityGate.note='Native runtime security tests require installed NestJS; audit and real deployment review not performed';
    const verdict=assessReadiness(sourceChecks,runtimeChecks);
    const report={project:'THIEN DO',version,started,completed:new Date().toISOString(),mode:'read-only-local-source',
      verdict,sourceChecks,dependencies,runtimeChecks,
      boundaries:['No npm registry, Docker, PostgreSQL or remote credentials used','No migrations or destructive E2E executed','Google OAuth/OTP and TLS must be checked in a controlled staging environment','CI workflows added to source are not evidence that GitHub Actions ran']};
    const dir=resolve(root,'docs/reports');mkdirSync(dir,{recursive:true});
    const file=resolve(dir,`V11_148_READINESS_EVIDENCE.json`);
    writeFileSync(file,JSON.stringify(report,null,2)+'\n');
    console.log(`Source=${verdict.source}; production=${verdict.production}; pending=${verdict.missing.join(', ')}`);
    console.log(`Saved ${file}`);
    if(verdict.source!=='SOURCE_PASS')process.exitCode=1;
  }
}
