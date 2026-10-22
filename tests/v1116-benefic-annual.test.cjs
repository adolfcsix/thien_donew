'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const natal=require('../packages/astrology-engine/src/benefic-stars.js');
const annualExtra=require('../packages/astrology-engine/src/annual-extensions.js');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Verify=require('../packages/astrology-engine/src/verify.js');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const Audit=require('../packages/star-audit/src/index.cjs');
const cases=require('../packages/star-audit/fixtures/chart-baselines.json').cases;
const base={date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'};
const names=['Thiên Đức','Nguyệt Đức','Thiên Giải','Địa Giải'];
const annualNames=['Lưu Tang Môn','Lưu Bạch Hổ','Lưu Thiên Khốc','Lưu Thiên Hư'];
const mod=n=>(n%12+12)%12;
test('V11.16: independent lunar month 1..12 tables for Thiên Giải and Địa Giải',()=>{
 for(let month=1;month<=12;month++){
  const x=natal.calculate({yearBranch:0,lunarMonth:month});
  assert.deepEqual(x.map(s=>s.name),names);
  assert.equal(x[2].branch,mod(8+month-1));
  assert.equal(x[3].branch,mod(7+month-1));
  assert.ok(x.every(s=>s.ruleSet===natal.RULESET));
 }
});
test('V11.16: all 12 year branches follow explicit Đức/Giải mappings',()=>{
 for(let branch=0;branch<12;branch++){
  const x=natal.calculate({yearBranch:branch,lunarMonth:1});
  assert.equal(x[0].branch,mod(9+branch));
  assert.equal(x[1].branch,mod(5+branch));
 }
});
test('V11.16: invalid inputs fail closed instead of wrapping silent values',()=>{
 for(const v of [-1,12,0.5,NaN,undefined,'1'])assert.throws(()=>natal.calculate({yearBranch:v,lunarMonth:2}),RangeError);
 for(const v of [-1,0,13,2.2,undefined,'3'])assert.throws(()=>natal.calculate({yearBranch:0,lunarMonth:v}),RangeError);
 for(const v of [-1,12,NaN,1.5,undefined,'2'])assert.throws(()=>annualExtra.calculate(v),RangeError);
});
test('V11.16: selected-year branches follow Tang–Hổ opposition and Khốc–Hư directions',()=>{
 for(let b=0;b<12;b++){
  const x=annualExtra.calculate(b);
  assert.deepEqual(x.map(s=>s.name),annualNames);
  assert.deepEqual(x.map(s=>s.branch),[mod(2+b),mod(8+b),mod(6-b),mod(6+b)]);
  assert.equal(mod(x[1].branch-x[0].branch),6);
  assert.ok(x.every(s=>s.ruleSet===annualExtra.RULESET));
 }
});
test('V11.16: all 22 existing baseline inputs preserve 12 houses and mirror four new stars precisely',()=>{
 for(const c of cases){const x=Engine.calculate(c.input);
  assert.equal(x.beneficStars.length,4,c.id);
  assert.deepEqual(x.beneficStars.map(s=>s.name),names,c.id);
  assert.deepEqual(x.houses.flatMap(h=>h.beneficStars).sort(),[...names].sort(),c.id);
  for(const s of x.beneficStars)assert.deepEqual(x.houses.filter(h=>h.beneficStars.includes(s.name)).map(h=>h.branchIndex),[s.branch],c.id);
  assert.equal(x.houses.flatMap(h=>h.stars).length,14);
 }
});
test('V11.16: 12 annual stars stay separate from natal chart, in 12 unique palace slots',()=>{
 const chart=Engine.calculate(base),before=JSON.stringify(chart);
 const x=Engine.annualOverview(chart,2026),y=Engine.annualOverview(chart,2027);
 assert.equal(x.luuStars.items.length,12);
 assert.deepEqual(x.luuStars.items.slice(8).map(s=>s.name),annualNames);
 for(const s of x.luuStars.items){assert.ok(Number.isInteger(s.branch)&&s.branch>=0&&s.branch<12);assert.equal(chart.houses[s.branch].palace,s.palace);}
 assert.notDeepEqual(x.luuStars.items.slice(8).map(s=>s.branch),y.luuStars.items.slice(8).map(s=>s.branch));
 assert.equal(JSON.stringify(chart),before);
});
test('V11.16: repeating lunar-year branch restores the same four annual placements',()=>{
 const x=Engine.calculate(base);
 for(let year=2005;year<2088;year+=7){
  const a=Engine.annualOverview(x,year),b=Engine.annualOverview(x,year+12);
  assert.deepEqual(a.luuStars.items.slice(8).map(s=>s.branch),b.luuStars.items.slice(8).map(s=>s.branch));
 }
});
test('V11.16: corruption of a Đức/Giải palace position is detected by verifier',()=>{
 const chart=Engine.calculate(base);
 assert.equal(Verify.check(chart).passed,true);
 const bad=structuredClone(chart),s=bad.beneficStars[0];
 bad.houses[s.branch].beneficStars=bad.houses[s.branch].beneficStars.filter(x=>x!==s.name);
 bad.houses[(s.branch+1)%12].beneficStars.push(s.name);
 const result=Verify.check(bad);
 assert.equal(result.passed,false);
 assert.ok(result.checks.some(x=>x.name.includes('Đức/Giải')&&!x.passed));
});
test('V11.16: four new profiles exist with human-readable interpretation and clear cautions',()=>{
 for(const name of names){const r=Knowledge.lookupSymbol(name);assert.ok(r?.context.length>100,name);assert.ok(r?.caution.length>30,name);}
 assert.equal(Knowledge.lookupSymbol('Giải Thần').family!==undefined,true);
 assert.equal(Knowledge.lookupSymbol('Địa Không').family!==undefined,true);
});
test('V11.16: full inventory 93 natal/cycle names and 12 annual overlays without duplication',()=>{
 const r=Audit.buildInventory();
 assert.equal(r.records.length,104);assert.equal(r.annualRecords.length,12);
 assert.equal(r.totals.missingEditorialProfiles,0);assert.equal(r.totals.pendingNatalCandidates,0);assert.equal(r.totals.pendingAnnualCandidates,1);
 assert.equal(r.groups.find(x=>x.id==='benefic').count,4);
 assert.equal(new Set(r.records.map(s=>s.name)).size,104);
});
test('V11.16: ledger, UI, research, interpretation and export contain the separated natal group',()=>{
 const paths=['apps/web/src/features/chart/components/palace-tile.tsx','apps/web/src/features/chart/components/palace-details.tsx','apps/web/src/features/chart/lib/twelve-palace-ledger.ts','apps/web/src/features/chart/lib/chart-explorer.ts','packages/interpretation/src/chart-reading.cjs','packages/chart-export/src/index.cjs','packages/astrology-engine/src/palace-research.js'];
 for(const file of paths)assert.match(fs.readFileSync(path.join(root,file),'utf8'),/beneficStars/,file);
 const chart=Engine.calculate(base);const a=Engine.annualOverview(chart,2026);
 const svg=require('../packages/chart-export/src/index.cjs').renderChartSvg(chart,'Kiểm thử',a);
 for(const name of [...names,...annualNames])assert.ok(svg.includes(name),`SVG missing ${name}`);
});
test('V11.16: new modules and annual overlays do not embed citations or technical links in user-facing components',()=>{
 const components=['apps/web/src/features/chart/components/palace-tile.tsx','apps/web/src/features/chart/components/palace-details.tsx'];
 for(const file of components){const source=fs.readFileSync(path.join(root,file),'utf8');assert.doesNotMatch(source,/https?:\/\/|citation|Nguồn & Phương pháp an sao/);}
});
