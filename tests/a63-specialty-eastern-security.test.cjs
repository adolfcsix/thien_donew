'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {join,resolve}=require('node:path');
const root=resolve(__dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');
const badges=require('../packages/knowledge/src/specialty-badges.cjs');
const service=read('apps/api/src/modules/tinh-canh/tinh-canh.service.ts');
const controller=read('apps/api/src/modules/tinh-canh/tinh-canh.controller.ts');
const sql=read('infrastructure/db/036_specialty_badges.sql');
const publicIdentity=read('apps/web/src/features/community-hub/identity.tsx');
const admin=read('apps/web/src/features/tinh-canh/specialty-badge-administration.tsx');
const scene=read('apps/web/src/features/discipline-canvas/eastern-scene.tsx');
const sceneCss=read('apps/web/src/features/discipline-canvas/eastern-scene.module.css');
const guide=read('apps/web/src/features/discipline-canvas/discipline-method-guide.tsx');
test('Catalog contains eight distinct specialist disciplines, symbols, names and nonempty explanations',()=>{
 assert.equal(badges.length,8);assert.equal(new Set(badges.map(b=>b.id)).size,8);
 assert.ok(badges.every(b=>/^[a-z][a-z0-9-]+$/.test(b.id)&&b.name&&b.symbol&&b.subject&&b.description.length>25));
});
test('Catalog JSON is the single authority for both web and API',()=>{
 assert.match(read('apps/web/src/features/tinh-canh/specialty-badge.tsx'),/knowledge\/src\/specialty-badges\.json/);
 assert.match(read('packages/knowledge/src/specialty-badges.cjs'),/require\('\.\/specialty-badges\.json'\)/);
 assert.match(service,/specialty-badges\.cjs/);
});
test('36 is additive: old 035 remains, new SQL has grants and irreversible revocation log',()=>{
 assert.ok(existsSync(join(root,'infrastructure/db/035_admin_trusted_devices.sql')));
 for(const token of ['CREATE TABLE specialty_badge_grants','CREATE TABLE specialty_badge_revocations','PRIMARY KEY REFERENCES specialty_badge_grants','REFERENCES users(id)','granted_at TIMESTAMPTZ','revoked_at TIMESTAMPTZ']) assert.ok(sql.includes(token),token);
 assert.doesNotMatch(sql,/DROP TABLE|ALTER TABLE users|UPDATE users SET/i);
});
test('API exposes protected rank-domain read, grant and revocation routes',()=>{
 for(const route of ["@Get('admin/specialty-badges')","@Post('admin/specialty-badges')","@Post('admin/specialty-badges/:id/revoke')"])assert.ok(controller.includes(route),route);
 assert.match(read('apps/api/src/modules/admin-console/permissions.ts'),/\^\\\/api\\\/tinh-canh\\\/admin/);
});
test('Mutations demand admin + recent TOTP and recheck permissions inside transaction',()=>{
 for(const name of ['grantSpecialtyBadge','revokeSpecialtyBadge']){
  const fn=service.split('async '+name+'(')[1];assert.ok(fn,name);
  const scope=fn.split('\n }')[0];assert.match(scope,/requireAdmin\(req,false,true\)/);assert.match(scope,/assertWriteInTransaction\(c,req,actor.id,false\)/);
  assert.match(scope,/admin_audit/);
 }
});
test('Grant and revoke serialize per recipient and reject duplicates/repeat actions',()=>{
 const grant=service.split('async grantSpecialtyBadge(')[1].split('async revokeSpecialtyBadge(')[0];
 assert.match(grant,/FOR UPDATE/);assert.match(grant,/ConflictException\('Thành viên đã có danh hiệu này'\)/);
 const revoke=service.split('async revokeSpecialtyBadge(')[1].split('async grantRank(')[0];
 assert.match(revoke,/ON CONFLICT\(grant_id\) DO NOTHING/);assert.match(revoke,/FOR UPDATE/);
});
test('No role, Expert, subscription or earned-rank mutation in specialty grant/revoke',()=>{
 const scope=service.split('async grantSpecialtyBadge(')[1].split('async grantRank(')[0];
 for(const forbidden of ['INSERT INTO admin_memberships','UPDATE admin_memberships','INSERT INTO expert_credentials','INSERT INTO billing_entitlements','INSERT INTO tinh_van_awards','UPDATE tinh_canh'])assert.ok(!scope.includes(forbidden),forbidden);
 assert.match(scope,/rolesChanged:false,pointsChanged:false/);
});
test('Public badge only after privacy-aware existing member profile query; not from front-end role claims',()=>{
 assert.match(service,/specialtyBadges:await this.activeSpecialtyBadges\(userId\)/);
 assert.match(service,/tinh_canh_preferences p WHERE p.user_id=u.id AND p.public_rank=false/);
 assert.match(publicIdentity,/specialtyBadgeRows\(r\)/);
 assert.match(publicIdentity,/SpecialtyBadge/);
});
test('Administrator forms are wired to API endpoints; no decorative action buttons',()=>{
 assert.match(admin,/onSubmit=\{e=>void grant\(e\)\}/);
 assert.match(admin,/onClick=\{\(\)=>void revoke\(g.id\)\}/);
 assert.match(admin,/\/api\/tinh-canh\/admin\/specialty-badges/);
 assert.match(read('apps/web/src/app/admin/tinh-canh/page.tsx'),/<SpecialtyBadgeAdministration/);
});
test('Login defaults to chart for user, never client-side grant admin',()=>{
 const source=read('apps/web/src/lib/login-destination.ts');assert.match(source,/return '\/chart'/);
 assert.match(source,/parseAdminAccess\(await api/);assert.match(source,/if\(access\.isAdmin\)/);
});
test('Eastern animation has viewport pause and reduced-motion support',()=>{
 assert.match(scene,/observeVisibleMotion/);assert.match(scene,/data-paused="true"/);
 assert.match(sceneCss,/prefers-reduced-motion:reduce/);assert.match(sceneCss,/animation-play-state:paused/);
 assert.match(scene,/Never rotates a calculated chart/);
});
test('Eastern visual variants are present on 12 named pages without duplicating scene source',()=>{
 const mapped=['chart','bazi','mai-hoa','luc-hao','ky-mon','phong-thuy','ha-lac','thiet-ban','iching','ngu-hanh','thai-at','dai-luc-nham'];
 assert.equal(mapped.length,12);
 for(const key of mapped)assert.match(read('apps/web/src/app/'+key+'/page.tsx'),/<EasternScene variant="[a-z-]+"\s*\/>/,key);
});
test('Ten Eastern disciplines include context-specific guide with valid navigation',()=>{
 for(const key of ['bazi','mai-hoa','luc-hao','ky-mon','phong-thuy','ha-lac','thiet-ban','iching','thai-at','dai-luc-nham'])assert.match(read('apps/web/src/app/'+key+'/page.tsx'),/<DisciplineMethodGuide variant="[a-z-]+"\s*\/>/,key);
 assert.match(guide,/Phân biệt/);assert.match(guide,/href="\/study"/);assert.match(guide,/href="\/research\/development"/);
});
test('No-go metadata remains honest after migration',()=>{
 const release=JSON.parse(read('infrastructure/release/current.json'));
 assert.match(release.bundleVersion,/^V11\.164\.\d+$/);assert.equal(release.status,'NO_GO');
 assert.equal(release.blockingGates.length,11);assert.ok(release.blockingGates.every(g=>g.status==='OPEN'));
 assert.equal(release.productionDatabaseTestPassed,false);
});

test('Readiness fails shut on absent 035/036 migrations and their tables',()=>{
 const health=read('apps/api/src/modules/health/health.controller.ts');
 for(const n of ['035_admin_trusted_devices.sql','036_specialty_badges.sql','admin_trusted_devices','specialty_badge_grants','specialty_badge_revocations'])assert.ok(health.includes(n),n);
 assert.match(health,/REQUIRED_MIGRATIONS/);assert.match(health,/REQUIRED_TABLES/);
});
