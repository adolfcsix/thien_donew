/** Explicit release metadata updater; default is read-only preview. */
import {ROOT,prepareRelease,auditReleaseMetadata} from './release-metadata.mjs';
const args=process.argv.slice(2),i=args.indexOf('--version');
if(i<0||!args[i+1]){
 console.error('Usage: npm run prepare:release -- --version 11.53.0 [--apply]');process.exitCode=2;
}else{
 try{
 const r=prepareRelease(ROOT,args[i+1],{apply:args.includes('--apply'),regenerate:args.includes('--apply')});
 console.log(`${r.status}: ${r.nextVersion}; metadata files changing: ${r.changes.join(', ')||'none'}`);
 if(r.status==='APPLIED')console.log(`Release metadata: ${auditReleaseMetadata().status}. This is not a build verification.`);
 else console.log('Preview only: pass --apply to write; will regenerate star identity snapshot.');
 }catch(e){console.error('BLOCKED:',e.message);process.exitCode=1;}
}
