'use strict';
const fs=require('node:fs'),path=require('node:path');
const M=require('../../packages/knowledge/src/star-system-matrix.cjs');
const E=require('../../packages/astrology-engine/src/tuvi.js');
const baselines=require('../../packages/star-audit/fixtures/chart-baselines.json');
const report=M.auditCatalog();let charts=0,annualYears=0;
for(const {input} of baselines.cases){M.buildChartMatrix(E.calculate(input));charts++;}
const chart=E.calculate(baselines.cases[0].input);
for(let year=Math.max(1900,chart.lunar.year);year<Math.max(1900,chart.lunar.year)+60&&year<=2100;year++){M.buildChartMatrix(chart,E.annualOverview(chart,year));annualYears++;}
const output={scope:'identity-layer-and-internal-output-integrity',...report,baselineCharts:charts,annualYears,resolutions:M.getResolutions().map(r=>({name:r.name,category:r.category,state:r.state,automaticPlacement:r.automaticPlacement,automaticAlias:r.automaticAlias})),verdict:report.errors.length?'FAIL':'PASS',limits:'Internal integrity only. Does not independently validate all placements or turn nine scoped source rules into integrated stars.'};
if(process.argv.includes('--write')){const out=path.resolve(__dirname,'../../docs/reports/star-system-audit.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');}
console.log(JSON.stringify(output,null,2));if(report.errors.length)process.exitCode=1;
