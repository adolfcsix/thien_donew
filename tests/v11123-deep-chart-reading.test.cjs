'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const E=require('../packages/astrology-engine/src/tuvi.js');
const {buildDeepChartReading:read}=require('../packages/interpretation/src/index.cjs');
const catalog=require('../packages/knowledge/src/deep-reading-v11123.json');
const make=(date='2004-01-01',gender='Nam',hour=8)=>E.calculate({date,gender,hour,minute:30,calendar:'solar'});
const natal=r=>({palaces:r.palaces.map(p=>p.natal),hoa:r.natalTransformations});
const allEvidence=r=>r.palaces.flatMap(p=>[...p.natal.paragraphs.flatMap(x=>x.evidence),...p.natal.relationships.flatMap(x=>x.evidence),...p.natal.groups.flatMap(x=>x.evidence),...p.natal.transformations.map(x=>x.evidence),...p.annual.stars,...p.annual.transformations.map(x=>x.evidence)]);
test('V11.123 explicit format, 12 distinct editorial topics, 6 pair angles, separate 4+4 Hoa and 12 annual stars',()=>{
 const r=read(make(),2026);assert.equal(r.format,'thien-do.deep-chart-reading');assert.equal(r.edition,'11.123.0');assert.equal(r.expertReviewed,false);
 assert.deepEqual(r.summary,{palaces:12,reviewPalaces:0,natalTransformations:4,annualTransformations:4,annualStars:12});
 assert.equal(new Set(r.palaces.map(p=>p.palace)).size,12);assert.equal(new Set(r.palaces.map(p=>p.natal.question)).size,12);assert.equal(Object.keys(catalog.pairAngles).length,6);
 assert.equal(new Set(r.natalTransformations.map(x=>x.evidence.transformation)).size,4);
 assert.ok(r.limitations.some(x=>x.includes('Phi Hóa')));assert.ok(r.limitations.some(x=>x.includes('11 tên')));
});
test('V11.123 independent known chart fixture: Menh Dau relates Suu/Ty/Mao; period labels preserve natal palaces',()=>{
 const r=read(make(),2026),m=r.palaces.find(x=>x.palace==='Mệnh');
 assert.deepEqual(m.natal.courts.map(c=>[c.branch,c.palace]),[['Dậu','Mệnh'],['Sửu','Quan Lộc'],['Tỵ','Tài Bạch'],['Mão','Thiên Di']]);
 assert.deepEqual(r.periods.items.map(p=>[p.name,p.palace,p.branch]),[['Đại hạn','Phu Thê','Mùi'],['Tiểu hạn','Điền Trạch','Tý'],['Lưu Thái Tuế','Tử Tức','Ngọ']]);
 assert.equal(r.ageMu,24);assert.equal(r.periods.items[0].fromAge,23);assert.equal(r.periods.items[0].toAge,32);
 const a=r.annualTransformations.find(x=>x.evidence.transformation==='Hóa Kỵ');assert.equal(a.evidence.star,'Liêm Trinh');assert.equal(a.evidence.palace,'Phúc Đức');
 const n=r.natalTransformations.find(x=>x.evidence.transformation==='Hóa Quyền');assert.equal(n.evidence.star,'Cự Môn');assert.equal(n.evidence.palace,'Điền Trạch');
});
test('V11.123 wraparound for all 12 anchors; actual branch geometry independent of array order',()=>{
 const c=make();const r=read(c,2026);
 for(const p of r.palaces){assert.deepEqual(p.natal.courts.map(x=>x.branchIndex),[p.branchIndex,(p.branchIndex+4)%12,(p.branchIndex+8)%12,(p.branchIndex+6)%12]);}
 c.houses.reverse();assert.deepEqual(read(c,2026),r);
});
test('V11.123 yearly change leaves every natal paragraph/relationship/transformation byte-equivalent and does not mutate chart',()=>{
 const c=make(),before=JSON.stringify(c),a=read(c,2025),b=read(c,2026);assert.deepEqual(natal(a),natal(b));assert.equal(JSON.stringify(c),before);
 assert.notDeepEqual(a.annualTransformations,b.annualTransformations);assert.notDeepEqual(a.periods,b.periods);
 for(const x of allEvidence(b))if(x.scope==='annual')assert.equal(x.year,2026);else assert.equal(x.year,undefined);
});
test('V11.123 unrelated injected annual fields cannot trigger natal pairs/groups or add annual stars',()=>{
 const c=make(),r=read(c,2026);c.houses[0].luuStars=['Tả Phụ','Hữu Bật'];c.houses[0].luuTuHoa=[{name:'Hóa Kỵ',star:'Tử Vi'}];assert.deepEqual(read(c,2026),r);
});
test('V11.123 every positional argument traces to its true house and scope; no source code paths in prose/evidence',()=>{
 const c=make(),r=read(c,2026);
 for(const e of allEvidence(r)){const h=c.houses.find(h=>h.branchIndex===e.branchIndex);assert.equal(e.palace,h.palace);assert.equal(e.branch,h.branch);
  if(e.scope==='natal'&&e.kind!=='obstruction')assert.ok(Object.keys(h).filter(k=>Array.isArray(h[k])).some(k=>h[k].includes(e.star)));
  assert.doesNotMatch(JSON.stringify(e),/sourcePath|strengthPath|targetPath/);
 }
 for(const p of r.palaces)for(const x of p.natal.paragraphs)assert.ok(x.text.length>100);
});
test('V11.123 void palace reports opposite stars as opposition only; never changes local main group',()=>{
 const r=read(make(),2026),p=r.palaces.find(p=>p.palace==='Tài Bạch');assert.equal(p.natal.voChinhDieu,true);assert.deepEqual(p.natal.courts[0].groups.main,[]);
 const x=p.natal.paragraphs.find(p=>p.id==='main');assert.match(x.text,/không chuyển sao/);assert.ok(x.evidence.every(e=>e.branchIndex===(p.branchIndex+6)%12));
});
test('V11.123 corrupt brightness is excluded from main interpretations and tracked as review, including linked court',()=>{
 const c=make(),h=c.houses.find(h=>h.palace==='Mệnh'),s=h.stars[0];h.mainStarStrengths=[];const r=read(c,2026);
 const p=r.palaces.find(p=>p.palace==='Mệnh');assert.equal(p.natal.voChinhDieu,false);assert.equal(p.natal.status,'needs-review');assert.ok(!p.natal.paragraphs.some(x=>x.id==='main-'+s));
 assert.ok(!p.natal.otherSymbols.some(x=>x.evidence.star===s));assert.ok(r.summary.reviewPalaces>=4);
});
test('V11.123 duplicate natal positions fail closed before any pair/group interpretation',()=>{
 const c=make(),at=c.houses.find(h=>h.auxiliaryStars.includes('Tả Phụ'));at.auxiliaryStars.push('Tả Phụ');
 assert.throws(()=>read(c,2026),/Trùng sao/);
 const a=make(),source=a.houses.find(h=>h.auxiliaryStars.includes('Hữu Bật'));
 a.houses.find(h=>h.branchIndex!==source.branchIndex).auxiliaryStars.push('Hữu Bật');assert.throws(()=>read(a,2026),/Trùng sao/);
});
test('V11.123 conflicting natal Hoa labels/targets are excluded, and unknown label never becomes prose',()=>{
 const c=make(),h=c.houses.find(h=>h.palace==='Mệnh');h.tuHoa.push({name:'Hóa Quyền',star:h.stars[0]},{name:'Hóa XYZ',star:h.stars[0]});const r=read(c,2026);
 assert.equal(r.natalTransformations.filter(x=>x.evidence.transformation==='Hóa Quyền').length,0);assert.ok(r.summary.reviewPalaces>0);assert.equal(r.annualTransformations.length,4);
});
test('V11.123 same-target cross-layer Hoa retains two records including unequal labels, no cancellation',()=>{
 let found;for(const y of [2023,2024,2025,2026,2027]){const r=read(make(),y);found=r.transformationLinks.find(x=>x.natal.transformation!==x.annual.transformation);if(found)break;}
 assert.ok(found);assert.equal(found.natal.scope,'natal');assert.equal(found.annual.scope,'annual');assert.equal(found.natal.star,found.annual.star);assert.match(found.text,/không tự cộng lực, triệt tiêu/);
});
test('V11.123 pre-DaiHan and corrupted interval: no fabricated period; boundaries validated before interpretation',()=>{
 const c=make('2026-10-10');const r=read(c,2026);assert.equal(r.periods.beforeFirstDaiHan,true);assert.equal(r.periods.items.some(p=>p.name==='Đại hạn'),false);
 const old=make();const a=old.houses.find(h=>h.daiHan.fromAge===23);a.daiHan.toAge=42;const bad=read(old,2026);assert.equal(bad.periods.items.some(p=>p.name==='Đại hạn'),false);assert.ok(bad.periods.issues.length);
 for(const year of [2002,1899,2101,2026.5,NaN,'2026'])assert.throws(()=>read(make(),year),/Năm xem/);
 const dup=make();dup.houses[0].palace=dup.houses[1].palace;assert.throws(()=>read(dup,2026),/thiếu hoặc trùng/);
});
test('V11.123 representative sex/hour/date corpus, 1900 and 2100 boundaries; star scope stays correct',()=>{
 for(const [date,year] of [['1900-02-10',1900],['1979-06-16',2026],['1997-12-27',2025],['2026-10-10',2026],['2100-12-20',2100]])for(const gender of ['Nam','Nữ'])for(const hour of [1,8,20]){
  const c=make(date,gender,hour),r=read(c,year);assert.equal(r.palaces.length,12);assert.equal(r.annualTransformations.length,4);assert.equal(r.natalTransformations.length,4);assert.equal(r.summary.reviewPalaces,0);
  for(const p of r.palaces)assert.ok(p.annual.stars.every(e=>e.year===year&&p.natal.courts.some(x=>x.branchIndex===e.branchIndex)));
 }
});

test('V11.123 local support synthesis does not treat tam-hop stars as same-palace support',()=>{
 const r=read(make(),2026),m=r.palaces.find(p=>p.palace==='Mệnh'),d=r.palaces.find(p=>p.palace==='Điền Trạch');
 assert.ok(!m.natal.paragraphs.some(x=>x.id==='local-support'));
 const local=d.natal.paragraphs.find(x=>x.id==='local-support');assert.ok(local);assert.match(local.text,/Cự Môn/);assert.match(local.text,/Lộc Tồn/);assert.ok(local.evidence.every(x=>x.branchIndex===0));
});
test('V11.123 overlapping period labels stay distinct and report no auspiciousness arithmetic',()=>{
 let found;for(let y=2003;y<=2050;y++){const r=read(make(),y);if(r.periods.overlaps.length){found=r;break;}}
 assert.ok(found);const o=found.periods.overlaps[0];assert.equal(o.names.length,2);assert.match(o.text,/không tự tăng cát\/hung/);
 for(const name of o.names)assert.ok(found.periods.items.some(p=>p.name===name&&p.palace===o.palace));
 assert.doesNotMatch(JSON.stringify(found),/fortuneScore|auspiciousScore|predictionScore/);
});

test('V11.123 age beyond all 12 decade intervals is outside-range, never mistaken for pre-first DaiHan',()=>{
 const r=read(make('1900-02-10'),2100);assert.equal(r.ageMu,201);assert.equal(r.periods.beforeFirstDaiHan,false);assert.equal(r.periods.daiHanStatus,'outside-range');assert.ok(!r.periods.items.some(p=>p.name==='Đại hạn'));
 const first=read(make('2026-10-10'),2026);assert.equal(first.periods.daiHanStatus,'before-first');
});

test('V11.123 co-located pair in opposite court retains pair relation, while evidence correctly says opposition to anchor',()=>{
 const r=read(make('2004-05-01'),2026),p=r.palaces.find(p=>p.palace==='Mệnh'),x=p.natal.relationships.find(x=>x.id==='hoa-linh');
 assert.ok(x);assert.equal(x.relation,'Đồng cung');assert.ok(x.evidence.every(e=>e.palace==='Thiên Di'&&e.relation==='đối cung'&&e.branchIndex===(p.branchIndex+6)%12));
});
