'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {validateBirthProfile}=require('../apps/api/src/modules/birth-profiles/birth-profile-validation.cjs');
const {workspaceIndex,searchWorkspace,fold}=require('../apps/web/src/features/unified-room/workspace-index.cjs');
const {compareStudyEntries}=require('../apps/web/src/features/unified-room/study-comparison.cjs');
const sample={name:'Tử Vi Hà Nội',date:'2004-02-29',hour:23,minute:30,calendar:'solar',leap:false,gender:'Nam',timeZone:'Asia/Ho_Chi_Minh',birthPlace:'Hải Phòng',latitude:20.85,longitude:106.68,timeAccuracy:'estimated',notes:'Chưa xác minh giờ sinh'};
test('accept exact valid leap-day, coords, timezone and output-only known fields',()=>{
 const p=validateBirthProfile(sample);assert.equal(p.date,'2004-02-29');assert.equal(p.latitude,20.85);assert.equal(Object.keys(p).length,13);
});
test('never fabricate clock time from an unknown birth hour',()=>{
 const p=validateBirthProfile({...sample,hour:null,minute:null,timeAccuracy:'unknown'});assert.equal(p.hour,null);assert.equal(p.minute,null);
 assert.throws(()=>validateBirthProfile({...sample,hour:null,minute:20}),/Giờ và phút/);
 assert.throws(()=>validateBirthProfile({...sample,timeAccuracy:'unknown'}),/chắc chắn/);
 assert.throws(()=>validateBirthProfile({...sample,hour:null,minute:null,timeAccuracy:'exact'}),/chắc chắn/);
});
test('reject invalid source calendar, future/invalid date, timezone and coordinate pairs',()=>{
 for(const input of [
  {...sample,date:'2003-02-29'}, {...sample,date:'2101-01-01'},
  {...sample,calendar:'solar',leap:true},{...sample,calendar:'gregorian'},
  {...sample,timeZone:'Moon/City'}, {...sample,longitude:null},
  {...sample,latitude:91},{...sample,gll:'surprise'}
 ])assert.throws(()=>validateBirthProfile(input));
});
test('no HTML markup, negative hour, duplicate invalid data or overlong notes',()=>{
 assert.throws(()=>validateBirthProfile({...sample,name:'<script>'}));
 assert.throws(()=>validateBirthProfile({...sample,hour:-1}));
 assert.throws(()=>validateBirthProfile({...sample,notes:'a'.repeat(1001)}));
});
test('search collapses accents and Vietnamese d-bar, across private owner inputs and public tools',()=>{
 const i=workspaceIndex({profiles:[{id:'owner-A',name:'Đặng Tâm',date:'2004-01-01',birthPlace:'Hải Phòng'}],
 charts:[{id:'chart-a',label:'Hồ sơ Lập Tử Vi',date:'2004-01-01',gender:'Nam'}],
 entries:[{id:'e-a',title:'Đại Lục Nhâm',summary:'Tứ Khóa',notes:'Nguồn',discipline:'dai-luc-nham',tags:['khảo cứu']}],
 navigation:[{href:'/study',text:'Thư phòng',caption:'Lưu trữ',keywords:'nghien cuu'}]});
 assert.equal(searchWorkspace(i,'dang tam')[0].id,'owner-A');
 assert.equal(searchWorkspace(i,'hai phong')[0].kind,'profile');
 assert.equal(searchWorkspace(i,'lap tu vi')[0].kind,'chart');
 assert.equal(searchWorkspace(i,'tu khoa')[0].kind,'study');
 assert.equal(searchWorkspace(i,'thu phong')[0].kind,'tool');
 assert.equal(searchWorkspace(i,' ')[0],undefined);
 assert.equal(fold('Đại Lục Nhâm'),'dai luc nham');
});
test('comparison is structural only, allows 2–3 and rejects duplicates',()=>{
 const a={id:'a',title:'A',discipline:'mai-hoa',updatedAt:'2026-01-01',snapshot:{method:'x',date:'2004-01-01',hour:8,nested:{abc:1}}};
 const b={id:'b',title:'B',discipline:'luc-hao',updatedAt:'2026-01-02',snapshot:{method:'y',date:'2004-01-01',hour:9}};
 const r=compareStudyEntries([a,b]);assert.equal(r.sameDiscipline,false);assert.equal(r.sameMethod,false);
 assert.equal(r.fields.find(f=>f.key==='date').match,true);assert.equal(r.fields.find(f=>f.key==='hour').match,false);
 assert.equal(r.fields.find(f=>f.key==='nested'),undefined);
 assert.throws(()=>compareStudyEntries([a,a]));assert.throws(()=>compareStudyEntries([a]));
});
test('schema migrations append safely and enforce owner-scoped relationships',()=>{
 const migration=fs.readFileSync(path.join(__dirname,'../infrastructure/db/012_unified_birth_profiles.sql'),'utf8');
 assert.match(migration,/REFERENCES users\(id\) ON DELETE CASCADE/);
 assert.match(migration,/FOREIGN KEY \(birth_profile_id,user_id\)/);
 assert.match(migration,/ON DELETE SET NULL \(birth_profile_id\)/);
 assert.match(migration,/ha-lac.*thiet-ban.*lich-phap/);
 assert.doesNotMatch(migration,/DROP TABLE|DELETE FROM charts|TRUNCATE/i);
});
