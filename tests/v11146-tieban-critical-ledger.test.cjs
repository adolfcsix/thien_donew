'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R=path.resolve(__dirname,'..');
const TB=require('../packages/astrology-engine/src/tieban-source.cjs');
const CR=require('../packages/astrology-engine/src/tieban-critical-ledger-v11146.cjs');
const source=(id,lineage='school-a',scanStatus='scan-inspected')=>({id,title:'Ấn bản kiểm thử '+id,edition:'Giả lập '+id,sourceUrl:'https://example.org/'+id,rights:'Ví dụ giả lập tự tạo; không phải điều văn cổ',lineageId:lineage,scanStatus});
const witness=(sourceId,part=1,number='1001',transcription='Trích lục thử nghiệm nội bộ')=>({sourceId,articleNumber:number,page:'trang 1',part,transcription,reviewStatus:'scan-checked'});
const input=(methodId='eight-parts',branchIndex=0,sources=[],witnesses=[])=>({methodId,branchIndex,sources,witnesses});

test('V11.146: 8×12 và 12×12 phần tạo khoảng thời gian đúng, liên tục, duy nhất',()=>{
 for(const [method,perBranch] of [['eight-parts',8],['twelve-parts',12]]){
  const names=new Set();
  for(let b=0;b<12;b++){
   const l=CR.buildLedger(input(method,b));
   assert.equal(l.rows.length,perBranch);
   for(const row of l.rows){assert.match(row.range,/^\d{2}:\d{2}–\d{2}:\d{2}$/);assert.equal(row.status,'NO_EVIDENCE');names.add(`${b}:${row.part}`);}
  }
  assert.equal(names.size,perBranch*12);
  const start=CR.buildLedger(input(method,0));assert.match(start.rows[0].range,/^23:00/);assert.match(start.rows.at(-1).range,/01:00$/);
 }
});
test('V11.146: nguồn khác URL nhưng cùng dòng không được đếm độc lập',()=>{
 const l=CR.buildLedger(input('eight-parts',0,[source('book-a'),source('book-b')],[witness('book-a'),witness('book-b')]));
 assert.equal(l.rows[0].lineageCount,1);
 assert.equal(l.rows[0].sourceIds.length,2);
 assert.equal(l.rows[0].status,'SOURCE_LINKED_UNVERIFIED');
 assert.equal(l.limits.derivesArticleNumber,false);
 assert.equal(l.limits.determinesBirthTime,false);
});
test('V11.146: hai dòng độc lập cùng số, đã kiểm ảnh, vẫn không xác nhận định điều',()=>{
 const l=CR.buildLedger(input('eight-parts',11,[source('book-a'),source('book-b','school-b')],[witness('book-a'),witness('book-b')]));
 assert.equal(l.rows[0].status,'MULTIPLE_LINEAGES_CONSISTENT');assert.equal(l.rows[0].lineageCount,2);
 assert.equal(l.status,'EDITORIAL_SOURCE_MAPPING_ONLY');assert.equal(l.limits.validatesPrediction,false);
});
test('V11.146: hai dị bản khác số điều hoặc bản chép => cần khảo dị',()=>{
 const s=[source('book-a'),source('book-b','school-b')];
 const x=CR.buildLedger(input('eight-parts',0,s,[witness('book-a'),witness('book-b',1,'2002')]));
 assert.equal(x.rows[0].status,'COLLATION_REQUIRED');assert.deepEqual(x.rows[0].collationFlags,['DIFFERENT_ARTICLE_NUMBERS']);
 const y=CR.buildLedger(input('eight-parts',0,s,[witness('book-a'),witness('book-b',1,'1001','Văn bản dịch khác')]));
 assert.deepEqual(y.rows[0].collationFlags,['DIFFERENT_TRANSCRIPTIONS']);
});
test('V11.146: không cho giả nhận đã kiểm ảnh khi nguồn chỉ là mục lục',()=>{
 assert.throws(()=>CR.buildLedger(input('eight-parts',0,[source('book-a','lineage-a','catalogue-only')],[witness('book-a')])),/ảnh nguồn/);
});
test('V11.146: từ chối nguồn thiếu xuất xứ, bản ghi sai dạng, trùng và URL không an toàn',()=>{
 assert.throws(()=>CR.buildLedger(input('eight-parts',0,[{...source('book-a'),sourceUrl:'javascript:alert(1)'}])),/URL/);
 assert.throws(()=>CR.buildLedger(input('eight-parts',0,[{...source('book-a'),sourceUrl:'https://foo:secret@example.org'}])),/URL/);
 assert.throws(()=>CR.buildLedger(input('eight-parts',0,[{...source('book-a'),bad:'x'}])),/cấu trúc/);
 assert.throws(()=>CR.buildLedger(input('eight-parts',0,[source('book-a'),source('book-a')])),/Trùng/);
 assert.throws(()=>CR.buildLedger(input('eight-parts',0,[],[witness('book-a')])),/Không có tư liệu/);
 assert.throws(()=>CR.buildLedger(input('eight-parts',0,[source('book-a')],[witness('book-a'),witness('book-a')])),/lặp/);
 assert.throws(()=>CR.buildLedger(input('eight-parts',0,[source('book-a')],[witness('book-a',9)])),/Phần giờ/);
 assert.throws(()=>CR.buildLedger(input('twelve-parts',0,[source('book-a')],[witness('book-a',13)])),/Phần giờ/);
 assert.throws(()=>CR.buildLedger(input('fake')),/Quy ước/);
});
test('V11.146: giới hạn đầu vào, JSON import/export, và chống chen quyền qua trường không cho phép',()=>{
 const l=input('twelve-parts',3,[source('book-a')],[witness('book-a',12)]);
 const json=CR.exportLedger(l);assert.deepEqual(CR.importLedger(json),l);
 assert.throws(()=>CR.importLedger(JSON.stringify({...JSON.parse(json),unexpected:true})),/cấu trúc/);
 assert.throws(()=>CR.importLedger(JSON.stringify({...JSON.parse(json),version:777})),/định dạng/);
 assert.throws(()=>CR.importLedger(' '.repeat(1024*1024+1)),/1 MB/);
 assert.throws(()=>CR.importLedger('bad data'),/JSON/);
 assert.throws(()=>CR.buildLedger(input('eight-parts',0,Array.from({length:31},(_,i)=>source(`s-${i}`)))),/giới hạn/);
});
test('V11.146: legacy 8 và 12 phần vẫn nguyên kết quả, không phát sinh số điều tự động',()=>{
 const cases=[[23,0,'Tý',1],[0,59,'Tý',8],[1,0,'Sửu',1],[22,59,'Hợi',8]];
 for(const [hour,minute,branch,part] of cases){const v=TB.sliceTime({hour,minute,methodId:'eight-parts',sourceId:'verified-test'});assert.equal(v.branch,branch);assert.equal(v.part,part);assert.equal(v.noTextLookup,true);}
 assert.equal(CR.observedSlot({hour:23,minute:15,methodId:'eight-parts',sourceId:'verified-test'}),2);
});
test('V11.146: UI nghiên cứu và tài liệu tham khảo có thật, không thêm bài đoán tự động',()=>{
 const page=fs.readFileSync(path.join(R,'apps/web/src/app/thiet-ban/page.tsx'),'utf8');
 const links=fs.readFileSync(path.join(R,'apps/web/src/features/study-room/study-links.cjs'),'utf8');
 assert.match(page,/buildLedger/);assert.match(page,/importLedger/);assert.match(page,/SaveStudy/);assert.match(page,/không phải phép tự suy ra số điều/);
 assert.match(links,/sliceTieBan\(s\)/);
 const docs=JSON.parse(fs.readFileSync(path.join(R,'packages/knowledge/src/tieban-v11146-references.json'),'utf8'));
 assert.ok(docs.references.length>=2);assert.equal(docs.status,'bibliographic-leads-not-edition-verified');
});
