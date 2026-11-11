'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {orKnown,andKnown,asKnown}=require('../packages/interpretation/src/classical-evidence-logic.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {auditClassicalDingZaSourceBridge}=require('../packages/interpretation/src/classical-dingza-source-bridge.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const condition=chart=>auditClassicalPatternCandidates(chart).pendingEvidence
 .find(x=>x.id==='dinh-ban-02').checks[0];

test('r31: exhaustive three-valued OR and AND truth tables never confuse missing data with false',()=>{
 const options=[true,false,null];
 const orTable=[[true,true,true],[true,false,null],[true,null,null]];
 const andTable=[[true,false,null],[false,false,false],[null,false,null]];
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){
  assert.equal(orKnown(options[i],options[j]),orTable[i][j]);
  assert.equal(andKnown(options[i],options[j]),andTable[i][j]);
 }
 assert.equal(orKnown(true,undefined),true);
 assert.equal(orKnown(false,undefined),null);
 assert.equal(orKnown(false,'false'),null);
 assert.equal(orKnown(false,0),null);
 assert.equal(orKnown(),null);
 assert.equal(andKnown(),null);
 assert.equal(asKnown('true'),null);
 assert.equal(asKnown(1),null);
 assert.equal(asKnown(false),false);
});

test('r31: actual natal Lộc or Hóa Lộc at Mệnh is sufficient; tampered Tứ Hóa never becomes false evidence',()=>{
 let locTrue=0,bothFalse=0,oneUnknown=0,checked=0;
 for(let year=1984;year<=1993;year++)for(const gender of ['Nam','Nữ'])
  for(const hour of [0,8,16]){
   const chart=Engine.calculate({date:year+'-08-15',hour,minute:0,
    calendar:'solar',gender});
   const before=JSON.stringify(chart);
   const menh=chart.houses.find(h=>h.palace==='Mệnh')?.branchIndex;
   const loc=chart.auxiliaries.find(x=>x.name==='Lộc Tồn')?.branch;
   const hua=chart.transformations.find(x=>x.name==='Hóa Lộc')?.branch;
   assert.ok(Number.isInteger(menh)&&Number.isInteger(loc)&&Number.isInteger(hua));
   const want=loc===menh||hua===menh?'met':'not-met';
   const result=auditClassicalPatternCandidates(chart);
   const actual=result.pendingEvidence.find(x=>x.id==='dinh-ban-02');
   assert.equal(actual.checks[0].state,want,year+' '+gender+' '+hour);
   assert.equal(actual.checks[1].label.includes('Địa Không và Địa Kiếp'),true);
   assert.equal(actual.checks[2].state,'unknown');
   assert.equal(actual.sourceCriterionVerified,false);
   assert.equal(JSON.stringify(chart),before);
   const corrupted=clone(chart);
   corrupted.tuHoaRuleSet='invalid-source-year-rule';
   const corruptBefore=JSON.stringify(corrupted);
   const partial=condition(corrupted);
   if(loc===menh){
    locTrue++;
    assert.equal(partial.state,'met','Verified Lộc Tồn alone must be sufficient');
   }else{
    oneUnknown++;
    assert.equal(partial.state,'unknown','False Lộc Tồn + unknown Hóa Lộc is unknown');
   }
   if(want==='not-met')bothFalse++;
   assert.equal(JSON.stringify(corrupted),corruptBefore);
   checked++;
  }
 assert.equal(checked,60);
 assert.ok(locTrue>0,'synthetic matrix must exercise true OR unknown');
 assert.ok(oneUnknown>0,'synthetic matrix must exercise false OR unknown');
 assert.ok(bothFalse>0,'synthetic matrix must exercise false OR false');
});

test('r31: no premium, classical verdict, or 31-of-49 mapped count is promoted',()=>{
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:0,
  calendar:'solar',gender:'Nữ'});
 const natal=auditClassicalPatternCandidates(chart);
 const period=auditClassicalDingZaSourceBridge(chart);
 const catalog=summarizeClassicalCatalog([...natal.records.map(x=>x.id),...period.mappedIds]);
 assert.equal(catalog.assessed,31);
 assert.equal(catalog.referenceTotal,49);
 assert.equal(natal.records.length,28);
 assert.equal(period.mappedIds.length,3);
 assert.ok(natal.pendingEvidence.every(x=>x.sourceCriterionVerified===false&&x.status==='partial-evidence'));
 assert.equal(natal.pendingEvidence.some(x=>x.id==='dinh-ban-02'),true);
 assert.equal(catalog.groups[2].entries.find(x=>x.id==='dinh-ban-02').assessed,false);
});

test('r31: production implementation uses the same fail-closed helper and retains original source blockers',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/classical-pattern-research.cjs'),'utf8');
 assert.match(code,/const \{orKnown\}=require\('\.\/classical-evidence-logic\.cjs'\)/);
 assert.match(code,/dingPin02LocEvidence=orKnown\(natalLocAtMenh,natalHuaLocAtMenh\)/);
 assert.match(code,/check\('Lộc Tồn hoặc Hóa Lộc nguyên cục tọa Mệnh'/);
 assert.match(code,/Không Vong theo quy tắc an sao và tên sao nguồn được thẩm định/);
 assert.doesNotMatch(code,/sourceCriterionVerified:true/);
});
