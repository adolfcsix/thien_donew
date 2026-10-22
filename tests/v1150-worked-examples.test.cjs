'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const catalogue=require('../packages/knowledge/src/worked-examples.json');
const definitions=require('../packages/knowledge/src/worked-case-definitions.json');
const {buildCasebook,checkSnapshot,extract,publicFields}=require('../infrastructure/scripts/build-worked-examples.cjs');
const {audit}=require('../infrastructure/scripts/audit-worked-examples.cjs');
const root=path.resolve(__dirname,'..');
test('V11.50 exactly 12 distinct exercises, one per palace, all unique prompts',()=>{
 assert.equal(catalogue.cases.length,12);assert.equal(new Set(catalogue.cases.map(x=>x.id)).size,12);
 assert.deepEqual(new Set(catalogue.cases.map(x=>x.palace)),new Set(Object.keys(require('../packages/knowledge/src/palace-topics.json').topics)));
 assert.equal(new Set(catalogue.cases.map(x=>x.question)).size,12);
 assert.equal(new Set(catalogue.cases.map(x=>x.exercise)).size,12);
 assert.equal(definitions.cases.length,12);
});
test('V11.50 deterministic regeneration reproduces checked-in snapshot byte for byte',()=>{
 const current=buildCasebook();assert.equal(JSON.stringify(current),JSON.stringify(catalogue));
 assert.equal(checkSnapshot(catalogue).ok,true);
});
test('V11.50 alterations to saved evidence cannot pass replay validation',()=>{
 const forged=structuredClone(catalogue);forged.cases[0].evidence[0].star='SAI';
 assert.equal(checkSnapshot(forged).ok,false);
 const changed=structuredClone(catalogue);changed.cases[0].input.hour=23;
 assert.equal(checkSnapshot(changed).ok,false);
});
test('V11.50 every teaching case has checkable conditions and non-predictive language',()=>{
 for(const row of catalogue.cases){
  assert.ok(row.checks.length>=2,row.id);assert.ok(row.checks.every(x=>typeof x.met==='boolean'&&x.label.length>10));
  assert.ok(row.question.length>50,row.id);assert.ok(row.exercise.length>50,row.id);
  assert.ok(row.evidence.every(x=>x.scope==='natal'&&!('sourcePath' in x)));
  assert.ok(['observed','partial'].includes(row.status),row.id);
  if(row.status==='observed')assert.ok(row.checks.every(x=>x.met));
  assert.match(row.sha256,/^[0-9a-f]{64}$/);
 }
 assert.equal(catalogue.expertReviewed,false);assert.match(catalogue.notice,/không phải/i);
});
test('V11.50 examples replay actual non-personal engine fixtures without mutating chart',()=>{
 for(const row of catalogue.cases){
  const chart=Engine.calculate(row.input),before=JSON.stringify(chart);
  const record=extract(chart,row.branchIndex,row.family,row.recordId);
  assert.equal(record.status,row.status,row.id);
  assert.deepEqual(record.evidence.map(publicFields),row.evidence,row.id);
  assert.equal(JSON.stringify(chart),before);
 }
});
test('V11.50 canonical chart house order does not change publishable evidence',()=>{
 const x=catalogue.cases.find(r=>r.id==='huynh-de-hoi'),chart=Engine.calculate(x.input);
 chart.houses.reverse();
 const actual=extract(chart,x.branchIndex,x.family,x.recordId);
 assert.deepEqual(actual.evidence.map(publicFields),x.evidence);
});
test('V11.50 missing transformation target cannot be accepted as original complete case',()=>{
 const x=catalogue.cases.find(r=>r.id==='menh-hoa');const chart=Engine.calculate(x.input);
 const h=chart.houses.find(h=>h.branchIndex===x.branchIndex);h.tuHoa=[];
 const actual=extract(chart,x.branchIndex,x.family,x.recordId);
 assert.notEqual(actual.status,'observed');
});
test('V11.50 duplicate natal star in two houses prevents a false complete evidence case',()=>{
 const x=catalogue.cases.find(r=>r.id==='thien-di-doi');const chart=Engine.calculate(x.input);
 const opp=chart.houses.find(h=>h.branchIndex===(x.branchIndex+6)%12);
 const duplicate=opp.stars[0];assert.ok(duplicate);
 const other=chart.houses.find(h=>h.branchIndex!==opp.branchIndex);other.stars.push(duplicate);
 const actual=extract(chart,x.branchIndex,x.family,x.recordId);
 assert.equal(actual.status,'needs-review');
});
test('V11.50 static web casebook has filtering, expand/collapse and disclaimer without internal paths',()=>{
 const file=fs.readFileSync(path.join(root,'apps/web/src/app/research/examples/page.tsx'),'utf8');
 assert.match(file,/casebook\.cases\.filter/);
 assert.match(file,/<details/);assert.match(file,/c\.checks\.map/);
 assert.match(file,/không phải/i);assert.doesNotMatch(file,/houses\[|sourcePath|@thiendo\/astrology-engine/);
 const research=fs.readFileSync(path.join(root,'apps/web/src/app/research/page.tsx'),'utf8');
 assert.match(research,/\/research\/examples/);
});
test('V11.50 audit verifies twelve fixture replays with zero integrity violations',()=>{
 const report=audit();assert.equal(report.status,'PASS',report.errors.join('\n'));
 assert.equal(report.stats.examples,12);assert.equal(report.stats.fixtureReplays,12);
 assert.equal(report.stats.distinctPalaces,12);assert.equal(report.stats.sourcePathsLeaked,0);
 assert.ok(report.stats.checks>=24);assert.ok(report.stats.evidenceItems>12);
});
