'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=path=>fs.readFileSync(require('node:path').join(root,path),'utf8');
const sites=[
 ['apps/web/src/app/numerology/page.tsx', 'thien-do-pythagoras.json'],
 ['apps/web/src/app/western-astrology/page.tsx', 'thien-do-natal.json'],
 ['apps/web/src/app/good-days/page.tsx','thien-do-ngay-theo-truc-'],
 ['apps/web/src/app/collection/page.tsx','thien-do-la-so-'],
];

test('A82 client exports reuse shared helper rather than synchronously revoke their object URLs',()=>{
 for(const [file,filename] of sites){
  const source=read(file);
  assert.match(source,/import\s*\{\s*downloadBlobFile\s*\}\s*from\s*['"]@\/lib\/download-blob['"]/,file);
  assert.match(source,/downloadBlobFile\(blob,|downloadBlobFile\(new Blob\(/,file);
  assert.ok(source.includes(filename),`${file}: expected file name missing`);
  assert.doesNotMatch(source,/URL\.revokeObjectURL\(url\)/,`${file}: URL revoked prematurely`);
 }
});

test('A82 helper attaches anchor and defers revocation on success and thrown click',()=>{
 const source=read('apps/web/src/lib/download-blob.ts').replace('export function downloadBlobFile(blob: Blob, filename: string): void','function downloadBlobFile(blob, filename)');
 for(const shouldFail of [false,true]){
  const order=[],timers=[];
  const URL={createObjectURL:()=>{order.push('created');return 'blob:a82';},revokeObjectURL:value=>order.push('revoked:'+value)};
  const document={body:{appendChild:()=>order.push('attached')},createElement:()=>({click(){order.push('clicked');if(shouldFail)throw Error('blocked');},remove(){order.push('removed');}})};
  const window={setTimeout:(fn,ms)=>{assert.ok(ms>=1000);timers.push(fn);order.push('scheduled');}};
  const fn=Function('URL','document','window',`${source}\nreturn downloadBlobFile;`)(URL,document,window);
  if(shouldFail)assert.throws(()=>fn({},'test.json'),/blocked/);else fn({},'test.json');
  assert.deepEqual(order,['created','attached','clicked','removed','scheduled']);
  timers[0]();assert.equal(order.at(-1),'revoked:blob:a82');
 }
});

test('A82 Western Natal invalidates old detailed reading as soon as birth input changes',()=>{
 const source=read('apps/web/src/app/western-astrology/page.tsx');
 assert.match(source,/function update<[\s\S]*?setResult\(null\);setReport\(null\);setMessage\(''\);}/);
 assert.match(source,/\{report&&result&&<WesternDepth/);
 assert.match(source,/setResult\(null\);setReport\(null\);setInput\(initial\);/);
 assert.match(source,/if\(!controller\.signal\.aborted&&version===revision\.current\)setMessage\(error\.message\)/);
});

test('A82 saved Numerology request cannot display errors after user edits inputs',()=>{
 const source=read('apps/web/src/app/numerology/page.tsx');
 assert.match(source,/\.catch\(error=>\{if\(!controller\.signal\.aborted&&version===revision\.current\)setMessage\(error\.message\);\}\)/);
});
