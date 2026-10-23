'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const {join,resolve}=require('node:path');
const root=resolve(__dirname,'..');
const text=p=>readFileSync(join(root,p),'utf8');
const R=require('../packages/knowledge/src/tinh-canh-ranks.cjs');
const counts={'hoc-gia':18,'luan-gia':18,'kham-pha-gia':18,'nguoi-dan-loi':18};
test('six ordered stages with exactly eighteen canonical names',()=>{
 assert.equal(R.stages.length,6);assert.equal(R.ranks.length,18);
 assert.deepEqual(R.stages.map(x=>x[1].length),[3,3,3,3,3,3]);
 assert.deepEqual(R.ranks.map(r=>r.name),['Tinh Mầm','Sơ Kiến','Tầm Quang','Quan Tượng','Tầm Tinh','Tinh Hành','Giải Tượng','Thông Huyền','Minh Tinh','Huyền Văn','Thiên Cơ','Ngự Tinh','Tinh Chủ','Vạn Tượng','Thái Hư','Thiên Khải','Tinh Hà Bất Diệt','Vô Cực Tinh Đồ']);
});
test('all medallion IDs and effects distinguish 18 levels',()=>{
 assert.equal(new Set(R.ranks.map(x=>x.badge)).size,18);assert.deepEqual(R.ranks.map(x=>x.level),Array.from({length:18},(_,i)=>i+1));
 assert.equal(R.ranks[8].effect,'static');assert.notEqual(R.ranks[9].effect,'static');assert.equal(R.ranks[17].effect,'infinite-cosmos');
});
test('thresholds are integer, strictly ascending, independent of wall clock',()=>{
 const x=R.ranks.map(x=>x.points);assert.equal(x[0],0);assert.ok(x.every(Number.isInteger));assert.ok(x.slice(1).every((a,i)=>a>x[i]));
 assert.equal(R.evaluate(0).rank.level,1);assert.equal(R.evaluate(19).rank.level,1);
});
test('exact threshold yields each rank given required verified diversity',()=>{
 for(const x of R.ranks)assert.equal(R.evaluate(x.points,counts).rank.level,x.level,x.name);
});
test('cannot skip contribution milestone with point grinding',()=>{
 const x=R.evaluate(100000,{'hoc-gia':99});assert.equal(x.rank.level,3);assert.equal(x.blockedBy.level,4);
 const y=R.evaluate(100000,{'hoc-gia':45,'luan-gia':1});assert.equal(y.rank.level,9);
});
test('one historic forum award contributes one verified path; no manufactured level 18',()=>{
 const x=R.evaluate(1000,{'hoc-gia':20},2,1);assert.equal(x.points,1002);assert.equal(x.directions['luan-gia'],0);assert.equal(x.rank.level,9);
});
test('no fractional, negative, NaN, infinity, or overflow credits',()=>{
 for(const n of [-1,0.2,Infinity,NaN,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>R.evaluate(n));
 assert.throws(()=>R.evaluate(4,{'hoc-gia':-1}));
});
test('all six categories have fixed non-client-controlled credit values',()=>{
 assert.equal(Object.keys(R.awards).length,6);
 for(const v of Object.values(R.awards)){assert.ok(R.directions.includes(v.direction));assert.ok(Number.isInteger(v.points)&&v.points>0&&v.points<=50);}
});
test('schema keeps member deletion possible while denying user UPDATE / DELETE permissions',()=>{
 const s=text('infrastructure/db/026_tinh_canh_points.sql');
 assert.match(s,/CREATE TABLE tinh_van_awards/);assert.match(s,/UNIQUE \(source_id\)/);
 assert.match(s,/REFERENCES users\(id\) ON DELETE CASCADE/);
 assert.match(s,/CREATE TABLE tinh_van_reversals/);assert.match(s,/award_id BIGINT NOT NULL UNIQUE/);
 assert.match(s,/BEFORE UPDATE ON tinh_van_awards/);assert.match(s,/CONSTRAINT award_policy_check/);
 assert.doesNotMatch(s,/BEFORE UPDATE OR DELETE ON tinh_van_awards/);
 assert.match(s,/GRANT SELECT,INSERT ON tinh_van_awards,tinh_van_reversals/);
 assert.doesNotMatch(s,/GRANT (?:DELETE|UPDATE).*ON tinh_van_awards/);
});
test('every administrator award validates evidence and requires fresh MFA',()=>{
 const s=text('apps/api/src/modules/tinh-canh/tinh-canh.service.ts');
 assert.match(s,/requireAdmin\(req,false,true\)/);assert.match(s,/assertWriteInTransaction\(c,req,actor.id,false\)/);
 for(const x of ['forum_comments','study_entries','van_kho_documents','forum_suspensions','account_blocks'])assert.ok(s.includes(x),x);
 assert.match(s,/ON CONFLICT\(source_id\) DO NOTHING/);
 assert.match(s,/admin_audit/);assert.ok(!s.includes('points: b.points'));
});
test('all public score APIs calculate from PostgreSQL, not browser',()=>{
 const controller=text('apps/api/src/modules/tinh-canh/tinh-canh.controller.ts');
 assert.match(controller,/@Get\('leaderboard'\)/);assert.match(controller,/@Patch\('me\/privacy'\)/);
 assert.match(controller,/@Post\('admin\/awards'\)/);assert.match(controller,/@Post\('admin\/awards\/:id\/revoke'\)/);
 const service=text('apps/api/src/modules/tinh-canh/tinh-canh.service.ts');
 assert.match(service,/LEFT JOIN tinh_van_reversals/);assert.match(service,/forum_tinh_van_ledger/);
 assert.match(service,/public_rank=false/);
});
test('badge components include unique geometry and reduced-motion override',()=>{
 const component=text('apps/web/src/components/tinh-canh-medal.tsx');const css=text('apps/web/src/components/tinh-canh-medal.module.css');
 assert.match(component,/points\(6\+stage/);assert.match(component,/l>=17/);assert.match(component,/l===18/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/animation:none!important/);
});
test('migration and restore contract include 026 without rewriting older ledger',()=>{
 const files=readdirSync(join(root,'infrastructure/db')).filter(x=>/^\d{3}_.+\.sql$/.test(x));
 assert.equal(files.length,37);assert.ok(files.includes('025_forum_moderation.sql'));assert.ok(files.includes('026_tinh_canh_points.sql'));assert.ok(files.includes('027_tinh_canh_manual_grants.sql'));
 const restore=text('infrastructure/production/restore-drill.sh');assert.match(restore,/026_tinh_canh_points.sql/);
 assert.match(restore,/verifiedMigrationNames:37/);
});
