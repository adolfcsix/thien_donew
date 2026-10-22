'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {createTwelvePalaceStudy,buildPalaceReading,auditAnnualEvidence}=require('../packages/interpretation/src/index.cjs');
const {profiles}=require('../packages/knowledge/src/twelve-palace-study.json');
const chart=()=>Engine.calculate({date:'2004-08-15',calendar:'solar',gender:'Nam',hour:8,minute:30});
const year=c=>Engine.annualOverview(c,2026);
test('V11.46 twelve unique named palace study profiles match the existing knowledge index',()=>{
 const {topics}=require('../packages/knowledge/src/palace-topics.json');
 assert.deepEqual(Object.keys(profiles).sort(),Object.keys(topics).sort());
 assert.equal(new Set(Object.values(profiles).map(x=>x.focus)).size,12);
 assert.equal(Object.values(profiles).every(x=>x.questions.length===3&&x.questions.every(q=>q.length>20)),true);
});
test('V11.46 each of the real 12 houses has its own three evidence-based questions',()=>{
 const c=chart(),before=JSON.stringify(c);
 for(const h of c.houses){const study=createTwelvePalaceStudy(c,h.branchIndex);
  assert.equal(study.palace,h.palace);assert.equal(study.status,'research-only');
  assert.deepEqual(study.steps.map(s=>s.scope),['Tọa cung','Đối cung','Năm xem']);
  assert.equal(study.annual,null);assert.equal(study.coverage.annualAudited,false);
  assert.ok(study.steps[0].evidence.includes(h.stars[0]??'Vô chính diệu'));
  assert.equal(study.expertReviewed,false);
 }
 assert.equal(JSON.stringify(c),before);
});
test('V11.46 invalid structure is rejected and unknown palace has no invented content',()=>{
 const c=chart();assert.throws(()=>createTwelvePalaceStudy({houses:[]},0),RangeError);
 c.houses[0].palace='Lạ';assert.equal(createTwelvePalaceStudy(c,0).status,'unavailable');
});
test('V11.46 checked annual records only: malformed placement is absent from all three UI summaries',()=>{
 const c=chart(),a=year(c),focus=c.houses.find(h=>h.palace==='Mệnh');
 a.luuStars.items.push({name:'Sao giả lập không hợp lệ',branch:focus.branchIndex,palace:'Sai tên cung'});
 a.luuTuHoa.items.push({name:'Hóa Kỵ',star:'Không có sao đích',branch:focus.branchIndex});
 const before=JSON.stringify([c,a]);
 const r=buildPalaceReading({chart:c,branchIndex:focus.branchIndex,annual:a,includeAnnual:true});
 assert.equal(r.period.rejectedCount>=2,true);
 assert.equal(r.period.annualStars.includes('Sao giả lập không hợp lệ'),false);
 assert.equal(r.period.annualHoa.some(x=>x.includes('Không có sao đích')),false);
 assert.equal(r.twelvePalaceStudy.steps[2].evidence.includes('bản ghi bị loại'),true);
 assert.equal(r.twelvePalaceStudy.annual.rejected,r.period.rejectedCount);
 assert.equal(r.annualEvidence.rejectedStars.length>=1,true);
 assert.equal(JSON.stringify([c,a]),before);
});
test('V11.46 annual layer stays hidden when annual toggle is off',()=>{
 const c=chart(),a=year(c),h=c.houses[0];
 const r=buildPalaceReading({chart:c,branchIndex:h.branchIndex,annual:a,includeAnnual:false});
 assert.equal(r.period,null);assert.equal(r.annualEvidence,null);
 assert.equal(r.twelvePalaceStudy.annual,null);
});
test('V11.46 copied raw annual evidence cannot be injected into palace studies of another branch',()=>{
 const c=chart(),a=year(c),e=auditAnnualEvidence(c,a,0);
 const study=createTwelvePalaceStudy(c,4,{includeAnnual:true,annualEvidence:e});
 assert.equal(study.annual,null);assert.equal(study.coverage.annualAudited,false);
});
test('V11.46 uses validated strength only, never invents missing strength',()=>{
 const c=chart(),h=c.houses.find(x=>x.stars.length>0);
 h.mainStarStrengths=[{name:h.stars[0],status:'X'}];
 const r=createTwelvePalaceStudy(c,h.branchIndex);
 assert.ok(r.steps[0].evidence.includes('chưa xác định'));
});
test('V11.46 frontend surfaces the twelve-palace study in deep mode and no raw annual items',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/palace-reading.tsx'),'utf8');
 const panel=fs.readFileSync(path.resolve(__dirname,'../apps/web/src/features/chart/components/twelve-palace-study-panel.tsx'),'utf8');
 const impl=fs.readFileSync(path.resolve(__dirname,'../packages/interpretation/src/index.cjs'),'utf8');
 assert.match(src,/level==='deep'/);assert.match(src,/TwelvePalaceStudyPanel study=\{reading.twelvePalaceStudy\}/);
 assert.match(panel,/study.steps.map/);assert.doesNotMatch(panel,/fetch\(|astrology-engine/);
 assert.doesNotMatch(impl,/annual\.luuStars\.items\.filter/);assert.doesNotMatch(impl,/annual\.luuTuHoa\.items\.filter/);
});
test('V11.46 22-fixture audit covers twelve palaces and preserves input immutability',()=>{
 const r=require('../infrastructure/scripts/audit-twelve-palace-study.cjs').audit();
 assert.equal(r.status,'PASS');assert.equal(r.stats.charts,22);assert.equal(r.stats.palaceChecks,264);
 assert.equal(r.stats.annualChecks,528);assert.equal(r.stats.uniquePalaceNames,12);
});
