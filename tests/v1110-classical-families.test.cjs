'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {classicalFamilies}=require('../packages/knowledge/src/index.cjs');
const {matchClassicalFamilies,buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const chart=Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
const focusIndex=chart.houses.find(x=>x.palace==='Mệnh').branchIndex;
const positions=[focusIndex,(focusIndex+4)%12,(focusIndex+8)%12,(focusIndex+6)%12];
function house(c,i){return c.houses.find(h=>h.branchIndex===i);}
function cleared(){const c=structuredClone(chart);for(const h of c.houses){
  for(const key of ['stars','auxiliaryStars','yearStars','additionalStars','advancedStars','mainStarStrengths','tuHoa','obstructionMarkers'])h[key]=[];
}return c;}
function place(c,star,at,type='stars',status='M'){const h=house(c,at);h[type].push(star);if(type==='stars')h.mainStarStrengths.push({name:star,status});}
function arrange(rule){const c=cleared();rule.conditions.requiredStars.forEach((name,i)=>place(c,name,positions[i%positions.length]));
  if(!rule.conditions.focusAny.some(name=>house(c,focusIndex).stars.includes(name))){
    // Sát Phá Tham starts with Thất Sát and is already at focus; defensive for future catalogue.
    const target=rule.conditions.focusAny.find(name=>rule.conditions.requiredStars.includes(name));
    assert.ok(target);place(c,target,focusIndex);
  }
  return c;
}
test('V11.10: four independent documented star-family definitions are structurally sound',()=>{
 assert.equal(classicalFamilies.length,4);
 assert.equal(new Set(classicalFamilies.map(r=>r.id)).size,4);
 for(const rule of classicalFamilies){
  const c=rule.conditions;
  assert.equal(c.focusPalace,'Mệnh');assert.equal(c.scope,'tu-chinh');
  assert.ok(c.requiredStars.length>=2);assert.equal(new Set(c.requiredStars).size,c.requiredStars.length);
  assert.ok(c.focusAny.some(s=>c.requiredStars.includes(s)));
  assert.ok(c.supportAny.length>0&&c.reviewAny.length>0);
  assert.ok(rule.interpretation.length>80&&rule.boundary.length>80);
 }
});
test('V11.10: recognize all four star families in the correct focus and report real placements',()=>{
 for(const rule of classicalFamilies){
  const c=arrange(rule),match=matchClassicalFamilies(c,focusIndex).find(x=>x.id===rule.id);
  assert.ok(match,rule.id);
  assert.deepEqual(match.evidence.placements.map(p=>p.star),rule.conditions.requiredStars);
  assert.ok(match.evidence.placements.every(x=>positions.includes(x.branchIndex)));
  assert.equal(match.evidence.placements[0].relation,'Tọa cung');
  assert.equal(match.assessment,'Khớp bộ sao, chưa xác định thành cách');
 }
});
test('V11.10: cannot mistake a non-Mệnh focus for an established Mệnh configuration',()=>{
 for(const rule of classicalFamilies)assert.deepEqual(matchClassicalFamilies(arrange(rule),positions[1]),[]);
});
test('V11.10: absent required star never triggers a family match',()=>{
 for(const rule of classicalFamilies){
  const c=arrange(rule),star=rule.conditions.requiredStars.at(-1);
  for(const h of c.houses)h.stars=h.stars.filter(s=>s!==star);
  assert.ok(!matchClassicalFamilies(c,focusIndex).some(x=>x.id===rule.id),rule.id);
 }
});
test('V11.10: a required star outside Tam phương Tứ chính never counts',()=>{
 for(const rule of classicalFamilies){
  const c=arrange(rule),star=rule.conditions.requiredStars.at(-1);
  for(const h of c.houses)h.stars=h.stars.filter(s=>s!==star);
  place(c,star,(focusIndex+1)%12);
  assert.ok(!matchClassicalFamilies(c,focusIndex).some(x=>x.id===rule.id),rule.id);
 }
});
test('V11.10: a forged main star in a supporting array cannot qualify a pattern',()=>{
 const r=classicalFamilies[0],c=arrange(r);
 const target=r.conditions.requiredStars[0];house(c,focusIndex).stars=[];
 place(c,target,focusIndex,'auxiliaryStars');
 assert.ok(!matchClassicalFamilies(c,focusIndex).some(x=>x.id===r.id));
});
test('V11.10: duplicate natal positions cause safe rejection, not arbitrary placement choice',()=>{
 for(const r of classicalFamilies){const c=arrange(r);place(c,r.conditions.requiredStars[0],(focusIndex+1)%12);
  assert.ok(!matchClassicalFamilies(c,focusIndex).some(x=>x.id===r.id),r.id);
 }
});
test('V11.10: supports and counterevidence are listed without an invented fortune score',()=>{
 const r=classicalFamilies[0],c=arrange(r);
 place(c,'Tả Phụ',positions[1],'auxiliaryStars');place(c,'Địa Kiếp',positions[2],'advancedStars');
 const match=matchClassicalFamilies(c,focusIndex).find(x=>x.id===r.id);
 assert.ok(match.evidence.supports.some(x=>x.star==='Tả Phụ'));
 assert.ok(match.evidence.reviewSignals.some(x=>x.star==='Địa Kiếp'));
 assert.equal(match.assessment,'Có yếu tố cần xét thêm');
 assert.ok(!('score' in match));
});
test('V11.10: weak main-star position, Tuần/Triệt and valid natal Hóa Kỵ require further review',()=>{
 const r=classicalFamilies[1],c=arrange(r);
 const h=house(c,focusIndex);h.mainStarStrengths[0].status='H';h.obstructionMarkers.push('Tuần');
 h.tuHoa.push({name:'Hóa Kỵ',star:h.stars[0]});
 const m=matchClassicalFamilies(c,focusIndex).find(x=>x.id===r.id);
 assert.deepEqual(new Set(m.evidence.reviewSignals.map(x=>x.type)),new Set(['trạng thái chính tinh','án ngữ','Tứ Hóa năm sinh']));
});
test('V11.10: invalid Hóa Kỵ targets and annual stars must never leak into natal evaluation',()=>{
 const r=classicalFamilies[2],c=arrange(r),h=house(c,focusIndex);
 h.tuHoa=[{name:'Hóa Kỵ',star:'Sao không có thực'}];
 const before=matchClassicalFamilies(c,focusIndex).find(x=>x.id===r.id);
 h.annualStars=['Địa Kiếp'];h.luuStars=['Hỏa Tinh'];
 assert.deepEqual(before,matchClassicalFamilies(c,focusIndex).find(x=>x.id===r.id));
 assert.equal(before.evidence.reviewSignals.length,0);
});
test('V11.10: missing main star strength is marked unknown, not assumed good',()=>{
 const r=classicalFamilies[0],c=arrange(r),h=house(c,focusIndex);
 h.mainStarStrengths=[];
 const m=matchClassicalFamilies(c,focusIndex).find(x=>x.id===r.id);
 assert.equal(m.evidence.uncertainStrength,true);
 assert.equal(m.evidence.strengths[0].status,null);
});
test('V11.10: interpretation stays unchanged across viewing years and never mutates chart',()=>{
 const before=JSON.stringify(chart),annual=Engine.annualOverview(chart,2026);
 for(const h of chart.houses){
  const a=buildPalaceReading({chart,branchIndex:h.branchIndex});
  const b=buildPalaceReading({chart,branchIndex:h.branchIndex,annual,includeAnnual:true});
  assert.deepEqual(a.classicalMatches,b.classicalMatches);
  assert.equal(a.coverage.classicalFamiliesReviewed,4);
  assert.equal(a.coverage.classicalFamiliesConfirmed,false);
 }
 assert.equal(JSON.stringify(chart),before);
});
test('V11.10: invalid charts and invalid selected branches fail closed',()=>{
 assert.throws(()=>matchClassicalFamilies({},0),RangeError);
 assert.throws(()=>matchClassicalFamilies(chart,12),RangeError);
 const c=structuredClone(chart);c.houses[0].branchIndex=c.houses[1].branchIndex;
 assert.throws(()=>matchClassicalFamilies(c,focusIndex),RangeError);
});
test('V11.10: UI only prints user-facing evidence and never rule identifiers or internal sources',()=>{
 const p=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
 assert.match(p,/reading\.classicalMatches\.map/);assert.match(p,/evidence\.reviewSignals/);
 assert.doesNotMatch(p,/>\s*\{item\.id\}\s*</);assert.doesNotMatch(p,/rule\.source|sourceUrl/);
});
