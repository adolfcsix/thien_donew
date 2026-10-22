'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const tarot=require('../packages/astrology-engine/src/tarot-rws.cjs');
const {CARDS,METHODS,secureIndex,newSpread,validateSpreadSnapshot,reading}=tarot;
const snapshot={version:1,deck:METHODS.deck,spread:'three',includeReversed:true,question:'Tôi nên hiểu thêm điều gì?',draw:[{id:'major-00',reversed:false},{id:'cups-02',reversed:true},{id:'swords-10',reversed:false}]};
const read=rel=>readFileSync(path.join(root,rel),'utf8');
test('RWS 1909 exactly 22 major (0-21) and four 14-card suits with canonical identities',()=>{
 assert.equal(CARDS.length,78);assert.equal(new Set(CARDS.map(c=>c.id)).size,78);
 assert.deepEqual(CARDS.filter(x=>x.arcana==='major').map(x=>x.number),Array.from({length:22},(_,i)=>i));
 for(const s of ['wands','cups','swords','pentacles'])assert.deepEqual(CARDS.filter(x=>x.suit===s).map(x=>x.number),Array.from({length:14},(_,i)=>i+1));
 assert.equal(CARDS[8].name,'Strength');assert.equal(CARDS[11].name,'Justice');
});
test('every card has original Vietnamese two-orientation text and a distinct reflection',()=>{
 for(const c of CARDS){for(const k of ['upright','reversed','reflection'])assert.ok(c[k].length>12,`${c.id}: ${k}`);assert.notEqual(c.upright,c.reversed);}
 assert.equal(new Set(CARDS.map(c=>c.reflection)).size,78);
});
test('snapshot is strictly versioned and canonical after validation',()=>{
 const restored=validateSpreadSnapshot({...snapshot,unknown:'discard',draw:snapshot.draw.map(c=>({...c,forgedResult:true}))});
 assert.deepEqual(restored,snapshot);assert.deepEqual(validateSpreadSnapshot(restored),restored);
 const r=reading(restored);assert.deepEqual(r.positions.map(p=>p.label),['Bối cảnh','Góc nhìn bổ sung','Hướng hành động']);
 assert.equal(r.positions[1].meaning,CARDS.find(x=>x.id==='cups-02').reversed);assert.equal(r.positions[1].orientation,'reversed');
});
test('reject wrong versions, duplicate cards, made-up IDs, bad orientations and invalid shape',()=>{
 const fail=[{},null,[],{...snapshot,version:2},{...snapshot,deck:'marseille'},{...snapshot,spread:'ten'},{...snapshot,includeReversed:'false'},{...snapshot,question:'x'.repeat(241)},{...snapshot,draw:[]},{...snapshot,draw:[snapshot.draw[0],snapshot.draw[0],snapshot.draw[2]]},{...snapshot,draw:[{id:'made-up',reversed:false},...snapshot.draw.slice(1)]},{...snapshot,draw:[{id:'major-00',reversed:'false'},...snapshot.draw.slice(1)]},{...snapshot,includeReversed:false}];
 for(const input of fail)assert.throws(()=>validateSpreadSnapshot(input));
});
test('one-card and three-card spread draws never repeat; no reversed when disabled',()=>{
 for(let i=0;i<100;i++){
  const spread=newSpread({spread:'three',question:'a'});assert.equal(spread.draw.length,3);
  assert.equal(new Set(spread.draw.map(x=>x.id)).size,3);assert.ok(spread.draw.every(x=>!x.reversed));
  assert.equal(newSpread({spread:'one',includeReversed:true}).draw.length,1);
 }
});
test('secureIndex rejects modulo-bias region and has bounded loop',()=>{
 let n=0;const bytes=()=>new Uint8Array([++n===1?255:201]);
 assert.equal(secureIndex(78,bytes),201%78);assert.equal(n,2);
 assert.throws(()=>secureIndex(0));assert.throws(()=>secureIndex(79));
 assert.throws(()=>secureIndex(78,()=>new Uint8Array([255])),/Không lấy được/);
 assert.throws(()=>secureIndex(78,()=>[1]),/không hợp lệ/);
});
test('deterministic injected entropy makes readable non-repeating audit fixture',()=>{
 const rng=(()=>{let counter=1;return()=>new Uint8Array([(counter++*37)%234]);})();
 const a=newSpread({spread:'three',includeReversed:true,question:'  Test  '},rng);
 assert.equal(a.question,'Test');assert.equal(a.draw.length,3);assert.equal(new Set(a.draw.map(x=>x.id)).size,3);
 assert.deepEqual(reading(a).draw,a.draw);
});
test('common user account, backups, links, backend, SQL and discovery recognize Tarot',()=>{
 const source=read('apps/api/src/modules/study/study-validation.ts');assert.match(source,/validateTarot\(input\)/);
 const constraint=read('infrastructure/db/009_tarot_rws_study.sql');assert.match(constraint,/tarot/);
 const ready=read('apps/api/src/modules/health/health.controller.ts');assert.match(ready,/LIKE '%tarot%'/);
 for(const p of ['apps/web/src/features/study-room/study-backup.cjs','apps/web/src/features/study-room/study-links.cjs','apps/web/src/lib/navigation.ts','apps/web/src/app/study/page.tsx','apps/web/src/lib/api.ts'])assert.match(read(p),/tarot/,p);
 // Exercise real backup/link source with isolated unrelated Natal/Numerology imports: 
 // the offline Tarot test must not depend on a planetary ephemeris or IANA tzdb.
 const isolated=relative=>{
  const target={exports:{}};
  const wrapper=vm.runInNewContext(`(function(require,module,exports){${read(relative)}\n})`,{URLSearchParams});
  wrapper(id=>id.includes('tarot-rws')?tarot:{validateInput:x=>x},target,target.exports);
  return target.exports;
 };
 const backup=isolated('apps/web/src/features/study-room/study-backup.cjs');
 const links=isolated('apps/web/src/features/study-room/study-links.cjs');
 const parsed=backup.parseStudyBackup({format:'thien-do.study-export',version:1,entries:[{discipline:'tarot',title:'RWS',summary:'',notes:'',tags:[],snapshot,pinned:false}]});
 assert.deepEqual(JSON.parse(JSON.stringify(parsed[0].snapshot)),snapshot);assert.equal(links.validSnapshot('tarot',snapshot),true);
 assert.equal(links.validSnapshot('tarot',{...snapshot,draw:[snapshot.draw[0]]}),false);
});
test('Tarot appears as exactly one implemented Western discipline and app route',()=>{
 const d=JSON.parse(read('packages/knowledge/src/research-disciplines.json'));const match=d.records.filter(x=>x.id==='tarot');assert.equal(match.length,1);assert.equal(match[0].route,'/tarot');
 const page=read('apps/web/src/app/tarot/page.tsx');assert.match(page,/SaveStudy/);assert.match(page,/studyApi\.get/);assert.match(page,/aria-live="polite"/);
 const css=read('apps/web/src/app/tarot/tarot.module.css');assert.match(css,/@media\(max-width:640px\)/);assert.match(css,/prefers-reduced-motion/);
});
