/** Current documentation/release gate. Never grants production approval. */
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const BUNDLE='V11.164.103';
export const REQUIRED_GATES=['P0_INSTALL','P0_TYPECHECK_BUILD','P0_NODE_TESTS','P0_AUTH_DB_E2E','P0_PAYMENT_AI','P0_PRODUCTION_CONFIG','P0_BACKUP_RESTORE','P0_LEGAL_LICENSES','P1_BROWSER_VISUAL','P1_PERFORMANCE','P1_TAROT_ASSETS'];
export const REQUIRE_FILES=['README.md','HUONG_DAN.md','docs/BAO_CAO_HIEN_TAI.md','infrastructure/release/current.json','docs/TAROT_78_ANH_BAI_GOC_1909.md','docs/TAROT_DECKS_MODERN_LICENSES.md','START_THIEN_DO_WINDOWS.bat','CHECK_THIEN_DO_WINDOWS.bat','infrastructure/production/backup.sh','infrastructure/production/restore-drill.sh','infrastructure/production/rollback.sh','apps/web/src/lib/portal-v11163-content.json','apps/web/src/components/shell.tsx','package.json','package-lock.json'];
const get=(root,rel)=>readFileSync(join(root,rel),'utf8');
export function auditHandover(root=ROOT){
 const errors=[],err=x=>errors.push(x);
 for(const rel of REQUIRE_FILES)if(!existsSync(join(root,rel)))err('Missing file: '+rel);
 if(errors.length)return {status:'FAIL',errors,checkedFiles:REQUIRE_FILES.length};
 let pkg,lock,meta,portal;
 try{pkg=JSON.parse(get(root,'package.json'));lock=JSON.parse(get(root,'package-lock.json'));meta=JSON.parse(get(root,'infrastructure/release/current.json'));portal=JSON.parse(get(root,'apps/web/src/lib/portal-v11163-content.json'));}catch(e){return {status:'FAIL',errors:['Invalid JSON: '+e.message],checkedFiles:REQUIRE_FILES.length};}
 if(meta.schemaVersion!==2||meta.bundleVersion!==BUNDLE||meta.guide!=='HUONG_DAN.md'||meta.report!=='docs/BAO_CAO_HIEN_TAI.md')err('Current release metadata mismatch');
 if(meta.status!=='NO_GO')err('Unapproved GO marker: documentation cannot approve production');
 if(meta.packageVersion!==pkg.version||lock.version!==pkg.version||lock.packages?.['']?.version!==pkg.version)err('Package/lock metadata mismatch');
 if(meta.legalDraftsApproved!==false||meta.realProviderTestsPassed!==false||meta.productionDatabaseTestPassed!==false)err('Unverified production claim');
 if(!Array.isArray(meta.blockingGates)||meta.blockingGates.length!==REQUIRED_GATES.length)err('Missing release gates');
 else for(const id of REQUIRED_GATES){const gate=meta.blockingGates.filter(x=>x.id===id);if(gate.length!==1||gate[0].status!=='OPEN'||typeof gate[0].evidenceRequired!=='string'||gate[0].evidenceRequired.length<12)err('Improper gate '+id);}
 for(const rel of ['README.md','HUONG_DAN.md','docs/BAO_CAO_HIEN_TAI.md'])if(!get(root,rel).includes(BUNDLE)||!get(root,rel).includes('NO-GO'))err('Current document lacks bundle/NO-GO: '+rel);
 if(pkg.scripts?.['audit:handover']!=='node infrastructure/scripts/audit-handover.mjs')err('Missing executable audit command');
 const guides=portal.filter(x=>x.kind==='guide'),policies=portal.filter(x=>x.kind==='policy');
 if(guides.length!==15||policies.length!==8||!policies.every(x=>x.reviewStatus==='legal_draft'))err('8 policy draft / 15 guide contract changed or unsupported legal approval');
 const shell=get(root,'apps/web/src/components/shell.tsx');for(const p of policies)if(!shell.includes('/phap-ly/'+p.slug))err('Footer missing policy '+p.slug);
 const migrations=readdirSync(join(root,'infrastructure/db')).filter(x=>/^\d{3}_[a-zA-Z0-9_-]+\.sql$/.test(x));
 if(migrations.length!==37||!get(root,'HUONG_DAN.md').includes('**'+migrations.length+' migration'))err('Migration count/document mismatch');
 const modern=get(root,'docs/TAROT_DECKS_MODERN_LICENSES.md');if(!modern.includes('CC BY 4.0')||!modern.includes('offline')||!modern.includes('78'))err('Tarot license/offline qualification undocumented');
 for(const rel of ['README.md','HUONG_DAN.md','docs/BAO_CAO_HIEN_TAI.md'])for(const m of get(root,rel).matchAll(/\]\(([^)]+)\)/g)){
  const link=m[1];if(/^\w+:|^\/\//.test(link))continue;
  let [path,anchor]=link.split('#');path=path.split('?')[0];try{path=decodeURIComponent(path);anchor=anchor?decodeURIComponent(anchor):'';}catch{err('Malformed URL '+link);continue;}
  const absolute=path?resolve(dirname(join(root,rel)),path):join(root,rel);
  if(!(absolute===root||absolute.startsWith(root+'/')))err('Unsafe Markdown link '+rel+': '+link);
  else if(!existsSync(absolute))err('Broken Markdown link '+rel+': '+link);
  else if(anchor&&!readFileSync(absolute,'utf8').includes('id="'+anchor+'"'))err('Broken guide anchor '+rel+': '+link);
 }
 return {status:errors.length?'FAIL':'PASS',errors,checkedFiles:REQUIRE_FILES.length,guides:guides.length,policyDrafts:policies.length,migrations:migrations.length,blockingGates:meta.blockingGates?.length??0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=auditHandover();console.log(`Current handover ${r.status}: ${r.checkedFiles} files, ${r.migrations??0} migrations, ${r.blockingGates??0} OPEN release gates`);
 for(const error of r.errors)console.error('FAIL '+error);
 if(r.errors.length)process.exitCode=1;else console.log('PASS: current guide, links and NO-GO release status are consistent; this does not certify production readiness');
}
