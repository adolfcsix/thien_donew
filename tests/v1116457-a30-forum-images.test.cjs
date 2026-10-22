const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const {validatedImage,MAX_BYTES,hasMetadata}=require('../apps/api/src/modules/forum/forum-image-contract.cjs');
const {thread,visible}=require('../apps/api/src/modules/forum/forum-contract.cjs');
const read=(p)=>readFileSync(join(root,p),'utf8');
const image=(e)=>readFileSync(join(__dirname,'fixtures/a30-forum-'+e));
const id='77777777-7777-4777-8777-777777777777';
const draft=(overrides={})=>({title:'Bài chia sẻ',category:'hoi-dap',body:'',imageId:id,...overrides});
test('accepts photo-only, text-only, mixed; blocks truly empty posts and unsupported external embeds',()=>{
 assert.equal(thread(draft()).body,'');assert.equal(thread(draft({title:''})).title,'Bài chia sẻ');assert.equal(thread(draft({title:'   '})).title,'Bài chia sẻ');
 assert.equal(thread(draft({body:'Một ý ngắn',imageId:null})).imageId,null);
 assert.equal(thread(draft({body:'Một ý ngắn'})).imageId,id);
 for(const bad of [draft({imageId:null}),draft({imageUrl:'https://evil.invalid/malicious.svg'}),draft({title:'A'}),draft({imageId:'../../'}),draft({body:'<iframe>'})])assert.throws(()=>thread(bad));
});
test('editing a photo-only thread may keep existing image, but cannot leave a thread truly empty',()=>{
 assert.equal(thread(draft({imageId:undefined}),true).body,'');
 assert.throws(()=>thread(draft({imageId:undefined})));
});
test('complete PNG JPEG WebP accepted and MIME spoofing rejected',()=>{
 for(const [ext,mime] of [['png','image/png'],['jpg','image/jpeg'],['webp','image/webp']]){
  const data=image(ext);assert.equal(validatedImage(data,mime),mime);
  assert.equal(validatedImage(data,'image/svg+xml'),null);
  assert.equal(validatedImage(data,'application/octet-stream'),null);
  assert.equal(validatedImage(data,'image/png; charset=utf-8'),null);
 }
 assert.equal(validatedImage(image('png'),'image/jpeg'),null);
});
test('rejects incomplete image, truncated content and oversized payload',()=>{
 assert.equal(MAX_BYTES,1048576);
 for(const source of ['png','webp','jpg']){
  const data=image(source), mime=source==='png'?'image/png':source==='jpg'?'image/jpeg':'image/webp';
  assert.equal(validatedImage(data.subarray(0,Math.floor(data.length/2)),mime),null);
 }
 assert.equal(validatedImage(Buffer.alloc(MAX_BYTES+1),'image/png'),null);
 assert.equal(validatedImage('not a Buffer','image/png'),null);
});
test('common JPEG EXIF fields are rejected server-side',()=>{
 const data=image('jpg'),app1=Buffer.from([0xff,0xe1,0,8,69,120,105,102,0,0]);
 const tagged=Buffer.concat([data.subarray(0,2),app1,data.subarray(2)]);
 assert.equal(hasMetadata(tagged,'jpeg'),true);
 assert.equal(validatedImage(tagged,'image/jpeg'),null);
});
test('forum media lifecycle limits visibility and links only on ownership-checked transaction',()=>{
 const s=read('apps/api/src/modules/forum/forum.service.ts');
 const sql=read('infrastructure/db/031_forum_single_image.sql');
 assert.match(s,/UPDATE forum_media SET thread_id=\$1 WHERE id=\$2 AND user_id=\$3 AND thread_id IS NULL AND expires_at>clock_timestamp\(\)/);
 assert.match(s,/JOIN forum_threads t ON t.id=m.thread_id/);
 assert.match(s,/WHERE t.id=\$2 AND \${publicFilter}/);
 assert.match(s,/await this.row\(c,id,user.id,true\)/);
 assert.match(s,/DELETE FROM forum_media WHERE thread_id=\$1/);
 assert.match(sql,/thread_id UUID UNIQUE REFERENCES forum_threads\(id\) ON DELETE CASCADE/);
 assert.match(sql,/user_id UUID NOT NULL REFERENCES users\(id\)/);
 assert.match(sql,/expires_at TIMESTAMPTZ/);
 assert.equal(visible({state:'visible',visibility:'private',author_id:id},null),false);
 assert.equal(visible({state:'visible',visibility:'private',author_id:id},id),true);
 assert.equal(visible({state:'hidden',visibility:'public',author_id:id},id),false);
});
test('composer uploads only opt-in binary photo; no chart is forced and picture routes through backend',()=>{
 const form=read('apps/web/src/app/forum/new/page.tsx'),helper=read('apps/web/src/features/forum/thread-image-upload.ts');
 const main=read('apps/api/src/main.ts'),ingress=read('infrastructure/production/nginx.conf');
 assert.match(form,/!body.trim\(\)&&!file/);assert.match(form,/imageId/);
 assert.match(form,/Tham chiếu lá số \(tùy chọn\)/);
 assert.match(helper,/canvas.toBlob/);assert.match(helper,/URL.revokeObjectURL/);
 assert.match(helper,/fetch\('\/api\/forum\/media'/);
 assert.match(main,/app.use\('\/api\/forum\/media', raw/);
 assert.match(ingress,/location = \/api\/forum\/media \{ client_max_body_size 1m;/);
});
