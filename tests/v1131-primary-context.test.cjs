'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildPrimaryPalaceContext,buildPalaceReading}=require('../packages/interpretation/src/index.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const K=require('../packages/knowledge/src/index.cjs');
const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,gender:'Nam',calendar:'solar'});
const clone=()=>structuredClone(chart);
const focus=c=>c.houses[0];
const clear=(c)=>{
  for(const h of c.houses){h.stars=[];h.auxiliaryStars=[];h.yearStars=[];h.additionalStars=[];h.traditionalStars=[];h.natalExtensionStars=[];h.beneficStars=[];h.advancedStars=[];h.mainStarStrengths=[];h.tuHoa=[];h.obstructionMarkers=[];}
  return c;
};
const create=()=>{const c=clear(clone());c.houses[0].stars=['Tử Vi'];return c;};

test('V11.31 actual engine: each contextual record is anchored to a present main star and correct house',()=>{
  for(const h of chart.houses){
    const got=buildPrimaryPalaceContext(chart,h.branchIndex);
    assert.equal(got.length,h.stars.filter(s=>K.lookupPrimaryStarPalace(s,h.palace)).length);
    for(const r of got){
      assert.ok(h.stars.includes(r.star));assert.equal(r.palace,h.palace);
      assert.equal(r.focus,K.lookupPrimaryStarPalace(r.star,h.palace).focus);
      assert.equal(r.quality.independentValidation,false);
      assert.equal(r.evidence.tamHop.length,2);
      assert.equal(r.evidence.opposite.branchIndex,(h.branchIndex+6)%12);
    }
  }
});
test('V11.31 never generates an interpretation for stars absent from focus palace',()=>{
  const c=create();c.houses[0].stars=[];
  assert.deepEqual(buildPrimaryPalaceContext(c,c.houses[0].branchIndex),[]);
  assert.deepEqual(buildPalaceReading({chart:c,branchIndex:c.houses[0].branchIndex}).primaryPalaceContexts,[]);
});
test('V11.31 natal year-origin stars remain support; annual overlays are not included',()=>{
  const c=create();const h=focus(c);h.yearStars=['Tả Phụ'];
  const b=buildPrimaryPalaceContext(c,h.branchIndex)[0];
  assert.deepEqual(b.evidence.samePalaceSupportingStars,['Tả Phụ']);
  const annual={year:2026,luuStars:{items:[{name:'Hữu Bật',branch:h.branchIndex}]},luuTuHoa:{items:[]}};
  const x=buildPalaceReading({chart:c,branchIndex:h.branchIndex,annual,includeAnnual:true});
  assert.deepEqual(x.primaryPalaceContexts[0].evidence.samePalaceSupportingStars,['Tả Phụ']);
});
test('V11.31 only matches natal Tứ Hóa targeting a present main star',()=>{
  const c=create();const h=focus(c);
  h.tuHoa=[{name:'Hóa Lộc',star:'Thiên Cơ'},{name:'Hóa Quyền',star:'Tử Vi'},{name:'Hóa Khoa',star:'Tử Vi'},{name:'Lưu Hóa Kỵ',star:'Tử Vi'}];
  assert.deepEqual(buildPrimaryPalaceContext(c,h.branchIndex)[0].evidence.natalTransformations,['Hóa Quyền','Hóa Khoa']);
});
test('V11.31 tam hop / opposition evidence corresponds to known 12-house chart',()=>{
  const c=create();const h=focus(c);
  c.houses.find(x=>x.branchIndex===(h.branchIndex+4)%12).stars=['Thiên Cơ'];
  c.houses.find(x=>x.branchIndex===(h.branchIndex+6)%12).stars=['Thiên Phủ'];
  const r=buildPrimaryPalaceContext(c,h.branchIndex)[0];
  assert.ok(r.evidence.tamHop.some(item=>item.mainStars.includes('Thiên Cơ')));
  assert.ok(r.evidence.opposite.mainStars.includes('Thiên Phủ'));
  assert.ok(!r.evidence.samePalaceMainStars.includes('Thiên Phủ'));
});
test('V11.31 conservative strength handling - do not extrapolate unknown or conflicting codes',()=>{
  const c=create();const h=focus(c);
  h.mainStarStrengths=[{name:'Tử Vi',status:'H'}];
  assert.equal(buildPrimaryPalaceContext(c,h.branchIndex)[0].evidence.strength.label,'Hãm');
  h.mainStarStrengths=[{name:'Tử Vi',status:'?' }];
  assert.equal(buildPrimaryPalaceContext(c,h.branchIndex)[0].evidence.strength.code,null);
  h.mainStarStrengths=[{name:'Tử Vi',status:'V'},{name:'Tử Vi',status:'H'}];
  assert.equal(buildPrimaryPalaceContext(c,h.branchIndex)[0].evidence.strength.label,'Chưa xác định');
});
test('V11.31 only factual Tuần/Triệt markers and no good/bad grade',()=>{
  const c=create();const h=focus(c);h.obstructionMarkers=['Tuần','Triệt','invented'];
  const r=buildPrimaryPalaceContext(c,h.branchIndex)[0];
  assert.deepEqual(r.evidence.obstructionMarkers,['Tuần','Triệt']);
  assert.equal(Object.hasOwn(r,'fortuneScore'),false);
});
test('V11.31 source chart is never mutated by synthesis',()=>{
  const before=JSON.stringify(chart);
  chart.houses.forEach(h=>buildPalaceReading({chart,branchIndex:h.branchIndex}));
  assert.equal(JSON.stringify(chart),before);
});
test('V11.31 safe fall-through on unknown main stars and valid prototype names',()=>{
  const c=create();focus(c).stars=['__proto__','Tử Vi','Tử Vi'];
  const r=buildPrimaryPalaceContext(c,focus(c).branchIndex);
  assert.equal(r.length,1);assert.equal(r[0].star,'Tử Vi');
});
test('V11.31 chart geometry fails closed rather than fabricate relations',()=>{
  const c=create();c.houses.pop();
  assert.throws(()=>buildPrimaryPalaceContext(c,0),RangeError);
  assert.throws(()=>buildPrimaryPalaceContext(chart,12),RangeError);
});
test('V11.31 integration: deep-mode UI uses data-bound context, not generated static prose',()=>{
  const fs=require('node:fs');const path=require('node:path');
  const p=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
  const c=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/primary-context-panel.tsx'),'utf8');
  assert.ok(p.includes('<PrimaryContextPanel records={reading.primaryPalaceContexts}/>'));
  assert.ok(c.includes('record.evidence.tamHop.map'));
  assert.ok(c.includes('record.quality')===false); // don't display development metadata to viewers
});

test('V11.31 editorial audit distinguishes 168 pairs from original scholarly essays',()=>{
  const audit=require('../infrastructure/scripts/audit-primary-context.cjs').runAudit();
  assert.equal(audit.pairCount,168);
  assert.equal(audit.errors.length,0);
  assert.equal(audit.countsAreNotIndependentScholarlyTreatises,true);
  assert.ok(audit.fields.tradeoff.exactRepeats>0);
});
