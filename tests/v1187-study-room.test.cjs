'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('./helpers-typeloader.cjs');
const root=path.resolve(__dirname,'..');
const text=p=>fs.readFileSync(path.join(root,p),'utf8');
const {studyHref,readStudyInput,validSnapshot}=require('../apps/web/src/features/study-room/study-links.cjs');
function validation(){
 const source=text('apps/api/src/modules/study/study-validation.ts');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};
 class BadRequestException extends Error {}
 const fn=vm.runInNewContext('(function(require,module,exports){'+js+'})',{Buffer});
 const shared={exports:{}};
 const sharedSource=ts.transpileModule(text('apps/api/src/common/profile-identifiers.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext('(function(require,module,exports){'+sharedSource+'})')(
  name=>{if(name==='@nestjs/common')return {BadRequestException};throw Error(name);},shared,shared.exports);
 fn(name=>{if(name==='../../common/profile-identifiers')return shared.exports;if(name==='@thiendo/astrology-engine/src/tarot-rws.cjs')return require('../packages/astrology-engine/src/tarot-rws.cjs');if(name==='@thiendo/astrology-engine/src/qimen-profile.cjs')return require('../packages/astrology-engine/src/qimen-profile.cjs');if(name==='@thiendo/astrology-engine/src/luc-hao-profile.cjs')return require('../packages/astrology-engine/src/luc-hao-profile.cjs');if(name==='@thiendo/astrology-engine/src/mai-hoa-profile.cjs')return require('../packages/astrology-engine/src/mai-hoa-profile.cjs');if(name==='@thiendo/astrology-engine/src/western-relationship.cjs')return {METHOD:'western-relationship-v11.128',validateRelationshipInput:()=>{throw new Error('Requires separate western relationship fixture')}};if(name==='@thiendo/astrology-engine/src/western-natal.cjs')return {validateInput:()=>{throw new Error('Requires separate western natal fixture')}};if(name==='@thiendo/astrology-engine/src/numerology-pythagorean.cjs')return require('../packages/astrology-engine/src/numerology-pythagorean.cjs');if(name==='@thiendo/astrology-engine/src/taiyi-depth.cjs')return require('../packages/astrology-engine/src/taiyi-depth.cjs');if(name==='@thiendo/astrology-engine/src/ha-lac-source.cjs')return require('../packages/astrology-engine/src/ha-lac-source.cjs');if(name==='@thiendo/astrology-engine/src/tieban-source.cjs')return require('../packages/astrology-engine/src/tieban-source.cjs');if(name==='@thiendo/astrology-engine/src/traditional-calendar-audit.cjs')return require('../packages/astrology-engine/src/traditional-calendar-audit.cjs');if(name==='@nestjs/common')return {BadRequestException};if(name.startsWith('@thiendo/astrology-engine/src/'))return require('../packages/astrology-engine/src/'+name.split('/').at(-1));throw Error(name);},mod,mod.exports);
 return mod.exports;
}
const v=validation();
const fixtures={
 'mai-hoa':{mode:'time',yearBranch:7,lunarMonth:10,lunarDay:12,hourBranch:9},
 'luc-hao':{mode:'calendar',lines:[6,7,8,9,6,9],date:'2026-10-12'},
 'ky-mon':{mode:'auto',withHour:true,date:'2026-10-12',hour:8,minute:55,dayBoundary:'midnight'},
 'phong-thuy':{degrees:247.5},
};
for(const [discipline,snapshot] of Object.entries(fixtures)){
 test(`Save/reopen ${discipline} restores reproducible source inputs`,()=>{
  const saved=v.studySnapshot(discipline,snapshot);
  assert.deepEqual(JSON.parse(JSON.stringify(saved)),snapshot);
  assert.ok(validSnapshot(discipline,snapshot));
  const link=studyHref(discipline,snapshot);
  assert.ok(link.startsWith('/'+discipline+'?'),link);
  assert.deepEqual({...readStudyInput(discipline,new URL('https://thiendo.invalid'+link).search)},snapshot);
 });
}
test('Both Mai Hoa protocols are reconstructible',()=>{
 const s={mode:'numbers',first:1,second:1000000};
 assert.deepEqual({...readStudyInput('mai-hoa',new URL('https://app.invalid'+studyHref('mai-hoa',s)).search)},s);
});
test('Lục Hào manual stem/branch fields preserve inputs',()=>{
 const s={mode:'manual',lines:[7,8,7,8,7,8],dayStem:'Giáp',dayBranch:'Tý',monthBranch:'Thìn'};
 assert.deepEqual(JSON.parse(JSON.stringify(v.studySnapshot('luc-hao',s))),s);
 assert.deepEqual({...readStudyInput('luc-hao',new URL('https://app.invalid'+studyHref('luc-hao',s)).search)},s);
});
test('Kỳ Môn manual method restores independent inputs',()=>{
 const s={mode:'manual',withHour:false,solarTermIndex:23,dayCycleIndex:59,hourBranchIndex:11};
 assert.deepEqual(JSON.parse(JSON.stringify(v.studySnapshot('ky-mon',s))),s);
 assert.deepEqual({...readStudyInput('ky-mon',new URL('https://app.invalid'+studyHref('ky-mon',s)).search)},s);
});
test('Bad dates, incomplete hexagrams, invalid directions cannot be saved',()=>{
 assert.throws(()=>v.studySnapshot('luc-hao',{mode:'manual',lines:[6,7,8]}));
 assert.throws(()=>v.studySnapshot('ky-mon',{...fixtures['ky-mon'],date:'2026-02-30'}));
 assert.throws(()=>v.studySnapshot('phong-thuy',{degrees:Infinity}));
 assert.throws(()=>v.studySnapshot('mai-hoa',{mode:'numbers',first:0,second:3}));
 assert.equal(readStudyInput('luc-hao','?restore=1&mode=calendar&lines=6,7,8,0,9,9'),null);
 assert.equal(studyHref('phong-thuy',{degrees:-90}),'/study');
});
test('Do not accept unknown routes, invalid/missing restore tokens',()=>{
 assert.equal(studyHref('invalid',{}),'/study');
 assert.equal(readStudyInput('phong-thuy','?degrees=30'),null);
 assert.equal(readStudyInput('mai-hoa','?restore=1&mode=numbers&first=%3Cscript%3E&second=9'),null);
 assert.equal(studyHref('general',{}),'/study');
});
test('Untrusted calculation result, client ownership and arbitrary tags cannot be stored',()=>{
 const draft=v.createStudyEntry({discipline:'mai-hoa',title:'  Quẻ  ','summary':'note',notes:'memo',tags:['A'],snapshot:{...fixtures['mai-hoa'],owner:'someone',stars:['injected']}});
 assert.equal(draft.title,'Quẻ');assert.equal(draft.snapshot.owner,undefined);assert.equal(draft.snapshot.stars,undefined);
 assert.throws(()=>v.createStudyEntry({...draft,tags:['A','a']}));
 assert.throws(()=>v.createStudyEntry({...draft,tags:['a','b','c','d','e','f']}));
 assert.throws(()=>v.createStudyEntry({...draft,notes:'x'.repeat(3001)}));
 assert.throws(()=>v.createStudyEntry({...draft,title:' '}));
});
test('Patch cannot override snapshot, owner or discipline',()=>{
 assert.throws(()=>v.patchStudyEntry({user_id:'attacker'}));
 assert.throws(()=>v.patchStudyEntry({snapshot:{degrees:1}}));
 assert.throws(()=>v.patchStudyEntry({}));
 assert.throws(()=>v.patchStudyEntry({pinned:'true'}));
 assert.deepEqual({...v.patchStudyEntry({pinned:true,notes:'OK'})},{pinned:true,notes:'OK'});
});
test('Database schema enforces cascading ownership, bounds and efficient indexes',async()=>{
 const sql=text('infrastructure/db/004_study_entries.sql');
 for(const k of ['REFERENCES users(id) ON DELETE CASCADE','CHECK (char_length(notes) <= 3000)','study_entries_owner_recent_idx','study_entries_owner_pinned_idx','JSONB'])assert.ok(sql.includes(k),k);
 // Migration enumeration moved into the immutable-chain verifier. Exercise its
 // behavior rather than pinning the obsolete inline implementation.
 const {verifyMigrationChain,defaultDbDir,defaultBaselinePath}=await import('../infrastructure/scripts/lib/migration-chain-integrity.mjs');
 const chain=verifyMigrationChain(defaultDbDir,defaultBaselinePath);
 assert.ok(chain.files.includes('004_study_entries.sql'));
 assert.equal(chain.total,chain.frozen);
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'study-migrations-'));
 try{
  fs.cpSync(defaultDbDir,scratch,{recursive:true});
  fs.unlinkSync(path.join(scratch,'004_study_entries.sql'));
  assert.throws(()=>verifyMigrationChain(scratch,defaultBaselinePath),/incomplete/);
 }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 assert.match(text('infrastructure/scripts/migrate.mjs'),/verifyMigrationChain\(dir,defaultBaselinePath\)/);
});
test('CRUD database queries scope every read/edit/delete by the authenticated owner',()=>{
 const source=text('apps/api/src/modules/study/study.service.ts');
 for(const q of ['WHERE user_id=$1 ORDER BY','WHERE id=$1 AND user_id=$2','DELETE FROM study_entries WHERE id=$1 AND user_id=$2','SELECT pg_advisory_xact_lock'])assert.ok(source.includes(q),q);
 assert.ok((source.match(/await this\.auth\.required\(req\)/g)||[]).length>=5);
 assert.match(source,/createStudyEntry\(body\)/);
 assert.match(source,/patchStudyEntry\(body\)/);
});
test('Save is explicit; account switching unmounts private view and aborts stale reads',()=>{
 const source=text('apps/web/src/app/study/page.tsx');
 assert.match(source,/key=\{user\.id\}/);
 assert.match(source,/request\.current\?\.abort\(\)/);
 assert.match(source,/exportRequest\.current\?\.abort\(\)/);
 assert.match(text('apps/web/src/features/study-room/save-study.tsx'),/window\.confirm/);
 assert.doesNotMatch(source,/dangerouslySetInnerHTML/);
});
test('Four live calculators support save and exact input restoration',()=>{
 for(const name of ['mai-hoa','luc-hao','ky-mon','phong-thuy']){
  const source=text(`apps/web/src/app/${name}/page.tsx`);
  assert.match(source,/<SaveStudy draft=\{(?:savedDraft|result&&)/,name);
  assert.match(source,new RegExp(`readStudyInput\\('${name}'`));
 }
});
test('Existing natal chart collection remains the source of truth for birth data',()=>{
 assert.match(text('apps/web/src/app/study/page.tsx'),/href="\/collection"/);
 assert.match(text('apps/web/src/lib/navigation.ts'),/href: '\/study'/);
 assert.match(text('apps/api/src/app.module.ts'),/StudyController/);
});
test('Styles are locally scoped and mobile/keyboard/reduced motion are considered',()=>{
 const css=text('apps/web/src/features/study-room/study-room.module.css');
 assert.match(css,/:focus-visible/);assert.match(css,/@media\(max-width:660px\)/);assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/(^|\n)\s*(body|html|:root)\s*\{/);
});

test('CORS accepts PATCH for editing personal records under origin policy',()=>{
 const source=text('apps/api/src/main.ts');
 assert.match(source,/methods: \[\'GET\', \'POST\', \'PATCH\', \'DELETE\', \'OPTIONS\'\]/);
 assert.match(source,/isTrustedMutation/);
});

function loadService(){
 const input=text('apps/api/src/modules/study/study.service.ts');
 const js=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
 const mod={exports:{}};
 class HttpError extends Error{}
 const fn=vm.runInNewContext('(function(require,module,exports){'+js+'})',{Buffer});
 fn(name=>{
  if(name==='@thiendo/astrology-engine/src/tarot-rws.cjs')return require('../packages/astrology-engine/src/tarot-rws.cjs');if(name==='@thiendo/astrology-engine/src/qimen-profile.cjs')return require('../packages/astrology-engine/src/qimen-profile.cjs');if(name==='@thiendo/astrology-engine/src/luc-hao-profile.cjs')return require('../packages/astrology-engine/src/luc-hao-profile.cjs');if(name==='@thiendo/astrology-engine/src/mai-hoa-profile.cjs')return require('../packages/astrology-engine/src/mai-hoa-profile.cjs');if(name==='@thiendo/astrology-engine/src/western-relationship.cjs')return {METHOD:'western-relationship-v11.128',validateRelationshipInput:()=>{throw new Error('Requires separate western relationship fixture')}};if(name==='@thiendo/astrology-engine/src/western-natal.cjs')return {validateInput:()=>{throw new Error('Requires separate western natal fixture')}};if(name==='@thiendo/astrology-engine/src/numerology-pythagorean.cjs')return require('../packages/astrology-engine/src/numerology-pythagorean.cjs');if(name==='@nestjs/common')return {Injectable:()=>x=>x,ConflictException:HttpError,NotFoundException:HttpError};
  if(name==='node:crypto')return {randomUUID:()=> '33333333-3333-4333-8333-333333333333',createHash:require('node:crypto').createHash};
  if(name==='../../common/identifiers')return {assertChartId:id=>{if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('bad id');return id;}};
  if(name==='./study-validation')return v;
  throw Error('Unknown dependency '+name);
 },mod,mod.exports);
 return mod.exports.StudyService;
}
const VALID_ID='33333333-3333-4333-8333-333333333333';
test('Service lists only records of authenticated owner (mock database contract)',async()=>{
 const StudyService=loadService();const calls=[];
 const db={query:async(q,args)=>{calls.push({q,args});return {rows:[]};}};
 const auth={required:async()=>({id:'user-123'})};
 const instance=new StudyService(db,auth);
 assert.equal((await instance.list({})).entries.length,0);
 assert.equal(calls[0].args[0],'user-123');
 assert.match(calls[0].q,/WHERE user_id=\$1/);
});
test('Service rejects cross-owner lookup and delete without touching other users',async()=>{
 const StudyService=loadService();const calls=[];
 const db={query:async(q,args)=>{calls.push({q,args});return {rows:[],rowCount:0};}};
 const auth={required:async()=>({id:'user-456'})};
 const instance=new StudyService(db,auth);
 await assert.rejects(instance.get({},VALID_ID),/Không tìm thấy/);
 await assert.rejects(instance.remove({},VALID_ID),/Không tìm thấy/);
 assert.ok(calls.every(x=>x.args[1]==='user-456'&&x.q.includes('user_id=$2')));
});
test('Concurrent archive saves use per-owner advisory locking and enforce cap',async()=>{
 const StudyService=loadService();const commands=[];
 const db={transaction:async(fn)=>fn({query:async(q,args)=>{
  commands.push({q,args});return q.includes('COUNT(*)')?{rows:[{n:'200'}]}:{rows:[]};
 }})};
 const auth={required:async()=>({id:'user-locked'})};
 const instance=new StudyService(db,auth);
 await assert.rejects(instance.create({},{discipline:'general',title:'Memo',summary:'',notes:'',tags:[],snapshot:{}}),/Tối đa 200/);
 assert.ok(commands[0].q.includes('pg_advisory_xact_lock'));
 assert.equal(commands.length,2,'reject without insert');
});
test('Updates never allow client to change owner or saved original calculations',async()=>{
 const StudyService=loadService();let last;
 const db={query:async(q,args)=>{last={q,args};return {rowCount:1};}};
 const instance=new StudyService(db,{required:async()=>({id:'true-owner'})});
 await instance.update({},VALID_ID,{notes:'Điều kiện bổ sung',pinned:true});
 assert.match(last.q,/UPDATE study_entries SET/);
 assert.match(last.q,/WHERE id=\$1 AND user_id=\$2/);
 assert.ok(!last.q.includes('snapshot='));
 assert.equal(last.args[1],'true-owner');
 await assert.rejects(instance.update({},VALID_ID,{snapshot:{degrees:90}}),/Chỉ được sửa/);
});

test('Atomic archive import validates version, cap and every entry before database writes',async()=>{
 const StudyService=loadService();let transactions=0;
 const db={transaction:async()=>{transactions++;throw Error('should not start');}};
 const instance=new StudyService(db,{required:async()=>({id:'owner-a'})});
 const entry={discipline:'general',title:'A',notes:'',summary:'',tags:[],snapshot:{},pinned:false};
 for(const backup of [null,{}, {format:'wrong',version:1,entries:[entry]},
   {format:'thien-do.study-export',version:2,entries:[entry]},
   {format:'thien-do.study-export',version:1,importId:VALID_ID,entries:[]},
   {format:'thien-do.study-export',version:1,importId:VALID_ID,entries:[entry,{...entry,pinned:'yes'}]},
   {format:'thien-do.study-export',version:1,importId:VALID_ID,entries:Array(201).fill(entry)}]){
  await assert.rejects(instance.importBackup({},backup));
 }
 assert.equal(transactions,0,'invalid archive must never reach a transaction');
});
test('Atomic archive import rolls back on the second insert and preserves existing owner records',async()=>{
 const StudyService=loadService(),original=[{id:'preexisting',user_id:'owner-a'}];let rows=[...original],rollbacks=0,insertCount=0;
 const db={transaction:async work=>{
  const before=rows.slice();
  try {return await work({query:async(sql,args)=>{
   if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
   if(sql.includes('study_import_receipts') && sql.includes('SELECT'))return {rows:[]};
   if(sql.includes('COUNT(*)'))return {rows:[{n:String(rows.filter(r=>r.user_id===args[0]).length)}]};
   if(sql.includes('INSERT INTO study_entries')){
    insertCount++;if(insertCount===2)throw Error('simulated insert failure');
    rows.push({id:args[0],user_id:args[1],title:args[3],pinned:args[8]});
    return {rows:[]};
   }
   throw Error('unexpected SQL');
  }});}catch(err){rollbacks++;rows=before;throw err;}
 }};
 const entry={discipline:'general',title:'Study',summary:'',notes:'',tags:[],snapshot:{forged:true},pinned:true};
 const svc=new StudyService(db,{required:async()=>({id:'owner-a'})});
 await assert.rejects(svc.importBackup({}, {format:'thien-do.study-export',version:1,importId:VALID_ID,entries:[entry,entry]}),/simulated insert failure/);
 assert.equal(rollbacks,1);assert.equal(insertCount,2);
 assert.deepEqual(rows,original,'none of the batch may survive transaction failure');
});
test('Atomic import preserves pins, generates new identifiers, scopes owner, and enforces quota under lock',async()=>{
 const StudyService=loadService(),queries=[],rows=[];
 const db={transaction:async work=>work({query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql.includes('study_import_receipts') && sql.includes('SELECT'))return {rows:[]};
   if(sql.includes('COUNT(*)'))return {rows:[{n:String(rows.length)}]};
  if(sql.includes('INSERT INTO study_entries'))rows.push(args);
  return {rows:[]};
 }})};
 const svc=new StudyService(db,{required:async()=>({id:'owner-unique'})});
 const base={discipline:'mai-hoa',title:'  Kiểm chứng  ',summary:'',notes:'',tags:[],pinned:true,snapshot:{mode:'numbers',first:3,second:8,forgedResult:123},id:'STOLEN',user_id:'another-owner'};
 const result=await svc.importBackup({}, {format:'thien-do.study-export',version:1,importId:VALID_ID,entries:[base]});
 assert.equal(result.imported,1);assert.equal(rows[0][1],'owner-unique');assert.equal(rows[0][3],'Kiểm chứng');assert.equal(rows[0][8],true);
 assert.equal(JSON.parse(rows[0][7]).forgedResult,undefined);assert.notEqual(rows[0][0],'STOLEN');
 assert.match(queries[0].sql,/pg_advisory_xact_lock/);
 rows.push(...Array.from({length:199},(_,i)=>['fake-'+i]));
 await assert.rejects(svc.importBackup({}, {format:'thien-do.study-export',version:1,importId:'44444444-4444-4444-8444-444444444444',entries:[base]}),/chỗ trống/);
 assert.equal(rows.length,200);
});
test('Study import HTTP route is separate, limited to 2 MiB, and uses one authenticated DB transaction',()=>{
 const controller=text('apps/api/src/modules/study/study.controller.ts');
 const main=text('apps/api/src/main.ts');
 const service=text('apps/api/src/modules/study/study.service.ts');
 assert.match(controller,/@Post\('import'\) @HttpCode\(HttpStatus\.CREATED\) importBackup/);
 assert.ok(main.includes("app.use('/api/study/import', json({ limit: '2mb' }));"));
 assert.ok(main.includes("app.use(json({ limit: '80kb' }));"));
 const start=service.indexOf('async importBackup('),end=service.indexOf('async update(',start);
 const imported=service.slice(start,end);
 assert.match(imported,/await this\.auth\.required\(req\)/);
 assert.match(imported,/validateStudyImport\(body\)/);
 assert.match(imported,/this\.db\.transaction/);
 assert.match(imported,/pg_advisory_xact_lock/);
 assert.match(imported,/INSERT INTO study_entries/);
 assert.doesNotMatch(imported,/this\.db\.query\(|\bDELETE FROM\b|\bUPDATE study_entries\b/);
});


test('V11.114.2: durable idempotency receipt prevents duplicates even after quota is exhausted',async()=>{
 const StudyService=loadService();
 const entries=[],receipts=new Map();let inserts=0,transactions=0;
 const auth={required:async req=>({id:req.owner})};
 const db={
  query:async(sql,args)=>{
   assert.match(sql,/WHERE user_id=\$1 AND import_id=\$2/);
   const record=receipts.get(`${args[0]}:${args[1]}`);
   return {rows:record?[{imported_count:record.imported_count}]:[]};
  },
  transaction:async work=>{
   transactions++;
   const previous=entries.slice(),previousReceipts=new Map(receipts);
   try {return await work({query:async(sql,args)=>{
    if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
    if(sql.includes('FROM study_import_receipts')){
     const row=receipts.get(`${args[0]}:${args[1]}`);
     return {rows:row?[row]:[]};
    }
    if(sql.includes('COUNT(*)'))return {rows:[{n:String(entries.filter(e=>e.owner===args[0]).length)}]};
    if(sql.includes('INSERT INTO study_entries')){
     inserts++;entries.push({owner:args[1],id:args[0],title:args[3]});return {rows:[]};
    }
    if(sql.includes('INSERT INTO study_import_receipts')){
     receipts.set(`${args[0]}:${args[1]}`,{payload_sha256:args[2],imported_count:args[3]});return {rows:[]};
    }
    throw Error('Unexpected SQL '+sql);
   }});}
   catch(e){entries.splice(0,entries.length,...previous);receipts.clear();for(const [k,v] of previousReceipts)receipts.set(k,v);throw e;}
  }
 };
 const svc=new StudyService(db,auth),ownerA={owner:'owner-a'},ownerB={owner:'owner-b'};
 const id=VALID_ID,entry={discipline:'general',title:'Original',summary:'',notes:'',tags:[],snapshot:{},pinned:true};
 const archive={format:'thien-do.study-export',version:1,importId:id,entries:[entry]};
 const first=await svc.importBackup(ownerA,archive);
 assert.equal(first.imported,1);assert.equal(first.replayed,false);assert.equal(inserts,1);
 // Simulates client disconnect after successful COMMIT and another request.
 assert.equal((await svc.importStatus(ownerA,id)).committed,true);
 assert.equal((await svc.importStatus(ownerA,id)).imported,1);
 await assert.rejects(svc.importStatus(ownerB,id),/Chưa có biên nhận/);
 entries.push(...Array.from({length:199},(_,i)=>({owner:'owner-a',id:String(i)})));
 const again=await svc.importBackup(ownerA,archive);
 assert.equal(again.replayed,true);assert.equal(again.imported,1);
 assert.equal(inserts,1,'replay must not create rows even at capacity');
 await assert.rejects(svc.importBackup(ownerA,{...archive,entries:[{...entry,title:'Tampered'}]}),/nội dung khác/);
 assert.equal(inserts,1);
 // Same id is independently scoped per owner, never leaks the first owner's receipt.
 const other=await svc.importBackup(ownerB,archive);
 assert.equal(other.replayed,false);assert.equal(inserts,2);
 assert.equal((await svc.importStatus(ownerB,id)).imported,1);
 assert.equal(receipts.size,2);
 assert.equal(transactions,4);
});

test('V11.114.2: invalid import UUID cannot touch DB and no receipt is written on partial failure',async()=>{
 const StudyService=loadService();let transactions=0,receipts=0;
 const svc=new StudyService({transaction:async work=>{
  transactions++;
  return work({query:async(sql,args)=>{
   if(sql.includes('pg_advisory_xact_lock'))return {rows:[]};
   if(sql.includes('FROM study_import_receipts'))return {rows:[]};
   if(sql.includes('COUNT(*)'))return {rows:[{n:'0'}]};
   if(sql.includes('INSERT INTO study_entries'))throw Error('forced failure');
   if(sql.includes('INSERT INTO study_import_receipts')){receipts++;return {rows:[]};}
   throw Error(sql);
  }});
 }},{required:async()=>({id:'a'})});
 const entry={discipline:'general',title:'Original',summary:'',notes:'',tags:[],snapshot:{},pinned:false};
 await assert.rejects(svc.importBackup({}, {format:'thien-do.study-export',version:1,importId:'not-a-uuid',entries:[entry]}),/Mã yêu cầu/);
 assert.equal(transactions,0);
 await assert.rejects(svc.importBackup({}, {format:'thien-do.study-export',version:1,importId:VALID_ID,entries:[entry]}),/forced failure/);
 assert.equal(receipts,0);
});

test('V11.114.2: readiness, migration, and client retry reuse the durable receipt',()=>{
 const schema=text('infrastructure/db/005_study_import_receipts.sql');
 assert.match(schema,/PRIMARY KEY \(user_id, import_id\)/);
 assert.match(schema,/REFERENCES users\(id\) ON DELETE CASCADE/);
 assert.match(text('apps/api/src/modules/health/health.controller.ts'),/study_import_receipts/);
 assert.match(text('infrastructure/scripts/e2e-db-policy.mjs'),/study_receipts_table/);
 const service=text('apps/api/src/modules/study/study.service.ts');
 assert.match(service,/INSERT INTO study_import_receipts/);
 assert.match(text('apps/api/src/modules/study/study.controller.ts'),/@Get\('import\/:id'\)/);
 const ui=text('apps/web/src/app/study/page.tsx');
 assert.match(ui,/crypto.randomUUID\(\)/);
 assert.match(ui,/studyApi.importStatus\(backupImportId\)/);
 assert.match(ui,/studyApi.importBackup\(restoring,backupImportId\)/);
});
