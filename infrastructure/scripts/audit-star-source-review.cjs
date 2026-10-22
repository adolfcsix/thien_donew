'use strict';
const fs=require('node:fs'),path=require('node:path');
const {auditSourceComparison}=require('../../packages/star-audit/src/source-comparison.cjs');
const result=auditSourceComparison();
if(result.summary.tuanLocationMatches!==60||result.summary.changshengMismatches||result.summary.circleAnchorMismatches)throw Error('Source comparison diverged; review required.');
if(process.argv.includes('--write'))fs.writeFileSync(path.resolve(__dirname,'../../packages/knowledge/src/star-source-comparison.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
