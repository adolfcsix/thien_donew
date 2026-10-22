'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');
const extract=(source,pattern,label)=>{
 const match=source.match(pattern);
 assert.ok(match,`Cannot identify ${label}; update the contract test deliberately if the declaration moves`);
 return new Set([...match[1].matchAll(/['"]([a-z]+(?:-[a-z]+)*)['"]/g)].map(m=>m[1]));
};
const backend=()=>extract(read('apps/api/src/modules/study/study-validation.ts'),/export const STUDY_DISCIPLINES\s*=\s*\[([^\]]+)\]/,'API disciplines');
const frontend=()=>extract(read('apps/web/src/lib/api.ts'),/function studyRecord\([\s\S]*?\[([^\]]+)\]\.includes\(String\(value\.discipline\)\)/,'client API response validator');
const backup=()=>extract(read('apps/web/src/features/study-room/study-backup.cjs'),/const DISCIPLINES\s*=\s*new Set\(\[([^\]]+)\]\)/,'backup disciplines');
const types=()=>extract(read('apps/web/src/features/study-room/study-types.ts'),/export type StudyDiscipline\s*=\s*([^;]+);/,'UI study types');
test('API, client response validator, backup and UI types agree on every supported study discipline',()=>{
 const expected=[...backend()].sort();
 assert.ok(expected.length>=14,'Expected the full study catalog, not a partial fallback');
 for(const [name,values] of [['frontend',frontend()],['backup',backup()],['types',types()]])
  assert.deepEqual([...values].sort(),expected,`${name} silently rejects a valid API discipline`);
});
test('Bát Tự snapshot remains available in all study protocols',()=>{
 for(const set of [backend(),frontend(),backup(),types()])assert.ok(set.has('bazi'));
 assert.match(read('apps/web/src/app/study/page.tsx'),/['"]bazi['"]\s*:/);
});
