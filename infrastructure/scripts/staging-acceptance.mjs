/** Read-only staging evidence REVIEW, never a release authorization or deploy command. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateStagingEvidence,REQUIRED} from './staging-acceptance-lib.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
const version=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version;
const indexOfKey=flag=>args.indexOf(flag);
const inputIndex=indexOfKey('--evidence'),shaIndex=indexOfKey('--commit');
if(args.includes('--help')){console.log('Usage: node infrastructure/scripts/staging-acceptance.mjs --evidence FILE --commit GIT_SHA');process.exit(0)}
const file=inputIndex>=0?args[inputIndex+1]:null;
const sha=shaIndex>=0?args[shaIndex+1]:null;
let input,loadError;
try{if(!file)throw Error('Staging evidence file not supplied');input=JSON.parse(readFileSync(resolve(file),'utf8'));}
catch(e){loadError=e.message;input=null;}
const assessment=evaluateStagingEvidence(input,{version,sha});
if(loadError)assessment.problems.unshift('evidence:not-accessible');
const report={project:'THIEN DO',version,stage:'staging',generatedAt:new Date().toISOString(),
 status:assessment.status,problems:assessment.problems,missing:assessment.missing,
 expectedEvidence:REQUIRED,independentProofVerified:false,
 note:assessment.caution||'External CI evidence is not supplied; publication is blocked.'};
const out=process.env.THIENDO_STAGING_REPORT||resolve(root,'docs/reports',`V11_149_STAGING_REVIEW.json`);
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(`STAGING REVIEW: ${report.status}; missing=${report.missing.join(', ')||'none'}`);
console.log(`Read-only report: ${out}`);
// Never return a successful release gate based solely on caller-supplied evidence.
process.exitCode=2;
