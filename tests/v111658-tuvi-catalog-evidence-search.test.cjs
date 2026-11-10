'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Engine=require('../packages/astrology-engine/src/tuvi.js');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const {summarizeClassicalCatalog,filterClassicalCatalog}=require('../packages/interpretation/src/classical-pattern-catalog.cjs');

const ids=view=>view.groups.flatMap(group=>group.entries.map(entry=>entry.id));

test('r14 searches mapped criteria by accent-insensitive Vietnamese text without modifying catalog status',()=>{
 const report=summarizeClassicalCatalog(['dinh-quy-01','dinh-quy-17']);
 const evidenceTerms={
  'dinh-quy-01':'Dấu Tuần / Triệt, điều kiện Không Vong',
  'dinh-quy-17':'Hỏa Tinh cùng Mệnh; độ sáng Hỏa Tinh chưa xác minh'
 };
 assert.deepEqual(ids(filterClassicalCatalog(report,{query:'KHONG VONG',evidenceTerms})),['dinh-quy-01']);
 assert.deepEqual(ids(filterClassicalCatalog(report,{query:'  hỏa tinh  ',evidenceTerms})),['dinh-quy-17']);
 assert.deepEqual(ids(filterClassicalCatalog(report,{query:'hoa tinh',evidenceTerms,status:'pending'})),[]);
 assert.equal(report.assessed,2);
 assert.equal(filterClassicalCatalog(report,{status:'all'}).matches,49);
});

test('r14 never indexes unassessed reference items or overrides source status',()=>{
 const report=summarizeClassicalCatalog(['dinh-quy-17']);
 const evidenceTerms={
  'dinh-tap-01':'uniquefakekeyword',
  'dinh-quy-12':'uniquefakekeyword',
  'dinh-quy-07':'uniquefakekeyword',
  'dinh-quy-17':'Hỏa Tinh'
 };
 assert.equal(filterClassicalCatalog(report,{query:'uniquefakekeyword',evidenceTerms}).matches,0);
 assert.deepEqual(ids(filterClassicalCatalog(report,{query:'hoa tinh',evidenceTerms,status:'assessed'})),['dinh-quy-17']);
 assert.equal(filterClassicalCatalog(report,{status:'disputed'}).matches,9);
 assert.equal(filterClassicalCatalog(report,{status:'unreachable'}).matches,6);
 assert.equal(report.groups[3].assessed,0);
});

test('r14 validates evidence search metadata and does not evaluate arbitrary input',()=>{
 const report=summarizeClassicalCatalog(['dinh-quy-17']);
 for(const bad of [null,[],12,'Hỏa Tinh',{'dinh-quy-17':12}]){
  assert.throws(()=>filterClassicalCatalog(report,{evidenceTerms:bad}),/evidence search terms map/);
 }
 assert.deepEqual(ids(filterClassicalCatalog(report,{query:'.*',evidenceTerms:{'dinh-quy-17':'Hỏa Tinh'}})),[]);
 assert.equal(filterClassicalCatalog(report,{query:'  ',evidenceTerms:{'dinh-quy-17':'Hỏa Tinh'}}).matches,49);
});

test('r14 live engine evidence is indexed from labels and interpretation, not chart-specific details',()=>{
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const before=JSON.stringify(chart);
 const research=auditClassicalPatternCandidates(chart);
 const catalog=summarizeClassicalCatalog(research.records.map(record=>record.id));
 const evidenceTerms=Object.fromEntries(research.records.map(record=>[
  record.id,[record.interpretation,...record.checks.map(check=>check.label)].join(' ')
 ]));
 const found=ids(filterClassicalCatalog(catalog,{query:'Hỏa Tinh',status:'assessed',evidenceTerms}));
 assert.ok(found.includes('dinh-quy-17'));
 assert.equal(catalog.assessed,28);
 assert.equal(JSON.stringify(chart),before);
 assert.ok(research.records.find(record=>record.id==='dinh-quy-17').status!=='structural-match');
});

test('r14 reuses the existing catalog search control, with no new page or duplicated UI',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 const cjs=fs.readFileSync(path.join(__dirname,'../packages/interpretation/src/classical-pattern-catalog.cjs'),'utf8');
 assert.match(ui,/evidenceTerms=useMemo/);
 assert.match(ui,/record\.interpretation,\.\.\.record\.checks\.map\(condition=>condition\.label\)/);
 assert.match(ui,/localizedTitles,evidenceTerms/);
 assert.match(ui,/Tìm theo tên gốc, tên Việt, tên sao, điều kiện/);
 assert.match(cjs,/entry\.assessed&&Object\.prototype\.hasOwnProperty\.call\(evidenceTerms,entry\.id\)/);
 assert.doesNotMatch(ui,/evidenceTerms.*condition\.detail/);
});
