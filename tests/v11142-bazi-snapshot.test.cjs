'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const BaZi=require('../packages/astrology-engine/src/bazi.js');
const {METHOD_ID,SCHEMA_VERSION,OFFSET_MINUTES,createBaziSnapshot,validateBaziSnapshot}=require('../packages/astrology-engine/src/bazi-study-snapshot.cjs');
const {parseStudyBackup}=require('../apps/web/src/features/study-room/study-backup.cjs');
const {studyHref,readStudyInput,validSnapshot}=require('../apps/web/src/features/study-room/study-links.cjs');
const valid=()=>createBaziSnapshot({date:'2004-02-29',hour:23,minute:35,dayBoundary:'late-zi',sex:'female'});
const entry=(snapshot=valid())=>({discipline:'bazi',title:'Tứ trụ riêng',summary:'Nhật chủ và phép đổi ngày',notes:'',tags:['Bát Tự'],snapshot,pinned:true});
test('versioned input-only snapshot stores source rule IDs and UTC+7, no result or secrets',()=>{
 const s=valid();assert.equal(s.schemaVersion,SCHEMA_VERSION);assert.equal(s.methodId,METHOD_ID);
 assert.equal(s.coreRuleSet,BaZi.RULESET);assert.equal(s.daYunRuleSet,BaZi.DA_YUN_RULESET);
 assert.equal(s.utcOffsetMinutes,OFFSET_MINUTES);assert.equal(s.solarTimeCorrection,false);
 assert.equal(s.date,'2004-02-29');assert.equal(s.dayBoundary,'late-zi');
 assert.equal(s.result,undefined);assert.deepEqual(validateBaziSnapshot({...s,results:'made-up',birthProfileId:'another-owner',notes:'private'}),s);
 assert.equal(BaZi.calculate(s).pillars.day.name,BaZi.calculate({date:s.date,hour:s.hour,minute:s.minute,dayBoundary:s.dayBoundary}).pillars.day.name);
});
test('both Zi boundary rules remain distinct and male/female Da Yun convention preserved',()=>{
 const early=createBaziSnapshot({date:'2004-02-29',hour:23,minute:35,dayBoundary:'midnight',sex:'male'});
 const late=valid();assert.notEqual(BaZi.calculate(early).pillars.day.name,BaZi.calculate(late).pillars.day.name);
 assert.notEqual(BaZi.daYun(early).direction,BaZi.daYun({...early,sex:'female'}).direction);
});
test('reject unknown rules, historical offset modifications, invalid date and times, no silent normalization',()=>{
 const s=valid();for(const candidate of [
  {...s,schemaVersion:2},{...s,methodId:'bazi-researched-depth'},
  {...s,coreRuleSet:'unsupported'},{...s,daYunRuleSet:'fake'},
  {...s,utcOffsetMinutes:480},{...s,timeZone:'Asia/Shanghai'},
  {...s,solarTimeCorrection:true},{...s,date:'1900-02-29'},
  {...s,date:'1899-12-31'},{...s,date:'2101-01-01'},
  {...s,hour:24},{...s,hour:0.1},{...s,minute:60},
  {...s,sex:'unknown'},{...s,dayBoundary:'custom'},
  {...s,minute:'35'}
 ])assert.throws(()=>validateBaziSnapshot(candidate));
});
test('archive roundtrip, metadata retained; mixed previous discipline stays compatible',()=>{
 const original={format:'thien-do.study-export',version:1,entries:[entry(),{discipline:'general',title:'Cũ',summary:'',notes:'',tags:[],snapshot:{},pinned:false}]};
 const parsed=parseStudyBackup(JSON.stringify(original));assert.equal(parsed.length,2);
 assert.equal(parsed[0].discipline,'bazi');assert.equal(parsed[0].pinned,true);
 assert.deepEqual(parsed[0].snapshot,valid());assert.equal(parsed[1].discipline,'general');
 assert.throws(()=>parseStudyBackup(JSON.stringify({...original,entries:[entry({...valid(),utcOffsetMinutes:0})]})),/không hợp lệ/);
 assert.throws(()=>parseStudyBackup(JSON.stringify({...original,entries:[entry({...valid(),coreRuleSet:'invented'})]})),/không hợp lệ/);
});
test('authenticated entry restore has no private date/time query params; unauth URL fails closed',()=>{
 const s=valid();assert.equal(validSnapshot('bazi',s),true);assert.equal(studyHref('bazi',s),'/study');
 assert.equal(readStudyInput('bazi',`?restore=1&date=${s.date}`),null);
});
test('migration 014 is append-only; prior 13 types preserved; API and Web use shared validator',()=>{
 const r=path.resolve(__dirname,'..');
 const sql=fs.readFileSync(path.join(r,'infrastructure/db/014_bazi_study_snapshot.sql'),'utf8');
 const source=fs.readFileSync(path.join(r,'apps/api/src/modules/study/study-validation.ts'),'utf8');
 const page=fs.readFileSync(path.join(r,'apps/web/src/app/bazi/page.tsx'),'utf8');
 const room=fs.readFileSync(path.join(r,'apps/web/src/app/study/page.tsx'),'utf8');
 const old=fs.readFileSync(path.join(r,'infrastructure/db/012_unified_birth_profiles.sql'),'utf8');
 const match=x=>[...x.matchAll(/'([a-z][a-z-]*)'/g)].map(m=>m[1]);
 const allowed=new Set(match(sql)),before=new Set(match(old));
 for(const oldType of ['general','mai-hoa','luc-hao','ky-mon','dai-luc-nham','thai-at','phong-thuy','ha-lac','thiet-ban','lich-phap','numerology','western-astrology','tarot']){
  assert.equal(before.has(oldType),true,oldType);assert.equal(allowed.has(oldType),true,oldType);
 }
 assert.equal(allowed.has('bazi'),true);
 assert.doesNotMatch(sql,/DROP TABLE|DELETE FROM|TRUNCATE|UPDATE study_entries/i);
 assert.match(source,/validateBaziSnapshot\(input\)/);
 assert.match(page,/studyApi\.get\(id,controller.signal\)/);
 assert.match(page,/SaveStudy/);
 assert.match(room,/'bazi':'Bát Tự/);
});
