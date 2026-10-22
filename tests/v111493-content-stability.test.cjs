'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const {assessResearchCoverage}=require('../apps/web/src/features/bazi/research-coverage.cjs');
const ZiPing=require('../packages/astrology-engine/src/ziping-depth.cjs');
const cases={outside:'2004-08-15',inside:'2026-05-18'};
const input=date=>({date,hour:10,minute:30,utcOffsetMinutes:420,longitudeDeg:105,sex:'male'});
test('Bát Tự: outside the 2025-2027 table stays blocked and basic page explicitly says approximation',()=>{
 const x=assessResearchCoverage(ZiPing.evaluate(input(cases.outside)));
 assert.equal(x.level,'blocked');assert.equal(x.sourceStatus,'OUT_OF_COVERAGE');assert.equal(x.sourceAvailable,false);
 assert.equal(x.verifiedUsefulGod,false);assert.equal(x.verifiedDayun,false);assert.match(x.explanation,/2025–2027/);
});
test('Bát Tự: covered 2026 date is RESEARCH only, not verified useful god',()=>{
 const x=assessResearchCoverage(ZiPing.evaluate(input(cases.inside)));
 assert.equal(x.level,'research');assert.equal(x.sourceAvailable,true);
 assert.equal(x.yearMonthSourceVerified,false);assert.equal(x.verifiedUsefulGod,false);
 assert.equal(x.luckStatus,'PROVISIONAL');
});
test('Bát Tự: near a Jie boundary is review or blocked, never research-approved',()=>{
 const x=assessResearchCoverage({calendar:{sourceStatus:'BOUNDARY_REVIEW',nearClockBoundary:false},methods:{status:'BLOCKED'},luck:{status:'BLOCKED'}});
 assert.equal(x.level,'review');assert.equal(x.yearMonthSourceVerified,false);
});
test('Bát Tự: guarded clock boundary downgrades covered research to review',()=>{
 const x=assessResearchCoverage({calendar:{sourceStatus:'RESOLVED',nearClockBoundary:true},methods:{status:'PROVISIONAL'},luck:{status:'PROVISIONAL'}});
 assert.equal(x.level,'review');
});
test('Bát Tự: invalid research response does not silently claim coverage',()=>{
 assert.throws(()=>assessResearchCoverage(null),TypeError);
 assert.throws(()=>assessResearchCoverage({calendar:{sourceStatus:'RESOLVED'}}),TypeError);
});
test('Bát Tự Basic/Expert: distinct presentation, same stored input and explicit caveats',()=>{
 const source=read('apps/web/src/app/bazi/page.tsx');
 assert.match(source,/<ExpertOnly title="Cách cục, Dụng thần/);
 assert.match(source,/data-level=\{coverage.level\}/);
 assert.match(source,/SaveStudy.*snapshot:/);
 assert.match(source,/chưa xác minh một Dụng thần kết luận/);
 assert.doesNotMatch(source,/chưa có dụng thần, xác nhận hóa khí/);
});
test('Chart: JSON export keeps object URL alive until browser consumes click',()=>{
 const source=read('apps/web/src/app/chart/page.tsx');
 const section=source.slice(source.indexOf('function exportData()'),source.indexOf('return (',source.indexOf('function exportData()')));
 assert.match(section,/document.body.appendChild\(element\)/);
 assert.match(section,/window.setTimeout\(\(\) => URL.revokeObjectURL\(url\), 2000\)/);
});
test('Tử Vi: 11 unreviewed stars and 4 aliases are research-only, not auto-placed',()=>{
 const d=require('../packages/knowledge/src/star-source-docket.json');
 assert.equal(d.records.filter(x=>x.category==='missing').length,11);
 assert.equal(d.records.filter(x=>x.category==='alias').length,4);
 const preview=require('../packages/knowledge/src/star-candidate-preview.cjs');
 assert.equal(preview.getStarCandidatePreview({birthCycleIndex:0,annualBranch:0}).automaticPlacement,false);
});
test('15 editorial disciplines have source files and explicit expert-review pending',()=>{
 const report=require('../infrastructure/scripts/audit-content-integrity-v111493.cjs').check();
 assert.equal(report.status,'PASS',report.issues.join(', '));assert.equal(report.inventory.disciplines,15);
});
