'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const table=require('../packages/knowledge/src/tuong-tien-study-table.json');
const study=require('../packages/knowledge/src/tuong-tien-study.cjs');
const {auditStudy}=require('../infrastructure/scripts/audit-tuong-tien-study.cjs');
test('V11.38: all 12 earthly branches have twelve unique placements',()=>{
 assert.equal(table.rows.length,12);
 for(let year=0;year<12;year++){
  const entries=study.calculateStudyCircle(year),row=study.getStudyRow(year);
  assert.equal(entries.length,12);assert.equal(new Set(entries.map(x=>x.branchIndex)).size,12);
  assert.deepEqual(entries,row.placements);assert.equal(row.yearBranch,table.branches[year]);
 }
});
test('V11.38: four natal year groups have independently specified starting places',()=>{
 const anchors=[[2,6],[6,6],[10,6],[8,0],[0,0],[4,0],[5,9],[9,9],[1,9],[11,3],[3,3],[7,3]];
 for(const [year,start] of anchors)assert.equal(study.calculateStudyCircle(year)[0].branchIndex,start);
});
test('V11.38: source-study does not enable chart placements or expert approval',()=>{
 assert.equal(table.scope,'reference-only-research');assert.equal(table.automaticNatalPlacement,false);
 assert.equal(table.automaticAnnualPlacement,false);assert.equal(table.expertReviewed,false);
 const engineDir=path.join(root,'packages/astrology-engine/src');
 for(const f of fs.readdirSync(engineDir,{recursive:true}).filter(x=>/\.([cm]?js|ts)$/.test(x)))
  assert.doesNotMatch(fs.readFileSync(path.join(engineDir,f),'utf8'),/tuong-tien-study|V11_38_TUONG_TIEN/);
});
test('V11.38: invalid earthly branches are rejected without coercion',()=>{
 for(const x of [-1,12,0.5,'0',null,NaN,undefined]){
  assert.throws(()=>study.calculateStudyCircle(x),RangeError);
  assert.throws(()=>study.getStudyRow(x),RangeError);
 }
});
test('V11.38: overlap with Hoa Cái and Kiếp Sát is checked against current engine for all 12 branches',()=>{
 const r=auditStudy();assert.deepEqual(r.errors,[]);assert.equal(r.engineNameOverlapChecks,24);
 assert.equal(r.placements,144);assert.equal(r.expertReviewed,false);
});
test('V11.38: damaged research row is detected, rather than silently fixed',()=>{
 const corrupt=structuredClone(table);corrupt.rows[2].placements[4].branchIndex=1;
 assert.ok(auditStudy(corrupt).errors.some(x=>x.includes('divergence')));
});
test('V11.38: displaced group start cannot change agreed four reference anchors',()=>{
 const corrupt=structuredClone(table);corrupt.groupStartByYearBranch[2]=0;
 assert.ok(auditStudy(corrupt).errors.some(x=>x.includes('Starting branches')));
});
test('V11.38: study panel is UI-only; the source does not claim to write a natal chart',()=>{
 const panel=fs.readFileSync(path.join(root,'apps/web/src/app/research/tuong-tien-reference.tsx'),'utf8');
 const page=fs.readFileSync(path.join(root,'apps/web/src/app/research/page.tsx'),'utf8');
 assert.match(panel,/không tự thêm sao vào lá số/);assert.match(panel,/study\.rows\[index\]/);
 assert.match(page,/<TuongTienReference \/>/);assert.doesNotMatch(panel,/chartEngine|createChart|calculateNatal/);
});
