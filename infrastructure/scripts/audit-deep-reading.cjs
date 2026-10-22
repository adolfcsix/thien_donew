'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../../packages/astrology-engine/src/tuvi.js');
const {buildDeepChartReading:read}=require('../../packages/interpretation/src/deep-chart-reading.cjs');
const baselines=require('../../packages/star-audit/fixtures/chart-baselines.json');
let charts=0,years=0,anchors=0;const errors=[];
try{
 for(const {input} of baselines.cases){const c=E.calculate(input),before=JSON.stringify(c),year=Math.max(2026,c.lunar.year),r=read(c,year);assert.equal(r.palaces.length,12);assert.equal(r.natalTransformations.length,4);assert.equal(r.annualTransformations.length,4);assert.equal(r.summary.reviewPalaces,0);assert.equal(JSON.stringify(c),before);charts++;anchors+=12;}
 const c=E.calculate(baselines.cases[0].input);let previous;
 for(let y=c.lunar.year;y<Math.min(c.lunar.year+60,2101);y++){const r=read(c,y);const n={palaces:r.palaces.map(p=>p.natal),hoa:r.natalTransformations};if(previous)assert.deepEqual(n,previous);previous=n;assert.equal(r.annualTransformations.length,4);assert.equal(r.summary.annualStars,12);years++;anchors+=12;}
}catch(e){errors.push(e.message);}
const report={version:'11.123.0',verdict:errors.length?'FAIL':'PASS',scope:'internal-synthesis-and-time-layer-integrity',baselineCharts:charts,annualYears:years,palaceAnchors:anchors,errors,limits:'Internal invariants and representative chart corpus. No independent expert validation of editorial readings or traditional formulas.'};
if(process.argv.includes('--write')){const out=path.resolve(__dirname,'../../docs/reports/deep-reading-audit.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
