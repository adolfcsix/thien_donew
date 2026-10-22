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
  api=await NestFactory.create(BrowserSqlModule,{logger:false,bodyParser:false});const express=require('express');api.use('/api/auth/avatar',express.raw({type:['image/jpeg','image/png','image/webp'],limit:'300kb'}));api.use(express.json({limit:'80kb'}));await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:webWork,hostname:'127.0.0.1',port:3614});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3614,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3614',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password,username:email.startsWith('owner-')?'qa_owner':'qa_member'}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const owner=await register('owner-browser@example.invalid'),member=await register('member-browser@example.invalid');
  await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.user.id]);
  async function post(context,url,data){const r=await context.request.post(origin+url,{data});assert.equal(r.status(),200,url+' '+await r.text());return r.json();}
  const sent=await post(owner.context,'/api/auth/email/send',{});await post(owner.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(owner.email)});

 const {totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));
 const fresh=await browser.newContext({viewport:{width:1440,height:1000}});fresh.on('page',p=>p.on('pageerror',e=>pageErrors.push(e.message)));
 const page=await fresh.newPage();page.setDefaultTimeout(15000);await page.goto(origin+'/admin',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Đăng nhập quản trị',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();
 await dialog.getByLabel('Username hoặc email',{exact:true}).fill('qa_owner');await dialog.getByLabel('Mật khẩu',{exact:true}).fill(password);await dialog.getByRole('button',{name:'Đăng nhập',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await page.getByRole('heading',{name:'Bảo vệ khu vực quản trị',exact:true}).waitFor();assert.equal((await fresh.request.get(origin+'/api/admin/overview')).status(),403);
 record({case:'real username/password Owner login succeeds; dashboard remains locked before MFA',verdict:'PASS'});
 let setupCalls=0,releaseSetup;const holdSetup=new Promise(r=>releaseSetup=r);await page.route('**/api/auth/mfa/setup',async route=>{setupCalls++;await holdSetup;await route.continue()});
 await page.getByLabel('Mật khẩu hiện tại',{exact:true}).fill(password);const setupResponse=page.waitForResponse(r=>r.url().endsWith('/api/auth/mfa/setup'));
 await page.getByRole('button',{name:'Thiết lập MFA',exact:true}).evaluate(button=>{button.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));button.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))});
 await page.waitForFunction(()=>document.querySelector('button:disabled')!==null);releaseSetup();const setup=await (await setupResponse).json();await page.getByText(setup.manualKey,{exact:true}).waitFor();assert.equal(setupCalls,1);await page.unroute('**/api/auth/mfa/setup');
 record({case:'real MFA enrollment from UI; paired synchronous submits issue exactly one setup request',verdict:'PASS'});
 let confirmCalls=0,releaseConfirm;const holdConfirm=new Promise(r=>releaseConfirm=r);await page.route('**/api/auth/mfa/confirm',async route=>{confirmCalls++;await holdConfirm;await route.continue()});
 await page.getByLabel('Mã Authenticator 6 chữ số (không phải mã email)',{exact:true}).fill(totpCode(setup.manualKey,Math.floor(Date.now()/30000)));const confirmed=page.waitForResponse(r=>r.url().endsWith('/api/auth/mfa/confirm'));
 await page.getByRole('button',{name:'Xác nhận thiết lập',exact:true}).evaluate(button=>{button.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));button.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))});releaseConfirm();assert.equal((await confirmed).status(),200);
 await page.getByRole('heading',{name:'Toàn cảnh Thiên Đồ',exact:true}).waitFor();assert.equal(confirmCalls,1);await page.unroute('**/api/auth/mfa/confirm');
 record({case:'real TOTP confirmation admits Owner dashboard, prevents duplicate code consumption',verdict:'PASS'});
 let statusCalls=0;const listener=req=>{if(req.url().endsWith('/api/auth/mfa/status'))statusCalls++};page.on('request',listener);
 const statusResponse=page.waitForResponse(r=>r.url().endsWith('/api/auth/mfa/status'));await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))});await statusResponse;await page.getByRole('heading',{name:'Toàn cảnh Thiên Đồ',exact:true}).waitFor();assert.equal(statusCalls,1);page.off('request',listener);
 record({case:'paired focus/visibility events perform only one MFA status read and retain verified dashboard',verdict:'PASS'});
 await page.route('**/api/billing/access',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Controlled access outage'})}));await page.waitForTimeout(300);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('alert').filter({hasText:'Máy chủ tạm thời chưa sẵn sàng'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Toàn cảnh Thiên Đồ',exact:true}).count(),0);await page.unroute('**/api/billing/access');await page.getByRole('button',{name:'Kiểm tra lại quyền',exact:true}).click();await page.getByRole('heading',{name:'Toàn cảnh Thiên Đồ',exact:true}).waitFor();
 record({case:'permission 503 closes privileged content; retry restores real verified state',verdict:'PASS'});

 await page.route('**/api/auth/mfa/status',async route=>{const response=await route.fetch();const value=await response.json();await route.fulfill({json:{...value,configured:false}})});await page.waitForTimeout(300);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('alert').filter({hasText:'Máy chủ chưa cấu hình khóa mã hóa MFA'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Toàn cảnh Thiên Đồ',exact:true}).count(),0);await page.unroute('**/api/auth/mfa/status');await page.waitForTimeout(300);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('heading',{name:'Toàn cảnh Thiên Đồ',exact:true}).waitFor();
 record({case:'missing MFA server configuration closes privileged UI despite stale verified=true receipt (controlled response)',verdict:'PASS'});
 await page.goto(origin+'/admin/books',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Quản trị sách',exact:true}).waitFor();await page.reload({waitUntil:'networkidle'});await page.getByRole('heading',{name:'Quản trị sách',exact:true}).waitFor();
 for(const width of [390,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Admin books overflow '+width)}
 record({case:'direct admin subsection, reload and four viewport sizes remain functional',verdict:'PASS'});
 const regular=await member.context.newPage();await regular.goto(origin+'/admin',{waitUntil:'networkidle'});await regular.getByRole('alert').filter({hasText:'không có quyền quản trị'}).waitFor();assert.equal((await member.context.request.get(origin+'/api/admin/overview')).status(),403);await regular.close();
 // Expiring assurance requires MFA again, even though the login session is still alive.
 await pg.query("UPDATE admin_session_assurance SET verified_at=clock_timestamp()-interval '13 hours' WHERE user_id=$1",[owner.user.id]);await page.waitForTimeout(300);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('heading',{name:'Bảo vệ khu vực quản trị',exact:true}).waitFor();assert.equal((await fresh.request.get(origin+'/api/admin/overview')).status(),403);
 record({case:'ordinary member denied and expired MFA assurance cannot retain admin access',verdict:'PASS'});
 // A new login session does not inherit another session's MFA assurance.
 await fresh.request.post(origin+'/api/auth/logout',{data:{}});await page.evaluate(()=>{const c=new BroadcastChannel('thiendo.auth-session.v1');c.postMessage({type:'signed-out'});setTimeout(()=>c.close(),100)});await page.getByRole('button',{name:'Đăng nhập quản trị',exact:true}).waitFor();assert.equal(await page.getByRole('navigation',{name:'Điều hướng quản trị'}).count(),0);assert.equal((await fresh.request.get(origin+'/api/admin/overview')).status(),401);
 record({case:'confirmed logout removes privileged UI and protected HTTP access',verdict:'PASS'});
 await fresh.close();assert.deepEqual(pageErrors,[]);
 }catch(error){console.error('BROWSER FAILED',error);for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web){web.closeAllConnections();await new Promise(r=>web.close(r));}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});fs.rmSync(webWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
