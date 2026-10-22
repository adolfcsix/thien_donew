'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const Positional=require('../packages/astrology-engine/src/positional-stars.js');
const Verify=require('../packages/astrology-engine/src/verify.js');
const Audit=require('../packages/star-audit/src/index.cjs');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const Svg=require('../packages/chart-export/src/index.cjs');
const cases=require('../packages/star-audit/fixtures/chart-baselines.json').cases;
const names=['Thiên La','Địa Võng','Thiên Thương','Thiên Sứ'];
const chart=()=>Engine.calculate({date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'});
const file=x=>fs.readFileSync(path.resolve(__dirname,'..',x),'utf8');
test('V11.17: four positional names are complete and unique, two fixed branches and two fixed palace roles',()=>{
  const c=chart();assert.deepEqual(Positional.NAMES,names);assert.deepEqual(c.positionalStars.map(s=>s.name),names);
  assert.deepEqual(c.positionalStars.map(s=>s.kind),['branch-marker','branch-marker','palace-star','palace-star']);
  assert.equal(c.positionalStars[0].branch,4);assert.equal(c.positionalStars[1].branch,10);
  assert.equal(c.positionalStars[2].branch,c.houses.find(h=>h.palace==='Nô Bộc').branchIndex);
  assert.equal(c.positionalStars[3].branch,c.houses.find(h=>h.palace==='Tật Ách').branchIndex);
});
test('V11.17: position calculation independent of array ordering',()=>{
  const c=chart();assert.deepEqual(Positional.calculate(c.houses),Positional.calculate([...c.houses].reverse()));
});
test('V11.17: fixed branch markers remain at Thìn Tuất across 22 natal baselines',()=>{
  for(const c of cases){const x=Engine.calculate(c.input);assert.deepEqual(x.positionalStars.slice(0,2).map(s=>s.branch),[4,10],c.id);}
});
test('V11.17: Nô Bộc and Tật Ách association changes correctly with Mệnh in 22 baselines',()=>{
  const positions=new Set();
  for(const c of cases){const x=Engine.calculate(c.input);positions.add(x.menh);for(const [index,palace] of [[2,'Nô Bộc'],[3,'Tật Ách']])assert.equal(x.positionalStars[index].branch,x.houses.find(h=>h.palace===palace).branchIndex,c.id);}
  assert.ok(positions.size>3);
});
test('V11.17: missing, non-unique, invalid or malformed palace topology is rejected',()=>{
  const c=chart(), h=c.houses;
  for(const invalid of [h.slice(1),h.map((x,i)=>i===1?{...x,branchIndex:0}:x),h.map((x,i)=>i===0?{...x,palace:'Nô Bộc'}:x),h.map((x,i)=>i===0?{...x,palace:''}:x),h.map((x,i)=>i===0?{...x,branchIndex:-1}:x),null])assert.throws(()=>Positional.calculate(invalid),RangeError);
});
test('V11.17: all four names appear exactly once in house projection and structural verifier passes',()=>{
  for(const c of cases){const x=Engine.calculate(c.input);assert.equal(Verify.check(x).passed,true,c.id);
   assert.deepEqual(x.houses.flatMap(h=>h.positionalStars).sort(),[...names].sort(),c.id);
   for(const s of x.positionalStars)assert.deepEqual(x.houses.filter(h=>h.positionalStars.includes(s.name)).map(h=>h.branchIndex),[s.branch]);
  }
});
test('V11.17: verifier detects changed placement, missing star, altered kind, and forged ruleset',()=>{
  const c=chart();for(const type of ['house','branch','kind','ruleSet']){const broken=structuredClone(c),s=broken.positionalStars[0];
   if(type==='house'){broken.houses[s.branch].positionalStars=[];broken.houses[(s.branch+1)%12].positionalStars.push(s.name);}
   if(type==='branch')s.branch=5;
   if(type==='kind')s.kind='palace-star';
   if(type==='ruleSet')s.ruleSet='tampered';
   const result=Verify.check(broken);assert.equal(result.passed,false,type);assert.ok(result.checks.some(k=>k.name.includes('bốn sao vị trí cố định')&&!k.passed));
  }
});
test('V11.17: registry includes 97 natal/cycle names, 12 annual stars, and removes completed backlog',()=>{
  const r=Audit.buildInventory();assert.equal(r.records.length,104);assert.equal(r.totals.missingEditorialProfiles,0);
  assert.equal(r.groups.find(g=>g.id==='positional').count,4);assert.equal(r.annualRecords.length,12);
  assert.equal(r.totals.pendingNatalCandidates,0);assert.equal(r.totals.pendingAnnualCandidates,1);
  for(const name of names){assert.ok(r.records.some(x=>x.name===name));assert.ok(!r.gaps.pendingNatal.some(x=>x.name===name));}
});
test('V11.17: four editorial records distinct and each contains context and cautions',()=>{
  for(const name of names){const p=Knowledge.lookupSymbol(name);assert.ok(p?.context.length>80,name);assert.ok(p?.caution.length>45,name);}
});
test('V11.17: chart SVG accessibility and visible summary contain all four names, without changing existing stars',()=>{
  const c=chart();const svg=Svg.renderChartSvg(c,'V11.17 kiểm tra');
  for(const name of names)assert.ok(svg.includes(name),name);
  assert.equal(c.houses.flatMap(h=>h.stars).length,14);assert.equal(c.cycles.daiHan.length,12);
});
test('V11.17: search, 12-palace ledger, research, reading and UI honor separate positional layer',()=>{
  const files=['apps/web/src/features/chart/components/palace-tile.tsx','apps/web/src/features/chart/components/palace-details.tsx','apps/web/src/features/chart/lib/twelve-palace-ledger.ts','apps/web/src/features/chart/lib/chart-explorer.ts','packages/astrology-engine/src/palace-research.js','packages/interpretation/src/chart-reading.cjs'];
  for(const f of files)assert.match(file(f),/positionalStars/,f);
  const c=chart();const r=Engine.palaceResearch(c,null,4);assert.ok(r.perspectives[0].layers.find(l=>l.id==='positional').records.some(x=>x.name==='Thiên La'));
  const f=Engine.traceableFindings(r);assert.ok(f.findings.length>0);
});
test('V11.17: selectors/knowledge are not user-facing technical source citations',()=>{
  for(const f of ['apps/web/src/features/chart/components/palace-tile.tsx','apps/web/src/features/chart/components/palace-details.tsx'])assert.doesNotMatch(file(f),/https?:\/\/|Nguồn & Phương pháp an sao/);
});
