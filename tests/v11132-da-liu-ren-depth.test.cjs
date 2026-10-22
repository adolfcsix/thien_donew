'use strict';
const {test}=require('node:test');const a=require('node:assert/strict');
const {readFileSync}=require('node:fs');const {resolve}=require('node:path');
const D=require('../packages/astrology-engine/src/da-liu-ren-depth.cjs');
const base=(dayStem,dayBranch,monthGeneral,divinationHour)=>({dayStem,dayBranch,monthGeneral,divinationHour,dayNight:'manual',manualPeriod:'day'});
const classical=[
 // Yuan Shushan 大六壬探原 推演篇: independent, hand-transcribed examples with named 9 gates.
 ['Giáp','Tý','Tuất','Dần','Tuất Ngọ Dần','zei-ke'],
 ['Đinh','Sửu','Thân','Tý','Tỵ Sửu Dậu','zei-ke'],
 ['Nhâm','Thìn','Tỵ','Dần','Tuất Sửu Thìn','yao-ke'],
 ['Nhâm','Thân','Mùi','Thìn','Tỵ Thân Hợi','yao-ke'],
 ['Mậu','Dần','Tý','Thân','Sửu Ngọ Dậu','mao-xing'],
 ['Đinh','Hợi','Mão','Tý','Ngọ Tuất Dần','mao-xing'],
 ['Bính','Thìn','Ngọ','Tỵ','Hợi Ngọ Ngọ','bie-ze'],
 ['Tân','Dậu','Hợi','Tý','Sửu Dậu Dậu','bie-ze'],
 ['Giáp','Dần','Tý','Mão','Sửu Hợi Hợi','ba-zhuan'],
 ['Đinh','Mùi','Sửu','Tuất','Hợi Tuất Tuất','ba-zhuan'],
 ['Kỷ','Mùi','Ngọ','Thìn','Dậu Dậu Dậu','ba-zhuan'],
 ['Canh','Tuất','Hợi','Tỵ','Dần Thân Dần','fan-yin'],
 ['Tân','Sửu','Thân','Dần','Hợi Mùi Thìn','fan-yin'],
 ['Quý','Sửu','Tý','Tý','Sửu Tuất Mùi','fu-yin'],
 ['Bính','Thìn','Dần','Dần','Tỵ Thân Dần','fu-yin'],
 ['Nhâm','Thìn','Hợi','Hợi','Hợi Thìn Tuất','fu-yin']
];
for(const [s,b,g,h,expected,gate] of classical)test(`Independent classical ${gate}: ${s}${b} ${g} tướng ${h} giờ`,()=>{
 const x=D.buildDepth(base(s,b,g,h));a.equal(x.verdict,'derived-subroutine-only');a.equal(x.gate,gate);a.deepEqual(x.transmissions.sequence,expected.split(' '));a.equal(x.fourLessons.lessons.length,4);a.equal(x.generals.positions.length,12);
});
test('Classic twelve generals: day/night independently selected, noble anchored in heaven then earth',()=>{
 const day=D.buildDepth(base('Giáp','Tý','Sửu','Tý'));a.equal(day.generals.nobleHeaven,'Sửu');a.equal(day.generals.nobleEarth,'Tý');a.equal(day.generals.direction,'thuận');a.equal(day.generals.positions.find(p=>p.earth==='Tý').general,'Quý Nhân');a.equal(day.generals.positions.find(p=>p.earth==='Sửu').general,'Đằng Xà');
 const night=D.buildDepth({...base('Giáp','Tý','Sửu','Tý'),manualPeriod:'night'});a.equal(night.generals.nobleHeaven,'Mùi');a.equal(night.generals.nobleEarth,'Ngọ');a.equal(night.generals.direction,'nghịch');a.equal(night.generals.positions.find(p=>p.earth==='Ngọ').general,'Quý Nhân');a.equal(night.generals.positions.find(p=>p.earth==='Tỵ').general,'Đằng Xà');
 const unknown=D.buildDepth({...base('Giáp','Tý','Sửu','Tý'),manualPeriod:null});a.equal(unknown.generals.positions,null);a.equal(unknown.generals.status,'missing-day-night');a.deepEqual(unknown.fourLessons.lessons,day.fourLessons.lessons);
 const byHour=D.buildDepth({...base('Giáp','Tý','Sửu','Mão'),dayNight:'hour-mao-shen',manualPeriod:null});a.equal(byHour.generals.period,'day');
});
test('V11.144 routes She Hai while v11.132 remains reproducible by method',()=>{
 const input=base('Đinh','Mão','Sửu','Tý');
 const x=D.buildDepth(input);a.equal(x.gate,'she-hai');a.equal(x.verdict,'derived-subroutine-only');a.ok(x.sheHai.scored.length>=2);
 const legacy=D.buildDepthByMethod(input,D.LEGACY_RULESET);a.equal(legacy.verdict,'unresolved');a.equal(legacy.transmissions,null);
});
test('Strict valid input, deterministic plate and immutable reported branches',()=>{
 for(const bad of [{...base('Giáp','Tý','Tý','Tý'),dayBranch:'Sửu'}, {...base('Giáp','Tý','Tý','Tý'),monthGeneral:'wrong'},{...base('Giáp','Tý','Tý','Tý'),dayNight:'solar-clock'}, {...base('Giáp','Tý','Tý','Tý'),date:'2026-01-01'},null,[]])a.throws(()=>D.buildDepth(bad));
 for(const general of D.BRANCHES){const r=D.buildDepth(base('Ất','Hợi',general,'Tý'));a.equal(new Set(r.fourLessons.plate.positions.map(p=>p.heaven)).size,12);a.equal(new Set(r.generals.positions.map(p=>p.general)).size,12);a.equal(r.fourLessons.plate.positions.length,12);a.ok(Object.isFrozen(r));a.ok(Object.isFrozen(r.trace));}
});
test('All 720 canonical cases: immutable, no fabricated triple for unresolved; source profiles named',()=>{
 const totals={}, statuses={};let count=0;
 for(let i=0;i<60;i++)for(const general of D.BRANCHES){const x=D.buildDepth(base(D.STEMS[i%10],D.BRANCHES[i%12],general,'Tý'));count++;totals[x.gate]=(totals[x.gate]||0)+1;statuses[x.verdict]=(statuses[x.verdict]||0)+1;
  a.equal(x.ruleSet,D.RULESET);a.ok(D.GATE_NAMES[x.gate]);
  if(x.verdict==='unresolved'){a.equal(x.transmissions,null);a.ok(x.reason);}else{a.equal(x.transmissions.sequence.length,3);a.ok(x.transmissions.sequence.every(v=>D.BRANCHES.includes(v)));}
  a.equal(new Set(x.generals.positions.map(p=>p.general)).size,12);
 }
 a.equal(count,720);a.equal(Object.values(totals).reduce((a,b)=>a+b,0),720);
 for(const g of Object.keys(D.GATE_NAMES))a.ok(totals[g]>0,g);
 a.equal(statuses.unresolved||0,0);a.equal(statuses['derived-subroutine-only'],720);
});
test('V11.132 persistent snapshot validation rejects unknown/mixed methods',()=>{
 const s={method:D.RULESET,...base('Giáp','Tý','Tuất','Dần'),source:'Trung khí xác minh'};
 a.deepEqual(D.validateDaLiuRenSnapshot(s),s);
 for(const value of [{...s,date:'2026-10-14'},{...s,method:'made-up'},{...s,dayBranch:'Sửu'},{...s,source:'x'.repeat(201)}])a.throws(()=>D.validateDaLiuRenSnapshot(value));
});
test('Research engine is additive: no modifications to legacy three-transmissions or Ziwei required',()=>{
 const old=readFileSync(resolve(__dirname,'../packages/astrology-engine/src/da-liu-ren-three-transmissions.cjs'),'utf8');a.match(old,/partial-research-v1/);
 const page=readFileSync(resolve(__dirname,'../apps/web/src/app/dai-luc-nham/page.tsx'),'utf8');a.match(page,/DaLiuRenPanel/);
});
