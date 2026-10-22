/** No dependencies required. Reports prerequisites only; not a build or DB test. */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Socket } from 'node:net';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const reqWeb=createRequire(resolve(root,'apps/web/package.json'));
const reqApi=createRequire(resolve(root,'apps/api/package.json'));
const checks=[['Node.js >=22.13', (()=>{const [maj,min]=process.versions.node.split('.').map(Number);return maj>22||(maj===22&&min>=13)})()]];
for(const [name,lookup,req] of [
 ['Next.js','next/package.json',reqWeb],
 ['React','react/package.json',reqWeb],
 ['NestJS','@nestjs/core/package.json',reqApi],
 ['PostgreSQL driver','pg/package.json',reqApi],
 ['TypeScript','typescript/package.json',reqApi],
]){
 let ok=false;
 try{ok=Boolean(req.resolve(lookup));}catch{}
 checks.push([name,ok]);
}
const lock=existsSync(resolve(root,'package-lock.json'));
checks.push(['npm package-lock.json present (reproducible installation)',lock]);
const docker=spawnSync(process.platform==='win32'?'docker.exe':'docker',['--version'],{encoding:'utf8',timeout:3000});
checks.push(['Docker CLI found',docker.status===0]);
let dbUrl;
try{dbUrl=new URL(process.env.DATABASE_URL??'postgresql://thiendo:thiendo_dev@localhost:5432/thiendo');}
catch{console.error('INVALID DATABASE_URL');process.exitCode=2;}
async function tcp(host,port){return await new Promise(done=>{let finished=false;const socket=new Socket();const finish=(ok)=>{if(!finished){finished=true;socket.destroy();done(ok)}};socket.setTimeout(750);socket.once('error',()=>finish(false));socket.once('timeout',()=>finish(false));socket.connect(port,host,()=>finish(true));});}
if(dbUrl && ['localhost','127.0.0.1','::1','[::1]'].includes(dbUrl.hostname)) checks.push(['PostgreSQL TCP port reachable (not a DB authentication test)',await tcp(dbUrl.hostname.replace(/[\[\]]/g,''),Number(dbUrl.port||5432))]);
else checks.push(['Local DB port probe',false]);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'NOT READY'}: ${name}`);
console.log('\nNext steps: npm install; npm run typecheck; npm run build; docker compose -f infrastructure/compose.yaml up -d; npm run db:migrate; npm run dev; npm run test:e2e.');
console.log('Never run the destructive HTTP E2E suite against a production database.');
if(checks.some(([name,ok])=>!ok&&['Next.js','React','NestJS','PostgreSQL driver','TypeScript'].includes(name)))process.exitCode=2;
