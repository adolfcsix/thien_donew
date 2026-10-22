'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {examineNatalMultiStars,buildPalaceReading,diagnoseNatalStarPairs}=require('../packages/interpretation/src/index.cjs');
const library=require('../packages/knowledge/src/natal-multi-star-research.json');
const {audit}=require('../infrastructure/scripts/audit-natal-multi.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const sample=()=>({houses:Array.from({length:12},(_,branchIndex)=>({branchIndex,branch:`Chi ${branchIndex}`,palace:branchIndex===0?'Mệnh':`Cung ${branchIndex}`,stars:[],auxiliaryStars:[],yearStars:[],tuHoa:[]}))});
const put=(chart,at,star,layer='auxiliaryStars')=>chart.houses[at][layer]=[...(chart.houses[at][layer]??[]),star];
const get=(chart,id,anchor=0,options)=>examineNatalMultiStars(chart,anchor,options).records.find(x=>x.id===id);
test('V11.43 research catalogue has authored, distinct 3/4-star groups',()=>{
 assert.equal(library.groups.length,6);
 assert.equal(new Set(library.groups.map(g=>g.id)).size,6);
 assert.equal(new Set(library.groups.map(g=>g.question)).size,6);
 for(const group of library.groups){assert.ok([3,4].includes(group.stars.length));assert.equal(new Set(group.stars).size,group.stars.length);assert.ok(group.nextStep.length>40);}
});
test('V11.43 observes four natal stars in four courts with exact layers',()=>{
 const c=sample();put(c,0,'Tả Phụ');put(c,4,'Hữu Bật','beneficStars');put(c,8,'Văn Xương');put(c,6,'Văn Khúc');
 const f=get(c,'ta-huu-xuong-khuc');assert.equal(f.status,'all-observed');assert.equal(f.observed,4);
 assert.deepEqual(f.placements.map(p=>p.relation),['Tọa cung','Tam hợp','Tam hợp','Đối cung']);
 assert.deepEqual(f.placements[1].layers,['beneficStars']);
});
test('V11.43 partial status counts only stars in requested four courts',()=>{
 const c=sample();put(c,0,'Tả Phụ');put(c,4,'Hữu Bật');put(c,2,'Lộc Tồn');
 const f=get(c,'ta-huu-loc-ton');assert.equal(f.status,'partial');assert.equal(f.observed,2);
 assert.equal(f.placements[2].relation,'Ngoài Tứ chính');
});
test('V11.43 malformed or duplicated natal positions fail closed',()=>{
 const c=sample();put(c,0,'Tả Phụ');put(c,4,'Tả Phụ');put(c,0,'Hữu Bật');put(c,4,'Lộc Tồn');
 const f=get(c,'ta-huu-loc-ton');assert.equal(f.status,'ambiguous');assert.equal(f.placements[0].status,'ambiguous');
 assert.throws(()=>examineNatalMultiStars({houses:[]},0),RangeError);
 assert.throws(()=>examineNatalMultiStars(sample(),12),RangeError);
});
test('V11.43 same-star multi-layer at one branch is not duplicate',()=>{
 const c=sample();put(c,0,'Tả Phụ');put(c,0,'Tả Phụ','advancedStars');put(c,4,'Hữu Bật');put(c,8,'Lộc Tồn');
 const f=get(c,'ta-huu-loc-ton');assert.equal(f.status,'all-observed');
 assert.deepEqual(f.placements[0].layers,['advancedStars','auxiliaryStars']);
});
test('V11.43 annual overlays never fulfill natal requirements',()=>{
 const c=sample();c.houses[0].luuStars=['Tả Phụ'];put(c,8,'Thiên Cơ','stars');
 const annual={year:2026,luuStars:{items:[{name:'Tả Phụ',branch:0,palace:'Mệnh'},{name:'Hữu Bật',branch:4,palace:'Cung 4'}]},luuTuHoa:{items:[{name:'Hóa Lộc',star:'Thiên Cơ',branch:8,palace:'Cung 8'}]}};
 const study=examineNatalMultiStars(c,0,{annual,includeAnnual:true});
 assert.equal(study.records.find(g=>g.id==='ta-huu-loc-ton').status,'insufficient');
 assert.equal(study.annualOverlay.stars.length,2);assert.equal(study.annualOverlay.transformations.length,1);
 assert.equal(examineNatalMultiStars(c,0,{annual,includeAnnual:false}).annualOverlay,null);
});
test('V11.43 natal Tứ Hóa requires exact unique target in same branch',()=>{
 const c=sample();put(c,0,'Thiên Cơ','stars');c.houses[0].tuHoa=[{name:'Hóa Lộc',star:'Thiên Cơ'}];
 let s=examineNatalMultiStars(c,0);
 assert.equal(s.transformations.length,1);assert.equal(s.rejectedTransformations.length,0);
 c.houses[4].tuHoa=[{name:'Hóa Lộc',star:'Hữu Bật'}];
 s=examineNatalMultiStars(c,0);assert.equal(s.transformations.length,0);assert.equal(s.rejectedTransformations.length,2);
});
test('V11.43 detached, outside-scope and duplicate-target birth transformations are rejected',()=>{
 const c=sample();c.houses[0].tuHoa=[{name:'Hóa Kỵ',star:'Thái Âm'}];
 put(c,2,'Vũ Khúc');c.houses[2].tuHoa=[{name:'Hóa Quyền',star:'Vũ Khúc'}];
 put(c,4,'Hóa Khoa');c.houses[4].tuHoa=[{name:'Hóa Khoa',star:'Văn Xương'}];
 let s=examineNatalMultiStars(c,0);assert.equal(s.transformations.length,0);assert.equal(s.rejectedTransformations.length,3);
 put(c,8,'Thiên Cơ','stars');c.houses[8].tuHoa=[{name:'Hóa Lộc',star:'Thiên Cơ'}];
 s=examineNatalMultiStars(c,0);assert.equal(s.transformations.length,1);
 put(c,1,'Thiên Cơ','stars');
 s=examineNatalMultiStars(c,0);assert.equal(s.transformations.length,0);
});
test('V11.43 pair research unchanged after shared-index refactor',()=>{
 const c=sample();put(c,0,'Tả Phụ');put(c,4,'Hữu Bật');
 const f=diagnoseNatalStarPairs(c,0).records.find(g=>g.id==='ta-huu');
 assert.equal(f.status,'matched');assert.equal(f.relation,'tam-hop');
});
test('V11.43 fixture audit verifies 22 real charts without source mutation',()=>{
 const a=audit();assert.equal(a.fixtures,22);assert.equal(a.groups,6);assert.equal(a.observations,132);
 assert.equal(a.status,'PASS');assert.deepEqual(a.issues,[]);
});
test('V11.43 reading wires data and unchanged input without placing new stars',()=>{
 const chart=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
 const before=JSON.stringify(chart),anchor=chart.houses.find(h=>h.palace==='Mệnh');
 const reading=buildPalaceReading({chart,branchIndex:anchor.branchIndex});
 assert.equal(reading.natalMultiStarStudy.assessed,6);
 assert.equal(reading.natalMultiStarStudy.expertReviewed,false);
 assert.equal(JSON.stringify(chart),before);
 const folder=path.resolve(__dirname,'../apps/web/src/features/chart/components');
 const parent=fs.readFileSync(path.join(folder,'palace-reading.tsx'),'utf8');
 const panel=fs.readFileSync(path.join(folder,'natal-multi-star-study-panel.tsx'),'utf8');
 assert.match(parent,/level==='deep'/);assert.match(parent,/NatalMultiStarStudyPanel study=\{reading\.natalMultiStarStudy\}/);
 assert.match(panel,/study\.notice/);assert.doesNotMatch(panel,/fetch\(|\.calculate\(|astrology-engine/);
});
