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
  browser=await chromium.launch(require('./helpers-browser-launch.cjs').browserLaunchOptions());
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3614',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password,username:email.startsWith('owner-')?'qa_owner':'qa_member'}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const owner=await register('owner-browser@example.invalid'),member=await register('member-browser@example.invalid');
  await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.user.id]);
  async function post(context,url,data){const r=await context.request.post(origin+url,{data});assert.equal(r.status(),200,url+' '+await r.text());return r.json();}
  const sent=await post(owner.context,'/api/auth/email/send',{});await post(owner.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(owner.email)});


 // Two submits in one event turn must share the same pending operation.
 async function pairedSubmit(page,button,endpoint){
  let calls=0,release;const gate=new Promise(resolve=>release=resolve),handlers=[];
  const handler=route=>{const done=(async()=>{calls++;await gate;await route.continue()})();handlers.push(done);return done;};
  await page.route('**'+endpoint,handler);
  const response=page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==='POST');
  try{const request=page.waitForRequest(r=>new URL(r.url()).pathname===endpoint&&r.method()==='POST');await button.evaluate(b=>{b.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));b.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))});await request;await new Promise(resolve=>setTimeout(resolve,200));assert.equal(calls,1,'duplicate POST '+endpoint);}
  finally{release();await Promise.all(handlers);await page.unroute('**'+endpoint,handler);}
  const receipt=await response;assert.ok(receipt.ok(),'submission response '+endpoint+' '+receipt.status());await receipt.finished();
 }
 const {totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));
 const fresh=await browser.newContext({viewport:{width:1440,height:1000}});fresh.on('page',p=>p.on('pageerror',e=>pageErrors.push(e.message)));
 const page=await fresh.newPage();page.setDefaultTimeout(15000);await page.goto(origin+'/login?next=/chart',{waitUntil:'networkidle'});
 const dialog=page.getByRole('dialog');await dialog.waitFor();
 await dialog.getByLabel('Username hoặc email',{exact:true}).fill('qa_owner');await dialog.getByLabel('Mật khẩu',{exact:true}).fill(password);await pairedSubmit(page,dialog.getByRole('button',{name:'Đăng nhập',exact:true}),'/api/auth/login');await dialog.waitFor({state:'hidden'});
 await page.getByRole('heading',{name:'Bảo vệ khu vực quản trị',exact:true}).waitFor();assert.equal((await fresh.request.get(origin+'/api/admin/overview')).status(),403);
 assert.equal(Number((await pg.query('SELECT count(*)::int AS n FROM sessions WHERE user_id=$1',[owner.user.id])).rows[0].n),2);record({case:'paired login submit creates exactly one new session and one POST',verdict:'PASS'});
 assert.equal(new URL(page.url()).pathname,'/admin');record({case:'Owner login from public login page routes to /admin and remains locked before MFA',verdict:'PASS'});
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
 const regular=await member.context.newPage();await regular.goto(origin+'/admin',{waitUntil:'networkidle'});
 const memberApi=await(await member.context.request.get(origin+'/api/auth/me')).json();
 const memberBrowser=await regular.evaluate(async()=>await(await fetch('/api/auth/me',{cache:'no-store',credentials:'include'})).json());
 console.log('QA_MEMBER_IDENTITY',JSON.stringify({expected:member.user.id,api:memberApi.user?.id,browser:memberBrowser.user?.id,owner:owner.user.id}));
 assert.equal(memberApi.user?.id,member.user.id,'API request context must retain member identity');
 assert.equal(memberBrowser.user?.id,member.user.id,'Browser must retain member identity');
 await regular.getByRole('alert').filter({hasText:'không có quyền quản trị'}).waitFor();assert.equal((await member.context.request.get(origin+'/api/admin/overview')).status(),403);await regular.close();
 // Expiring assurance requires MFA again, even though the login session is still alive.
 await pg.query("UPDATE admin_session_assurance SET verified_at=clock_timestamp()-interval '13 hours' WHERE user_id=$1",[owner.user.id]);await page.waitForTimeout(300);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('heading',{name:'Bảo vệ khu vực quản trị',exact:true}).waitFor();assert.equal((await fresh.request.get(origin+'/api/admin/overview')).status(),403);
 record({case:'ordinary member denied and expired MFA assurance cannot retain admin access',verdict:'PASS'});
 // A new login session does not inherit another session's MFA assurance.
 await fresh.request.post(origin+'/api/auth/logout',{data:{}});await page.evaluate(()=>{const c=new BroadcastChannel('thiendo.auth-session.v1');c.postMessage({type:'signed-out'});setTimeout(()=>c.close(),100)});await page.waitForURL(origin+'/');assert.equal(await page.getByRole('navigation',{name:'Điều hướng quản trị'}).count(),0);assert.equal((await fresh.request.get(origin+'/api/admin/overview')).status(),401);
 record({case:'confirmed logout removes privileged UI and protected HTTP access',verdict:'PASS'});

 // Real ordinary-user login initiated from an admin URL must leave the admin area.
 const userContext=await browser.newContext({viewport:{width:1440,height:700}});
 const userPage=await userContext.newPage();userPage.setDefaultTimeout(15000);
 await userPage.goto(origin+'/admin',{waitUntil:'networkidle'});
 await userPage.getByRole('button',{name:'Đăng nhập quản trị',exact:true}).click();
 const userDialog=userPage.getByRole('dialog');
 await userDialog.getByLabel('Username hoặc email',{exact:true}).fill('qa_member');
 await userDialog.getByLabel('Mật khẩu',{exact:true}).fill(password);
 await userDialog.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await userPage.waitForURL('**/chart');
 assert.equal(await userPage.getByLabel('Tên lá số',{exact:true}).inputValue(),'');assert.equal(await userPage.getByLabel('Tên lá số',{exact:true}).getAttribute('placeholder'),'Nhập họ và tên');
 assert.equal((await userContext.request.get(origin+'/api/admin/overview')).status(),403);
 record({case:'ordinary username/password login from admin entry routes to /chart; protected HTTP still 403',verdict:'PASS'});

 // Use a real uploaded image, not an assumed CSS-only avatar fixture.
 const upload=await userContext.request.post(origin+'/api/auth/avatar',{headers:{'content-type':'image/png'},data:fs.readFileSync(process.env.THIENDO_AVATAR_FIXTURE||path.join(root,'tests/fixtures/a33-avatar.png'))});
 assert.equal(upload.status(),200,await upload.text());
 await userPage.reload({waitUntil:'networkidle'});
 const photo=userPage.locator('.shell-avatar-photo');await photo.waitFor();
 await photo.evaluate(n=>n.decode());
 assert.equal(await photo.evaluate(n=>{const b=n.parentElement.getBoundingClientRect(),r=n.getBoundingClientRect(),c=getComputedStyle(n.parentElement);return r.width<=b.width+1&&r.height<=b.height+1&&c.overflow==='hidden'&&getComputedStyle(n).objectFit==='cover'}),true);
 await userPage.getByRole('button',{name:'Mở tài khoản',exact:true}).click();
 const profile=userPage.locator('.account-profile-avatar img');await profile.waitFor();
 assert.equal(await profile.evaluate(n=>getComputedStyle(n.parentElement).overflow), 'hidden');
 await userPage.getByRole('button',{name:'Đóng cửa sổ tài khoản',exact:true}).click();
 await userPage.screenshot({path:path.join(out,'avatar-layout.png')});record({case:'uploaded avatar remains clipped in circular topbar and profile controls',verdict:'PASS'});

 for(const theme of ['dark','light']){
  await userPage.evaluate(t=>localStorage.setItem('thiendo-theme',t),theme);
  for(const route of ['/research/star-audit','/study/compare','/library','/articles','/tinh-canh']){
   for(const width of [320,390,768,1024,1440,1920]){
    await userPage.setViewportSize({width,height:800});
    await userPage.goto(origin+route,{waitUntil:'networkidle'});
    const overflow=await userPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    assert.equal(overflow,false,route+' '+width+' '+theme);
    if(route==='/study/compare'){
     const heading=userPage.getByRole('heading',{name:'Đối chiếu bản nghiên cứu',exact:true});await heading.waitFor();
     assert.equal(await heading.evaluate(n=>getComputedStyle(n.closest('header')).justifyItems),'start');
    }
    if(route==='/research/star-audit'){
     const colors=await userPage.locator('main header').last().evaluate(n=>({bg:getComputedStyle(n).backgroundColor,text:getComputedStyle(n).color}));
     assert.notEqual(colors.bg,theme==='dark'?'rgb(255, 253, 247)':'rgb(22, 35, 30)');
    }
    assert.equal(await userPage.locator('html').getAttribute('data-thiendo-theme'),theme);
    if(width===1440 && ['/research/star-audit','/study/compare'].includes(route))await userPage.screenshot({path:path.join(out,theme+route.replaceAll('/','-')+'.png')});
    record({case:'route fits viewport and uses shared theme',route,width,theme,verdict:'PASS'});
   }
  }
 }
 await userPage.setViewportSize({width:1440,height:900});await userPage.goto(origin+'/tinh-canh',{waitUntil:'networkidle'});
 const signatures=[];
 for(let level=10;level<=18;level++){
  const medal=userPage.locator('svg[data-level="'+level+'"]').first();await medal.scrollIntoViewIfNeeded();
  signatures.push(await medal.evaluate(n=>Array.from(n.querySelectorAll('*')).map(e=>{const c=getComputedStyle(e);return c.animationName+':'+c.animationDuration+':'+c.animationDirection}).join('|')));
 }
 assert.equal(new Set(signatures).size,9);
 await userPage.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await userPage.locator('svg[data-level]').evaluateAll(nodes=>nodes.every(n=>Array.from(n.querySelectorAll('*')).every(e=>getComputedStyle(e).animationName==='none'))),true);
 record({case:'nine high-level medal motion signatures differ; reduced-motion disables every decorative animation',verdict:'PASS'});
 await userContext.close();

 // Register through the real form, including a hostile admin return hint.
 const signupContext=await browser.newContext({viewport:{width:390,height:600}});signupContext.on('page',p=>p.on('pageerror',e=>pageErrors.push(e.message)));const signupPage=await signupContext.newPage();signupPage.setDefaultTimeout(15000);await signupPage.goto(origin+'/login?mode=register&next=/admin',{waitUntil:'networkidle'});const signup=signupPage.getByRole('dialog');await signup.getByLabel('Username riêng',{exact:true}).fill('qa_new_member');await signup.getByLabel('Email',{exact:true}).fill('new-member@example.invalid');await signup.getByLabel('Mật khẩu',{exact:true}).fill(password);await signup.getByLabel('Nhập lại mật khẩu',{exact:true}).fill(password);await pairedSubmit(signupPage,signup.getByRole('button',{name:'Tạo tài khoản',exact:true}),'/api/auth/register');await signupPage.waitForURL('**/chart');assert.equal((await signupContext.request.get(origin+'/api/admin/overview')).status(),403);assert.equal((await signupContext.request.get(origin+'/api/auth/me').then(r=>r.json())).user.username,'qa_new_member');assert.equal(await signupPage.locator('[data-admin-workspace=true]').count(),0);await signupContext.close();
 record({case:'real mobile registration opens member workspace even when next requests admin; new account has no administrative API access',verdict:'PASS'});


 const recoveryContext=await browser.newContext();recoveryContext.on('page',p=>p.on('pageerror',e=>pageErrors.push(e.message)));const recoveryPage=await recoveryContext.newPage();recoveryPage.setDefaultTimeout(15000);await recoveryPage.goto(origin+'/login?mode=recover',{waitUntil:'networkidle'});const recovery=recoveryPage.getByRole('dialog');await recovery.getByLabel('Email đăng ký',{exact:true}).fill('new-member@example.invalid');await pairedSubmit(recoveryPage,recovery.getByRole('button',{name:'Tiếp tục',exact:true}),'/api/auth/password/forgot');await recovery.getByLabel('Mã xác minh 6 chữ số',{exact:true}).fill(delivered.get('new-member@example.invalid'));const changedPassword='A42Recovery!'+randomBytes(12).toString('hex');await recovery.getByLabel('Mật khẩu mới',{exact:true}).fill(changedPassword);await pairedSubmit(recoveryPage,recovery.getByRole('button',{name:'Đặt lại mật khẩu',exact:true}),'/api/auth/password/reset');await recovery.getByText('Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.',{exact:true}).waitFor();assert.equal((await recoveryContext.request.post(origin+'/api/auth/login',{data:{email:'qa_new_member',password:changedPassword}})).status(),200);await recoveryContext.close();
 record({case:'paired recovery request/reset each sends once, consumes one OTP and new password authenticates',verdict:'PASS'});
 // Short screens and high zoom equivalents must expose the final form controls.
 const anonymous=await browser.newContext();const authPage=await anonymous.newPage();authPage.setDefaultTimeout(15000);
 for(const width of [320,390,768,1024,1440,1920]){
  for(const mode of ['login','register']){
   await authPage.setViewportSize({width,height:480});
   await authPage.goto(origin+'/login?mode='+mode,{waitUntil:'networkidle'});
   const authDialog=authPage.getByRole('dialog');await authDialog.waitFor();
   const submit=authDialog.getByRole('button',{name:mode==='login'?'Đăng nhập':'Tạo tài khoản',exact:true});
   await submit.scrollIntoViewIfNeeded();assert.equal(await submit.isVisible(),true);
   const scrolled=await authDialog.evaluate(n=>{const candidates=[n,n.querySelector('.account-dialog-content')];return candidates.some(e=>e&&e.scrollHeight>e.clientHeight&&getComputedStyle(e).overflowY==='auto')});
   assert.equal(scrolled,true,'scroll region '+width+' '+mode);
   await authDialog.evaluate(n=>{for(const e of [n,n.querySelector('.account-dialog-content')])if(e)e.scrollTop=0});
   const content=authDialog.locator('.account-dialog-content');await content.hover({position:{x:30,y:90}});await authPage.mouse.wheel(0,500);
   await authPage.waitForFunction(()=>[document.querySelector('.account-modal'),document.querySelector('.account-dialog-content')].some(e=>e&&e.scrollTop>0));
   const switchButton=authDialog.locator('.account-switch button');await switchButton.scrollIntoViewIfNeeded();
   assert.equal(await switchButton.evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),true);
   if(width===1440)await authPage.screenshot({path:path.join(out,'auth-'+mode+'-scroll.png')});
   assert.equal(await authPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   record({case:'auth form has usable scroll region on short viewport',width,height:480,mode,verdict:'PASS'});
  }
 }
 await authPage.goto(origin+'/admin',{waitUntil:'networkidle'});await authPage.getByRole('button',{name:'Đăng nhập quản trị',exact:true}).click();
 await authPage.route('**/api/billing/access',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Controlled role outage'})}));
 const retryDialog=authPage.getByRole('dialog');await retryDialog.getByLabel('Username hoặc email',{exact:true}).fill('qa_member');await retryDialog.getByLabel('Mật khẩu',{exact:true}).fill(password);await retryDialog.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 // A67 already made a confirmed login independent of a transient access outage.
 // Keep the actual security invariant: unknown admin rights never become admission.
 await authPage.waitForURL('**/chart');assert.equal(await authPage.getByRole('navigation',{name:'Điều hướng quản trị'}).count(),0);
 assert.equal((await(await anonymous.request.get(origin+'/api/auth/me')).json()).user.id,member.user.id);
 assert.equal((await anonymous.request.get(origin+'/api/admin/overview')).status(),403);
 await authPage.unroute('**/api/billing/access');
 record({case:'confirmed login survives a permission-service outage, defaults to /chart and never assumes administrative access',verdict:'PASS'});
 await anonymous.close();

 await fresh.close(); const shortcutPage=await member.context.newPage();await shortcutPage.goto(origin+'/',{waitUntil:'networkidle'});await shortcutPage.keyboard.press('Control+k');await shortcutPage.getByRole('dialog',{name:'Tìm nhanh trang và công cụ',exact:true}).waitFor();await shortcutPage.keyboard.press('Escape');await shortcutPage.waitForFunction(()=>document.body.style.overflow!=='hidden');assert.equal(await shortcutPage.locator('.command-backdrop').count(),0);
 await shortcutPage.goto(origin+'/admin',{waitUntil:'networkidle'});await shortcutPage.getByRole('alert').filter({hasText:'không có quyền quản trị'}).waitFor();await shortcutPage.keyboard.press('Control+k');await shortcutPage.keyboard.press('Escape');assert.equal(await shortcutPage.locator('.command-backdrop').count(),0);assert.notEqual(await shortcutPage.evaluate(()=>document.body.style.overflow),'hidden');
 record({case:'public Ctrl+K remains functional; non-admin admin gate cannot open invisible user search or lock scrolling',verdict:'PASS'}); await shortcutPage.close();
assert.deepEqual(pageErrors,[]);
 }catch(error){console.error('BROWSER FAILED',error);for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web){web.closeAllConnections();await new Promise(r=>web.close(r));}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true,maxRetries:6,retryDelay:100});fs.rmSync(webWork,{recursive:true,force:true,maxRetries:6,retryDelay:100});}
})().catch(e=>{console.error(e);process.exitCode=1;});

