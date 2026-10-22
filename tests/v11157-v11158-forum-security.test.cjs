const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const s=read('apps/api/src/modules/forum/forum.service.ts');
const m=read('apps/api/src/modules/forum/forum-moderation.service.ts');
const c=read('apps/api/src/modules/forum/forum.controller.ts');
const db1=read('infrastructure/db/024_forum_community.sql');const db2=read('infrastructure/db/025_forum_moderation.sql');
test('thread writes require authenticated user and DB author lock',()=>{assert.match(s,/this\.auth\.required\(req\)/);assert.match(s,/this\.row\(c,id,user\.id,true\)/);assert.match(s,/old\.revision/);});
test('all sensitive admin writes recheck session MFA in same transaction',()=>{assert.match(m,/requireAdmin\(req,false,sensitive\)/);assert.match(m,/this\.mfa\.assertWriteInTransaction\(c,req,user\.id,false\)/);});
test('forum accepts ONLY a verified, bounded raster image with owner, role and visibility protection',()=>{
 assert.match(c,/@Post\('media'\) imageUpload/);assert.match(c,/@Get\('threads\/:id\/image'\) image/);
 assert.match(s,/validatedImage\(req.body,req.headers\['content-type'\]\)/);
 assert.match(s,/await this.active\(c,user.id\)/);assert.match(s,/this.limit\(c,user.id,'image',10\)/);
 assert.match(s,/AND t.state='visible'|WHERE t.id=\$2 AND \${publicFilter}/);
 assert.match(s,/m.user_id=\$3|user_id=\$3/);
 assert.match(s,/imageId:string,threadId:string,userId:string/);
 assert.doesNotMatch(s,/multer|writeFile|readFile|createWriteStream/);
});
test('forum DOB cannot flow from chart into response',()=>{assert.match(s,/SELECT 1 FROM charts WHERE id=\$1 AND user_id=\$2/);assert.doesNotMatch(s,/birth_date|birth_time|birth_hour/);});
test('member-level private access at backend for reads and writes',()=>{assert.match(s,/t\.visibility==='private'&&viewer!==t\.author_id/);assert.match(s,/t\.visibility='public'.*t\.visibility='members'/s);assert.match(m,/view\.visibility==='private'/);});
test('spam limits use persisted hourly DB windows and advisory transaction lock',()=>{assert.match(s,/pg_advisory_xact_lock/);assert.match(s,/forum_action_limits/);assert.match(db1,/PRIMARY KEY\(user_id,action,window_start\)/);});
test('soft delete clears body and chart reference; moderator cannot restore author-deleted',()=>{assert.match(s,/state='deleted',body='',title='Bài viết đã xóa',chart_id=NULL/);assert.match(m,/if\(x\.state==='deleted'\)throw/);});
test('moderation appeal requires owner and hidden content',()=>{assert.match(m,/content\.author_id!==user\.id\|\|content\.state!=='hidden'/);});
test('report queue and audit are admin protected',()=>{assert.match(m,/async queue\(req:Request\)\{await this\.admin/);assert.match(m,/async audit\(req:Request\)\{await this\.admin/);});
test('Tinh Văn ledger only for moderated helpful answer with distinct reactions',()=>{assert.match(m,/if\(votes<2\)/);assert.match(db2,/CREATE UNIQUE INDEX forum_tinh_van_award_once/);assert.match(db2,/points SMALLINT NOT NULL CHECK\(points IN \(-2,2\)\)/);});
test('reactions are unique by user, target and kind despite nullable target',()=>{assert.match(db1,/CREATE UNIQUE INDEX forum_reaction_thread_unique/);assert.match(db1,/CREATE UNIQUE INDEX forum_reaction_comment_unique/);assert.doesNotMatch(db1,/PRIMARY KEY\(user_id,kind,thread_id,comment_id\)/);});
test('user ownership and IDs never trusted via request body',()=>{assert.doesNotMatch(c,/@Body\(\)\s*userId/);assert.match(s,/this\.auth\.required\(req\)/);});
test('moderation never deletes source content outright',()=>{assert.doesNotMatch(m,/DELETE FROM forum_threads/);assert.doesNotMatch(m,/DELETE FROM forum_comments/);});
test('forum suspension cannot disable global owner/admin',()=>{assert.match(m,/SELECT 1 FROM admin_memberships WHERE user_id=\$1/);});

test('forum composer and personal inbox require login, public discussions do not',()=>{const {requiresToolLogin}=require('../apps/web/src/lib/tool-access.cjs');assert.equal(requiresToolLogin('/forum/new'),true);assert.equal(requiresToolLogin('/forum/me'),true);assert.equal(requiresToolLogin('/forum'),false);assert.equal(requiresToolLogin('/forum/55555555-5555-4555-8555-555555555555'),false);});

test('deleting a chart revokes forum chart sharing atomically without blocking chart owner',()=>{assert.match(db1,/CREATE TRIGGER forum_chart_private_delete BEFORE DELETE ON charts/);assert.match(db1,/chart_id=NULL,chart_alias=NULL,chart_shared=FALSE/);});
