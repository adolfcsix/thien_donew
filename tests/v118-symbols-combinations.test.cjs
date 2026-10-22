'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const Knowledge=require('../packages/knowledge/src/index.cjs');
const {buildPalaceReading,matchCombinations}=require('../packages/interpretation/src/index.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const guide=require('../packages/knowledge/src/star-study-guide.json');
const chart=Engine.calculate({date:'2004-08-15',calendar:'solar',leap:false,gender:'Nam',hour:8,minute:30});
const names={
  auxiliary:'Thiên Việt,Văn Khúc,Tả Phụ,Thiên Khôi,Đà La,Lộc Tồn,Hữu Bật,Kình Dương,Văn Xương',
  year:'Đào Hoa,Thiên Hỷ,Thiên Mã,Hồng Loan,Hoa Cái',
  additional:'Thiên Hình,Thiên Riêu,Thiên Y,Thiên Khốc,Thiên Hư,Tam Thai,Bát Tọa',
  advanced:'Hỏa Tinh,Linh Tinh,Địa Kiếp,Địa Không',
  traditional:'Long Trì,Phượng Các,Giải Thần,Cô Thần,Quả Tú,Thiên Quan,Thiên Phúc,Ân Quang,Thiên Quý,Thái Phụ,Phong Cáo',
  thaiTue:'Tuế Phá,Long Đức,Bạch Hổ,Phúc Đức,Điếu Khách,Trực Phù,Thái Tuế,Thiếu Dương,Tang Môn,Thiếu Âm,Quan Phù,Tử Phù',
  bacSi:'Tướng Quân,Tấu Thư,Phi Liêm,Hỷ Thần,Bệnh Phù,Đại Hao,Phục Binh,Quan Phủ,Bác Sĩ,Lực Sĩ,Thanh Long,Tiểu Hao',
  trangSinh:'Tử,Mộ,Tuyệt,Thai,Dưỡng,Tràng Sinh,Mộc Dục,Quan Đới,Lâm Quan,Đế Vượng,Suy,Bệnh'
};
function reading(c=chart,house=c.houses[0]){return buildPalaceReading({chart:c,branchIndex:house.branchIndex,guide});}
test('V11.8: 72 distinct star profiles cover every named non-main star and all 36 cycle markers',()=>{
  const all=Object.values(names).flatMap(group=>group.split(','));
  assert.equal(all.length,72);
  assert.equal(new Set(all).size,72);
  assert.deepEqual(Object.keys(Knowledge.starSymbols).sort(),[...all,'Quốc Ấn','Kiếp Sát','Phá Toái','Thiên Đức','Nguyệt Đức','Thiên Giải','Địa Giải','Thiên La','Địa Võng','Thiên Thương','Thiên Sứ','Thiên Tài','Thiên Thọ','Đường Phù','Thiên Trù','Lưu Hà','Thiên Không','Đẩu Quân'].sort());
  for(const name of all){
    const entry=Knowledge.lookupSymbol(name);
    assert.ok(entry,`Missing ${name}`);
    for(const field of ['family','motif','context','caution'])assert.ok(entry[field]?.length>(field==='family'?5:field==='motif'?7:15),`${name} missing ${field}`);
  }
  assert.equal(Knowledge.lookupSymbol('__proto__'),null);
  assert.equal(Knowledge.lookupSymbol('toString'),null);
  assert.equal(Knowledge.lookupSymbol('Không có thật'),null);
});
test('V11.8: Tuần and Triệt are editorial obstruction markers, not natal stars',()=>{
  assert.equal(Object.keys(Knowledge.obstructionSymbols).length,2);
  for(const name of ['Tuần','Triệt']){
    assert.ok(Knowledge.lookupObstruction(name).context.length>70);
    assert.equal(Knowledge.lookupSymbol(name),null);
  }
});
test('V11.55: 9 reachable same-palace / natal-transform rules use named scopes, distinct ids and meaningful cautions',()=>{
  const rules=Knowledge.combinationRules;
  assert.equal(rules.length,9);
  assert.equal(new Set(rules.map(r=>r.id)).size,9);
  for(const rule of rules){
    assert.ok(rule.title && rule.interpretation.length>=75 && rule.caution.length>=30);
    const c=rule.conditions;
    assert.ok(['same-palace','natal-transformation'].includes(c.scope));
    if(c.scope==='same-palace'){
      assert.equal(c.all.length,2);
      for(const name of c.all)assert.ok(Knowledge.lookupSymbol(name));
    } else assert.ok(['Hóa Lộc','Hóa Quyền','Hóa Khoa','Hóa Kỵ'].includes(c.name));
  }
});
test('V11.8: rule matching requires BOTH actual stars in same palace; neither one is enough',()=>{
  const h=structuredClone(chart.houses[0]);
  h.auxiliaryStars=[];h.yearStars=[];h.additionalStars=[];h.traditionalStars=[];h.advancedStars=[];h.tuHoa=[];
  for(const rule of Knowledge.combinationRules.filter(r=>r.conditions.scope==='same-palace')){
    const [a,b]=rule.conditions.all;
    h.auxiliaryStars=[a];
    assert.equal(matchCombinations(h).some(x=>x.id===rule.id),false,rule.id+' was triggered by only one star');
    h.auxiliaryStars=[a,b];
    const matching=matchCombinations(h).find(x=>x.id===rule.id);
    assert.deepEqual(matching?.evidence,{scope:'same-palace',stars:[a,b]});
    h.auxiliaryStars=[];
  }
});
test('V11.8: four natal transformations require corresponding star physically present, never standalone marker',()=>{
  const h=structuredClone(chart.houses[0]);h.auxiliaryStars=[];h.yearStars=[];h.additionalStars=[];h.traditionalStars=[];h.advancedStars=[];
  h.tuHoa=[];
  for(const rule of Knowledge.combinationRules.filter(r=>r.conditions.scope==='natal-transformation')){
    h.tuHoa=[{name:rule.conditions.name,star:'Văn Xương'}];
    h.stars=['Tham Lang'];
    assert.equal(matchCombinations(h).some(x=>x.id===rule.id),false);
    h.auxiliaryStars=['Văn Xương'];
    const matched=matchCombinations(h).find(x=>x.id===rule.id);
    assert.equal(matched?.evidence.transformation,rule.conditions.name);
    assert.deepEqual(matched?.evidence.stars,['Văn Xương']);
    h.tuHoa=[];h.auxiliaryStars=[];
  }
});
test('V11.8: every actual house has 3 cycle profiles; stars, markers and interpretations preserve source data',()=>{
  const before=JSON.stringify(chart);
  for(const house of chart.houses){
    const r=reading(chart,house);
    const expected=[...house.auxiliaryStars,...house.yearStars,...(house.additionalStars??[]),...(house.traditionalStars??[]),...(house.natalExtensionStars??[]),...(house.beneficStars??[]),...(house.positionalStars??[]),...(house.derivedStars??[]),...(house.missingStars??[]),...(house.advancedStars??[])];
    assert.deepEqual(r.supportingProfiles.map(s=>s.name),expected);
    assert.equal(r.cycleProfiles.length,3);
    assert.equal(r.coverage.unknownCycleStars.length,0);
    assert.equal(r.coverage.unknownSupportingStars.length,0);
    assert.deepEqual(r.obstructionProfiles.map(s=>s.name),house.obstructionMarkers??[]);
    for(const c of r.combinations)assert.equal(c.evidence.stars.every(n=>house.stars.includes(n)||expected.includes(n)),true);
    assert.equal(r.coverage.formalPatternMatching,false);
    assert.equal(r.coverage.completeAnnualAnalysis,false);
    assert.doesNotMatch(JSON.stringify(r),/https?:\/\/|\.json\s*→|houses\[/);
  }
  assert.equal(JSON.stringify(chart),before);
});
test('V11.8: annual-year toggle does not change natal combinations or editorial profiles',()=>{
  const a=Engine.annualOverview(chart,2026),b=Engine.annualOverview(chart,2030);
  for(const house of chart.houses){
    const ra=buildPalaceReading({chart,branchIndex:house.branchIndex,guide,annual:a,includeAnnual:true});
    const rb=buildPalaceReading({chart,branchIndex:house.branchIndex,guide,annual:b,includeAnnual:true});
    assert.deepEqual(ra.combinations,rb.combinations);
    assert.deepEqual(ra.supportingProfiles,rb.supportingProfiles);
    assert.deepEqual(ra.cycleProfiles,rb.cycleProfiles);
  }
});
test('V11.8: renderer has editable panels and no technical sources in public combinations',()=>{
  const root=join(__dirname,'..');
  const comp=readFileSync(join(root,'apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
  assert.match(comp,/reading\.combinations\.map/);
  assert.match(comp,/reading\.supportingProfiles\.map/);
  assert.match(comp,/reading\.cycleProfiles\.filter/);
  assert.match(comp,/reading\.obstructionProfiles\.map/);
  assert.match(comp,/<details key=/);
  assert.doesNotMatch(comp,/sourcePath|ruleSet|<code>|https?:\/\//);
});
