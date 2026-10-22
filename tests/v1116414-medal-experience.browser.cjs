/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v1116414-medal-experience');
(async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.AUTH_OTP_SECRET=randomBytes(32).toString('hex');process.env.COOKIE_SECURE='false';
 const privateWork=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'thiendo-browser-files-')),assetRoot=path.join(privateWork,'private');fs.mkdirSync(path.join(assetRoot,'books'),{recursive:true});fs.mkdirSync(path.join(assetRoot,'van-kho-media'));process.env.BOOK_PRIVATE_STORAGE_DIR=path.join(assetRoot,'books');process.env.VAN_KHO_PRIVATE_MEDIA_DIR=path.join(assetRoot,'van-kho-media');
 const pg=await PGlite.create({dataDir:'memory://'});let api,web,app,browser;const results=[],pageErrors=[];fs.mkdirSync(out,{recursive:true});function record(result){results.push(result);console.log('PASS '+result.case+(result.route?' '+result.route+' @ '+result.width:''));}
 try{
  await pg.exec('CREATE ROLE thiendo_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO thiendo_app; CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,checksum CHAR(64),applied_at TIMESTAMPTZ DEFAULT NOW())');
  for(const name of fs.readdirSync(path.join(root,'infrastructure/db')).filter(x=>/^\d{3}_.*\.sql$/.test(x)).sort()){
   const sql=fs.readFileSync(path.join(root,'infrastructure/db',name),'utf8');await pg.transaction(async tx=>{await tx.exec(sql);await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,createHash('sha256').update(sql).digest('hex')]);});
  }
  const query=async(c,sql,params)=>{try{const r=await c.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows||r.rows.length};}catch(error){console.error('SQL integration error',error.code,error.message);throw error;}};
  const db={query:(sql,p)=>query(pg,sql,p),transaction:work=>pg.transaction(tx=>work({query:(sql,p)=>query(tx,sql,p)}))};
  require('reflect-metadata');const {NestFactory}=require('@nestjs/core'),{Module}=require('@nestjs/common');
  const {AppModule}=require(path.join(root,'apps/api/dist/app.module.js')),{DatabaseService}=require(path.join(root,'apps/api/dist/common/database.service.js'));
  const delivered=new Map();require(path.join(root,'apps/api/dist/modules/auth/email-code.js')).sendVerificationCode=async(email,code)=>delivered.set(email,code);
  class BrowserSqlModule{};Module({controllers:Reflect.getMetadata('controllers',AppModule),providers:Reflect.getMetadata('providers',AppModule).map(p=>p===DatabaseService?{provide:DatabaseService,useValue:db}:p)})(BrowserSqlModule);
  api=await NestFactory.create(BrowserSqlModule,{logger:false});await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3615});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3615,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3615',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const owner=await register('owner-browser@example.invalid'),member=await register('member-browser@example.invalid');
  await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.user.id]);
  async function post(context,url,data){const r=await context.request.post(origin+url,{data});assert.equal(r.status(),200,url+' '+await r.text());return r.json();}
  const sent=await post(owner.context,'/api/auth/email/send',{});await post(owner.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(owner.email)});
  const setup=await post(owner.context,'/api/auth/mfa/setup',{password});const {totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));await post(owner.context,'/api/auth/mfa/confirm',{code:totpCode(setup.manualKey,Math.floor(Date.now()/30000))});
  const page=await owner.context.newPage();page.setDefaultTimeout(12000);
  const privateTitle='QA bài riêng chỉ tác giả được xem';
  const privatePost=await owner.context.request.post(origin+'/api/forum/threads',{data:{category:'nghien-cuu',visibility:'private',title:privateTitle,body:'Nội dung QA riêng để kiểm tra đổi phiên trên trang hồ sơ.'}});assert.equal(privatePost.status(),201);
  await page.goto(origin+'/forum/members/'+owner.user.id,{waitUntil:'networkidle'});await page.getByRole('link',{name:privateTitle,exact:true}).waitFor();
  await post(owner.context,'/api/auth/logout',{});const me=page.waitForResponse(r=>r.url().endsWith('/api/auth/me'));
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));assert.equal((await(await me).json()).user,null);
  await page.waitForFunction(()=>document.querySelector('button[aria-label="Mở tài khoản"]')?.getAttribute('title')==='Tài khoản');
  assert.equal(await page.getByRole('link',{name:privateTitle,exact:true}).count(),0,'private profile threads must disappear when account session changes without navigating');
  record({case:'profile removes previous owner private thread after session change without navigation',verdict:'PASS'});
  if(process.env.THIENDO_BROWSER_PHASE==='before')return;

  await post(owner.context,'/api/auth/login',{email:owner.email,password});
  await post(owner.context,'/api/auth/mfa/verify',{code:totpCode(setup.manualKey,Math.floor(Date.now()/30000)+1)});
  const grant=await owner.context.request.post(origin+'/api/tinh-canh/admin/rank-grants',{data:{userId:member.user.id,level:18,reason:'QA huy hiệu công khai và riêng tư trên hồ sơ.'}});assert.equal(grant.status(),201,await grant.text());
  await page.goto(origin+'/forum/members/'+member.user.id,{waitUntil:'networkidle'});
  const badge=page.locator('section[aria-label="Huy hiệu cảnh giới thành viên"]');await badge.locator('svg[data-level="18"]').waitFor();
  assert.equal((await(await member.context.request.get(origin+'/api/tinh-canh/me')).json()).progress.points,0);
  record({case:'public forum profile shows actual granted badge while verified points remain unchanged',verdict:'PASS'});
  await member.context.request.patch(origin+'/api/tinh-canh/me/privacy',{data:{publicRank:false}});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await badge.locator('svg').waitFor({state:'detached'});
  await badge.getByRole('status').filter({hasText:'Chưa hiển thị được cảnh giới'}).waitFor();
  record({case:'private rank is not displayed to a different viewer and never replaced with a fake starter badge',verdict:'PASS'});
  await post(owner.context,'/api/auth/login',{email:member.email,password});await page.evaluate(()=>window.dispatchEvent(new Event('online')));await badge.locator('svg[data-level="18"]').waitFor();
  let pending,ready;const requested=new Promise(resolve=>ready=resolve);await page.route('**/api/tinh-canh/members/'+member.user.id,async route=>{pending={route,response:await route.fetch()};ready()});
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await requested;
  await post(owner.context,'/api/auth/logout',{});await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await page.waitForFunction(()=>document.querySelector('button[aria-label="Mở tài khoản"]')?.getAttribute('title')==='Tài khoản');
  try{await pending.route.fulfill({response:pending.response})}catch{/* The old account-scoped read may already have been aborted. */}
  await page.unrouteAll({behavior:'ignoreErrors'});assert.equal(await badge.locator('svg').count(),0);
  record({case:'private owner badge and delayed rank response cannot survive logout in an open profile',verdict:'PASS'});

  const gallery=await browser.newPage({viewport:{width:1440,height:1000}});gallery.on('pageerror',error=>pageErrors.push(error.message));gallery.setDefaultTimeout(12000);
  await gallery.goto(origin+'/tinh-canh',{waitUntil:'networkidle'});const collection=gallery.locator('section[aria-label="18 huy chương"]');const medals=collection.locator('svg[data-level]');await medals.nth(17).waitFor();assert.equal(await medals.count(),18);
  const R=require(path.join(root,'packages/knowledge/src/tinh-canh-ranks.cjs'));
  const motifs=await medals.evaluateAll(nodes=>nodes.map(node=>node.dataset.motif));assert.equal(new Set(motifs).size,18);
  const centers=await medals.evaluateAll(nodes=>nodes.map(node=>[...node.querySelectorAll('[data-emblem] path')].map(path=>path.getAttribute('d')).join('|')));assert.equal(new Set(centers).size,18);
  for(const rank of R.ranks)assert.ok((await medals.nth(rank.level-1).getAttribute('aria-label')).includes(rank.name));
  record({case:'all eighteen canonical names have distinct center artwork rather than color-only geometry',verdict:'PASS'});
  const motionCounts={};
  for(const level of Array.from({length:18},(_,index)=>index+1)){
    const medal=collection.locator('svg[data-level="'+level+'"]');await medal.scrollIntoViewIfNeeded();
    if(level>=10)await gallery.waitForFunction(level=>document.querySelector('section[aria-label="18 huy chương"] svg[data-level="'+level+'"]')?.dataset.paused==='false',level);
    const animations=await medal.evaluate(node=>node.getAnimations({subtree:true}).map(animation=>({state:animation.playState,iterations:animation.effect.getTiming().iterations})));
    motionCounts[level]=animations.length;
    const expected={1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:5,11:6,12:8,13:9,14:10,15:10,16:12,17:15,18:17};assert.equal(animations.length,expected[level],'every specified layer must animate at the correct tier');
    if(level>=10){assert.ok(animations.every(animation=>animation.iterations===Infinity&&animation.state==='running'));const body=medal.locator('[data-layer="body"]');const first=await body.evaluate(node=>getComputedStyle(node).transform);await gallery.waitForTimeout(200);const next=await body.evaluate(node=>getComputedStyle(node).transform);assert.ok(first.startsWith('matrix3d('));assert.notEqual(first,next,'every high tier has live depth, not only a static tilt');}
    record({case:'medal tier animation',level,animations:animations.length,verdict:'PASS'});
  }
  assert.ok(motionCounts[18]>motionCounts[16]&&motionCounts[16]>motionCounts[13]&&motionCounts[13]>motionCounts[10]);
  const apex=collection.locator('svg[data-level="18"]');const body=apex.locator('[data-layer="body"]');
  const before=await body.evaluate(node=>getComputedStyle(node).transform);await gallery.waitForTimeout(350);const after=await body.evaluate(node=>getComputedStyle(node).transform);assert.ok(before.startsWith('matrix3d('));assert.notEqual(before,after);
  record({case:'high-tier body has a continuously changing real CSS 3D transform',verdict:'PASS'});
  await gallery.getByRole('button',{name:'Tạm dừng chuyển động huy hiệu',exact:true}).click();await apex.scrollIntoViewIfNeeded();assert.ok((await apex.evaluate(node=>node.getAnimations({subtree:true}).map(animation=>animation.playState))).every(state=>state==='paused'));
  await gallery.getByRole('button',{name:'Tiếp tục chuyển động huy hiệu',exact:true}).click();await apex.scrollIntoViewIfNeeded();await gallery.waitForFunction(()=>document.querySelector('svg[data-level="18"]')?.dataset.paused==='false');
  record({case:'manual pause/resume controls every decorative layer without changing rank',verdict:'PASS'});
  await apex.evaluate(()=>window.scrollTo(0,0));await gallery.waitForFunction(()=>document.querySelector('svg[data-level="18"]')?.dataset.paused==='true');
  assert.ok((await apex.evaluate(node=>node.getAnimations({subtree:true}).map(animation=>animation.playState))).every(state=>state==='paused'));
  record({case:'offscreen animated medal is paused at all layers',verdict:'PASS'});
  const openApex=gallery.getByRole('button',{name:'Xem lớn huy hiệu Vô Cực Tinh Đồ',exact:true});await openApex.click();const dialog=gallery.getByRole('dialog');await dialog.waitFor();await dialog.getByRole('heading',{name:'Vô Cực Tinh Đồ',exact:true}).waitFor();const large=dialog.locator('svg[data-level="18"]');await gallery.waitForFunction(()=>document.querySelector('dialog[open] svg')?.dataset.paused==='false');
  assert.equal(await large.locator('[data-detail="infinite-cosmos"]').count(),1);assert.equal(await large.locator('[data-detail="solar-crown"]').count(),1);
  assert.ok((await apex.evaluate(node=>node.getAnimations({subtree:true}).map(animation=>animation.playState))).every(state=>state==='paused'));
  assert.ok((await large.evaluate(node=>node.getAnimations({subtree:true}).map(animation=>animation.playState))).every(state=>state==='running'));
  record({case:'large eighteen has exclusive cosmic layers while background gallery stops animating',verdict:'PASS'});
  const ids=await gallery.locator('svg[data-level] [id]').evaluateAll(nodes=>nodes.map(node=>node.id));assert.equal(new Set(ids).size,ids.length);
  await dialog.getByRole('button',{name:'← Cấp trước',exact:true}).click();await dialog.getByRole('heading',{name:'Tinh Hà Bất Diệt',exact:true}).waitFor();await dialog.getByRole('button',{name:'Cấp tiếp →',exact:true}).click();
  for(let i=0;i<12;i++){await gallery.keyboard.press('Tab');assert.equal(await gallery.evaluate(()=>!!document.activeElement.closest('dialog[open]')),true);}
  await gallery.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await openApex.evaluate(node=>node===document.activeElement),true);
  record({case:'inspector has unique SVG IDs, next/previous, modal keyboard containment and Escape focus restoration',verdict:'PASS'});
  await openApex.click();await gallery.emulateMedia({reducedMotion:'reduce'});assert.equal(await gallery.locator('svg[data-level]').evaluateAll(nodes=>nodes.reduce((sum,node)=>sum+node.getAnimations({subtree:true}).length,0)),0);
  await gallery.emulateMedia({media:'print',reducedMotion:'no-preference'});assert.equal(await gallery.locator('svg[data-level]').evaluateAll(nodes=>nodes.reduce((sum,node)=>sum+node.getAnimations({subtree:true}).length,0)),0);
  await gallery.emulateMedia({media:'screen',reducedMotion:'no-preference'});
  record({case:'system reduced motion and print disable every old and new medal animation',verdict:'PASS'});
  for(const width of [320,390,768,1440]){await gallery.setViewportSize({width,height:900});assert.equal(await gallery.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const geometry=await dialog.evaluate(node=>({width:node.getBoundingClientRect().width,overflow:node.scrollWidth>node.clientWidth+1}));assert.equal(geometry.overflow,false);assert.ok(geometry.width<=width);assert.ok((await dialog.locator('[data-layer="body"]').evaluate(node=>getComputedStyle(node).transform)).startsWith('matrix3d('),'mobile retains continuous depth animation');record({case:'medal inspector responsive geometry',width,...geometry,verdict:'PASS'});}
  const shots=process.env.THIENDO_INTERNAL_SCREENSHOT_DIR;
  if(shots){fs.mkdirSync(shots,{recursive:true});await gallery.setViewportSize({width:1440,height:1000});await dialog.screenshot({path:path.join(shots,'medal18-inspector.png')});await gallery.keyboard.press('Escape');await gallery.emulateMedia({reducedMotion:'reduce'});await collection.locator('[class*="grid"]').evaluate(node=>node.style.gridTemplateColumns='repeat(6,minmax(0,1fr))');await collection.screenshot({path:path.join(shots,'eighteen-art-review.png')});}
  await gallery.close();

  assert.deepEqual(pageErrors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Real Next/Nest/PGlite; email captured; no native PostgreSQL acceptance',results,pageErrors},null,2));
 }finally{await browser?.close();if(web)await new Promise(resolve=>web.close(resolve));await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
