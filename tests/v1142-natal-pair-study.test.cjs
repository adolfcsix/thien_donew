'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {diagnoseNatalStarPairs,buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const pairs=require('../packages/knowledge/src/natal-pair-research.json');
const audit=require('../infrastructure/scripts/audit-natal-pairs.cjs').audit;
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const sample=()=>({houses:Array.from({length:12},(_,branchIndex)=>({branchIndex,branch:`Chi ${branchIndex}`,palace:branchIndex===0?'Mệnh':`Cung ${branchIndex}`,stars:[],auxiliaryStars:[],yearStars:[],tuHoa:[]}))});
const place=(c,branch,star,layer='auxiliaryStars')=>c.houses[branch][layer]=[...(c.houses[branch][layer]??[]),star];
const find=(c,id,anchor=0)=>diagnoseNatalStarPairs(c,anchor).records.find(r=>r.id===id);
test('V11.42: catalogue uses six distinct pairs with authored non-identical questions and actions',()=>{
 assert.equal(pairs.pairs.length,6);assert.equal(new Set(pairs.pairs.map(x=>x.id)).size,6);
 assert.equal(new Set(pairs.pairs.map(x=>x.question)).size,6);
 for(const p of pairs.pairs){assert.equal(new Set(p.stars).size,2);assert.ok(p.question.length>50);assert.ok(p.nextStep.length>50);}
});
test('V11.42: same-palace match retains exact source provenance',()=>{
 const c=sample();place(c,0,'Tả Phụ');place(c,0,'Hữu Bật','beneficStars');
 const f=find(c,'ta-huu');assert.equal(f.status,'matched');assert.equal(f.relation,'dong-cung');
 assert.deepEqual(f.placements.map(p=>p.layers),[['auxiliaryStars'],['beneficStars']]);
});
test('V11.42: tam-hop requires true 4-branch separation within anchor triad',()=>{
 const c=sample();place(c,0,'Văn Xương');place(c,4,'Văn Khúc');
 assert.equal(find(c,'xuong-khuc').relation,'tam-hop');
 c.houses[4].auxiliaryStars=[];place(c,2,'Văn Khúc');
 assert.equal(find(c,'xuong-khuc').status,'outside-scope');
});
test('V11.42: opposition connects focus to opposite, not arbitrary houses',()=>{
 const c=sample();place(c,6,'Thiên Khôi');place(c,0,'Thiên Việt');
 assert.equal(find(c,'khoi-viet').relation,'doi-cung');
 c.houses[0].auxiliaryStars=[];place(c,9,'Thiên Việt');
 assert.equal(find(c,'khoi-viet').status,'outside-scope');
});
test('V11.42: flanking houses support wraparound (11 and 1 around anchor 0)',()=>{
 const c=sample();place(c,11,'Kình Dương');place(c,1,'Đà La');
 assert.equal(find(c,'kinh-da').relation,'giap-cung');
 assert.equal(find(c,'kinh-da',6).status,'outside-scope');
});
test('V11.42: annual overlays cannot become natal pair evidence',()=>{
 const c=sample();c.houses[0].luuStars=['Hỏa Tinh'];c.houses[4].annualStars=['Linh Tinh'];
 assert.equal(find(c,'hoa-linh').status,'not-observed');
 place(c,0,'Hỏa Tinh');place(c,4,'Linh Tinh');
 assert.equal(find(c,'hoa-linh').status,'matched');
});
test('V11.42: duplicate natal star in two houses blocks recognition',()=>{
 const c=sample();place(c,0,'Địa Không');place(c,4,'Địa Không');place(c,0,'Địa Kiếp');
 const f=find(c,'khong-kiep');assert.equal(f.status,'ambiguous');assert.equal(f.relation,null);
 assert.deepEqual(f.placements[0].branches,[0,4]);
});
test('V11.42: same star in two layers of ONE house is not a duplicate position',()=>{
 const c=sample();place(c,0,'Địa Không');place(c,0,'Địa Không','advancedStars');place(c,8,'Địa Kiếp');
 const f=find(c,'khong-kiep');assert.equal(f.relation,'tam-hop');
 assert.deepEqual(f.placements[0].layers,['advancedStars','auxiliaryStars']);
});
test('V11.42: malformed chart or anchor fails closed',()=>{
 assert.throws(()=>diagnoseNatalStarPairs({houses:[]},0),RangeError);
 assert.throws(()=>diagnoseNatalStarPairs(sample(),12),RangeError);
});
test('V11.42: all 22 pinned charts yield immutable source data and no expert-validated claim',()=>{
 const result=audit();assert.equal(result.fixtures,22);assert.equal(result.pairProfiles,6);
 assert.equal(result.observations,132);assert.equal(result.status,'PASS');assert.deepEqual(result.issues,[]);
});
test('V11.42: deep panel wires up pure evidence without new placement or API requests',()=>{
 const chart=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
 const before=JSON.stringify(chart);const menh=chart.houses.find(h=>h.palace==='Mệnh');
 const reading=buildPalaceReading({chart,branchIndex:menh.branchIndex});
 assert.equal(reading.natalPairStudy.assessed,6);assert.equal(reading.natalPairStudy.expertReviewed,false);
 assert.equal(JSON.stringify(chart),before);
 const src=path.resolve(__dirname,'../apps/web/src/features/chart/components');
 const parent=fs.readFileSync(path.join(src,'palace-reading.tsx'),'utf8');
 const panel=fs.readFileSync(path.join(src,'natal-pair-study-panel.tsx'),'utf8');
 assert.match(parent,/level==='deep'/);assert.match(parent,/NatalPairStudyPanel study=\{reading\.natalPairStudy\}/);
 assert.match(panel,/study\.notice/);assert.doesNotMatch(panel,/fetch\(|\.calculate\(|astrology-engine/);
});
