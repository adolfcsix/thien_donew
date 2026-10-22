/** Read-only npm workspace dependency preflight. Does not install or mutate modules. */
import {createRequire} from 'node:module';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const checks=[
 ['API','apps/api/package.json',['@nestjs/common','@nestjs/core','pg','typescript','@thiendo/astrology-engine/src/tarot-rws.cjs']],
 ['Next','apps/web/package.json',['next','react','typescript','@thiendo/astrology-engine/src/tarot-rws.cjs']],
 ['Astrology engine','packages/astrology-engine/package.json',['astronomy-engine','moment-timezone']],
];
let missing=0;
for(const [group,packageFile,names] of checks){
 const req=createRequire(resolve(root,packageFile));
 for(const name of names){
  try{
   const resolved=req.resolve(name);
   if(!resolved.startsWith(root+sep))throw Error('resolved outside project');
   console.log(`[PASS] ${group}: ${name}`);
  }
  catch{missing++;console.log(`[BLOCKED] ${group}: ${name}`);}
 }
}
if(missing){
 console.error(`BLOCKED: ${missing} runtime/build dependencies not resolvable from their workspace.`);
 console.error('From a fresh extracted project with access to a trusted npm registry, run: npm.cmd ci --no-audit --no-fund (Windows).');
 console.error('Then retry: npm.cmd run check:dependencies; npm.cmd run typecheck; npm.cmd run build.');
 process.exitCode=1;
}else console.log('PASS: sampled critical dependencies resolve. This is not a typecheck, build, security audit or E2E verification.');
