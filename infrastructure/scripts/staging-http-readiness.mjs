/** Explicit-origin HTTPS probe. Read-only. Never implies complete staging acceptance. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkStagingHttp} from './staging-http-probe-lib.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
const args=process.argv.slice(2);
if(args.includes('--help')){console.log('Usage: node infrastructure/scripts/staging-http-readiness.mjs --origin https://staging.example.com');process.exit(0)}
const n=args.indexOf('--origin');const origin=n>=0?args[n+1]:null;
const result=await checkStagingHttp(origin);
const report={project:'THIEN DO',version,checkedAt:new Date().toISOString(),environment:'staging',origin:origin||null,...result,
  independentlyVerified:false,productionAuthorized:false};
const path=resolve(root,'docs/reports/V11_149_STAGING_HTTP.json');mkdirSync(dirname(path),{recursive:true});
writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(`${result.status} — ${path}`);
if(result.status!=='READ_ONLY_HTTP_PASS')process.exitCode=2;
