#!/usr/bin/env node
'use strict';
// Count source records, not validated technical or scholarly claims.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const base='packages/knowledge/src/';
const {primaryStarPalaceGuidance}=require('../../packages/knowledge/src/index.cjs');
const groups=[
  ['primary-star-palace-guidance.json','records','star-palace-grid'],
  ['star-symbols.json','records','star-editorial-notes'],
  ['combination-rules.json','rules','conditional-rules'],
  ['palace-topics.json','topics','palace-topics'],
  ['relationship-patterns.json','rules','conditional-rules'],
  ['adjacent-palace-patterns.json','rules','conditional-rules'],
  ['classical-families.json','rules','conditional-rules'],
  ['obstruction-symbols.json','records','symbolic-markers'],
  ['traditional-star-catalogue.json','records','star-catalogue'],
  ['natal-extension-catalogue.json','records','star-catalogue'],
];
const problems=[];
const normalizeName=s=>s.normalize('NFC').trim().toLocaleLowerCase('vi-VN');
const datasets=groups.map(([filename,key,kind])=>{
  const value=kind==='star-palace-grid' ? primaryStarPalaceGuidance.records : read(base+filename)[key];
  if (!value || typeof value!=='object') {problems.push(`Missing ${key} in ${filename}`);return null;}
  const count=Array.isArray(value)?value.length:Object.keys(value).length;
  const ids=Array.isArray(value)?value.map(x=>x.id||x.name):Object.keys(value);
  const normalized=ids.filter(Boolean).map(normalizeName);
  if (normalized.length!==ids.length) problems.push(`Unidentified record in ${filename}`);
  if (normalized.length!==new Set(normalized).size) problems.push(`Repeated normalized name/id in ${filename}`);
  if (kind==='star-palace-grid') {
    for (const [star,perPalace] of Object.entries(value)) {
      if (!perPalace || Object.keys(perPalace).length!==12) problems.push(`${star}: expected 12 palaces`);
    }
  }
  return {filename,kind,rootKey:key,recordCount:count,internalDuplicateIds:normalized.length-new Set(normalized).size};
}).filter(Boolean);
const guides=primaryStarPalaceGuidance.records;
const stars=read(base+'star-symbols.json').records;
const traditional=read(base+'traditional-star-catalogue.json').records;
const natal=read(base+'natal-extension-catalogue.json').records;
const namedSets={
  primary:Object.keys(guides), symbol:Object.keys(stars),
  traditional:traditional.map(x=>x.name), natal:natal.map(x=>x.name),
};
const sourceByStar=new Map();
for (const [source,names] of Object.entries(namedSets)) for (const name of names) {
  const normalized=normalizeName(name);
  const refs=sourceByStar.get(normalized)||{name,sources:[]};
  refs.sources.push(source);sourceByStar.set(normalized,refs);
}
const overlaps=[...sourceByStar.values()].filter(x=>x.sources.length>1).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
const lessons=read('apps/web/src/features/academy/lessons.json');
const glossary=read('apps/web/src/features/academy/glossary.json');
const content={
  release:'11.29.0',scope:'source-data-count-only',datasets,
  primaryStarCount:Object.keys(guides).length,
  primaryStarPalaceEntries:Object.values(guides).reduce((a,o)=>a+Object.keys(o).length,0),
  symbolicStarNotes:Object.keys(stars).length,
  distinctNamesAcrossFourDatasets:sourceByStar.size,
  overlaps,lessonCount:lessons.length,glossaryCount:glossary.length,
  warnings:problems,
  boundaries:[
    'Entries count is not a count of independently verified star placement formulas.',
    'Editorial notes do not imply expert-reviewed reference articles.',
    'Overlapping names across source datasets are expected in some cases and must not be summed.',
    'An inventory cannot establish that the library covers every school or variation.',
  ],
};
if (process.argv.includes('--write')) {
 const dir=path.join(root,'docs/reports');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'V11_29_KNOWLEDGE_AUDIT.json'),JSON.stringify(content,null,2)+'\n');
 const table=datasets.map(d=>`| ${d.filename} | ${d.kind} | ${d.recordCount} |`).join('\n');
 fs.writeFileSync(path.join(dir,'V11_29_KNOWLEDGE_AUDIT.md'),[
   '# Thiên Đồ V11.29 — Thống kê kho dữ liệu nội bộ','',
   '| File | Loại dữ liệu | Số bản ghi / khóa |','|---|---|---:|',table,'',
   `- ${content.primaryStarCount} khóa chính tinh, tổng ${content.primaryStarPalaceEntries} mục gợi ý theo cung.`,
   `- ${content.symbolicStarNotes} mục biểu tượng sao (không chứng minh đầy đủ sao).`,
   `- ${content.distinctNamesAcrossFourDatasets} tên phân biệt trong 4 tập tên (không đồng nhất với số sao an được).`,
   `- ${overlaps.length} tên có mặt ở hơn một tập tên; không được cộng dồn các nguồn.`,
   `- Học viện ${content.lessonCount} bài; từ điển ${content.glossaryCount} thuật ngữ.`,
   '', '## Phạm vi và giới hạn', ...content.boundaries.map(x=>'- '+x),
   '',`## Lỗi cấu trúc: ${problems.length}`, ...problems.map(x=>'- '+x),'',
 ].join('\n'));
}
console.log(`Knowledge audit: ${datasets.length} datasets; ${content.primaryStarPalaceEntries} guidance entries; ${content.distinctNamesAcrossFourDatasets} distinct names; ${problems.length} structural issues`);
if(problems.length) process.exitCode=1;
module.exports={audit:content};
