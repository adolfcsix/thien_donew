/** Offline, non-destructive V11.101 runtime consistency audit. */
import { spawnSync } from 'node:child_process';
import { localOrigin, localPostgresTarget } from './local-runtime-doctor-lib.mjs';
const baseline={...process.env,NODE_ENV:'development',WEB_ORIGIN:'http://localhost:3000',API_INTERNAL_URL:'http://127.0.0.1:8080',
 DATABASE_URL:'postgresql://dev:do_not_log@127.0.0.1:5432/db', API_PORT:'8080',API_HOST:'127.0.0.1',COOKIE_SECURE:'false'};
let cases=0;
function run(overrides,expected) {
 const p=spawnSync(process.execPath,['infrastructure/scripts/preflight.mjs'],{
  cwd:new URL('../../',import.meta.url).pathname,env:{...baseline,...overrides},encoding:'utf8',timeout:6000,
 });
 if (p.status!==expected) throw Error(`Unexpected preflight result for ${Object.keys(overrides).join(',')||'baseline'}: ${p.status}, expected ${expected}`);
 if ((p.stdout+p.stderr).includes('do_not_log')) throw Error('Secret in diagnostic output');
 cases++;
}
run({},0);
for(const API_PORT of ['0','65536','NaN','3.5'])run({API_PORT},1);
for(const API_HOST of ['remote.example.org','::2'])run({API_HOST},1);
for(const DATABASE_URL of ['http://example.org/db','mysql://localhost/db','not-a-url'])run({DATABASE_URL},1);
for(const WEB_ORIGIN of ['https://user:pass@example.org','http://example.org/path'])run({WEB_ORIGIN},1);
run({NODE_ENV:'production', WEB_ORIGIN:'https://example.org',COOKIE_SECURE:'true'},0);
run({NODE_ENV:'production', WEB_ORIGIN:'http://example.org',COOKIE_SECURE:'true'},1);
if(localOrigin('http://example.org')!==null||!localOrigin('http://127.0.0.1:3000')||
   localPostgresTarget('postgresql://localhost/db')?.port!==5432) throw Error('Unsafe loopback origin policy');
console.log(`PASS: V11.101 runtime guards, ${cases} live preflight probes and loopback policy.`);
