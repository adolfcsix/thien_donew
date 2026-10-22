'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=(name)=>readFileSync(join(root,name),'utf8');

test('Tarot typography inherits the shared design-system serif token',()=>{
 const css=read('apps/web/src/app/tarot/tarot.module.css');
 assert.doesNotMatch(css,/\bGeorgia\b|\bTimes New Roman\b/);
 assert.match(css,/font-family:\s*var\(--font-serif\)/);
 assert.match(css,/font:\s*[^;]*var\(--font-serif\)/);
});

test('Tarot restore releases the pending state for missing entry, malformed ID and logged-out account',()=>{
 const page=read('apps/web/src/app/tarot/page.tsx');
 // These branches were previously early returns, leaving the form disabled after an account change.
 assert.match(page,/if\(!id\|\|loading\)\{setRestoring\(false\);return;\}/);
 assert.match(page,/if\(!\/\^\[0-9a-f-\]\{36\}\$\/i\.test\(id\)\)\{setRestoring\(false\);/);
 assert.match(page,/if\(!user\)\{setRestoring\(false\);/);
 assert.match(page,/return\(\)=>controller\.abort\(\)/);
 assert.match(page,/\.finally\(\(\)=>\{if\(!controller\.signal\.aborted\)setRestoring\(false\);\}\)/);
});

test('RWS versioned spread contract and PostgreSQL schema migration stay unchanged by the UI patch',()=>{
 const data=JSON.parse(read('packages/knowledge/src/tarot-rws-78.json'));
 const engine=read('packages/astrology-engine/src/tarot-rws.cjs');
 const sql=read('infrastructure/db/009_tarot_rws_study.sql');
 assert.equal(data.cards.length,78);
 assert.match(engine,/deck:'rider-waite-smith-1909'/);
 assert.match(sql,/CHECK \(discipline IN/);
 assert.match(sql,/'tarot'/);
});
