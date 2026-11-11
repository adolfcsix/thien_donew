'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
 SOURCE_COMMIT,SOURCE_STEMS,SOURCE_VOID_STEM_ROWS,SOURCE_XUN_CODES,
 SOURCE_SCHOOL_DATA_URL,SOURCE_STEM_MATRIX_NOTE,lookupVoidStemCodes
}=require('../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const {auditClassicalPatternCandidates}=require('../packages/interpretation/src/classical-pattern-research.cjs');
const Engine=require('../packages/astrology-engine/src/tuvi.js');

test('r21 transcribes all ten source-stem rows for three school variants without branch interpretation',()=>{
 const stems=['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
 const v1=[9,7,5,3,1,10,8,6,4,2];
 const v2=[[9,10],[8,7],[5,6],[4,3],[1,2],[10,9],[7,8],[6,5],[3,4],[2,1]];
 const v3=[9,7,5,3,11,10,8,6,4,12];
 const xun=[3,1,11,9,7,5,3,1,11,9];
 assert.deepEqual(SOURCE_STEMS,stems);
 assert.deepEqual(SOURCE_XUN_CODES,[0,3,1,11,9,7,5,3,1,11,9,7,5]);
 assert.equal(SOURCE_VOID_STEM_ROWS.length,10);
 for(let i=0;i<10;i++){
  const row=SOURCE_VOID_STEM_ROWS[i];
  assert.equal(row.stem,stems[i]);
  assert.equal(row.ordinal,i+1);
  assert.deepEqual(row.single,[v1[i]]);
  assert.deepEqual(row.double,v2[i]);
  assert.deepEqual(row.zhanyan,[v3[i]]);
  assert.equal(row.xunSourceCode,xun[i]);
  assert.equal(row.sourceCodeMappingVerified,false);
  assert.equal(row.sourceSchoolParityVerified,false);
  assert.ok(Object.isFrozen(row));
  assert.ok(Object.isFrozen(row.single)&&Object.isFrozen(row.double)&&Object.isFrozen(row.zhanyan));
  assert.ok([row.xunSourceCode,...row.single,...row.double,...row.zhanyan].every(x=>Number.isInteger(x)&&x>=1&&x<=12));
 }
 assert.ok(Object.isFrozen(SOURCE_VOID_STEM_ROWS)&&Object.isFrozen(SOURCE_XUN_CODES));
 assert.ok(SOURCE_SCHOOL_DATA_URL.includes('/blob/'+SOURCE_COMMIT+'/lib/ziwei/school-data.ts'));
 assert.match(SOURCE_STEM_MATRIX_NOTE,/không phải chỉ số địa chi của Thiên Đồ/);
});

test('r21 strict lookup refuses unknown stems and variants and cannot return a pattern verdict',()=>{
 for(const row of SOURCE_VOID_STEM_ROWS){
  for(const v of ['single','double','zhanyan']){
   const out=lookupVoidStemCodes(row.stem,v);
   assert.ok(out);
   assert.equal(out.stem,row.stem);
   assert.equal(out.variant,v);
   assert.equal(out.ordinal,row.ordinal);
   assert.deepEqual(out.sourceCodes,row[v]);
   assert.equal(out.xunSourceCode,row.xunSourceCode);
   assert.equal(out.sourcePlacementVerified,false);
   assert.equal(out.sourceSchoolParityVerified,false);
   assert.equal(out.sourceCriterionVerified,false);
   assert.equal(out.sourceCodeMappingVerified,false);
   assert.ok(Object.isFrozen(out)&&Object.isFrozen(out.sourceCodes));
   assert.equal(Object.prototype.hasOwnProperty.call(out,'branchIndex'),false);
  }
 }
 for(const input of [['Giáp','incorrect'],['甲','single'],['Tuần','double'],[null,'double'],[0,'single'],['','single']]){
  assert.equal(lookupVoidStemCodes(...input),null);
 }
});

test('r21 table stays inside research catalog, does not touch or promote chart evidence',()=>{
 const chart=Engine.calculate({date:'2004-08-15',hour:8,minute:30,calendar:'solar',gender:'Nam'});
 const before=JSON.stringify(chart);
 const audit=auditClassicalPatternCandidates(chart);
 assert.equal(audit.assessed,28);
 assert.equal(audit.pendingEvidence.length,2);
 assert.equal(audit.pendingEvidence.every(x=>x.sourceCriterionVerified===false),true);
 assert.equal(JSON.stringify(chart),before);
 const file=fs.readFileSync(path.join(__dirname,'../apps/web/src/features/chart/components/classical-pattern-research.tsx'),'utf8');
 assert.match(file,/SOURCE_VOID_STEM_ROWS\.map\(row=>/);
 assert.match(file,/Bảng mã Không Vong theo 10 thiên can · nghiên cứu nguồn/);
 assert.match(file,/Bảng tham khảo thiên can; không phải kết quả an sao của lá số/);
 assert.match(file,/SOURCE_SCHOOL_DATA_URL/);
});
