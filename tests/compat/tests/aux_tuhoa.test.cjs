const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../packages/engine/auxiliary.js');
const H=require('../packages/engine/tuhoa.js');
const T=require('../packages/engine/tuvi.js');
const branch=T.BRANCHES;
function where(stars,name){return branch[stars.find(x=>x.name===name).branch];}

test('Lộc Tồn theo đủ 10 thiên can + Kình/Đà kề Lộc',()=>{
 const expected=['Dần','Mão','Tỵ','Ngọ','Tỵ','Ngọ','Thân','Dậu','Hợi','Tý'];
 for(let stem=0;stem<10;stem++){
   const a=A.calculate({yearStem:stem,lunarMonth:1,hourBranch:0});
   assert.equal(where(a,'Lộc Tồn'),expected[stem]);
   const loc=a.find(x=>x.name==='Lộc Tồn').branch;
   assert.equal(a.find(x=>x.name==='Kình Dương').branch,(loc+1)%12);
   assert.equal(a.find(x=>x.name==='Đà La').branch,(loc+11)%12);
 }
});
test('Khôi/Việt pairs by year stem in 10 independently published cases',()=>{
 const expected=[['Sửu','Mùi'],['Tý','Thân'],['Hợi','Dậu'],['Hợi','Dậu'],['Sửu','Mùi'],['Tý','Thân'],['Ngọ','Dần'],['Ngọ','Dần'],['Mão','Tỵ'],['Mão','Tỵ']];
 for(let s=0;s<10;s++){
   const a=A.calculate({yearStem:s,lunarMonth:8,hourBranch:6});
   assert.deepEqual([where(a,'Thiên Khôi'),where(a,'Thiên Việt')],expected[s]);
 }
});
test('Tả Hữu start at Thìn/Tuất, advance each of 12 lunar months',()=>{
 const ta=['Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi','Tý','Sửu','Dần','Mão'];
 const huu=['Tuất','Dậu','Thân','Mùi','Ngọ','Tỵ','Thìn','Mão','Dần','Sửu','Tý','Hợi'];
 for(let m=1;m<=12;m++){
   const a=A.calculate({yearStem:0,lunarMonth:m,hourBranch:0});
   assert.equal(where(a,'Tả Phụ'),ta[m-1]);assert.equal(where(a,'Hữu Bật'),huu[m-1]);
 }
});
test('Văn Xương at Tuất and Văn Khúc at Thìn for Tý hour; Dậu hour both Sửu',()=>{
 for(let h=0;h<12;h++){
  const a=A.calculate({yearStem:0,lunarMonth:1,hourBranch:h});
  assert.equal(a.find(x=>x.name==='Văn Xương').branch,(10-h+12)%12);
  assert.equal(a.find(x=>x.name==='Văn Khúc').branch,(4+h)%12);
 }
 const a=A.calculate({yearStem:0,lunarMonth:1,hourBranch:9});
 assert.equal(where(a,'Văn Xương'),'Sửu');assert.equal(where(a,'Văn Khúc'),'Sửu');
});
test('Every lunar month, hour and year stem generates 9 distinct names',()=>{
 for(let s=0;s<10;s++)for(let m=1;m<=12;m++)for(let h=0;h<12;h++){
  const a=A.calculate({yearStem:s,lunarMonth:m,hourBranch:h});
  assert.equal(a.length,9);
  assert.equal(new Set(a.map(x=>x.name)).size,9);
  assert.ok(a.every(x=>x.branch>=0 && x.branch<12));
 }
});
test('Four transformations resolve to a real star and valid branch for every stem',()=>{
 const allNames=new Set([...Array.from({length:12},(_,z)=>T.majorStars(z)).flat().map(s=>s.name),...A.calculate({yearStem:0,lunarMonth:1,hourBranch:0}).map(s=>s.name)]);
 for(let s=0;s<10;s++){
  const stars=[...T.majorStars(s),...A.calculate({yearStem:s,lunarMonth:2,hourBranch:5})];
  const ts=H.calculate(s,stars);
  assert.deepEqual(ts.map(x=>x.name),H.TYPES);
  assert.ok(ts.every(x=>allNames.has(x.star) && Number.isInteger(x.branch)));
 }
});
test('Table Giáp, Bính, Mậu, Nhâm includes transformed auxiliaries',()=>{
 assert.deepEqual(H.ROWS[0],['Liêm Trinh','Phá Quân','Vũ Khúc','Thái Dương']);
 assert.equal(H.ROWS[2][2],'Văn Xương');
 assert.equal(H.ROWS[4][2],'Hữu Bật');
 assert.equal(H.ROWS[8][2],'Tả Phụ');
});
test('V5 chart houses show 14 majors, 9 auxiliaries, 4 transformations',()=>{
 for(const y of [1955,1988,1990,1999,2004,2023,2026])for(const hour of [0,6,12,19,23]){
  const chart=T.calculate({date:`${y}-08-15`,hour,gender:'Nam'});
  assert.equal(chart.houses.length,12);
  assert.equal(chart.houses.flatMap(x=>x.stars).length,14);
  assert.equal(chart.houses.flatMap(x=>x.auxiliaryStars).length,9);
  assert.equal(chart.houses.flatMap(x=>x.tuHoa).length,4);
  assert.equal(chart.transformations.length,4);
  for(const h of chart.houses)for(const th of h.tuHoa){assert.ok([...h.stars,...h.auxiliaryStars].includes(th.star));}
  assert.equal(chart.coverage.fortuneCycles,true); assert.equal(chart.coverage.tieuHan,false);
 }
});
test('Input validation on new modules',()=>{
 assert.throws(()=>A.calculate({yearStem:10,lunarMonth:1,hourBranch:1}));
 assert.throws(()=>A.calculate({yearStem:1,lunarMonth:0,hourBranch:1}));
 assert.throws(()=>A.calculate({yearStem:1,lunarMonth:1,hourBranch:-1}));
 assert.throws(()=>H.calculate(10,[]));
 assert.throws(()=>H.calculate(0,[]),/Không tìm thấy/);
});
