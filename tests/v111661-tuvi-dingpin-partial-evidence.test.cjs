'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {summarizeClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');
const {summarizeClassicalResearchReadiness}=require('../packages/interpretation/src/classical-research-readiness.cjs');

function chart(gender='Nam'){
 return Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender});
}
const clone=x=>JSON.parse(JSON.stringify(x));

test('r17 audits precisely two Ding Pin candidates without misreporting 28 mapped sources',()=>{
 for(const gender of ['Nam','Nữ']){
  const c=chart(gender),before=JSON.stringify(c),r=auditClassicalPatternCandidates(c);
  assert.deepEqual(r.pendingEvidence.map(x=>x.id),['dinh-ban-01','dinh-ban-02']);
  assert.equal(r.assessed,28);
  assert.equal(r.records.length,28);
  assert.equal(r.records.some(x=>x.id==='dinh-ban-01'||x.id==='dinh-ban-02'),false);
  const back=summarizeClassicalResearchReadiness(summarizeClassicalCatalog(r.records.map(x=>x.id)));
  assert.equal(back.counts.pending,6);
  assert.equal(back.counts.total,21);
  assert.equal(JSON.stringify(c),before);
  for(const item of r.pendingEvidence){
   assert.equal(item.status,'partial-evidence');
   assert.equal(item.sourceCriterionVerified,false);
   assert.equal(item.scope,'natal-research');
   assert.ok(item.sourceUrl.includes('/blob/7922285d947b36610e7e31c232d8f1e2a0d0871d/lib/ziwei/patterns-dingpin.ts'));
   assert.ok(Object.isFrozen(item));
   assert.ok(Object.isFrozen(item.checks));
   assert.equal(item.checks.at(-1).state,'unknown');
   assert.match(item.checks.at(-1).detail,/Không Vong/);
  }
 }
});

test('r17 source strictness: two killers must coincide and six void stars remain unresolved',()=>{
 const r=auditClassicalPatternCandidates(chart());
 const one=r.pendingEvidence.find(x=>x.id==='dinh-ban-01');
 const two=r.pendingEvidence.find(x=>x.id==='dinh-ban-02');
 assert.ok(one.checks.some(x=>/Liêm Trinh/.test(x.label)));
 assert.ok(two.checks.some(x=>/Lộc Tồn hoặc Hóa Lộc/.test(x.label)));
 assert.ok(two.checks.some(x=>/Địa Không và Địa Kiếp/.test(x.label)));
 assert.ok(two.checks.every(x=>!x.label.includes('Địa Không hoặc Địa Kiếp')));
 assert.equal(one.checks.at(-1).state,'unknown');
 assert.equal(two.checks.at(-1).state,'unknown');
 assert.equal(r.obstructionAudit.verified,true);
});

test('r17 falsified advanced star placement cannot count as proof of Không/Kiếp',()=>{
 const broken=clone(chart());
 broken.advancedStars[0].branch=(broken.advancedStars[0].branch+1)%12;
 const r=auditClassicalPatternCandidates(broken);
 const candidate=r.pendingEvidence.find(x=>x.id==='dinh-ban-02');
 const check=candidate.checks.find(x=>x.label.includes('Địa Không và Địa Kiếp'));
 assert.equal(r.fireAudit.verified,false);
 assert.equal(check.state,'unknown');
 assert.equal(candidate.sourceCriterionVerified,false);
});

test('r17 missing, duplicated or cross-layer natal evidence never becomes a source verdict',()=>{
 const c=chart();
 const corrupted=clone(c);
 const h=corrupted.houses.find(x=>x.palace==='Mệnh');
 h.stars.push('Liêm Trinh');
 const result=auditClassicalPatternCandidates(corrupted);
 const one=result.pendingEvidence.find(x=>x.id==='dinh-ban-01');
 assert.equal(one.checks[0].state,'unknown');
 assert.equal(one.sourceCriterionVerified,false);
 assert.equal(result.assessed,28);
});

test('r17 uses the existing catalog control and never promotes pending checks to assessed',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 const evaluator=fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/classical-pattern-research.cjs'),'utf8');
 assert.match(ui,/pendingById=useMemo/);
 assert.match(ui,/Đã đối chiếu một phần · chưa ánh xạ/);
 assert.match(ui,/Trong nguồn, hai tên cũ 截路\/空亡 được chuẩn hóa thành 截空\/副截/);
 assert.match(ui,/Tuần\/Triệt không được coi là tương đương/);
 assert.match(evaluator,/const pendingEvidence=Object.freeze/);
 assert.doesNotMatch(evaluator,/records\.push\(.*dinh-ban-0[12]/);
});
