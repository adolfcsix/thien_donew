'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const T=require('../packages/astrology-engine/src/tieban-source.cjs');
const Ledger=require('../packages/astrology-engine/src/tieban-critical-ledger-v11146.cjs');
const HE=require('../packages/astrology-engine/src/ha-lac-source.cjs');
const Tr=require('../packages/astrology-engine/src/trach-nhat-specialized.cjs');
const F=require('../apps/web/src/features/feng-shui/feng-shui-audit.cjs');
const sample={corpusId:'book-a',edition:'Ấn bản A',sourceUrl:'https://example.org/text',page:'Trang 1',articleNumber:'123',transcription:'Văn bản gốc',license:'CC0',verification:'unchecked'};

test('A11: reject inherited properties in Thiết Bản time method IDs rather than emit NaN',()=>{
 for(const methodId of ['constructor','toString','__proto__','hasOwnProperty',[],{}]){
  assert.throws(()=>T.sliceTime({hour:23,minute:12,methodId,sourceId:'reference-id'}),/phương pháp|Phương pháp/i);
 }
 for(const methodId of Object.keys(T.TIME_METHODS)){
  for(let h=0;h<24;h++)for(let m=0;m<60;m++){
   const x=T.sliceTime({hour:h,minute:m,methodId,sourceId:'reference-id'});
   assert.ok(Number.isInteger(x.part)&&x.part>=1&&x.part<=x.partCount);
   assert.match(x.startLocal,/^[0-2][0-9]:[0-5][0-9]$/);
   assert.match(x.endLocal,/^[0-2][0-9]:[0-5][0-9]$/);
  }
 }
});

test('A11: bibliography URL must be absolute HTTP(S) and never include embedded credentials',()=>{
 for(const sourceUrl of ['https:// bad-url','https://user:secret@example.org/text','http://user@example.org','ftp://example.org/text','file:///tmp/file','https://']){
  assert.throws(()=>T.validateCorpusEntry({...sample,sourceUrl}),/URL|nguồn|Nguồn/);
 }
 assert.equal(T.validateCorpusEntry(sample).sourceUrl,sample.sourceUrl);
});

test('A11: equivalent Unicode and whitespace do not create false textual variants',()=>{
 const alternate={...sample,edition:'Ấn bản B',transcription:' Va\u0306n   bản\n gốc '};
 const first={...sample,transcription:'Văn bản gốc'};
 const comparison=T.compareEntries([first,alternate]);
 assert.equal(comparison.variants.length,1);
 assert.equal(comparison.variants[0].textVariants,1);
 assert.equal(comparison.variants[0].requiresCollation,false);
 assert.equal(comparison.entries[1].transcription,alternate.transcription.trim());
 const realDiff=T.compareEntries([first,{...alternate,transcription:'Bản khác thực sự'}]);
 assert.equal(realDiff.variants[0].textVariants,2);
 assert.equal(realDiff.variants[0].requiresCollation,true);
});

test('A11: ledger/time-slices agreement remains intact for 8 and 12 segments',()=>{
 for(const methodId of Object.keys(T.TIME_METHODS))for(const hour of [0,1,7,12,22,23])for(const minute of [0,10,15,30,45,59]){
  const x={hour,minute,methodId,sourceId:'reference-id'};
  assert.equal(T.sliceTime(x).part,Ledger.observedSlot(x));
 }
});

test('A11: independent Phong thủy, Hà Lạc, Trạch Nhật reference engines retain identities',()=>{
 const feng=F.measurementAudit(181,9,0.3);
 assert.equal(feng.natal.period,9);
 assert.equal(typeof feng.structure.flags.mountainAtSitting,'boolean');
 assert.equal(HE.calculate({pillars:['Nhâm Ngọ','Tân Hợi','Đinh Hợi','Kỷ Dậu']}).heaven.sum,34);
 const tr=Tr.evaluate({date:'2026-05-18',hour:10,ageBranchIndex:1});
 assert.equal(tr.lenses.length,4);assert.equal(tr.overallVerdict,null);
});
