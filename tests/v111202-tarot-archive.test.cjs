'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const t=require('../packages/astrology-engine/src/tarot-rws.cjs');
const root=path.resolve(__dirname,'..');
const source=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const date='2026-10-13T12:00:00.000Z';
const fixture={version:1,deck:t.METHODS.deck,spread:'three',includeReversed:true,question:'Kiểm tra phản tư',draw:[{id:'major-00',reversed:false},{id:'cups-09',reversed:true},{id:'pentacles-14',reversed:false}]};

test('Tarot standalone JSON export-import roundtrips orientation and order, without drawing again',()=>{
 const exported=t.createReadingExport(fixture,date);
 assert.equal(exported.format,'thien-do.tarot-rws-reading');
 assert.equal(exported.version,1);assert.equal(exported.exportedAt,date);
 assert.deepEqual(t.parseReadingExport(JSON.stringify(exported)),fixture);
 assert.deepEqual(t.reading(t.parseReadingExport(JSON.stringify(exported))).positions.map(p=>p.card.id),fixture.draw.map(x=>x.id));
 assert.equal(t.reading(t.parseReadingExport(JSON.stringify(exported))).positions[1].orientation,'reversed');
});
test('one-card exports are valid and do not require account metadata',()=>{
 const original={version:1,deck:t.METHODS.deck,spread:'one',includeReversed:false,question:'',draw:[{id:'swords-03',reversed:false}]};
 const file=t.createReadingExport(original,date);
 assert.deepEqual(t.parseReadingExport(JSON.stringify(file)),original);
 assert.equal(Object.hasOwn(file,'userId'),false);
});
test('reject corrupted and untrusted JSON archives before interpretation',()=>{
 const valid=t.createReadingExport(fixture,date);
 for(const bad of ['',null,{},'{not json','[]',JSON.stringify({format:'thien-do.study-export',version:1,snapshot:fixture}),
 JSON.stringify({...valid,version:2}),JSON.stringify({...valid,snapshot:{...fixture,draw:[fixture.draw[0],fixture.draw[0],fixture.draw[2]]}}),
 JSON.stringify({...valid,snapshot:{...fixture,draw:[{id:'unknown',reversed:true},...fixture.draw.slice(1)]}}),
 JSON.stringify({...valid,snapshot:{...fixture,includeReversed:false}}),
 ' '.repeat(t.TAROT_ARCHIVE.maxBytes+1),JSON.stringify({...valid,comments:'é'.repeat(9000)})])assert.throws(()=>t.parseReadingExport(bad));
});
test('archive parser canonicalizes snapshot and discards forged calculated results',()=>{
 const malicious=t.createReadingExport(fixture,date);
 malicious.snapshot.draw[0].forged='yes';
 malicious.snapshot.displayedResult='future';
 const restored=t.parseReadingExport(JSON.stringify(malicious));
 assert.deepEqual(restored,fixture);
 assert.ok(!('forged' in restored.draw[0]));
 assert.ok(!('displayedResult' in restored));
});
test('catalog search and zero-results panel never display a card outside filters',()=>{
 const page=source('apps/web/src/app/tarot/page.tsx');
 assert.match(page,/const activeCard=catalog\.find\(/);
 assert.match(page,/activeCard\?<aside/);
 assert.match(page,/Không tìm thấy lá bài phù hợp/);
 assert.match(page,/aria-pressed=\{activeCard\?\.id===card\.id\}/);
});
test('browser import is size-limited and leaves restoring state on completion; account save remains opt-in',()=>{
 const page=source('apps/web/src/app/tarot/page.tsx');
 assert.match(page,/file\.size>TAROT_ARCHIVE\.maxBytes/);
 assert.match(page,/parseReadingExport\(raw\)/);
 assert.match(page,/createReadingExport\(result\)/);
 assert.match(page,/finally\{if\(at===revision\.current\)setRestoring\(false\);\}/);
 assert.match(page,/type="file" accept="application\/json,\.json"/);
 assert.match(page,/Nhập tệp không tự động lưu vào tài khoản/);
});

test('dependency preflight is read-only and does not disguise a globally installed tool as project dependency',()=>{
 const check=source('infrastructure/scripts/check-dependency-readiness.mjs');
 assert.match(check,/createRequire/);assert.match(check,/resolved\.startsWith\(root\+sep\)/);
 assert.match(check,/process\.exitCode=1/);
 assert.doesNotMatch(check,/execSync|spawnSync|npm install|npm ci --/);
});
