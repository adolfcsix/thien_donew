'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join,resolve}=require('node:path');
const root=resolve(__dirname,'..');
const t=p=>readFileSync(join(root,p),'utf8');
const svc=t('apps/api/src/modules/tinh-canh/tinh-canh.service.ts');
const ctl=t('apps/api/src/modules/tinh-canh/tinh-canh.controller.ts');
const sql=t('infrastructure/db/027_tinh_canh_manual_grants.sql');
const ui=t('apps/web/src/app/admin/tinh-canh/page.tsx');
const me=t('apps/web/src/app/tinh-canh/page.tsx');
test('V11.160.1 preserves all 18 canonical levels without changing scoring',()=>{
 const R=require('../packages/knowledge/src/tinh-canh-ranks.cjs');
 assert.equal(R.ranks.length,18);
 assert.equal(R.ranks[0].name,'Tinh Mầm');assert.equal(R.ranks[17].name,'Vô Cực Tinh Đồ');
 assert.equal(R.evaluate(0).rank.level,1);
});
test('only MFA-verified administrators may grant, replace, revoke rank',()=>{
 assert.match(svc,/async grantRank\(req:Request/);
 assert.match(svc,/async revokeRank\(req:Request/);
 const authenticated=(svc.match(/this\.mfa\.requireAdmin\(req,false,true\)/g)||[]).length;
 assert.ok(authenticated>=4,`expected MFA on awards and rank mutations, got ${authenticated}`);
 assert.match(svc,/assertWriteInTransaction\(c,req,actor\.id,false\)/);
 assert.match(ctl,/@Post\('admin\/rank-grants'\)/);
 assert.match(ctl,/@Post\('admin\/rank-grants\/:id\/revoke'\)/);
});
test('level is strict integer from 1 to 18, independent of earned points',()=>{
 assert.match(svc,/typeof level!=='number'\|\|!Number\.isSafeInteger\(level\)\|\|level<1\|\|level>18/);
 assert.match(sql,/CHECK \(level BETWEEN 1 AND 18\)/);
 assert.match(svc,/pointsChanged:false/);
 assert.doesNotMatch(svc,/SET points=\$|UPDATE tinh_van_awards SET points/);
});
test('administrators cannot grant themselves rank; blocked accounts rejected',()=>{
 assert.match(svc,/if\(target===actor\.id\)throw new ForbiddenException\('Không được tự cấp cảnh giới'\)/);
 assert.match(sql,/rank_grant_no_self_award/);
 assert.match(svc,/SELECT 1 FROM account_blocks WHERE user_id=\$1/);
});
test('each admin grant and revocation requires reason and append-only audit',()=>{
 assert.match(sql,/CREATE TABLE tinh_canh_rank_grants/);
 assert.match(sql,/CREATE TABLE tinh_canh_rank_revocations/);
 assert.match(sql,/BEFORE UPDATE ON tinh_canh_rank_grants/);
 assert.match(sql,/BEFORE UPDATE ON tinh_canh_rank_revocations/);
 assert.match(sql,/length\(btrim\(reason\)\) BETWEEN 12 AND 600/g);
 assert.match(svc,/tinhcanh\.rank\.grant/);
 assert.match(svc,/tinhcanh\.rank\.revoke/);
 assert.match(svc,/admin_audit/);
});
test('parallel admin operations on same member are serialized by PostgreSQL',()=>{
 const matching=svc.match(/SELECT id FROM users WHERE id=\$1 FOR UPDATE/g)||[];
 assert.ok(matching.length>=2);
 assert.match(svc,/ORDER BY g\.id DESC LIMIT 1 FOR UPDATE OF g/);
 assert.match(svc,/Chỉ được thu hồi quyết định đang có hiệu lực/);
});
test('assignment replaces active manual grant with revocation, preserving history',()=>{
 assert.match(svc,/INSERT INTO tinh_canh_rank_revocations\(grant_id,actor_id,reason\)/);
 assert.match(svc,/Thay thế bằng quyết định cấp cảnh giới mới của Admin/);
 assert.match(svc,/rankSource:manual\?'admin':'earned'/);
 assert.match(svc,/earnedRank:earned\.rank/);
});
test('member and global public leaderboard show manual medal but preserve points',()=>{
 assert.match(svc,/manual AS \(/);
 assert.match(svc,/0::bigint AS points/);
 assert.match(svc,/t\.points DESC/);
 assert.match(svc,/public_rank=false/);
 assert.match(me,/mine\.progress\.earnedRank\.name/);
 assert.match(me,/x\.rankSource==='admin'/);
});
test('Admin UX supports email search, all 18 levels, reason, and revocation',()=>{
 assert.match(ui,/\/api\/admin\/users\?q=/);
 assert.match(ui,/\/api\/tinh-canh\/admin\/rank-grants/);
 assert.match(ui,/minLength=\{12\}/);
 assert.match(ui,/maxLength=\{600\}/);
 assert.match(ui,/Cấp \/ thay đổi cảnh giới/);
 assert.match(ui,/Thu hồi/);
});
test('new migration preserved in isolated restore gate',()=>{
 const restore=t('infrastructure/production/restore-drill.sh');
 const ops=t('infrastructure/production/ops-check.mjs');
 assert.match(restore,/027_tinh_canh_manual_grants\.sql/);
 assert.match(restore,/verifiedMigrationNames:36/);
 assert.match(ops,/verifiedMigrationNames>=36/);
});
