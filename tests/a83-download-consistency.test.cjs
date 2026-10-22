'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const cases=[
 ['features/tarot/tarot-depth.tsx','THIEN_DO_TAROT_LUAN_SAU.json'],
 ['features/tarot/tarot-history.tsx','THIEN_DO_TAROT_SO_SANH_V11_125.json'],
 ['features/chart/components/deep-chart-reading.tsx','THIEN_DO_LUAN_SAU_${report.year}_V11_123.json'],
 ['features/chart/components/star-system-matrix.tsx','thien-do-star-layer-matrix.json'],
 ['features/chart/components/twelve-palace-ledger.tsx','thien-do-12-cung-${annual.year}.csv'],
 ['features/chart/components/palace-study-workbench.tsx','thien-do-so-tay-cung-${selectedBranch}-'],
 ['features/huyen-giai/answer-tools.tsx','thien-do-luan-giai-'],
 ['features/ky-mon/depth-panel.tsx','thien-do-qimen-v1.json'],
 ['features/luc-hao/depth-panel.tsx','thien-do-luc-hao-v1.json'],
 ['features/mai-hoa/evidence-panel.tsx','thien-do-mai-hoa-v1.json'],
 ['features/dai-luc-nham/depth-panel.tsx','thien-do-dai-luc-nham-method-profile.json'],
 ['features/taiyi/taiyi-panel.tsx','thien-do-thai-at-v11133.json'],
 ['features/research-workbook/workbook-panel.tsx','thien-do-${report.discipline}-ho-so.md'],
 ['features/western/western-depth.tsx','thien-do-western-depth.json'],
 ['app/western-astrology/relationship/page.tsx','filename);'],
 ['features/chart/components/whole-chart-viewport.tsx','thien-do-la-so-day-du-${annual.year}.svg'],
 ['app/thiet-ban/page.tsx','thien-do-thiet-ban-v11146-research.json'],
 ['features/western/celestial-frame.tsx','thien-do-'],
];

test('A83: every migrated export uses the same attached-link lifecycle',()=>{
 for(const [file,filename] of cases){
  const src=fs.readFileSync(path.join(root,'apps/web/src',file),'utf8');
  assert.match(src,/import\s*\{\s*downloadBlobFile\s*\}\s*from\s*['"]@\/lib\/download-blob['"]/,file);
  assert.match(src,/downloadBlobFile\(/,file);
  assert.ok(src.includes(filename),`${file}: must preserve export filename`);
  assert.doesNotMatch(src,/URL\.revokeObjectURL\(/,`${file}: stray local URL revocation`);
 }
});

test('A83: Tarot and Tu Vi exports preserve UTF-8 JSON payloads and a newline',()=>{
 for(const file of ['features/tarot/tarot-depth.tsx','features/tarot/tarot-history.tsx','features/chart/components/deep-chart-reading.tsx']){
  const src=fs.readFileSync(path.join(root,'apps/web/src',file),'utf8');
  assert.match(src,/JSON\.stringify\([^;]*null,2\)\+'\\n'/,file);
  assert.match(src,/application\/json;charset=utf-8/,file);
 }
});

test('A83: CSV and SVG exports retain MIME types',()=>{
 const csv=fs.readFileSync(path.join(root,'apps/web/src/features/chart/components/twelve-palace-ledger.tsx'),'utf8');
 const svg=fs.readFileSync(path.join(root,'apps/web/src/features/chart/components/whole-chart-viewport.tsx'),'utf8');
 assert.match(csv,/text\/csv;charset=utf-8/);
 assert.match(svg,/image\/svg\+xml;charset=utf-8/);
});

test('A83: shared helper guarantees anchor removal and revocation even if click fails',()=>{
 const src=fs.readFileSync(path.join(root,'apps/web/src/lib/download-blob.ts'),'utf8').replace('export function downloadBlobFile(blob: Blob, filename: string): void','function downloadBlobFile(blob, filename)');
 for(const fail of [false,true]){
  const operations=[];const deferred=[];
  const URL={createObjectURL:()=>{operations.push('create');return 'blob:export';},revokeObjectURL:()=>operations.push('revoke')};
  const document={body:{appendChild:()=>operations.push('attach')},createElement:()=>({click(){operations.push('click');if(fail)throw Error('download blocked')},remove(){operations.push('remove')}})};
  const window={setTimeout:(f,ms)=>{assert.ok(ms>=2000);deferred.push(f);operations.push('defer')}};
  const download=Function('URL','document','window',`${src}\nreturn downloadBlobFile;`)(URL,document,window);
  if(fail)assert.throws(()=>download({},'a.json'),/download blocked/);else download({},'a.json');
  assert.deepEqual(operations,['create','attach','click','remove','defer']);
  deferred[0]();assert.deepEqual(operations.at(-1),'revoke');
 }
});
