'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exportUtil=read('apps/web/src/lib/download-blob.ts');
const chartUI=read('apps/web/src/features/chart/components/chart-result.tsx');
const study=read('apps/web/src/app/study/page.tsx');
const tarot=read('apps/web/src/app/tarot/page.tsx');

function makeBrowser(clickShouldThrow=false){
 const events=[],timers=[],links=[];
 const URL={createObjectURL:()=>{events.push('created');return 'blob:unique';},revokeObjectURL:url=>events.push('revoke:'+url)};
 const document={body:{appendChild:a=>{links.push(a);events.push('attached');}},createElement:tag=>{
  assert.equal(tag,'a');return {click(){events.push('click');if(clickShouldThrow)throw Error('Download click rejected');},remove(){events.push('removed');}};
 }};
 const window={setTimeout:(callback,ms)=>{timers.push({callback,ms});events.push('timer');}};
 const source=exportUtil.replace('export function downloadBlobFile(blob: Blob, filename: string): void','function downloadBlobFile(blob, filename)');
 const fn=Function('URL','document','window',`${source}\nreturn downloadBlobFile;`)(URL,document,window);
 return {fn,events,timers,links};
}

test('A18 browser download keeps blob URL valid through click, defers revocation and cleans up attached link',()=>{
 const b=makeBrowser();b.fn({size:5},'tệp lưu trữ.json');
 assert.deepEqual(b.events,['created','attached','click','removed','timer']);
 assert.equal(b.timers.length,1);assert.ok(b.timers[0].ms>=1000);
 assert.equal(b.links[0].download,'tệp lưu trữ.json');
 b.timers[0].callback();assert.equal(b.events.at(-1),'revoke:blob:unique');
});

test('A18 URL and anchor are cleaned up even when browser rejects the download click',()=>{
 const b=makeBrowser(true);assert.throws(()=>b.fn({},'archive.json'),/rejected/);
 assert.deepEqual(b.events,['created','attached','click','removed','timer']);
 b.timers[0].callback();assert.equal(b.events.at(-1),'revoke:blob:unique');
});

test('A18 study-unified, study-backup and Tarot JSON use the same safe download helper',()=>{
 assert.match(study,/downloadBlobFile\(blob,`thien-do-toan-bo-thu-phong-/);
 assert.match(study,/downloadBlobFile\(blob,`thien-do-thu-phong-/);
 assert.match(tarot,/downloadBlobFile\(new Blob\(/);
 assert.doesNotMatch(study,/a\.remove\(\);URL\.revokeObjectURL/);
 assert.doesNotMatch(tarot,/a\.click\(\);URL\.revokeObjectURL/);
});

test('A18 exported annual year equals the board year for PNG and printable PDF',()=>{
 assert.match(chartUI,/const annualYear = result \? Math\.min\(2100, Math\.max\(1900, result\.lunar\.year, chosenAnnualYear\)\) : chosenAnnualYear/);
 assert.match(chartUI,/onExportImage\(annualYear\)/);
 assert.match(chartUI,/Engine\.annualOverview\(result, annualYear\)/);
 assert.match(chartUI,/annualYear=\{annualYear\}/);
 const normalize=(birth,requested)=>Math.min(2100,Math.max(1900,birth,requested));
 assert.equal(normalize(2024,2023),2024);
 assert.equal(normalize(2004,2026),2026);
 assert.equal(normalize(2099,2300),2100);
});

test('A18 all 12 palaces and Unicode remain in complete SVG and printable star appendix',()=>{
 const E=require('../packages/astrology-engine/src/tuvi.js');
 const V=require('../packages/chart-export/src/complete-chart.cjs');
 const I=require('../packages/chart-export/src/star-inventory.cjs');
 const c=E.calculate({date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'});
 const a=E.annualOverview(c,2026);
 const svg=V.renderCompleteChartSvg(c,'Nguyễn Văn Tử Vi & <script>',a);
 const appendix=I.renderStarAppendixHtml(c,a);
 assert.equal((svg.match(/data-branch="\d+"/g)||[]).length,12);
 assert.equal((appendix.match(/<article>/g)||[]).length,12);
 assert.ok(svg.includes('Nguyễn Văn Tử Vi'));
 assert.ok(svg.includes('&lt;script&gt;'));
 assert.doesNotMatch(svg,/<script\b/i);
 assert.ok(appendix.includes('Tứ Hóa'));
 assert.ok(appendix.includes('Lưu niên'));
});
