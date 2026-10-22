/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'reports/browser');
(async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 process.env.GEMINI_API_KEY='';process.env.WEB_ANALYTICS_ENABLED='false';process.env.PAYOS_CLIENT_ID='';process.env.PAYOS_API_KEY='';process.env.PAYOS_CHECKSUM_KEY='';
 process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.AUTH_OTP_SECRET=randomBytes(32).toString('hex');process.env.COOKIE_SECURE='false';
 const privateWork=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'thiendo-browser-files-')),assetRoot=path.join(privateWork,'private');fs.mkdirSync(path.join(assetRoot,'books'),{recursive:true});fs.mkdirSync(path.join(assetRoot,'van-kho-media'));process.env.BOOK_PRIVATE_STORAGE_DIR=path.join(assetRoot,'books');process.env.VAN_KHO_PRIVATE_MEDIA_DIR=path.join(assetRoot,'van-kho-media');
 const webWork=fs.mkdtempSync(path.join(root,'.qa-web-'));
 fs.cpSync(path.join(root,'apps/web'),webWork,{recursive:true,filter:source=>!source.split(path.sep).some(part=>['node_modules','standalone','cache','route-cache'].includes(part))});
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
  api=await NestFactory.create(BrowserSqlModule,{logger:false,bodyParser:false});const express=require('express');api.use('/api/auth/avatar',express.raw({type:['image/jpeg','image/png','image/webp'],limit:'300kb'}));api.use('/api/forum/media',express.raw({type:['image/jpeg','image/png','image/webp'],limit:'1mb'}));api.use(express.json({limit:'80kb'}));await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:webWork,hostname:'127.0.0.1',port:3614});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3614,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3614',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const owner=await register('owner-browser@example.invalid'),member=await register('member-browser@example.invalid');
  await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.user.id]);
  async function post(context,url,data){const r=await context.request.post(origin+url,{data});assert.equal(r.status(),200,url+' '+await r.text());return r.json();}
  const sent=await post(owner.context,'/api/auth/email/send',{});await post(owner.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(owner.email)});
  const setup=await post(owner.context,'/api/auth/mfa/setup',{password});const {totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));await post(owner.context,'/api/auth/mfa/confirm',{code:totpCode(setup.manualKey,Math.floor(Date.now()/30000))});




 const verification=await post(member.context,'/api/auth/email/send',{});await post(member.context,'/api/auth/email/verify',{challengeId:verification.challengeId,code:delivered.get(member.email)});
 const page=await member.context.newPage();page.setDefaultTimeout(15000);
 await page.goto(origin+'/forum/new',{waitUntil:'networkidle'});
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=900;const x=c.getContext('2d');x.fillStyle='#276853';x.fillRect(0,0,c.width,c.height);return c.toDataURL('image/png').split(',')[1]});
 await page.locator('input[type=file]').setInputFiles({name:'local.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.getByRole('button',{name:'Đăng bài',exact:true}).click();await page.waitForURL(/\/forum\/[0-9a-f-]{36}$/);
 const threadId=new URL(page.url()).pathname.split('/').pop();await page.locator('img[alt="Ảnh trong bài: Bài chia sẻ"]').waitFor();
 assert.equal(await page.locator('img[alt="Ảnh trong bài: Bài chia sẻ"]').evaluate(i=>i.complete&&i.naturalWidth===1200),true);
 assert.equal((await member.context.request.get(origin+'/api/forum/threads/'+threadId+'/image')).status(),200);
 record({case:'image-only composer: real PNG canvas resize/WebP upload, SQL claim, displayed 1200px image',verdict:'PASS'});
 await page.getByRole('button',{name:'Sửa bài',exact:true}).click();await page.getByRole('combobox',{name:/^Quyền xem/}).selectOption('private');await page.getByRole('button',{name:'Lưu',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu bản sửa'}).waitFor();
 const reportResponse=await member.context.request.post(origin+'/api/forum/reports/threads/'+threadId,{data:{reason:'privacy',explanation:'Kiểm thử ảnh riêng tư'}});assert.equal(reportResponse.status(),201);
 const queue=await owner.context.request.get(origin+'/api/forum/moderation/queue');const reportId=(await queue.json()).reports[0].id;
 assert.equal((await member.context.request.post(origin+'/api/forum/moderation/reports/'+reportId+'/inspect')).status(),403);
 const inspect=await owner.context.request.post(origin+'/api/forum/moderation/reports/'+reportId+'/inspect');assert.equal(inspect.status(),201);assert.match((await inspect.json()).content.imageDataUrl,/^data:image\/webp;base64,/);
 const adminPage=await owner.context.newPage();await adminPage.goto(origin+'/admin/forum',{waitUntil:'networkidle'});await adminPage.getByRole('button',{name:'Xem nội dung (ghi audit)',exact:true}).first().click();const reviewed=adminPage.getByAltText('Ảnh đính kèm trong nội dung đang kiểm duyệt');await reviewed.waitFor();assert.equal(await reviewed.evaluate(i=>i.complete&&i.naturalWidth===1200),true);await adminPage.close();
 assert.ok((await pg.query("SELECT id FROM forum_moderation_events WHERE action='report.read' AND thread_id=$1",[threadId])).rows.length>=2);
 record({case:'image-only private report: normal member denied, MFA owner sees actual image in admin and reads are audited',verdict:'PASS'});
 const guest=await browser.newContext();assert.equal((await guest.request.get(origin+'/api/forum/threads/'+threadId+'/image')).status(),404);
 assert.equal((await owner.context.request.get(origin+'/api/forum/threads/'+threadId+'/image')).status(),404);
 await page.getByRole('button',{name:'Sửa bài',exact:true}).click();await page.getByLabel('Gỡ ảnh đang đính kèm').check();await page.getByRole('button',{name:'Lưu',exact:true}).click();await page.getByRole('alert').filter({hasText:'Bài viết phải có chữ hoặc ảnh'}).waitFor();
 await page.getByRole('button',{name:'Hủy',exact:true}).click();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Xóa bài',exact:true}).click();await page.waitForURL(origin+'/forum');
 assert.equal((await member.context.request.get(origin+'/api/forum/threads/'+threadId+'/image')).status(),404);
 await page.getByRole('heading',{name:'Thiên Đồ Luận Đàn',exact:true}).waitFor();await page.locator('[role=alert]:not(#__next-route-announcer__)').waitFor({state:'hidden'});
 record({case:'private image author-only, last-content edit rejected, confirmed deletion navigates to feed without false 404',verdict:'PASS'});
 // Two live tabs share one preference.
 const tab=await member.context.newPage();await page.goto(origin+'/numerology',{waitUntil:'networkidle'});await tab.goto(origin+'/tarot',{waitUntil:'networkidle'});
 if(await page.locator('.site').evaluate(n=>n.classList.contains('light')))await page.locator('.theme-button').click();
 await tab.waitForFunction(()=>!document.querySelector('.site').classList.contains('light'));
 await page.locator('.theme-button').click();await tab.waitForFunction(()=>document.querySelector('.site').classList.contains('light'));
 await tab.locator('.theme-button').click();await page.waitForFunction(()=>!document.querySelector('.site').classList.contains('light'));await tab.close();
 record({case:'global theme synchronizes both directions between real tabs in distinct Western branches',verdict:'PASS'});
 await page.goto(origin+'/western-astrology',{waitUntil:'networkidle'});await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Lập Natal Chart',exact:true}).click();await page.getByRole('region',{name:'Luận Natal chuyên sâu',exact:true}).waitFor();
 for(const width of [360,390,768,1024,1440,1920]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Natal overflow '+width)}
 record({case:'populated Natal route: calculation and six actual viewport widths without document overflow',verdict:'PASS'});
 await page.goto(origin+'/western-astrology/relationship',{waitUntil:'networkidle'});
 await page.getByRole('checkbox',{name:'Đã kiểm tra UTC và DST A',exact:true}).check();await page.getByRole('checkbox',{name:'Đã kiểm tra UTC và DST B',exact:true}).check();
 await page.getByRole('button',{name:'Lập Synastry và Composite',exact:true}).click();const panel=page.getByRole('region',{name:'Kết quả Chiêm tinh quan hệ',exact:true});await panel.waitFor();
 for(const width of [360,390,768,1024,1440,1920]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Relationship overflow '+width)}
 await panel.getByRole('button',{name:'Composite · trung điểm',exact:true}).click();await panel.getByRole('group',{name:'Biểu đồ Composite trung điểm',exact:true}).waitFor();
 record({case:'populated Synastry and Composite, six actual viewport widths without document overflow',verdict:'PASS'});
 const secret='PRIVATE_A31_'+randomBytes(8).toString('hex');const privatePost=await member.context.request.post(origin+'/api/forum/threads',{data:{category:'hoi-dap',body:secret,visibility:'private'}});assert.equal(privatePost.status(),201);const privateId=(await privatePost.json()).id;await page.goto(origin+'/forum/'+privateId,{waitUntil:'networkidle'});await page.getByText(secret,{exact:true}).waitFor();const feed=await member.context.newPage();await feed.goto(origin+'/forum',{waitUntil:'networkidle'});await feed.getByText(secret,{exact:true}).waitFor();await member.context.request.post(origin+'/api/auth/logout',{data:{}});await page.evaluate(()=>{const c=new BroadcastChannel('thiendo.auth-session.v1');c.postMessage({type:'signed-out'});setTimeout(()=>c.close(),100)});await page.getByText(secret,{exact:true}).waitFor({state:'hidden'});assert.equal(await page.getByRole('button',{name:'Sửa bài',exact:true}).count(),0);await feed.getByText(secret,{exact:true}).waitFor({state:'hidden'});await feed.close();
 record({case:'confirmed cross-tab logout clears private thread data and author controls without reloading the document',verdict:'PASS'});
 await guest.close();assert.deepEqual(pageErrors,[]);
 }catch(error){console.error('BROWSER FAILED',error);for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web){web.closeAllConnections();await new Promise(r=>web.close(r));}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});fs.rmSync(webWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
