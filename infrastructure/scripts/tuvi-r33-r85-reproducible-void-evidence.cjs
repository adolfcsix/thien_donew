'use strict';
/** R85: reproducible source-profile evidence, never a production verdict.
 * SHA-256 binds bytes and canonical JSON content, not authorship or academic
 * validity. All samples are synthetic. The three grids overlap.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const Engine=require('../../packages/astrology-engine/src/tuvi.js');
const {auditR62}=require('./tuvi-r33-r62-matched-source-void-controls.cjs');
const {PROFILE,auditPinnedDefaultVoidConditions}=require('./tuvi-r33-r83-pinned-default-ban02.cjs');
const {SOURCE_COMMIT}=require('../../packages/interpretation/src/classical-source-void-vocabulary.cjs');
const ROOT=path.resolve(__dirname,'../..');
const SCHEMA='thiendo-r85-reproducible-void-evidence-v1';
const IDS=['dinh-ban-01','dinh-ban-02','dinh-tap-03'];
const FLAGS={sourceCriterionVerified:false,semanticEquivalenceVerified:false,schoolParityVerified:false,
 expertReviewed:false,mayDeclarePattern:false,mayIncreaseMapping:false,researchMapped:31};
const hash=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>hash(JSON.stringify(x));
const readJSON=file=>JSON.parse(fs.readFileSync(path.resolve(ROOT,file),'utf8'));
const git=(dir)=>execFileSync('git',['rev-parse','HEAD'],{cwd:dir,encoding:'utf8'}).trim();
const branch=b=>Number.isInteger(b)&&b>=0&&b<12;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const same=(a,b)=>assert.deepEqual(a,b);
function totals(records){
 const n=Object.fromEntries(IDS.map(id=>[id,{sourcePositive:0,sourceNegative:0,bothPositive:0,bothNegative:0,
  sourceOnly:0,localOnly:0,unknown:0,rejected:0}]));
 const observe=(id,source,local,rejected)=>{
  assert.equal(typeof source,'boolean');
  assert.ok(local===null||typeof local==='boolean');
  const c=n[id];c[source?'sourcePositive':'sourceNegative']++;
  if(rejected)c.rejected++;
  else if(local===null)c.unknown++;
  else if(source&&local)c.bothPositive++;
  else if(!source&&!local)c.bothNegative++;
  else if(source)c.sourceOnly++;
  else c.localOnly++;
 };
 for(const r of records){
  for(const c of r.natal)observe(c.id,c.source,c.local,r.status==='rejected');
  for(const p of r.periods)observe(IDS[2],p.source,p.local,r.status==='rejected');
 }
 return n;
}
function buildRecords(source){
 return source.records.map(row=>{
  const d=row.diagnostic.reportedLunar;
  assert.ok(d&&Number.isInteger(d.year)&&Number.isInteger(d.month)&&Number.isInteger(d.day)&&typeof d.leap==='boolean');
  const date=[d.year,String(d.month).padStart(2,'0'),String(d.day).padStart(2,'0')].join('-');
  let chart=null,rejection=null;
  try{chart=Engine.calculate({date,calendar:'lunar',leap:d.leap,hour:row.hour*2,minute:0,gender:row.gender==='male'?'Nam':'Nữ'});}
  catch(e){if(!(e instanceof RangeError))throw e;rejection=e.message;}
  const a=chart?auditPinnedDefaultVoidConditions(chart,PROFILE):null;
  if(a){assert.equal(a.verifiedLocalInput,true,row.id);assert.equal(a.period.verifiedGeometry,true,row.id);
   for(const [k,v] of Object.entries(FLAGS))assert.equal(a[k],v,row.id);
   same(a.sourceNamedCoordinates,row.sourceVoidByName);}
  return {id:row.id,sourceSolar:row.solarDate,rawLunar:row.diagnostic.rawLunar,
   effectiveLunar:d,localSolar:chart?.solar??null,gender:row.gender,hourBranch:row.hour,
   status:chart?'accepted':'rejected',rejection,sourceNames:row.sourceVoidByName,
   localNames:a?.sourceNamedCoordinates??null,
   natal:IDS.slice(0,2).map(id=>{
    const c=a?.natal.find(x=>x.id===id);
    return {id,source:row.sourcePredicates[id],local:c?.formulaMatch??null,operands:c?.operands??null};
   }),
   periods:row.periods.map(p=>{
    const local=a?.period.periods.find(x=>x.fromAge===p.startAge);
    return {fromAge:p.startAge,toAge:p.startAge+9,sourceBranch:p.branch,
     localBranch:local?.branch??null,source:row.sourcePredicates[IDS[2]].includes(p.startAge),
     local:local?.formulaMatch??null,operands:local?.operands??null};
   })};
 });
}
function verifyEnvelope(envelope,source,provenance){
 const {sha256,payload}=envelope;
 assert.equal(sha256,digest(payload),'R85 report content digest mismatch');
 assert.equal(payload.schema,SCHEMA);
 same(payload.provenance,provenance);
 same(payload.scope,{grid:'R61',charts:960,periods:11520,syntheticOnly:true,profile:PROFILE});
 same(payload.flags,FLAGS);
 const rows=payload.records;
 assert.equal(rows.length,960);
 assert.equal(new Set(rows.map(r=>r.id)).size,960);
 const lookup=new Map(source.records.map(r=>[r.id,r]));
 for(const r of rows){
  const src=lookup.get(r.id);assert.ok(src,r.id);
  same(r.effectiveLunar,src.diagnostic.reportedLunar);
  same(r.rawLunar,src.diagnostic.rawLunar);
  assert.equal(r.sourceSolar,src.solarDate);
  assert.equal(r.gender,src.gender);assert.equal(r.hourBranch,src.hour);
  same(r.sourceNames,src.sourceVoidByName);
  assert.ok(['accepted','rejected'].includes(r.status));
  assert.equal(r.natal.length,2);same(r.natal.map(c=>c.id),IDS.slice(0,2));
  assert.equal(r.periods.length,12);
  assert.equal(new Set(r.periods.map(p=>p.fromAge)).size,12);
  assert.equal(new Set(r.periods.map(p=>p.sourceBranch)).size,12);
  for(const c of r.natal){
   assert.equal(c.source,src.sourcePredicates[c.id]);
   assert.ok(c.local===null||typeof c.local==='boolean');
   if(r.status==='rejected'){assert.equal(c.local,null);assert.equal(c.operands,null);}
   else assert.ok(c.operands&&Object.values(c.operands).every(v=>v===null||typeof v==='boolean'));
  }
  for(const p of r.periods){
   const original=src.periods.find(x=>x.startAge===p.fromAge);
   assert.ok(original);assert.equal(p.toAge,p.fromAge+9);
   assert.equal(p.sourceBranch,original.branch);assert.ok(branch(p.sourceBranch));
   assert.equal(p.source,src.sourcePredicates[IDS[2]].includes(p.fromAge));
   assert.ok(p.local===null||typeof p.local==='boolean');
   if(r.status==='rejected'){assert.equal(p.local,null);assert.equal(p.localBranch,null);assert.equal(p.operands,null);}
   else{assert.equal(p.localBranch,p.sourceBranch);assert.ok(p.operands);}
  }
  if(r.status==='accepted'){same(r.localNames,r.sourceNames);assert.equal(r.rejection,null);assert.ok(r.localSolar);}
  else{assert.equal(r.localNames,null);assert.equal(r.localSolar,null);assert.equal(typeof r.rejection,'string');}
 }
 same(payload.counts,totals(rows));
 for(const [id,c] of Object.entries(payload.counts)){
  assert.equal(c.sourcePositive+c.sourceNegative,id===IDS[2]?11520:960);
  assert.equal(c.sourcePositive+c.sourceNegative,c.bothPositive+c.bothNegative+c.sourceOnly+c.localOnly+c.unknown+c.rejected);
  assert.equal(c.sourceOnly+c.localOnly+c.unknown+c.rejected,0,'R85 unexpected unresolved R61 case '+id);
 }
 return true;
}
function run(){
 assert.equal(process.env.THIENDO_R33_REQUIRE_GENUINE,'1','R85 genuine workflow required');
 const sourceFile='.r61-pinned-source-void-predicate-observations.json';
 const baseFile='.r33-source-1989-root-cause-observations.json';
 const source=readJSON(sourceFile),base=readJSON(baseFile);
 assert.equal(auditR62(source,base).charts,960);
 const referenceDir=path.join(ROOT,'reference-ziwei');
 assert.equal(git(referenceDir),SOURCE_COMMIT);
 const lock=readJSON('reference-ziwei/package-lock.json');
 const installed=readJSON('reference-ziwei/node_modules/iztro/package.json');
 assert.equal(lock.packages?.['node_modules/iztro']?.version,'2.6.1');assert.equal(installed.version,'2.6.1');
 const provenance={localCheckout:git(ROOT),sourceCommit:SOURCE_COMMIT,iztroVersion:installed.version,
  sourceLockSha256:hash(fs.readFileSync(path.join(referenceDir,'package-lock.json'))),
  localLockSha256:hash(fs.readFileSync(path.join(ROOT,'package-lock.json'))),
  sourceObservationSha256:hash(fs.readFileSync(path.join(ROOT,sourceFile))),
  baselineSha256:hash(fs.readFileSync(path.join(ROOT,baseFile)))};
 const records=buildRecords(source);
 const payload={schema:SCHEMA,provenance,scope:{grid:'R61',charts:960,periods:11520,syntheticOnly:true,profile:PROFILE},
  flags:{...FLAGS},counts:totals(records),records};
 const envelope={sha256:digest(payload),payload};
 verifyEnvelope(envelope,source,provenance);
 // Detect accidental corruption, and semantic corruption even if re-hashed.
 const clone=()=>JSON.parse(JSON.stringify(envelope));
 const tamper=fn=>{const x=clone();fn(x.payload);assert.throws(()=>verifyEnvelope(x,source,provenance));};
 const rehash=fn=>{const x=clone();fn(x.payload);x.sha256=digest(x.payload);assert.throws(()=>verifyEnvelope(x,source,provenance));};
 tamper(x=>{x.records[0].periods[0].fromAge++;});
 rehash(x=>{x.records.pop();});
 rehash(x=>{x.records[0].periods[1]=x.records[0].periods[0];});
 rehash(x=>{x.records[0].natal[0].source=!x.records[0].natal[0].source;});
 rehash(x=>{x.counts[IDS[0]].bothPositive++;});
 rehash(x=>{x.provenance.sourceCommit='fake';});
 rehash(x=>{x.flags.mayIncreaseMapping=true;});
 const out=path.join(ROOT,'.r85-pinned-default-void-evidence.json');
 fs.writeFileSync(out,JSON.stringify(envelope,null,2)+'\n');
 const reread=JSON.parse(fs.readFileSync(out,'utf8'));
 verifyEnvelope(reread,source,provenance);
 console.log('R85 evidence summary: '+JSON.stringify({sha256:envelope.sha256,provenance,scope:payload.scope,counts:payload.counts,flags:FLAGS}));
}
if(require.main===module)run();
module.exports=Object.freeze({SCHEMA,verifyEnvelope,buildRecords,totals});
