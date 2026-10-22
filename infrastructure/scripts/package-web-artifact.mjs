import {cp,mkdir,stat,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
/** Build route caches can retain HTML/RSC pointing at a previous client bundle.
 * Keep current app output; discard only reproducible cache in the new artifact. */
export async function packageWebArtifact(app=resolve(root,'apps/web')){
const output=resolve(app,'.next/standalone/apps/web');
await stat(resolve(output,'server.js'));
await rm(resolve(app,'.next/server/route-cache'),{recursive:true,force:true});
await rm(resolve(output,'.next/server/route-cache'),{recursive:true,force:true});
await mkdir(resolve(output,'.next'),{recursive:true});
await cp(resolve(app,'.next/static'),resolve(output,'.next/static'),{recursive:true});
try{await stat(resolve(app,'public'));await cp(resolve(app,'public'),resolve(output,'public'),{recursive:true});}catch(error){if(error.code!=='ENOENT')throw error;}
console.log('Standalone web artifact includes static assets.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 execFileSync(process.execPath,[resolve(root,'infrastructure/scripts/audit-tarot-assets.mjs')],{cwd:root,stdio:'inherit'});
 execFileSync(process.execPath,[resolve(root,'infrastructure/scripts/audit-source-protection.mjs'),'--build'],{cwd:root,stdio:'inherit'});
 await packageWebArtifact();
}

