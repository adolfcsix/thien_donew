/** Read-only, reproducible dependency triage; does not equate missing modules with failing business logic. */
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const targets=[
 ['astrology-engine','packages/astrology-engine/package.json',['astronomy-engine','moment-timezone']],
 ['api','apps/api/package.json',['@nestjs/common','@nestjs/core','pg','typescript']],
 ['web','apps/web/package.json',['next','react','typescript']],
];
const rootPackage=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const lock=JSON.parse(readFileSync(resolve(root,'package-lock.json'),'utf8'));
const report={project:rootPackage.name,node:process.version,lockfileVersion:lock.lockfileVersion,groups:[],missing:0};
for(const [name,manifest,modules] of targets){
 const requireFrom=createRequire(resolve(root,manifest));
 const pkg=JSON.parse(readFileSync(resolve(root,manifest),'utf8'));
 const entries=modules.map(module=>{
  const declared=Boolean(pkg.dependencies?.[module]||pkg.devDependencies?.[module]||pkg.peerDependencies?.[module]);
  const lockEntry=Boolean(lock.packages?.[`node_modules/${module}`]);
  let resolved=false;
  try{requireFrom.resolve(module);resolved=true;}catch(error){if(error.code!=='MODULE_NOT_FOUND'&&error.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw error;}
  if(!resolved)report.missing++;
  return {module,declared,lockEntry,resolved};
 });
 report.groups.push({name,entries});
}
console.log(JSON.stringify(report,null,2));
if(report.missing)process.exitCode=2;
