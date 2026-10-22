'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const data=require('../apps/web/src/lib/portal-v11163-content.json');
const {validKind,validSlug,safeHref,parseDraft}=require('../apps/api/src/modules/portal/portal-contract.cjs');
function read(name){return readFileSync(join(root,name),'utf8');}
const good={title:'Bài hướng dẫn chuẩn',summary:'Thử nghiệm',body:'## Mục tiêu\n'+'Nội dung được xác minh kỹ thuật. '.repeat(4),toolHref:'/chart',relatedHref:'/van-kho'};
test('15 dedicated guide categories, no Account or Explore as top-level category',()=>{
 const guides=data.filter(x=>x.kind==='guide');assert.equal(guides.length,15);assert.equal(new Set(guides.map(x=>x.slug)).size,15);
 for(const g of guides){assert.ok(g.sections.length>=11,g.slug);assert.ok(g.sections.some(x=>/Cơ bản/.test(x.title)));assert.ok(g.sections.some(x=>/Chuyên sâu/.test(x.title)));assert.ok(g.sections.some(x=>/Giới hạn/.test(x.title)));assert.ok(g.sections.some(x=>/bước/.test(x.title)));assert.ok(g.body.length>1600,g.slug);assert.ok(safeHref(g.tool));}
 assert.ok(guides.every(g=>!['tai-khoan','kham-pha'].includes(g.slug)));
});
test('8 distinct policy drafts do not impersonate an effective legal agreement',()=>{
 const p=data.filter(x=>x.kind==='policy');assert.equal(p.length,8);assert.ok(p.every(x=>x.reviewStatus==='legal_draft'));assert.ok(p.every(x=>x.sections.length>=4));
 const docs=read('apps/web/src/features/portal/portal-reader.tsx');assert.match(docs,/Dự thảo|dự thảo/);assert.match(docs,/legalDraft/);
});
test('All seeded pages use stable unique keys and are present in migration',()=>{
 const sql=read('infrastructure/db/029_guides_policies_cms.sql');assert.equal((sql.match(/INSERT INTO portal_documents\(/g)||[]).length,23);assert.equal((sql.match(/INSERT INTO portal_revisions\(/g)||[]).length,23);
 assert.equal(new Set(data.map(x=>x.kind+'/'+x.slug)).size,23);
 for(const item of data){assert.ok(validKind(item.kind));assert.ok(validSlug(item.slug));assert.ok(sql.includes("slug='"+item.slug+"'"),item.slug);assert.ok(safeHref(item.related));}
});
test('CMS never publishes a draft revision before approval',()=>{
 const service=read('apps/api/src/modules/portal/portal.service.ts');
 assert.match(service,/published_revision/);assert.match(service,/version=d.published_revision/);
 assert.match(service,/row\.last_editor===actor\s*\|\|\s*row\.created_by===actor/);
 assert.match(service,/expectedRevision/);assert.match(service,/assertWriteInTransaction/);assert.match(service,/admin_audit/);
 assert.match(service,/requireAdmin/);assert.match(service,/['"]pending['"]/);
});
test('Markdown parser rejects script, HTML img and remote images',()=>{
 for(const x of ['<script>alert(1)</script>','<iframe src="http://x"></iframe>','<svg onload=x></svg>','<img src="x">','![img](https://bad.example/a.svg)','![img](data:image/png;base64,xx)','![img](javascript:alert(1))']){
  assert.throws(()=>parseDraft({...good,body:good.body+'\n'+x}),undefined,x);
 }
 assert.deepEqual(parseDraft(good),{...good,body:good.body.trim()});
});
test('No external destination or protocol-relative URI can appear in guide link fields',()=>{
 for(const url of ['https://evil.test','//evil.test','/a?redirect=https://evil.test','javascript:alert(1)','/../admin','/a#x','/%0a'])assert.equal(safeHref(url),false,url);
 assert.equal(safeHref('/academy/tu-vi'),true);
});
test('CMS endpoints do not expose admin data on anonymous route',()=>{
 const ctrl=read('apps/api/src/modules/portal/portal.controller.ts');const svc=read('apps/api/src/modules/portal/portal.service.ts');
 assert.match(ctrl,/@Get\('public\/:kind\/:slug'\)/);assert.match(ctrl,/@Get\('admin\/documents'\)/);assert.match(svc,/async adminList\(req:Request\)\{await this\.mfa\.requireAdmin/);
 assert.match(svc,/current_revision/);assert.match(svc,/published_revision/);
});
test('Links to all policies appear in persistent site footer',()=>{
 const shell=read('apps/web/src/components/shell.tsx');for(const slug of ['dieu-khoan','quyen-rieng-tu','du-lieu-ca-nhan','thanh-toan-hoan-tien','cong-dong','ban-quyen','bao-cao-vi-pham','lien-he-ho-tro'])assert.ok(shell.includes('/phap-ly/'+slug),slug);
 assert.ok(shell.includes('/huong-dan'));assert.ok(shell.includes('/ho-tro'));
});
test('Original older migrations unchanged; new SQL is an additive 029 step',()=>{
 const files=readdirSync(join(root,'infrastructure/db')).filter(x=>/^\d{3}_[\w-]+\.sql$/.test(x)).sort();assert.equal(files.length,36);assert.equal(files[29],'030_admin_insights.sql');assert.equal(files[32],'033_community_experts_access.sql');assert.equal(files[33],'034_admin_badge_showcase.sql');assert.equal(files[34],'035_admin_trusted_devices.sql');assert.equal(files.at(-1),'036_specialty_badges.sql');
 assert.match(read('infrastructure/production/restore-drill.sh'),/029_guides_policies_cms\.sql/);
});
test('Accessibility uses a responsive TOC, headings and visible search status',()=>{
 const catalog=read('apps/web/src/features/portal/portal-catalog.tsx');const reader=read('apps/web/src/features/portal/portal-reader.tsx');const css=read('apps/web/src/features/portal/portal.module.css');
 assert.match(catalog,/type="search"/);assert.match(catalog,/role="status"/);assert.match(reader,/<details className=\{styles\.tocMobile\}/);assert.match(reader,/aria-label="Mục lục của bài"/);assert.match(css,/prefers-reduced-motion/);
});
