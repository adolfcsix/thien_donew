'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {auditClassicalPatternCandidates:study}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const NAMES=['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];
function chart(menh=0,sites={}){
 const houses=Array.from({length:12},(_,i)=>({branchIndex:i,branch:String(i),palace:NAMES[(i-menh+12)%12],stars:[],auxiliaryStars:[],yearStars:[]}));
 for(const [name,entry] of Object.entries(sites))houses[entry[0]][entry[1]??'stars'].push(name);
 return {houses};
}
const item=(r,id)=>r.records.find(x=>x.id===id);
test('Twenty-two research rules must not claim full 49 classical structures',()=>{
 const r=study(chart());
 assert.equal(r.assessed,22);assert.equal(r.referenceTotal,49);
 assert.equal(r.groups.reduce((n,g)=>n+g.totalInReference,0),49);
 assert.equal(r.groups.reduce((n,g)=>n+g.implementedHere,0),22);
 assert.equal(new Set(r.records.map(x=>x.id)).size,20);
 assert.equal(r.expertReviewed,false);
 assert.equal(r.records.every(x=>x.status!=='structural-match'),true);
});
test('Sun in Mao, with Mao as Menh, matches source-defined geometry',()=>{
 const r=study(chart(3,{'Thái Dương':[3],'Thái Âm':[8],'Vũ Khúc':[7],'Thiên Mã':[5,'yearStars'],'Lộc Tồn':[6,'auxiliaryStars']}));
 assert.equal(item(r,'dinh-quy-02').status,'structural-match');
});
test('Sun alone in Menh at Ngo required for Kim xan quang huy',()=>{
 const s={'Thái Dương':[6],'Thái Âm':[0],'Vũ Khúc':[1],'Thiên Mã':[5,'yearStars'],'Lộc Tồn':[4,'auxiliaryStars']};
 assert.equal(item(study(chart(6,s)),'dinh-phu-06').status,'structural-match');
 const c=chart(6,s);c.houses[6].stars.push('Thất Sát');
 assert.equal(item(study(c),'dinh-phu-06').status,'not-met');
});
test('Both Sun and Moon must be in Dien Trach, not just in related palaces',()=>{
 const s={'Thái Dương':[3],'Thái Âm':[3],'Vũ Khúc':[5],'Thiên Mã':[6,'yearStars'],'Lộc Tồn':[1,'auxiliaryStars']};
 assert.equal(item(study(chart(0,s)),'dinh-phu-05').status,'structural-match');
 s['Thái Âm']=[4];
 assert.equal(item(study(chart(0,s)),'dinh-phu-05').status,'not-met');
});
test('Flanking Menh is unresolved until Khong Vong prerequisites can be checked',()=>{
 const r=study(chart(0,{'Thái Dương':[11],'Thái Âm':[1],'Vũ Khúc':[5],'Thiên Mã':[6,'yearStars'],'Lộc Tồn':[8,'auxiliaryStars'],'Tả Phụ':[0,'auxiliaryStars']}));
 assert.equal(item(r,'dinh-quy-01').status,'needs-review');
 assert.equal(item(r,'dinh-quy-01').checks.at(-1).state,'unknown');
});
test('Flanking geometry is adjacent ±1, not two palaces away',()=>{
 const a=study(chart(0,{'Vũ Khúc':[8],'Thái Âm':[7],'Thái Dương':[9],'Thiên Mã':[6,'yearStars'],'Lộc Tồn':[1,'auxiliaryStars']}));
 assert.equal(item(a,'dinh-phu-02').status,'structural-match');
 const b=study(chart(0,{'Vũ Khúc':[11],'Thái Âm':[4],'Thái Dương':[5],'Thiên Mã':[0,'yearStars'],'Lộc Tồn':[1,'auxiliaryStars']}));
 assert.equal(item(b,'dinh-phu-03').status,'structural-match');
});
test('Duplicate stars or a matching name in the wrong layer cannot confirm a formation',()=>{
 const c=chart(3,{'Thái Dương':[3],'Thái Âm':[7],'Vũ Khúc':[8],'Thiên Mã':[6,'yearStars'],'Lộc Tồn':[1,'auxiliaryStars']});
 c.houses[2].stars.push('Thái Dương');
 assert.equal(item(study(c),'dinh-quy-02').status,'needs-review');
 c.houses[2].stars=[];c.houses[3].stars=[];c.houses[3].auxiliaryStars.push('Thái Dương');
 assert.equal(item(study(c),'dinh-quy-02').status,'needs-review');
});
test('Invalid chart geometry is rejected and source chart is not mutated',()=>{
 const c=chart(0,{'Thái Dương':[3]});const before=JSON.stringify(c);
 study(c);assert.equal(JSON.stringify(c),before);
 assert.throws(()=>study({houses:[...c.houses.slice(0,11)]}),/12 cung/);
 const bad=chart();bad.houses[0].branchIndex=1;assert.throws(()=>study(bad),/trùng lặp/);
});

test('Actual Thiên Đồ engine chart is readable without altering placements',()=>{
 const engine=require('../packages/astrology-engine/src/tuvi.js');
 const chart=engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const before=JSON.stringify(chart.houses);
 const result=study(chart);
 assert.equal(result.assessed,22);
 assert.equal(result.groups.length,4);
 assert.ok(result.records.every(x=>['structural-match','not-met','needs-review'].includes(x.status)));
 assert.equal(JSON.stringify(chart.houses),before);
});


test('Reference research is pinned and 20 of 49 rules are clearly scoped',()=>{
 const r=study(chart());assert.equal(r.assessed,22);assert.equal(r.referenceTotal,49);
 assert.equal(r.groups.find(x=>x.name==='Định quý').implementedHere,18);
 assert.equal(r.groups.reduce((n,g)=>n+g.implementedHere,0),22);
 assert.equal(r.groups.reduce((n,g)=>n+g.totalInReference,0),49);
 assert.ok(r.records.every(x=>x.sourceUrl.includes('/blob/7922285d947b36610e7e31c232d8f1e2a0d0871d/')));
});
test('Nguyệt lạc Hợi cung requires Moon in Hoi as Menh',()=>{
 assert.equal(item(study(chart(11,{'Thái Âm':[11]})),'dinh-quy-03').status,'structural-match');
 assert.equal(item(study(chart(0,{'Thái Âm':[11]})),'dinh-quy-03').status,'not-met');
});
test('Nguyệt sinh Thương Hải requires Moon in Ty as Dien Trach',()=>{
 assert.equal(item(study(chart(9,{'Thái Âm':[0]})),'dinh-quy-04').status,'structural-match');
 assert.equal(item(study(chart(0,{'Thái Âm':[0]})),'dinh-quy-04').status,'not-met');
});
test('Minh châu xuất hải requires empty Menh at Mui and paired Sun/Moon in Suu',()=>{
 const sites={'Thái Dương':[1],'Thái Âm':[1]};
 assert.equal(item(study(chart(7,sites)),'dinh-quy-13').status,'structural-match');
 const c=chart(7,sites);c.houses[7].stars.push('Thất Sát');
 assert.equal(item(study(c),'dinh-quy-13').status,'not-met');
 c.houses[7].stars=[];c.houses[1].stars.pop();c.houses[4].stars.push('Thái Âm');
 assert.equal(item(study(c),'dinh-quy-13').status,'not-met');
});
test('Nhật Nguyệt đồng lâm requires natal Sun and Moon together in Menh',()=>{
 assert.equal(item(study(chart(7,{'Thái Dương':[7],'Thái Âm':[7]})),'dinh-quy-14').status,'structural-match');
 assert.equal(item(study(chart(7,{'Thái Dương':[7],'Thái Âm':[1]})),'dinh-quy-14').status,'not-met');
});
test('Vũ Khúc thủ viên requires Vu Khuc at Mao as Menh',()=>{
 assert.equal(item(study(chart(3,{'Vũ Khúc':[3]})),'dinh-quy-18').status,'structural-match');
 assert.equal(item(study(chart(3,{'Vũ Khúc':[9]})),'dinh-quy-18').status,'not-met');
});
test('Cự Cơ cư Mão rejects any non-major duplicate of Thien Co',()=>{
 assert.equal(item(study(chart(3,{'Cự Môn':[3],'Thiên Cơ':[3]})),'dinh-quy-24').status,'structural-match');
 const c=chart(3,{'Cự Môn':[3],'Thiên Cơ':[3]});
 c.houses[3].stars.pop();c.houses[3].auxiliaryStars.push('Thiên Cơ');
 assert.equal(item(study(c),'dinh-quy-24').status,'needs-review');
});


/** Synthetic natal data never derives four transformations from empty houses. */
function withFourHua(c,assignments){
 for(const h of c.houses)h.tuHoa=[];
 for(const [name,branchIndex,star] of assignments)c.houses[branchIndex].tuHoa.push({name,star});
 c.transformations=assignments.map(([name,branch,star])=>({name,branch,star}));
 return c;
}
test('Phụ Bật củng chủ requires Zi Wei at Menh and BOTH assistants, meeting or flanking',()=>{
 const s={'Tử Vi':[0],'Tả Phụ':[4,'auxiliaryStars'],'Hữu Bật':[8,'auxiliaryStars']};
 assert.equal(item(study(chart(0,s)),'dinh-quy-05').status,'structural-match');
 const adjacent=chart(0,{'Tử Vi':[0],'Tả Phụ':[11,'auxiliaryStars'],'Hữu Bật':[1,'auxiliaryStars']});
 assert.equal(item(study(adjacent),'dinh-quy-05').status,'structural-match');
 const miss=chart(0,{'Tử Vi':[0],'Tả Phụ':[11,'auxiliaryStars']});
 assert.equal(item(study(miss),'dinh-quy-05').status,'needs-review');
 const noZi=chart(0,{'Tử Vi':[4],'Tả Phụ':[11,'auxiliaryStars'],'Hữu Bật':[1,'auxiliaryStars']});
 assert.equal(item(study(noZi),'dinh-quy-05').status,'not-met');
});
test('Quân thần khánh hội requires all three in natal Menh, not merely Tứ chính',()=>{
 const full=chart(0,{'Tử Vi':[0],'Tả Phụ':[0,'auxiliaryStars'],'Hữu Bật':[0,'auxiliaryStars']});
 assert.equal(item(study(full),'dinh-quy-06').status,'structural-match');
 const dispersed=chart(0,{'Tử Vi':[0],'Tả Phụ':[4,'auxiliaryStars'],'Hữu Bật':[8,'auxiliaryStars']});
 assert.equal(item(study(dispersed),'dinh-quy-06').status,'not-met');
 assert.equal(item(study(dispersed),'dinh-quy-05').status,'structural-match');
});
test('Tọa quý hướng quý requires Khôi Việt on Menh versus exact opposite, either direction',()=>{
 assert.equal(item(study(chart(0,{'Thiên Khôi':[0,'auxiliaryStars'],'Thiên Việt':[6,'auxiliaryStars']})),'dinh-quy-09').status,'structural-match');
 assert.equal(item(study(chart(0,{'Thiên Khôi':[6,'auxiliaryStars'],'Thiên Việt':[0,'auxiliaryStars']})),'dinh-quy-09').status,'structural-match');
 assert.equal(item(study(chart(0,{'Thiên Khôi':[11,'auxiliaryStars'],'Thiên Việt':[1,'auxiliaryStars']})),'dinh-quy-09').status,'not-met');
});
test('Tử Phủ triều viên requires both natal major stars together at Menh in Dần or Thân',()=>{
 for(const branch of [2,8]){
  assert.equal(item(study(chart(branch,{'Tử Vi':[branch],'Thiên Phủ':[branch]})),'dinh-quy-20').status,'structural-match');
 }
 assert.equal(item(study(chart(0,{'Tử Vi':[0],'Thiên Phủ':[0]})),'dinh-quy-20').status,'not-met');
 assert.equal(item(study(chart(2,{'Tử Vi':[2],'Thiên Phủ':[8]})),'dinh-quy-20').status,'not-met');
});
test('Khoa Quyền Lộc củng checks three audited natal transformations in Tứ chính',()=>{
 const base=chart(0,{'Thái Dương':[0],'Thái Âm':[4],'Vũ Khúc':[8],'Thiên Cơ':[2]});
 const assign=[['Hóa Lộc',0,'Thái Dương'],['Hóa Quyền',4,'Thái Âm'],['Hóa Khoa',8,'Vũ Khúc'],['Hóa Kỵ',2,'Thiên Cơ']];
 assert.equal(item(study(withFourHua(base,assign)),'dinh-quy-16').status,'structural-match');
 const outside=chart(0,{'Thái Dương':[0],'Thái Âm':[4],'Vũ Khúc':[9],'Thiên Cơ':[2]});
 assert.equal(item(study(withFourHua(outside,[...assign.slice(0,2),['Hóa Khoa',9,'Vũ Khúc'],assign[3]])),'dinh-quy-16').status,'not-met');
 const incomplete=chart(0,{'Thái Dương':[0],'Thái Âm':[4],'Vũ Khúc':[8],'Thiên Cơ':[2]});
 assert.equal(item(study(incomplete),'dinh-quy-16').status,'needs-review');
});
test('Minh Lộc ám Lộc requires locTon at Menh plus verified natal Hoa Loc opposite',()=>{
 const c=chart(0,{'Lộc Tồn':[0,'auxiliaryStars'],'Thái Dương':[6],'Thái Âm':[4],'Vũ Khúc':[8],'Thiên Cơ':[2]});
 const assign=[['Hóa Lộc',6,'Thái Dương'],['Hóa Quyền',4,'Thái Âm'],['Hóa Khoa',8,'Vũ Khúc'],['Hóa Kỵ',2,'Thiên Cơ']];
 withFourHua(c,assign);
 assert.equal(item(study(c),'dinh-quy-25').status,'structural-match');
 const w=chart(0,{'Lộc Tồn':[0,'auxiliaryStars'],'Thái Dương':[0],'Thái Âm':[4],'Vũ Khúc':[8],'Thiên Cơ':[2]});
 withFourHua(w,[['Hóa Lộc',0,'Thái Dương'],...assign.slice(1)]);
 assert.equal(item(study(w),'dinh-quy-25').status,'not-met');
});
test('Missing, duplicate, or conflicting natal Hua cannot be reported as match',()=>{
 const gen=()=>chart(0,{'Lộc Tồn':[0,'auxiliaryStars'],'Thái Dương':[6],'Thái Âm':[4],'Vũ Khúc':[8],'Thiên Cơ':[2]});
 const full=[['Hóa Lộc',6,'Thái Dương'],['Hóa Quyền',4,'Thái Âm'],['Hóa Khoa',8,'Vũ Khúc'],['Hóa Kỵ',2,'Thiên Cơ']];
 const missing=withFourHua(gen(),full.slice(0,3));
 assert.equal(item(study(missing),'dinh-quy-25').status,'needs-review');
 const duplicate=withFourHua(gen(),full);duplicate.houses[4].tuHoa.push({name:'Hóa Lộc',star:'Thái Âm'});
 assert.equal(item(study(duplicate),'dinh-quy-25').status,'needs-review');
 const conflict=withFourHua(gen(),full);conflict.transformations[0].branch=3;
 assert.equal(item(study(conflict),'dinh-quy-25').status,'needs-review');
 const shifted=withFourHua(gen(),full);shifted.houses[6].tuHoa[0].star='Cự Môn';
 assert.equal(item(study(shifted),'dinh-quy-25').status,'needs-review');
});


test('Thất Sát triều đẩu only at natal Menh in Tý Dần Ngọ Thân',()=>{
 for(const branch of [0,2,6,8]){
  const record=item(study(chart(branch,{'Thất Sát':[branch]})),'dinh-quy-11');
  assert.equal(record.status,'structural-match',String(branch));
  assert.equal(record.checks.length,2);
 }
 for(const branch of [1,3,4,5,7,9,10,11]){
  assert.equal(item(study(chart(branch,{'Thất Sát':[branch]})),'dinh-quy-11').status,'not-met');
 }
 const outside=chart(0,{'Thất Sát':[6]});
 assert.equal(item(study(outside),'dinh-quy-11').status,'not-met');
});
test('Thất Sát triều đẩu never treats missing or wrong-layer stars as confirmed',()=>{
 const missing=chart(0);
 assert.equal(item(study(missing),'dinh-quy-11').status,'needs-review');
 const layer=chart(0,{'Thất Sát':[0,'auxiliaryStars']});
 assert.equal(item(study(layer),'dinh-quy-11').status,'needs-review');
 const duplicated=chart(0,{'Thất Sát':[0]});
 duplicated.houses[2].stars.push('Thất Sát');
 assert.equal(item(study(duplicated),'dinh-quy-11').status,'needs-review');
});
test('Phủ Tướng triều viên requires Mệnh at Dần/Thân and exact Tài Bạch/Quan Lộc occupation',()=>{
 for(const menh of [2,8]){
  const cai=(menh+8)%12,quan=(menh+4)%12;
  for(const [fu,tuong] of [[cai,quan],[quan,cai]]){
   const testChart=chart(menh,{'Thiên Phủ':[fu],'Thiên Tướng':[tuong]});
   const before=JSON.stringify(testChart);
   assert.equal(item(study(testChart),'dinh-quy-19').status,'structural-match');
   assert.equal(JSON.stringify(testChart),before,'Audit must not mutate the chart');
  }
 }
 const wrongMenh=chart(0,{'Thiên Phủ':[8],'Thiên Tướng':[4]});
 assert.equal(item(study(wrongMenh),'dinh-quy-19').status,'not-met');
});
test('Phủ Tướng triều viên cannot be relaxed to generic Tứ chính, same house, or wrong layer',()=>{
 const sameHouse=chart(2,{'Thiên Phủ':[10],'Thiên Tướng':[10]});
 assert.equal(item(study(sameHouse),'dinh-quy-19').status,'not-met');
 const indirect=chart(2,{'Thiên Phủ':[2],'Thiên Tướng':[6]});
 assert.equal(item(study(indirect),'dinh-quy-19').status,'not-met');
 const wrongLayer=chart(2,{'Thiên Phủ':[10],'Thiên Tướng':[6,'auxiliaryStars']});
 assert.equal(item(study(wrongLayer),'dinh-quy-19').status,'needs-review');
 const missing=chart(2,{'Thiên Phủ':[10]});
 assert.equal(item(study(missing),'dinh-quy-19').status,'needs-review');
});

test('Lộc Mã bội ấn recognizes natal Horse, Tuong and same/next-branch Loc Ton',()=>{
 const base={'Thiên Mã':[2,'yearStars'],'Thiên Tướng':[2],'Lộc Tồn':[3,'auxiliaryStars']};
 const match=item(study(chart(2,base)),'dinh-quy-08');
 assert.equal(match.status,'structural-match');
 assert.equal(match.checks.length,3);
 const same=item(study(chart(2,{...base,'Lộc Tồn':[2,'auxiliaryStars']})),'dinh-quy-08');
 assert.equal(same.status,'structural-match');
 assert.equal(item(study(chart(2,{...base,'Thiên Tướng':[4]})),'dinh-quy-08').status,'not-met');
 assert.equal(item(study(chart(2,{...base,'Thiên Mã':[2,'auxiliaryStars']})),'dinh-quy-08').status,'needs-review');
});
test('Lộc Mã bội ấn can use verified natal Hóa Lộc, but never a broken or missing Tứ Hóa',()=>{
 const sites={'Thiên Mã':[2,'yearStars'],'Thiên Tướng':[2],'Lộc Tồn':[8,'auxiliaryStars'],
  'Thái Dương':[3],'Thái Âm':[4],'Vũ Khúc':[5],'Thiên Cơ':[6]};
 const assign=[['Hóa Lộc',3,'Thái Dương'],['Hóa Quyền',4,'Thái Âm'],['Hóa Khoa',5,'Vũ Khúc'],['Hóa Kỵ',6,'Thiên Cơ']];
 assert.equal(item(study(chart(2,sites)),'dinh-quy-08').status,'needs-review');
 const full=withFourHua(chart(2,sites),assign);
 assert.equal(item(study(full),'dinh-quy-08').status,'structural-match');
 const outside=withFourHua(chart(2,{...sites,'Thái Dương':[9]}),[['Hóa Lộc',9,'Thái Dương'],...assign.slice(1)]);
 assert.equal(item(study(outside),'dinh-quy-08').status,'not-met');
 const dup=withFourHua(chart(2,sites),assign);dup.houses[2].auxiliaryStars.push('Lộc Tồn');
 assert.equal(item(study(dup),'dinh-quy-08').status,'needs-review');
 const sitesWithoutLoc={...sites};delete sitesWithoutLoc['Lộc Tồn'];
 const withoutLoc=withFourHua(chart(2,sitesWithoutLoc),assign);
 assert.equal(item(study(withoutLoc),'dinh-quy-08').status,'needs-review');
 const bad=withFourHua(chart(2,sites),assign);bad.houses[3].tuHoa[0].star='Cự Môn';
 assert.equal(item(study(bad),'dinh-quy-08').status,'needs-review');
});
test('Kình Dương nhập miếu checks four earth branches, exact natal layer and independent benefic',()=>{
 for(const b of [1,4,7,10]){
  const c=chart(b,{'Kình Dương':[b,'auxiliaryStars'],'Tả Phụ':[b,'auxiliaryStars']});
  const r=item(study(c),'dinh-quy-23');
  assert.equal(r.status,'structural-match',String(b));
  assert.equal(r.checks.length,3);
 }
 const notEarth=chart(3,{'Kình Dương':[3,'auxiliaryStars'],'Tả Phụ':[3,'auxiliaryStars']});
 assert.equal(item(study(notEarth),'dinh-quy-23').status,'not-met');
 const badLayer=chart(4,{'Kình Dương':[4,'advancedStars'],'Tả Phụ':[4,'auxiliaryStars']});
 assert.equal(item(study(badLayer),'dinh-quy-23').status,'needs-review');
 const missing=chart(4,{'Kình Dương':[4,'auxiliaryStars']});
 assert.equal(item(study(missing),'dinh-quy-23').status,'needs-review');
});
test('Kình Dương nhập miếu uses verified natal benefic Hóa; missing four Hóa never become false certainty',()=>{
 const sites={'Kình Dương':[4,'auxiliaryStars'],'Thái Dương':[4],'Thái Âm':[5],'Vũ Khúc':[6],'Thiên Cơ':[7]};
 const assign=[['Hóa Lộc',4,'Thái Dương'],['Hóa Quyền',5,'Thái Âm'],['Hóa Khoa',6,'Vũ Khúc'],['Hóa Kỵ',7,'Thiên Cơ']];
 const c=withFourHua(chart(4,sites),assign);
 assert.equal(item(study(c),'dinh-quy-23').status,'structural-match');
 const noBenefic=withFourHua(chart(4,{...sites,'Thái Dương':[8]}),[['Hóa Lộc',8,'Thái Dương'],...assign.slice(1)]);
 assert.equal(item(study(noBenefic),'dinh-quy-23').status,'not-met');
 const withDup=withFourHua(chart(4,sites),assign);
 withDup.houses[0].tuHoa.push({name:'Hóa Lộc',star:'Thái Âm'});
 assert.equal(item(study(withDup),'dinh-quy-23').status,'needs-review');
});
