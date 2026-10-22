'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const audit=require('../packages/star-audit/src/index.cjs');
const {csv,md,html}=require('../infrastructure/scripts/audit-star-inventory.cjs');
const report=()=>audit.buildInventory();
const repo=path.join(__dirname,'..');
const loaded=name=>fs.readFileSync(path.join(repo,'tests/fixtures/validation',name),'utf8');

test('V11.15: audit engine-derived 10 groups, exactly one record per natal symbol',()=>{
  const r=report();assert.equal(r.groups.length,14);assert.ok(r.totals.implementedNatalAndCycleNames>=89);
  assert.equal(r.records.length,r.totals.implementedNatalAndCycleNames);
  assert.equal(new Set(r.records.map(s=>audit.NORMALIZE(s.name))).size,r.records.length);
  assert.equal(r.groups.reduce((n,g)=>n+g.count,0),104);
});
test('V11.15: reject collisions between star groups, including Unicode-equivalent names',()=>{
  assert.throws(()=>audit.validateNoOverlap([{id:'x',names:['Địa Không']},{id:'y',names:[' Địa  Không']}]),/nhiều nhóm/);
});
test('V11.15: all 89 existing names matched editorial profile (separate from specialized interpretation)',()=>{
  const r=report();assert.equal(r.totals.missingEditorialProfiles,0);assert.equal(r.totals.unusedEditorialProfiles,0);
  assert.equal(r.totals.editorialProfilesMatched,r.records.length);
  assert.equal(r.records.filter(x=>x.hasSpecializedTwelvePalaceInterpretations).length,0);
});
test('V11.15: protect 14 principal names, 36 cycle names, 22 internal baseline inputs',()=>{
  const r=report();assert.equal(r.groups.find(g=>g.id==='main').count,14);
  assert.equal(r.groups.filter(g=>['thai_tue','bac_si','trang_sinh'].includes(g.id)).reduce((n,g)=>n+g.count,0),36);
  assert.equal(r.totals.auditedBaselineCases,22);
});
test('V11.15: separate markers, original Tứ Hóa, annual stars and annual transformations',()=>{
  const r=report();assert.deepEqual(r.markers.map(s=>s.name),['Tuần','Triệt']);
  assert.equal(r.annualRecords.length,12);assert.equal(r.totals.natalTransformations,4);assert.equal(r.totals.annualTransformations,4);
  assert.ok(!r.records.some(s=>['Tuần','Triệt','Hóa Khoa','Hóa Kỵ'].includes(s.name)));
});
test('V11.15: missing-candidate priority is not presented as complete canonical traditional inventory',()=>{
  const r=report();assert.equal(r.gaps.pendingNatal.length,r.totals.pendingNatalCandidates);assert.equal(r.gaps.pendingAnnual.length,r.totals.pendingAnnualCandidates);
  assert.ok(r.gaps.pendingNatal.every(s=>s.status.startsWith('chưa an')));
  assert.ok(r.gaps.pendingAnnual.every(s=>s.status.startsWith('chưa an')));
  assert.match(r.methodologicalLimits.join(' '),/không phải/);
});
test('V11.15: generated files exist and exactly match generator source output',()=>{
  const r=report();const json=JSON.parse(loaded('star-inventory.json'));
  assert.deepEqual(json,r);assert.equal(loaded('star-inventory.csv'),csv);
  assert.equal(loaded('star-audit.md'),md);assert.equal(loaded('star-audit.html'),html);
});
test('V11.15: CSV BOM, escaped header, HTML safe data and no public web route',()=>{
  assert.equal(csv.charCodeAt(0),0xFEFF);assert.ok(csv.includes('"name","group"'));
  assert.ok(html.includes('Quản trị nội bộ'));assert.ok(html.includes('replaceChildren()'));
  assert.equal(fs.existsSync(path.join(repo,'apps/web/src/app/star-audit')),false);
});
test('V11.15: no existing Natal Engine / its 12 palaces mutated by running audit',()=>{
  const engine=require('../packages/astrology-engine/src/tuvi.js');
  const input={date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'};
  const before=JSON.stringify(engine.calculate(input));audit.buildInventory();const after=JSON.stringify(engine.calculate(input));assert.equal(before,after);
});
