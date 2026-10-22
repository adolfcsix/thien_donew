'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {join,resolve}=require('node:path');
const root=resolve(__dirname,'..');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const lookup=require('../packages/astrology-engine/src/star-strength.js');
const verifier=require('../packages/astrology-engine/src/verify.js');
const read=p=>readFileSync(join(root,p),'utf8');
const samples=[
  {date:'2004-08-15',calendar:'solar',leap:false,gender:'Nam',hour:8,minute:30},
  {date:'2026-02-17',calendar:'solar',leap:false,gender:'Nữ',hour:23,minute:50},
  {date:'1999-02-14',calendar:'solar',leap:false,gender:'Nữ',hour:0,minute:0},
  {date:'2000-02-29',calendar:'solar',leap:false,gender:'Nam',hour:12,minute:35},
];
test('14 x 12 reference cells are complete and only use documented codes',()=>{
 const matrix=lookup.matrix();
 assert.equal(matrix.length,14); assert.equal(new Set(matrix.map(row=>row.name)).size,14);
 assert.equal(matrix.flatMap(row=>row.levels).length,168);
 for(const row of matrix){assert.equal(row.levels.length,12);for(const level of row.levels) assert.ok('MVDBH'.includes(level));}
 assert.equal(lookup.NAMES.length,14);assert.equal(lookup.BRANCHES.length,12);
});
test('reproduces a selected published row with twelve locations',()=>{
 const expected=['D','D','M','B','V','M','M','D','M','B','V','D'];
 assert.deepEqual(lookup.matrix().find(row=>row.name==='Tử Vi').levels,expected);
 assert.equal(lookup.lookup('Tử Vi',2).label,'Miếu');
 assert.equal(lookup.lookup('Thái Dương',0).status,'H');
 assert.equal(lookup.lookup('Thái Âm',9).status,'M');
 assert.equal(lookup.lookup('Thiên Lương',1).status,'D');
 assert.equal(lookup.lookup('Thiên Lương',7).status,'D');
});
test('unknown or invalid input is not silently assigned a made-up level',()=>{
 for(const [name,branch] of [['sao chưa biết',0],['Tử Vi',-1],['Tử Vi',12],['Tử Vi',1.5],[null,5]])assert.equal(lookup.lookup(name,branch),null);
});
test('lookup never mutates table or caller-facing rows',()=>{
 const first=lookup.lookup('Tử Vi',0); assert.ok(Object.isFrozen(first));
 const matrix=lookup.matrix(); assert.ok(Object.isFrozen(matrix[0].levels)); assert.throws(()=>{matrix[0].levels[0]='H';},TypeError);
 assert.equal(lookup.lookup('Tử Vi',0).status,'D');
 const entry=lookup.lookup('Tử Vi',0);assert.ok(entry.ruleSet);assert.equal(entry.source,lookup.SOURCE);
});
test('engine preserves the previous main-star positions, houses and natal rule version',()=>{
 const baseline=JSON.parse(read('tests/fixtures/pre-strength-natal-placements.json'));
 samples.forEach((data,index)=>{
   const next=Engine.calculate(data);
   assert.equal(next.ruleSet,'tam-hop-core-v6.0');
   assert.deepEqual(next.houses.map(({branchIndex,cell,palace,stars,auxiliaryStars,yearStars,tuHoa,daiHan,additionalStars})=>({branchIndex,cell,palace,stars,auxiliaryStars,yearStars,tuHoa,daiHan,additionalStars})),baseline[index]);
 });
});
test('all 14 natal main stars have exactly one reference level at their real branch',()=>{
 for(const data of samples){const result=Engine.calculate(data);let seen=0;
  assert.equal(result.mainStarStrengthRuleSet,lookup.RULESET);
  for(const house of result.houses){assert.equal(house.mainStarStrengths.length,house.stars.length);
    for(const item of house.mainStarStrengths){seen++;assert.equal(item.branch,house.branchIndex);assert.ok(house.stars.includes(item.name));assert.equal(item.status,lookup.lookup(item.name,house.branchIndex).status);assert.equal(item.ruleSet,lookup.RULESET);}
  }assert.equal(seen,14);
 }
});
test('reference and actual star placement are independent exports',()=>{
 assert.equal(Engine.mainStarStrengthRuleSet,lookup.RULESET);
 assert.equal(Engine.mainStarStrengthMatrix().length,14);
 assert.equal(Engine.lookupMainStarStrength('Phá Quân',0).status,'M');
 assert.equal(Engine.mainStarStrengthSource,lookup.SOURCE);
});
test('main star status shown as optional source-tagged layer in real board',()=>{
 const ui=['chart-board.tsx','chart-board-header.tsx','palace-tile.tsx','star-groups.tsx','palace-details.tsx'].map(name=>read('apps/web/src/features/chart/components/'+name)).join('\n');
 for(const required of ['mainStarStrengths','showStrength','setShowStrength','Miếu/Vượng (tham khảo)','/star-atlas','BẢNG MỨC ĐỘ CHÍNH TINH','Trạng thái là ký hiệu tham khảo'])assert.ok(ui.includes(required),required);
 const types=read('packages/shared-types/index.d.ts');assert.match(types,/mainStarStrengths\?/);
 const engineTypes=read('packages/astrology-engine/src/index.d.ts');assert.match(engineTypes,/lookupMainStarStrength/);
});
test('educational route and searchable table have source, disclaimer and mobile CSS',()=>{
 const ui=read('apps/web/src/app/star-atlas/page.tsx');
 for(const required of ['Engine.mainStarStrengthMatrix()', 'normalizeSearchText', 'setTerm(', 'setBranch(', 'setLevel(', '168 ô', '14 chính tinh', 'Quy trình đọc có trách nhiệm', 'aria-pressed', 'Tử Vi', 'Thiên Lương']) assert.ok(ui.includes(required),required);
 const css=read('apps/web/src/app/star-atlas/star-atlas.css');assert.match(css,/overflow-x:auto/);assert.match(css,/@media\(max-width:650px\)/);
 assert.ok(existsSync(join(root,'apps/web/src/app/star-atlas/page.tsx')));
});

test('integrity verifier detects forged status without breaking previous-format chart exports',()=>{
 const chart=JSON.parse(JSON.stringify(Engine.calculate(samples[0])));
 assert.ok(verifier.check(chart).passed);
 const forged=chart.houses.find(h=>h.mainStarStrengths.length).mainStarStrengths[0];forged.status=forged.status==='M'?'H':'M';
 assert.equal(verifier.check(chart).passed,false);
 assert.ok(verifier.check(chart).checks.some(c=>c.name.includes('168-ô') && !c.passed));
 const old=Engine.calculate(samples[1]);delete old.mainStarStrengthRuleSet;
 for(const house of old.houses)delete house.mainStarStrengths;
 assert.ok(verifier.check(old).passed);
});
test('integrity verifier rejects inconsistent statuses or missing subset of star labels',()=>{
 const chart=Engine.calculate(samples[2]);
 chart.houses.find(h=>h.mainStarStrengths.length).mainStarStrengths=[];
 assert.equal(verifier.check(chart).passed,false);
});
