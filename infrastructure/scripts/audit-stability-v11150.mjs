/** V11.150: offline, non-destructive hardening gate.
 * No packages are downloaded and no database, environment file or user data is modified.
 * This is NOT evidence of a production deployment, browser, payment or SQL E2E run. */
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {auditReleaseMetadata} from './release-metadata.mjs';
import {validateRepositoryLock} from './validate-lockfile.mjs';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const text=(root,file)=>readFileSync(resolve(root,file),'utf8');
const sha256=data=>createHash('sha256').update(data).digest('hex');
export function auditMigrations(root=ROOT) {
 const errors=[],base=JSON.parse(text(root,'infrastructure/db/baselines/migrations-001-018.json'));
 const files=readdirSync(resolve(root,'infrastructure/db')).filter(x=>/^\d{3}_.*\.sql$/.test(x)).sort();
 const baseline=base.migrations;
 if(Object.keys(baseline).length!==18 || base.sourceVersion!=='11.149.16')errors.push('baseline provenance is invalid');
 if(files.length<18)errors.push('migration files are missing');
 for (const [name,expected] of Object.entries(baseline)) {
  const file=resolve(root,'infrastructure/db',name);
  if(!existsSync(file))errors.push(`${name}: missing immutable migration`);
  else if(sha256(readFileSync(file))!==expected)errors.push(`${name}: immutable migration was modified`);
 }
 for(const [i,name] of files.entries()) {
  if(Number(name.slice(0,3))!==i+1)errors.push(`${name}: migration number gap/duplicate; expected ${String(i+1).padStart(3,'0')}`);
 }
 return {pass:errors.length===0,errors,files:files.length,baselineFiles:18};
}
export function auditSourceStability(root=ROOT) {
 const errors=[],check=(name,condition)=>{if(!condition)errors.push(name);};
 const mustRead=file=>{try{return text(root,file);}catch{errors.push(`missing ${file}`);return '';}};
 const api=mustRead('apps/api/src/main.ts');
 const db=mustRead('apps/api/src/common/database.service.ts');
 const migrate=mustRead('infrastructure/scripts/migrate.mjs');
 const auth=mustRead('apps/api/src/modules/auth/auth.service.ts');
 const pay=mustRead('apps/api/src/modules/billing/payment-gateway.ts');
 const attrs=mustRead('.gitattributes');
 const ci=mustRead('.github/workflows/ci.yml');
 const acceptance=mustRead('.github/workflows/production-acceptance.yml');
 const prod=mustRead('infrastructure/production/preflight.mjs');
 const pkg=JSON.parse(mustRead('package.json')||'{}');
 const parts=typeof pkg.version==='string'?pkg.version.split('.').map(Number):[];
 check('root release version is V11.150.0 or later',parts.length===3&&parts.every(Number.isSafeInteger)&&((parts[0]===11&&parts[1]>=150)||parts[0]>=12));
 check('API has origin policy',/isTrustedMutation\(req\.headers\.origin/.test(api));
 check('API explicitly verifies webhook separately',/req\.path !== '\/api\/billing\/webhook\/payos'/.test(api)&&/webhooks\.verify\(/.test(pay));
 check('API request body bounded',/json\(\{ limit: '80kb' \}\)/.test(api));
 check('API session cookie HttpOnly/Lax/Secure',/httpOnly:\s*true/.test(auth)&&/sameSite:\s*'lax'/.test(auth)&&/secure:\s*process\.env\.COOKIE_SECURE/.test(auth));
 check('PostgreSQL pool timeout',/connectionTimeoutMillis:\s*5_000/.test(db)&&/statement_timeout:\s*10_000/.test(db));
 check('PostgreSQL transactions rollback/release',/await client\.query\('ROLLBACK'\)/.test(db)&&/client\.release\(discardClient\)/.test(db));
 check('Git checkout preserves LF for immutable SQL',/^infrastructure\/db\/\*\.sql text eol=lf$/m.test(attrs));
 check('Migrations use bounded connection wait',/connectionTimeoutMillis:\s*10_000/.test(migrate));
 check('Migrations have bounded advisory lock wait',/SET statement_timeout = '30s'/.test(migrate)&&/RESET statement_timeout/.test(migrate));
 check('Migrations have checksum and first-run lock',/createHash\('sha256'\)/.test(migrate)&&/pg_advisory_lock\(20261010, 81\)/.test(migrate));
 check('Production requires immutable image digests',/sha256:\[a-f0-9\]\{64\}/.test(prod));
 check('CI checks source, regression, typecheck, build, migrations and HTTP E2E',
   ['npm run check:source','npm run test:sharded','npm run typecheck','npm run build','npm run db:migrate','run-ci-http.sh'].every(s=>ci.includes(s)));
 check('Production acceptance includes backup restore evidence',/pg_restore/.test(acceptance)&&/npm run check:production:smoke/.test(acceptance));
 check('V11.150 source gate is included in CI',ci.includes('npm run audit:stability:150'));
 check('V11.150 hardening test is included in CI',ci.includes('tests/v11150-stability.test.cjs'));
 return {pass:errors.length===0,errors};
}
export function auditAll(root=ROOT) {
 const migration=auditMigrations(root),source=auditSourceStability(root);
 const metadata=auditReleaseMetadata(root);
 const lock=validateRepositoryLock(root);
 const errors=[...migration.errors,...source.errors,...metadata.errors,...lock];
 return {version:JSON.parse(text(root,'package.json')).version,scope:'SOURCE_ONLY',verdict:errors.length?'FAIL':'PASS',checks:{migration,source,metadata:metadata.status,lockfile:lock.length?'FAIL':'PASS'},errors,notProven:['npm ci','typecheck','Next/Nest build','native PostgreSQL','browser mobile/tablet/desktop','real OAuth/OTP','payOS webhook/settlement','DNS/HTTPS','backup restore in production','stress/load','independent classical-method review']};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=auditAll();
 console.log(JSON.stringify(report,null,2));
 if(report.verdict!=='PASS')process.exitCode=1;
}
