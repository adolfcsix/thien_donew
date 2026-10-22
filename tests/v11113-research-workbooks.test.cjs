'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {buildMaiHoaWorkbook,buildQimenWorkbook,buildLucHaoWorkbook,workbookMarkdown}=require('../apps/web/src/features/research-workbook/workbooks.cjs');
const cast=require('../apps/web/src/features/mai-hoa/casting.cjs');
const qimen=require('../apps/web/src/features/ky-mon/formation.cjs');
const {buildRotatingHourPlate}=require('../apps/web/src/features/ky-mon/hour-plate.cjs');
const monthly=require('./fixtures/qimen-v11112-month-strength-independent.json');
const {HEXAGRAMS}=require('../apps/web/src/features/iching/hexagrams.cjs');
const {makeNaJiaChart}=require('../apps/web/src/features/luc-hao/na-jia.cjs');
const {QUESTION_GUIDES}=require('../apps/web/src/features/luc-hao/question-evidence.cjs');
const {manualContext,STEMS,BRANCHES}=require('../apps/web/src/features/luc-hao/temporal.cjs');
const {validSnapshot,readStudyInput}=require('../apps/web/src/features/study-room/study-links.cjs');
const {parseStudyBackup,MAX_BYTES,MAX_ENTRIES}=require('../apps/web/src/features/study-room/study-backup.cjs');
test('Mai Hoa explicit independent 3/8 witness and all 64 hexagrams/six moving lines across three profiles',()=>{
 const c=cast.castByNumbers({first:3,second:8}),r=buildMaiHoaWorkbook(c);assert.equal(c.original.bits,'000101');assert.equal(c.transformed.bits,'000111');assert.equal(c.changingLine,5);
 assert.match(r.sections.find(s=>s.id==='body-use').facts[0].value,/Khôn.*hạ/);assert.equal(r.sections.length,7);
 const bits=new Set(),moves=new Set();
 for(let first=1;first<=48;first++)for(let second=1;second<=48;second++){
  const c=cast.castByNumbers({first,second}),before=JSON.stringify(c),r=buildMaiHoaWorkbook(c);bits.add(c.original.bits);moves.add(c.changingLine);assert.equal(r.status,'ready');assert.equal(r.score,null);assert.equal(JSON.stringify(c),before);assert.ok(Object.isFrozen(r.sections[0].facts));
 }
 assert.equal(bits.size,64);assert.equal(moves.size,6);
 for(let upper=1;upper<=8;upper++)for(let lower=1;lower<=8;lower++)for(let hour=1;hour<=12;hour++)assert.equal(buildMaiHoaWorkbook(cast.castByLaterHeaven({objectTrigram:upper,directionTrigram:lower,hourBranch:hour})).status,'ready');
 for(const yearBranch of [1,12])for(const lunarMonth of [1,12])for(const lunarDay of [1,30])for(const hourBranch of [1,12])assert.equal(buildMaiHoaWorkbook(cast.castByLunarTime({yearBranch,lunarMonth,lunarDay,hourBranch})).status,'ready');
});
test('Mai Hoa rejects forged layers/arithmetic and exposes pure Can/Khon variant without changing the cast',()=>{
 const c=cast.castByNumbers({first:1,second:1}),r=buildMaiHoaWorkbook(c);assert.ok(r.gaps.some(g=>g.includes('Càn/Khôn')));
 assert.throws(()=>buildMaiHoaWorkbook({...c,changingLine:6}),RangeError);assert.throws(()=>buildMaiHoaWorkbook({...c,arithmetic:{...c.arithmetic,movingSeed:999}}),RangeError);
 assert.throws(()=>buildMaiHoaWorkbook({...c,body:c.lower.id==='qian'?{...c.body,element:'Thủy'}:c.lower}),RangeError);
 assert.throws(()=>buildMaiHoaWorkbook({...c,method:'unverified'}),RangeError);
});
test('Qimen workbook uses the selected symbol layer/month table, never palace element as substitute',()=>{
 let cases=0;
 for(let term=0;term<24;term++)for(const day of [0,52])for(const branch of [0,5,6,11]){
  const base=qimen.makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:qimen.hourForDayBranch(day,branch).index}),plate=buildRotatingHourPlate(base),month=monthly.branchElements[monthly.termBranches[term]],cell=plate.byPalace[6];
  for(const [layer,symbol,element,rows] of [['door',cell.door,monthly.doorElements[cell.door],monthly.genericRows],['stem',cell.heavenStem,monthly.stemElements[cell.heavenStem],monthly.genericRows],['star',cell.star,monthly.starElements[cell.star],monthly.starRows]]){
   const selection={topic:'career',indicatorId:layer+':'+symbol,referencePalace:1,confirmed:true,questionNote:'PRIVATE-NOTE-XYZ'},before=JSON.stringify({base,plate}),r=buildQimenWorkbook(base,plate,selection);
   const wanted=rows[monthly.elementOrder.indexOf(element)][monthly.elementOrder.indexOf(month)];assert.equal(r.sections.find(s=>s.id==='selected-strength').facts[0].value,wanted);assert.equal(r.score,null);assert.equal(r.outcome,null);assert.equal(JSON.stringify({base,plate}),before);
   assert.ok(!r.gaps.some(g=>g.startsWith('Chưa lượng hóa')));assert.ok(!workbookMarkdown(r).includes('PRIVATE-NOTE-XYZ'));cases++;
  }
 }
 assert.equal(cases,576);
});
test('Qimen confirmation/no-hour/missing Can/deity and Tian Qin host retain their boundaries',()=>{
 const base=qimen.makeBaseFormation({solarTermIndex:3,dayCycleIndex:52,hourCycleIndex:qimen.hourForDayBranch(52,5).index}),plate=buildRotatingHourPlate(base),s={topic:'career',indicatorId:'door:'+plate.byPalace[3].door,referencePalace:5,confirmed:false};
 assert.equal(buildQimenWorkbook(base,plate,s).status,'awaiting-confirmation');
 const noHour=qimen.makeBaseFormation({solarTermIndex:3,dayCycleIndex:52});assert.equal(buildQimenWorkbook(noHour,null,{...s,confirmed:true}).status,'not-computed');
 const deity=buildQimenWorkbook(base,plate,{...s,indicatorId:'deity:'+plate.byPalace[3].deity,confirmed:true});assert.match(deity.sections[1].facts[0].value,/Ngoài phạm vi/);assert.ok(deity.gaps.some(g=>g.startsWith('Chưa lượng hóa')));
 const absent=buildQimenWorkbook(base,plate,{...s,indicatorId:'stem:'+plate.centerEarthStem,confirmed:true});assert.equal(absent.status,'unlocated');
 const tianQin=buildQimenWorkbook(base,plate,{...s,indicatorId:'star:Thiên Cầm',confirmed:true});assert.equal(tianQin.status,'ready');assert.ok(tianQin.gaps.some(g=>g.includes('Thiên Cầm an độc lập')));
 assert.throws(()=>buildQimenWorkbook(base,{...plate,method:'Phi Bàn'},{...s,confirmed:true}));
});
test('Luc Hao 64 hexagrams x 5 scopes preserve all visible/hidden candidates and missing calendars',()=>{
 let hidden=false,multiple=false,cases=0;
 for(const h of HEXAGRAMS)for(const [questionId,g] of Object.entries(QUESTION_GUIDES)){
  const chart=makeNaJiaChart(h),before=JSON.stringify(chart),r=buildLucHaoWorkbook(chart,{questionId,confirmedFamily:g.family,movingPositions:[1,3]});
  assert.equal(r.status,'ready');assert.equal(r.score,null);assert.equal(r.outcome,null);assert.equal(JSON.stringify(chart),before);
  const candidates=r.sections.filter(s=>s.id.startsWith('candidate-'));assert.ok(candidates.length>0);hidden||=candidates.some(s=>s.id.includes('HIDDEN'));multiple||=candidates.length>1;
  for(const c of candidates){assert.equal(c.facts.find(f=>f.label==='Tuần Không').value,'Chưa có dữ kiện');assert.equal(c.facts.find(f=>f.label==='Nguyệt Phá').value,'Chưa có dữ kiện');if(c.id.includes('HIDDEN'))assert.match(c.facts.find(f=>f.label==='Động/tĩnh').value,/Không áp dụng/);}
  cases++;
 }
 assert.equal(cases,320);assert.ok(hidden&&multiple);
});
test('Luc Hao manual calendar, forged chart, unknown scope and conflicting UTC month fail correctly',()=>{
 const chart=makeNaJiaChart(HEXAGRAMS[2]),options={questionId:'money-owned-assets',confirmedFamily:'Thê Tài',movingPositions:[1],context:manualContext({dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Dần'})};
 assert.equal(buildLucHaoWorkbook(chart,options).status,'ready');
 assert.throws(()=>buildLucHaoWorkbook({...chart,lines:chart.lines.map((l,i)=>i===0?{...l,family:'bad'}:l)},options));
 assert.throws(()=>buildLucHaoWorkbook(chart,{...options,questionId:'health'}));assert.throws(()=>buildLucHaoWorkbook(chart,{...options,confirmedFamily:'Phụ Mẫu'}));
 assert.throws(()=>buildLucHaoWorkbook(chart,{...options,instantIso:'2026-06-01T00:00:00Z'}),/mâu thuẫn/);
});
test('Client restore rejects invalid calendar symbols and all parity mismatches while keeping valid partial drafts',()=>{
 const snapshot={mode:'manual',lines:[7,8,7,8,7,8],dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Dần'};
 assert.ok(validSnapshot('luc-hao',snapshot));assert.ok(validSnapshot('luc-hao',{...snapshot,dayStem:'',dayBranch:'',monthBranch:''}));
 for(let i=0;i<10;i++)for(let j=0;j<12;j++)assert.equal(validSnapshot('luc-hao',{...snapshot,dayStem:STEMS[i],dayBranch:BRANCHES[j]}),i%2===j%2);
 for(const patch of [{dayStem:'bad'},{monthBranch:{}},{dayBranch:[]},{dayStem:'Giáp',dayBranch:'Mão'}])assert.equal(validSnapshot('luc-hao',{...snapshot,...patch}),false);
 assert.equal(readStudyInput('luc-hao','?restore=1&mode=manual&lines=7,8,7,8,7,8&dayStem=Giáp&dayBranch=Mão&monthBranch=Dần'),null);
});
test('API snapshot validation rejects invalid Can Chi pairs, matching client behavior',()=>{
 const ts=require('./helpers-typeloader.cjs'),source=fs.readFileSync(path.join(__dirname,'../apps/api/src/modules/study/study-validation.ts'),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mod={exports:{}};
 vm.runInNewContext('(function(require,module,exports){'+js+'})')(name=>{if(name==='@thiendo/astrology-engine/src/tarot-rws.cjs')return require('../packages/astrology-engine/src/tarot-rws.cjs');if(name==='@thiendo/astrology-engine/src/qimen-profile.cjs')return require('../packages/astrology-engine/src/qimen-profile.cjs');if(name==='@thiendo/astrology-engine/src/luc-hao-profile.cjs')return require('../packages/astrology-engine/src/luc-hao-profile.cjs');if(name==='@thiendo/astrology-engine/src/mai-hoa-profile.cjs')return require('../packages/astrology-engine/src/mai-hoa-profile.cjs');if(name==='@thiendo/astrology-engine/src/western-relationship.cjs')return require('../packages/astrology-engine/src/western-relationship.cjs');if(name==='@thiendo/astrology-engine/src/western-natal.cjs')return require('../packages/astrology-engine/src/western-natal.cjs');if(name==='@thiendo/astrology-engine/src/numerology-pythagorean.cjs')return require('../packages/astrology-engine/src/numerology-pythagorean.cjs');if(name.startsWith('@thiendo/astrology-engine/src/')){const file=name.slice('@thiendo/astrology-engine/src/'.length);if(!/^[a-z0-9-]+\.cjs$/.test(file))throw Error(name);return require('../packages/astrology-engine/src/'+file);}if(name==='../../common/profile-identifiers'){const source=fs.readFileSync(require('node:path').join(__dirname,'../apps/api/src/common/profile-identifiers.ts'),'utf8');const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const profile={exports:{}};vm.runInNewContext('(function(require,module,exports){'+output+'})')(n=>{if(n==='@nestjs/common')return {BadRequestException:class extends Error{}};throw Error(n)},profile,profile.exports);return profile.exports;}if(name==='@nestjs/common')return {BadRequestException:class extends Error{}};throw Error(name);},mod,mod.exports);
 const raw={mode:'manual',lines:[7,8,7,8,7,8],dayStem:'Giáp',dayBranch:'Mão',monthBranch:'Dần'};
 assert.throws(()=>mod.exports.studySnapshot('luc-hao',raw),/lục thập/);assert.equal(mod.exports.studySnapshot('luc-hao',{...raw,dayBranch:'Tý'}).dayBranch,'Tý');
});
test('Workbook exports contain proof, counterchecks and limits; integration is on the actual pages',()=>{
 const r=buildMaiHoaWorkbook(cast.castByNumbers({first:3,second:8})),md=workbookMarkdown(r);assert.match(md,/Căn cứ:/);assert.match(md,/Cần kiểm tra:/);assert.match(md,/Điều chưa hoàn tất/);assert.throws(()=>workbookMarkdown({...r,status:'not-computed'}),TypeError);
 for(const [file,marker] of [['apps/web/src/app/mai-hoa/page.tsx','WorkbookPanel report={workbook}'],['apps/web/src/features/ky-mon/question-reading-panel.tsx','WorkbookPanel report={workbook}'],['apps/web/src/app/luc-hao/page.tsx','LucHaoQuestionWorkbook chart={naJia}']])assert.ok(fs.readFileSync(path.join(__dirname,'..',file),'utf8').includes(marker));
});

test('six new practical lessons have worked cases, sources and related calculator routes',()=>{
 const lessons=require('../apps/web/src/features/academy/lessons.json');
 const practical=lessons.filter(l=>/^(mai-hoa|ky-mon|luc-hao)-/.test(l.slug));assert.equal(practical.length,6);assert.equal(lessons.length,16);
 for(const l of practical){assert.equal(l.sections.length,4);assert.ok(l.sources.length>=2);assert.ok(l.pitfalls.length>=2);assert.ok(l.quiz.length>=2);assert.ok(['/mai-hoa','/ky-mon','/luc-hao'].includes(l.route));}
});

test('study backup restore validates the whole versioned file and imports only whitelisted fields',()=>{
 const source={format:'thien-do.study-export',version:1,exportedAt:'2026-10-12T18:00:00.000Z',entries:[
  {id:'old-id',discipline:'mai-hoa',title:'  Đối chiếu 3/8  ',summary:'Ví dụ',notes:'Ghi chú',tags:['nguồn'],snapshot:{mode:'numbers',first:3,second:8,forgedResult:{score:999}},pinned:true,createdAt:'2026-10-12T00:00:00.000Z',updatedAt:'2026-10-12T01:00:00.000Z',userId:'must-not-import'}
 ]};
 const entries=parseStudyBackup(JSON.stringify(source));assert.deepEqual(entries,[{discipline:'mai-hoa',title:'Đối chiếu 3/8',summary:'Ví dụ',notes:'Ghi chú',tags:['nguồn'],snapshot:{mode:'numbers',first:3,second:8},pinned:true}]);
 assert.equal(MAX_BYTES,2*1024*1024);assert.equal(MAX_ENTRIES,200);
});
test('study backup rejects unsupported versions, malformed records, invalid study inputs and oversize imports before writes',()=>{
 const base={format:'thien-do.study-export',version:1,entries:[{discipline:'general',title:'Ghi chú',summary:'',notes:'',tags:[],snapshot:{},pinned:false}]};
 for(const patch of [{version:2},{format:'other'},{entries:[{...base.entries[0],title:'   '}]},{entries:[{...base.entries[0],tags:['A','a']}]},{entries:[{...base.entries[0],snapshot:[]}]},{entries:[{...base.entries[0],discipline:'unknown'}]},{entries:[{...base.entries[0],pinned:'yes'}]}])assert.throws(()=>parseStudyBackup(JSON.stringify({...base,...patch})));
 assert.throws(()=>parseStudyBackup('x'.repeat(MAX_BYTES+1)),/2 MB/);
 assert.throws(()=>parseStudyBackup(JSON.stringify({...base,entries:Array(MAX_ENTRIES+1).fill(base.entries[0])})),/quá 200/);
 assert.throws(()=>parseStudyBackup(JSON.stringify({...base,entries:[{...base.entries[0],discipline:'luc-hao',snapshot:{mode:'manual',lines:[7,8,7,8,7,8],dayStem:'Giáp',dayBranch:'Mão',monthBranch:'Dần'}}]})),/tham số đầu vào không hợp lệ/);
});
test('study backup UI uses one atomic endpoint and makes network ambiguity explicit',()=>{
 const page=fs.readFileSync(path.join(__dirname,'../apps/web/src/app/study/page.tsx'),'utf8');
 const client=fs.readFileSync(path.join(__dirname,'../apps/web/src/lib/api.ts'),'utf8');
 assert.match(page,/parseStudyBackup\(await file\.text\(\)\)/);
 assert.match(page,/crypto\.randomUUID\(\)/); // key must survive failed request for safe replay
 assert.match(page,/window\.confirm\(`Tạo \$\{backupEntries\.length\} hồ sơ mới/);
 assert.match(page,/studyApi\.importBackup\(restoring,backupImportId\)/);
 assert.doesNotMatch(page,/studyApi\.update\(result\.id,\{pinned:true\}\)/);
 assert.match(page,/studyApi\.importStatus\(backupImportId\)/);
 assert.match(client,/\/api\/study\/import/);
});
