'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../packages/knowledge/src/star-system-matrix.cjs');
const E=require('../packages/astrology-engine/src/tuvi.js');
const I=require('../packages/knowledge/src/star-identity-registry.cjs');
const Inventory=require('../packages/star-audit/src/index.cjs');
const baselines=require('../packages/star-audit/fixtures/chart-baselines.json');
const sample=()=>E.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30,leap:false});
test('matrix isolates 104 natal/cycle identities from annual stars and non-star layers',()=>{
 assert.deepEqual(M.auditCatalog(),{errors:[],counts:{main:14,support:54,cycles:36,natalAndCycle:104,annual:12,special:11,identities:127}});
 const r=M.catalogRows(),a=Inventory.buildInventory();assert.deepEqual(r.filter(x=>['main','support','cycle'].includes(x.bucket)).map(x=>x.name).sort(),a.records.map(x=>x.name).sort());
 assert.equal(r.filter(x=>x.bucket==='special'&&x.type==='paired-marker').length,2);assert.equal(r.filter(x=>x.type==='transformation-label').length,8);
});
test('all 12 annual identities point to an explicit natal/cycle ID, never inferred by stripping Lưu',()=>{
 const r=M.catalogRows();for(const row of r.filter(x=>x.bucket==='annual')){const origin=r.find(x=>x.id===row.originId);assert.ok(origin&&['natal','cycle'].includes(origin.layer));assert.equal(row.originName,origin.name);assert.notEqual(row.id,origin.id);}
 const locator=r.find(x=>x.name==='Lưu Thái Tuế');assert.equal(locator.bucket,'special');assert.equal(locator.originName,'Thái Tuế');
});
test('each real chart placement matches its source house; paired markers retain two positions',()=>{
 const c=sample(),a=E.annualOverview(c,2026),m=M.buildChartMatrix(c,a);
 for(const row of m.rows){assert.equal(row.positionState,'computed');assert.equal(row.placements.length,row.layer==='obstruction'?2:1);for(const p of row.placements)assert.equal(p.palace,c.houses.find(h=>h.branchIndex===p.branchIndex).palace);}
 for(const s of a.luuStars.items)assert.equal(m.rows.find(x=>x.name===s.name).placements[0].branchIndex,s.branch);
 assert.equal(m.rows.find(x=>x.layer==='annual-locator').placements[0].branchIndex,a.luuThaiTueBranchIndex);
});
test('without annual input, year-dependent rows have no made-up placement',()=>{
 const m=M.buildChartMatrix(sample());assert.equal(m.annualYear,null);for(const row of m.rows.filter(x=>['annual','annual-transformation','annual-locator'].includes(x.layer))){assert.deepEqual(row.placements,[]);assert.equal(row.positionState,'catalog-only');}
});
test('all internal baseline charts and 60x12x2 sampled inputs retain 104 names, one position each',()=>{
 const expected=M.catalogRows().filter(x=>['natal','cycle'].includes(x.layer)).map(x=>x.id).sort();let cases=0;
 for(const {input} of baselines.cases){const m=M.buildChartMatrix(E.calculate(input));assert.deepEqual(m.rows.filter(x=>['natal','cycle'].includes(x.layer)).map(x=>x.id).sort(),expected);}
 for(let year=1960;year<2020;year++)for(let hour=0;hour<24;hour+=2)for(const gender of ['Nam','Nữ']){const m=M.buildChartMatrix(E.calculate({date:`${year}-08-15`,calendar:'solar',hour,minute:30,gender,leap:false}));assert.equal(m.rows.filter(x=>['natal','cycle'].includes(x.layer)).length,104);assert.ok(m.rows.filter(x=>['natal','cycle'].includes(x.layer)).every(x=>x.placements.length===1));cases++;}
 assert.equal(cases,1440);
});
test('changing annual years preserves every natal identity and placement and does not mutate inputs',()=>{
 const c=sample(),before=JSON.stringify(c),one=M.buildChartMatrix(c,E.annualOverview(c,2025)),two=M.buildChartMatrix(c,E.annualOverview(c,2026));
 const natal=m=>m.rows.filter(x=>['natal','cycle','obstruction','natal-transformation'].includes(x.layer));assert.deepEqual(natal(one),natal(two));assert.notDeepEqual(one.rows.filter(x=>x.bucket==='annual'),two.rows.filter(x=>x.bucket==='annual'));assert.equal(JSON.stringify(c),before);
});
test('missing/duplicate/unknown stars, invalid branches and incomplete cycles fail closed',()=>{
 for(const patch of [c=>c.houses.pop(),c=>c.houses[0].branchIndex=c.houses[1].branchIndex,c=>c.houses[0].branch='fake',c=>c.houses[0].stars.push('Hồng Diễm'),c=>c.houses[0].stars.push(c.houses.flatMap(h=>h.stars)[0]),c=>delete c.houses[0].cycleStars,c=>c.obstructionMarkers.push({name:'fake',branches:[0,1]}),c=>c.obstructionMarkers[0].branches=[0],c=>c.transformations[0].star='fake']){const c=sample();patch(c);assert.throws(()=>M.buildChartMatrix(c));}
});
test('forged annual identities or transformation targets cannot silently enter a matrix',()=>{
 for(const patch of [a=>a.year=1900,a=>a.year=2101,a=>a.luuStars.items.pop(),a=>a.luuStars.items[0].name='Lưu Thiên Không',a=>a.luuStars.items[0].branch=12,a=>a.luuTuHoa.items[0].star='fake',a=>a.luuThaiTueBranchIndex=-1]){const c=sample(),a=E.annualOverview(c,2026);patch(a);assert.throws(()=>M.buildChartMatrix(c,a));}
});
test('15 resolution dossiers distinguish nine scoped rules, one captured candidate and one conflicting table and four name relations',()=>{
 const rows=M.getResolutions();assert.equal(rows.length,15);assert.equal(M.getResolutions('','missing').length,11);assert.equal(M.getResolutions('','alias').length,4);assert.equal(rows.filter(r=>r.state==='source-scoped-rule').length,9);
 assert.equal(rows.find(r=>r.name==='Lưu Niên Văn Tinh').state,'conflicting-source-tables');assert.match(rows.find(r=>r.name==='Lưu Niên Văn Tinh').ruleScope,/năm sinh/);assert.equal(rows.find(r=>r.name==='Hồng Diễm').state,'source-table-captured');
 for(const row of rows){assert.equal(row.automaticPlacement,false);assert.equal(row.automaticAlias,false);assert.ok(row.decision&&row.remaining&&row.ruleScope);}
});
test('Trường Sinh is discoverable as a qualified term without creating a second identity or engine alias',()=>{
 const rows=M.filterRows(M.catalogRows(),'truong sinh','cycle');assert.equal(rows.length,1);assert.equal(rows[0].name,'Tràng Sinh');assert.deepEqual(rows[0].lookupTerms,['Trường Sinh']);assert.equal(I.resolveStarIdentity('Trường Sinh'),null);assert.equal(M.counts().natalAndCycle,104);
 assert.equal(M.getResolutions('triet khong','alias')[0].state,'representation-conflict');assert.equal(M.getResolutions('thai phu','alias')[0].state,'method-dependent');
});
test('filters are accent-insensitive, distinguish annual layers and give a true empty result',()=>{
 assert.equal(M.filterRows(M.catalogRows(),'','main').length,14);assert.equal(M.filterRows(M.catalogRows(),'','support').length,54);assert.equal(M.filterRows(M.catalogRows(),'','annual').length,12);assert.equal(M.filterRows(M.catalogRows(),'not-a-real-star').length,0);
 assert.equal(M.filterRows(M.catalogRows(),'hoa loc').length,2);assert.equal(M.filterRows(M.catalogRows(),'thien ma','annual').length,1);assert.throws(()=>M.filterRows([],null,'unknown'));
});
test('returned catalogs, chart rows and resolution records cannot mutate retained data',()=>{
 const row=M.catalogRows()[0];row.name='fake';row.editorialSources.push('fake');assert.notEqual(M.catalogRows()[0].name,'fake');assert.ok(!M.catalogRows()[0].editorialSources.includes('fake'));
 const d=M.getResolutions()[0];d.sourceIds.push('fake');assert.ok(!M.getResolutions()[0].sourceIds.includes('fake'));
 const c=sample(),m=M.buildChartMatrix(c);m.rows[0].placements[0].branch='fake';assert.notEqual(M.buildChartMatrix(c).rows[0].placements[0].branch,'fake');
});
