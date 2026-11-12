'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {evaluate,validateObservationShape,requireSingle,
 SOURCE_COMMIT,PINNED_IZTRO,PROBE_SCHEMA,DISCLAIMER}=
 require('../infrastructure/scripts/tuvi-r27-evaluate-parity.cjs');

const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,
 'fixtures/tuvi-r27-iztro-cases.json'),'utf8'));
const observationPath=path.resolve(__dirname,'../.r27-source-iztro-observations.json');

test('r27: all 10 stems x 2 genders x 3 clock hours plus calendar-boundary cases',()=>{
 assert.equal(fixture.schema,'thiendo-r27-public-synthetic-case-matrix-v1');
 assert.equal(fixture.cases.length,65);
 assert.equal(new Set(fixture.cases.map(x=>x.id)).size,65);
 assert.equal(fixture.cases.filter(x=>x.kind==='ten-stem-hour-gender-matrix').length,60);
 assert.equal(fixture.cases.filter(x=>x.kind==='calendar-boundary').length,5);
 for(let y=1984;y<=1993;y++)for(const gender of ['Nam','Nữ'])
  for(const hour of [0,8,22]){
   assert.ok(fixture.cases.some(x=>x.date===y+'-08-15'&&x.gender===gender&&x.hour===hour));
  }
 assert.ok(fixture.cases.some(x=>x.kind==='calendar-boundary'&&x.date==='2020-05-30'));
 assert.ok(fixture.cases.every(x=>x.minute===0&&x.hour!==23));
 assert.match(DISCLAIMER,/không chứng minh tương đương sao/);
});

test('r27: reject missing, duplicate and untrusted source/iztro observations',()=>{
 for(const broken of [null,undefined,{},[],{旬空:[]},{旬空:[0,1]},{旬空:[-1]},{旬空:[12]},{旬空:[0.5]},{旬空:['0']}])
  assert.throws(()=>requireSingle(broken,'旬空'));
 assert.equal(requireSingle({旬空:[0]},'旬空'),0);
 const fake={schema:PROBE_SCHEMA,
  provenance:{sourceCommit:SOURCE_COMMIT,sourceRepository:'Renhuai123/ziwei-doushu',
   iztroVersion:PINNED_IZTRO,syntheticCasesOnly:true},
  records:fixture.cases.map(x=>({id:x.id}))};
 assert.doesNotThrow(()=>validateObservationShape(fake,fixture));
 assert.throws(()=>validateObservationShape({...fake,provenance:{...fake.provenance,iztroVersion:'latest'}},fixture));
 assert.throws(()=>validateObservationShape({...fake,records:fake.records.slice(1)},fixture));
 assert.throws(()=>validateObservationShape({...fake,records:[fake.records[0],...fake.records.slice(0,64)]},fixture));
 assert.throws(()=>validateObservationShape({...fake,provenance:{...fake.provenance,syntheticCasesOnly:false}},fixture));
 assert.throws(()=>evaluate({...fake,records:[]},fixture));
});

test('r27: runnable source probe uses both pinned generateChart and direct raw iztro bySolar',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r27-source-iztro-probe.ts.template'),'utf8');
 const runner=fs.readFileSync(path.join(__dirname,'../infrastructure/scripts/tuvi-r27-evaluate-parity.cjs'),'utf8');
 assert.match(source,/from '\.\/lib\/ziwei\/algorithm'/);
 assert.match(source,/from 'iztro'/);
 assert.match(source,/generateChart\(/);
 assert.match(source,/astro\.bySolar\(/);
 assert.match(source,/node_modules\/iztro/);
 assert.match(source,/version!==PINNED_IZTRO/);
 assert.match(runner,/rawIztroToSourcePlacementReproduced/);
 assert.match(runner,/sourceFuxunPostprocessingReproduced/);
 assert.match(runner,/namedPlacementEquivalenceVerified:false/);
 assert.match(runner,/sourceSchoolParityVerified:false/);
 assert.match(runner,/sourceCriterionVerified:false/);
});

test('r27: genuinely executed source probes are mandatory in isolated external-runtime CI only',()=>{
 const mandatory=process.env.THIENDO_R27_REQUIRE_GENUINE==='1';
 if(!mandatory){
  assert.ok(!('sourceRunExecuted' in fixture));
  return;
 }
 assert.ok(fs.existsSync(observationPath),'Pinned runtime source observation file missing');
 const source=JSON.parse(fs.readFileSync(observationPath,'utf8'));
 const report=evaluate(source,fixture);
 assert.equal(report.caseCount,65);
 assert.equal(report.failures,0,JSON.stringify(report.failedCases.slice(0,10)));
 assert.equal(report.sourceConsistent,65);
 assert.equal(report.sourceRunExecuted,true);
 assert.equal(report.namedPlacementEquivalenceVerified,false);
 assert.equal(report.sourceSchoolParityVerified,false);
 assert.equal(report.sourceCriterionVerified,false);
 assert.equal(report.results.length,65);
 assert.ok(report.results.every(x=>x.sourceFuxunPostprocessingReproduced&&
  x.rawIztroToSourcePlacementReproduced&&x.namedSourceFormulaReproduced));
});

test('r49: source school variant declarations never imply actual alternate-source runtime',()=>{
 const vocab=require('../packages/interpretation/src/classical-source-void-vocabulary.cjs');
 assert.deepEqual(vocab.SOURCE_VARIANTS,['single','double','zhanyan']);
 assert.equal(vocab.SOURCE_VOID_STEM_ROWS.length,10);
 assert.ok(vocab.SOURCE_VOID_STEM_ROWS.every(r=>
  r.single.length===1&&r.double.length===2&&r.zhanyan.length===1));
 // The pinned workflow already checks out the exact reference source. Do not
 // substitute hand-copied snapshots when the real checkout is unavailable.
 if(process.env.THIENDO_R27_REQUIRE_GENUINE!=='1')return;
 const root=path.join(__dirname,'../reference-ziwei/lib/ziwei');
 const algorithm=fs.readFileSync(path.join(root,'algorithm.ts'),'utf8');
 const config=fs.readFileSync(path.join(root,'school-config.ts'),'utf8');
 const data=fs.readFileSync(path.join(root,'school-data.ts'),'utf8');
 assert.match(config,/export type JiekongSchool\s*=\s*'single'\s*\|\s*'double'\s*\|\s*'zhanyan'/);
 assert.match(config,/jiekongSchool:\s*'double'/);
 assert.match(config,/jiekongSchool:\s*\[/);
 for(const mode of vocab.SOURCE_VARIANTS)
  assert.ok(config.includes("value: '"+mode+"'"),'Missing variant option '+mode);
 assert.match(algorithm,/export function generateChart\(\s*birthInfo:\s*BirthInfo,\s*opts\?:\s*\{\s*leapMonth\?:\s*LunarMonthPolicy\s*\},\s*\):\s*ZiweiChart\s*\{/);
 assert.doesNotMatch(algorithm,/\bjiekongSchool\b/);
 assert.match(algorithm,/applySchoolJiekong\(palaces,\s*lunarInfo\.yearStem\)/);
 // These source tables are 1-based with a sentinel row. The Xun table has
 // extra trailing rows that must NOT be mapped to local branch indices.
 const extractArray=(text,anchor)=>{
  const at=text.indexOf(anchor);
  assert.ok(at>=0&&text.indexOf(anchor,at+anchor.length)<0,'Missing/ambiguous anchor '+anchor);
  const start=text.indexOf('[',at+anchor.length);
  assert.ok(start>=0,'Source array missing '+anchor);
  let level=0,end=-1;
  for(let i=start;i<text.length;i++){
   if(text[i]==='[')level++;
   else if(text[i]===']'&&--level===0){end=i+1;break;}
  }
  assert.ok(end>start,'Unclosed source table '+anchor);
  return JSON.parse(text.slice(start,end));
 };
 const section=data.match(/export const SCHOOL_JIEKONG_VARIANTS\s*=\s*\{([\s\S]*?)\}\s*as const;/);
 assert.ok(section,'Pinned school variant tables missing');
 const variants={
  single:extractArray(section[1],'v1:'),
  double:extractArray(section[1],'v2:'),
  zhanyan:extractArray(section[1],'v3:')
 };
 const xun=extractArray(data,'SCHOOL_XUNKONG: number[] =');
 assert.equal(xun.length,13);
 assert.deepEqual(xun.slice(1,11),vocab.SOURCE_VOID_STEM_ROWS.map(r=>r.xunSourceCode));
 for(const mode of vocab.SOURCE_VARIANTS){
  const raw=variants[mode];
  assert.equal(raw.length,11,mode+' rows');
  assert.deepEqual(raw.slice(1).map(x=>Array.isArray(x)?x:[x]),
   vocab.SOURCE_VOID_STEM_ROWS.map(row=>row[mode]),mode+' ten SOURCE stems');
 }
 assert.equal(vocab.SOURCE_COMMIT,SOURCE_COMMIT);
 console.log('R49: 30/30 SOURCE school variant table rows match, Xun 10/10; '+
  'source generateChart default path only, non-default runtime UNVERIFIED');
});
