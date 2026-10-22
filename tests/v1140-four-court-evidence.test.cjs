'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {inspectFourCourtEvidence}=require('../packages/interpretation/src/four-court-evidence.cjs');
const {describeClassicalCandidateCriteria}=require('../packages/interpretation/src/classical-condition-diagnostics.cjs');
const {buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const sample=()=>({houses:Array.from({length:12},(_,branchIndex)=>({branchIndex,branch:`Chi ${branchIndex}`,palace:branchIndex===0?'Mệnh':`Cung ${branchIndex}`,stars:[],auxiliaryStars:[],yearStars:[],tuHoa:[],mainStarStrengths:[],obstructionMarkers:[]}))});
const rule={conditions:{requiredStars:['Tử Vi','Thiên Phủ'],supportAny:['Tả Phụ'],reviewAny:['Kình Dương']}};
const inspect=c=>inspectFourCourtEvidence(c,0,rule);
test('V11.40: birthplace/natal layers include evidence positions and actual source paths',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];c.houses[4].stars=['Thiên Phủ'];
 c.houses[8].auxiliaryStars=['Tả Phụ'];c.houses[6].auxiliaryStars=['Kình Dương'];
 c.houses[4].mainStarStrengths=[{name:'Thiên Phủ',branch:4,status:'M'}];
 const e=inspect(c);assert.deepEqual(e.branches,[0,4,8,6]);
 assert.equal(e.supports[0].branchIndex,8);assert.deepEqual(e.supports[0].layers,['auxiliaryStars']);
 assert.equal(e.review[0].relation,'doi-cung');
 assert.equal(e.strengths[1].status,'M');assert.equal(e.flags.missingStrengthData,true);
 assert.deepEqual(e.summary,{requiredObserved:2,requiredTotal:2,supportsObserved:1,reviewObserved:1,transformationsVerified:0,strengthsKnown:1});
});
test('V11.40: annual overlay cannot contaminate natal four-court evidence',()=>{
 const c=sample();c.houses[0].luuStars=['Tử Vi'];c.houses[0].luuTuHoa=[{name:'Hóa Lộc',star:'Tử Vi'}];
 const e=inspect(c);assert.equal(e.required[0].status,'not-observed');
 assert.equal(e.transformations.length,0);assert.equal(e.summary.requiredObserved,0);
});
test('V11.40: same star in two separate palaces is ambiguous, not silently selected',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];c.houses[7].stars=['Tử Vi'];
 const e=inspect(c);assert.equal(e.required[0].status,'ambiguous');assert.equal(e.flags.ambiguousEvidence,true);
 assert.deepEqual(e.required[0].positions,[0,7]);
});
test('V11.40: same star in two natal layers of ONE house retains provenance without false duplicate',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];c.houses[0].auxiliaryStars=['Tử Vi'];
 const e=inspect(c);assert.equal(e.required[0].status,'observed');
 assert.deepEqual(e.required[0].layers,['auxiliaryStars','stars']);
});
test('V11.40: main-star requirements cannot be satisfied by homonymous auxiliary layer',()=>{
 const c=sample();c.houses[0].auxiliaryStars=['Tử Vi'];
 const e=inspect(c);assert.equal(e.required[0].status,'not-observed');
 assert.equal(e.required[0].reason,'not-main-star');
 assert.equal(e.summary.requiredObserved,0);
});
test('V11.40: rejects Tứ Hóa if its target is missing or in another house',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];c.houses[4].stars=['Thiên Phủ'];
 c.houses[0].tuHoa=[{name:'Hóa Kỵ',star:'Thiên Phủ'},{name:'Hóa Lộc',star:'Tử Vi'},{name:'Hóa Quyền',star:'Không có'}];
 const e=inspect(c);assert.equal(e.transformations.length,1);assert.equal(e.transformations[0].name,'Hóa Lộc');
 assert.equal(e.rejectedTransformations.length,2);assert.equal(e.flags.ambiguousEvidence,true);
 assert.equal(e.flags.containsHoaKy,false);
});
test('V11.40: Tứ Hóa valid natal target is recorded, never promoted to verified classical formation',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];c.houses[0].tuHoa=[{name:'Hóa Kỵ',star:'Tử Vi'}];
 const e=inspect(c);assert.equal(e.flags.containsHoaKy,true);assert.equal(e.transformations[0].status,'verified-natal-target');
 assert.equal(e.expertConfirmed,false);
});
test('V11.40: conflicting natal Tứ Hóa target records invalidate the shared label',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];c.houses[4].stars=['Thiên Phủ'];
 c.houses[0].tuHoa=[{name:'Hóa Lộc',star:'Tử Vi'}];
 c.houses[4].tuHoa=[{name:'Hóa Lộc',star:'Thiên Phủ'}];
 const e=inspect(c);assert.equal(e.transformations.length,0);assert.equal(e.rejectedTransformations.length,2);
});
test('V11.40: only explicit Tuần/Triệt markers can be included; ignores unknown and out-of-scope',()=>{
 const c=sample();c.houses[8].obstructionMarkers=['Tuần','Lạ','Tuần'];c.houses[2].obstructionMarkers=['Triệt'];
 const e=inspect(c);assert.equal(e.obstructions.length,1);assert.equal(e.obstructions[0].marker,'Tuần');
});
test('V11.40: missing strength must stay unknown even with forged, conflicting or wrong-branch inputs',()=>{
 const c=sample();c.houses[0].stars=['Tử Vi'];
 c.houses[0].mainStarStrengths=[{name:'Tử Vi',branch:9,status:'M'},{name:'Tử Vi',branch:0,status:'X'}];
 assert.equal(inspect(c).strengths[0].status,null);
 c.houses[0].mainStarStrengths=[{name:'Tử Vi',branch:0,status:'M'},{name:'Tử Vi',branch:0,status:'H'}];
 assert.equal(inspect(c).strengths[0].status,null);
});
test('V11.40: case study returns 4 reviews, no mutation and no hidden expert certification',()=>{
 const Engine=require('../packages/astrology-engine/src/tuvi.js');
 const chart=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
 const baseline=JSON.stringify(chart);const anchor=chart.houses.find(h=>h.palace==='Mệnh');
 const criteria=describeClassicalCandidateCriteria(chart,anchor.branchIndex);
 assert.equal(criteria.length,4);assert.ok(criteria.every(x=>x.evidenceReview && x.evidenceReview.expertConfirmed===false));
 const reading=buildPalaceReading({chart,branchIndex:anchor.branchIndex});
 assert.deepEqual(reading.classicalCriteria.map(x=>x.evidenceReview),criteria.map(x=>x.evidenceReview));
 assert.equal(JSON.stringify(chart),baseline);
});
test('V11.40: declines malformed inputs and incomplete rules',()=>{
 assert.throws(()=>inspectFourCourtEvidence({houses:[]},0,rule),RangeError);
 assert.throws(()=>inspectFourCourtEvidence(sample(),0,{}),TypeError);
});
test('V11.40: UI renders evidence only in deep palace mode and keeps research disclaimer',()=>{
 const fs=require('node:fs');const root=require('node:path').join(__dirname,'../apps/web/src/features/chart/components');
 const a=fs.readFileSync(require('node:path').join(root,'palace-reading.tsx'),'utf8');
 const b=fs.readFileSync(require('node:path').join(root,'four-court-evidence-detail.tsx'),'utf8');
 assert.match(a,/level==='deep'/);assert.match(a,/FourCourtEvidenceDetail/);assert.match(b,/data\.notice/);
 assert.doesNotMatch(b, /calculate\(|natal-placements|fetch\(/);
});
