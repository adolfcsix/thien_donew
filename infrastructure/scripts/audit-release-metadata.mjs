import {auditReleaseMetadata} from './release-metadata.mjs';
const result=auditReleaseMetadata();
console.log(`Release metadata: ${result.status} — ${result.version||'unknown'}`);
for(const error of result.errors)console.error('FAIL: '+error);
if(result.errors.length)process.exitCode=1;
