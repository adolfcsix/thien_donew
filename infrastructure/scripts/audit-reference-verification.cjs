#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {auditReferenceVerification}=require('../../packages/knowledge/src/reference-verification.cjs');
const report=auditReferenceVerification();
console.log(`V11.65 reference research: ${report.status}, ${report.checked} pending (${report.missing} absent, ${report.aliases} aliases), ${report.engineReady} approved for engine`);
for(const e of report.errors)console.error('FAIL '+e);
if(process.argv.includes('--write')){
 const target=path.resolve(__dirname,'../../docs/reports/reference-verification.json');
 fs.writeFileSync(target,JSON.stringify({...report,notVerified:['Reference descriptions not independently verified','No automatic alias merging','No placement formula approved']},null,2)+'\n');
}
if(report.errors.length)process.exitCode=1;
