/** Remove only generated application build output, never source or database. */
import {rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const paths=process.argv.includes('--web-only')?['apps/web/.next']:['apps/web/.next','apps/api/dist'];
for(const relative of paths){
 rmSync(resolve(root,relative),{recursive:true,force:true,maxRetries:3,retryDelay:100});
 console.log('Removed generated build output: '+relative);
}
