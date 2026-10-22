'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Stars=require('../packages/astrology-engine/src/traditional-stars.js');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Verify=require('../packages/astrology-engine/src/verify.js');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const {buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const {renderChartSvg}=require('../packages/chart-export/src/index.cjs');
const sample=()=>Engine.calculate({date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'});
const mod=n=>((n%12)+12)%12;
const run=(o={})=>Stars.calculate({yearStem:0,yearBranch:0,lunarDay:1,vanXuongBranch:10,vanKhucBranch:4,...o});
const pos=(list,name)=>list.find(p=>p.name===name)?.branch;

test('V11.13 — 11 unique names and stable rule/version in every placement',()=>{
  const a=run();assert.equal(a.length,11);assert.equal(new Set(a.map(x=>x.name)).size,11);
  assert.equal(a.every(x=>x.ruleSet===Stars.RULESET&&typeof x.basis==='string'&&Number.isInteger(x.branch)&&x.branch>=0&&x.branch<12),true);
});

test('V11.13 — independent Long Trì / Phượng Các twelve-year positional table',()=>{
  const longTri=[4,5,6,7,8,9,10,11,0,1,2,3];
  const phuongCac=[10,9,8,7,6,5,4,3,2,1,0,11];
  for(let branch=0;branch<12;branch++){
    const a=run({yearStem:branch%2,yearBranch:branch});
    assert.equal(pos(a,'Long Trì'),longTri[branch],`Long Trì chi ${branch}`);
    assert.equal(pos(a,'Phượng Các'),phuongCac[branch],`Phượng Các chi ${branch}`);
    assert.equal(pos(a,'Giải Thần'),phuongCac[branch],`Giải Thần chi ${branch}`);
  }
});

test('V11.13 — Cô Thần / Quả Tú tables for all four Tam hội seasons',()=>{
  const oracle={0:[2,10],1:[2,10],11:[2,10],2:[5,1],3:[5,1],4:[5,1],5:[8,4],6:[8,4],7:[8,4],8:[11,7],9:[11,7],10:[11,7]};
  for(let branch=0;branch<12;branch++){
    const a=run({yearStem:branch%2,yearBranch:branch});
    assert.deepEqual([pos(a,'Cô Thần'),pos(a,'Quả Tú')],oracle[branch]);
  }
});

test('V11.13 — ten Can-year lookup cases for Thiên Quan / Thiên Phúc',()=>{
  const quan=[7,4,5,2,3,9,11,9,10,6],phuc=[9,8,0,11,3,2,6,5,6,5];
  for(let stem=0;stem<10;stem++){
    const a=run({yearStem:stem,yearBranch:stem});
    assert.equal(pos(a,'Thiên Quan'),quan[stem]);
    assert.equal(pos(a,'Thiên Phúc'),phuc[stem]);
  }
});

test('V11.13 — Ân Quang / Thiên Quý independent day-count examples and 12-day periodicity',()=>{
  const cases=[
    {d:1,x:10,k:4,quang:9,quy:5},
    {d:2,x:10,k:4,quang:10,quy:4},
    {d:3,x:6,k:8,quang:7,quy:7},
    {d:13,x:10,k:4,quang:9,quy:5},
    {d:30,x:0,k:0,quang:4,quy:8},
  ];
  for(const {d,x,k,quang,quy} of cases){
    const a=run({lunarDay:d,vanXuongBranch:x,vanKhucBranch:k});
    assert.equal(pos(a,'Ân Quang'),quang);
    assert.equal(pos(a,'Thiên Quý'),quy);
  }
  for(let day=1;day<=18;day++){
    const a=run({lunarDay:day}),b=run({lunarDay:day+12});
    assert.equal(pos(a,'Ân Quang'),pos(b,'Ân Quang'));
    assert.equal(pos(a,'Thiên Quý'),pos(b,'Thiên Quý'));
  }
});

test('V11.13 — Thái Phụ / Phong Cáo depend on Khúc alone, one adjacent position per side',()=>{
  for(let khuc=0;khuc<12;khuc++){
    for(const day of [1,7,30]){
      const a=run({vanKhucBranch:khuc,lunarDay:day});
      assert.equal(pos(a,'Thái Phụ'),mod(khuc+1));
      assert.equal(pos(a,'Phong Cáo'),mod(khuc-1));
    }
  }
});

test('V11.13 — reject invalid stems, branches, days and dependent anchor positions',()=>{
  for(const args of [{yearStem:-1},{yearStem:10},{yearStem:1,yearBranch:0},{yearBranch:12},
    {lunarDay:0},{lunarDay:31},{vanXuongBranch:-1},{vanKhucBranch:12},{vanKhucBranch:1.5}]) {
    assert.throws(()=>run(args),RangeError,JSON.stringify(args));
  }
});

test('V11.13 — engine emits independent layer in all 12 palaces, once per named star',()=>{
  const c=sample();
  assert.equal(c.traditionalStars.length,11);
  assert.equal(c.coverage.traditionalRuleBasedStars,11);
  assert.equal(c.traditionalStarRuleSet,Stars.RULESET);
  assert.deepEqual(c.houses.flatMap(h=>h.traditionalStars).slice().sort(),c.traditionalStars.map(x=>x.name).sort());
  for(const s of c.traditionalStars){
    assert.equal(c.houses.filter(h=>h.traditionalStars.includes(s.name)).length,1);
    assert.ok(c.houses.find(h=>h.branchIndex===s.branch).traditionalStars.includes(s.name));
  }
  assert.equal(Verify.check(c).passed,true);
});

test('V11.13 — verifier catches a moved star, not a silent pass',()=>{
  const c=sample(),s=c.traditionalStars[0];
  const target=c.houses.find(h=>h.branchIndex===s.branch);
  target.traditionalStars=target.traditionalStars.filter(x=>x!==s.name);
  const other=c.houses.find(h=>h.branchIndex===mod(s.branch+1));
  other.traditionalStars.push(s.name);
  const v=Verify.check(c);
  assert.equal(v.passed,false);
  assert.ok(v.checks.some(x=>x.name.includes('V11.13')&&!x.passed));
});

test('V11.13 — existing main/auxiliary/annual layers unaffected by new editorial content',()=>{
  const c=sample();
  assert.equal(c.houses.flatMap(h=>h.stars).length,14);
  assert.equal(c.auxiliaries.length,9);
  assert.equal(c.additionalStars.length,7);
  assert.equal(c.advancedStars.length,4);
  assert.equal(c.obstructionMarkers.length,2);
  assert.equal(c.cycles.daiHan.length,12);
  const before=JSON.stringify(c);
  for(let b=0;b<12;b++)buildPalaceReading({chart:c,branchIndex:b,guide:require('../packages/knowledge/src/star-study-guide.json')});
  assert.equal(JSON.stringify(c),before);
});

test('V11.13 — all 11 editorial records are independently editable, mapped to the engine names',()=>{
  const c=sample(),names=c.traditionalStars.map(x=>x.name).sort();
  assert.equal(Knowledge.traditionalCatalogue.length,11);
  assert.deepEqual(Knowledge.traditionalCatalogue.map(x=>x.name).sort(),names);
  assert.equal(Knowledge.traditionalCatalogue.every(x=>x.expertReviewed===false&&x.placementRuleSet===Stars.RULESET),true);
  for(const name of names){
    const symbol=Knowledge.lookupSymbol(name);
    assert.ok(symbol && symbol.context.length>70 && symbol.caution.length>30);
  }
  assert.equal(Object.keys(Knowledge.starSymbols).length,90);
});

test('V11.13 — search, ledger and reading can all find newly placed stars without showing source URLs',()=>{
  const c=sample();
  const data=fs.readFileSync(path.join(__dirname,'..','apps/web/src/features/chart/lib/chart-explorer.ts'),'utf8');
  const ledger=fs.readFileSync(path.join(__dirname,'..','apps/web/src/features/chart/lib/twelve-palace-ledger.ts'),'utf8');
  const details=fs.readFileSync(path.join(__dirname,'..','apps/web/src/features/chart/components/palace-details.tsx'),'utf8');
  assert.match(data,/house\.traditionalStars/);
  assert.match(ledger,/traditionalStars/);
  assert.match(details,/house\.traditionalStars/);
  const star=c.traditionalStars[0];
  const reading=buildPalaceReading({chart:c,branchIndex:star.branch,guide:require('../packages/knowledge/src/star-study-guide.json')});
  assert.ok(reading.supportingProfiles.some(p=>p.name===star.name&&p.motif));
  assert.doesNotMatch(JSON.stringify(reading),/https?:\/\//);
});

test('V11.13 — SVG exports preserve a complete accessible 11-star index and escaped text',()=>{
  const c=sample(),svg=renderChartSvg(c,'Người lập số',Engine.annualOverview(c,2026));
  for(const s of c.traditionalStars) assert.ok(svg.includes(s.name),s.name);
  assert.match(svg,/Sao truyền thống:/);
  assert.doesNotMatch(svg,/<script|<foreignObject/i);
});
