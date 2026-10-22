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
  api=await NestFactory.create(BrowserSqlModule,{logger:false});await api.listen(8080,'127.0.0.1');
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
  if(process.env.THIENDO_AUTH_RESPONSIVE_ONLY==='true'){
    const matrix=[];const shots=path.join(out,'screenshots');fs.mkdirSync(shots,{recursive:true});
    for(const theme of ['dark','light']){
      const context=await browser.newContext();await context.addInitScript(value=>localStorage.setItem('thiendo-theme',value),theme);
      for(const width of [320,360,390,768,1024,1440,1920]){
        const p=await context.newPage();p.on('pageerror',e=>pageErrors.push(e.message));await p.setViewportSize({width,height:800});
        for(const mode of ['login','register','recover']){
          await p.goto(origin+'/login?mode='+mode,{waitUntil:'networkidle'});const dialog=p.getByRole('dialog');await dialog.waitFor();await p.waitForTimeout(350);
          assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,mode+' overflow '+width);
          const box=await dialog.boundingBox();assert.ok(box.x>=-1&&box.x+box.width<=width+1,mode+' dialog width');
          assert.ok(await dialog.locator('input').count()>0);if(mode==='register')await p.getByLabel('Username riêng').waitFor();
          if([390,1440].includes(width))await p.screenshot({path:path.join(shots,mode+'-'+width+'-'+theme+'.png')});
          matrix.push({width,theme,mode,overflow:false,dialogFits:true});
        }
        await p.close();
      }
      await context.close();
    }
    fs.writeFileSync(path.join(out,'auth-matrix.json'),JSON.stringify(matrix,null,2));assert.deepEqual(pageErrors,[]);record({case:'42 auth form/viewport/theme combinations fit without page errors',verdict:'PASS'});return;
  }
  const page=await owner.context.newPage();page.setDefaultTimeout(15000);
  await page.addInitScript(()=>{window.__tdPerf={lcp:null,cls:0};new PerformanceObserver(list=>{for(const e of list.getEntries())window.__tdPerf.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__tdPerf.cls+=e.value;}).observe({type:'layout-shift',buffered:true});});
  const screenshotDir=path.join(out,'screenshots');fs.mkdirSync(screenshotDir,{recursive:true});
  const shot=async(name)=>page.screenshot({path:path.join(screenshotDir,name+'.png'),fullPage:false});
  async function theme(mode){const button=page.locator('.theme-button');const light=await page.locator('.site').evaluate(el=>el.classList.contains('light'));if(light!==(mode==='light'))await button.click();await page.waitForTimeout(1100);}
  // Accounts are test-only; no production account or persistent volume is touched.
  const anonymous=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:path.join(out,'video'),size:{width:1440,height:1000}}});
  const signup=await anonymous.newPage();signup.setDefaultTimeout(12000);console.log('START signup');signup.on('pageerror',e=>pageErrors.push(e.message));await signup.goto(origin+'/login?mode=register',{waitUntil:'networkidle'});console.log('FORM ready');
  await signup.getByLabel('Username riêng').waitFor();
  await signup.getByLabel('Username riêng').fill('New_Researcher');await signup.getByLabel('Email',{exact:true}).fill('researcher@example.invalid');
  await signup.getByLabel('Mật khẩu',{exact:true}).fill(password);await signup.getByLabel('Nhập lại mật khẩu',{exact:true}).fill(password);
  const signed=signup.waitForResponse(r=>r.url().endsWith('/api/auth/register')&&r.request().method()==='POST');
  await signup.getByRole('button',{name:/^Tạo tài khoản/}).last().click();assert.equal((await signed).status(),201);await signup.locator('.modal-backdrop').waitFor({state:'hidden'});
  const stored=await pg.query("SELECT username FROM users WHERE email='researcher@example.invalid'");assert.equal(stored.rows[0].username,'new_researcher');
  record({case:'real registration form stores normalized username and commits SQL account/session',verdict:'PASS'});
  // Critical user journey uses rendered controls and an isolated SQL database.
  await signup.goto(origin+'/chart',{waitUntil:'networkidle'});
  await signup.getByLabel('Tên lá số',{exact:true}).fill('QA journey 2004');
  await signup.getByLabel('Ngày sinh',{exact:true}).fill('2004-01-01');
  await signup.getByRole('combobox',{name:/^Giờ sinh/}).selectOption('8');
  await signup.getByRole('combobox',{name:/^Phút sinh/}).selectOption('30');
  await signup.getByRole('button',{name:/Tính lá số/}).click();
  await signup.locator('.astrology-grid').waitFor({state:'attached'});
  await signup.locator('.astrology-grid').evaluate(el=>el.scrollIntoView({block:'center'}));
  await signup.locator('.astrology-grid').waitFor();
  assert.equal(await signup.locator('.astrology-grid .house').count(),12);
  await signup.screenshot({path:path.join(screenshotDir,'calculated-12-palaces.png')});
  const pngDownload=signup.waitForEvent('download');
  await signup.getByRole('button',{name:'↓ PNG',exact:true}).click();
  const pngPath=path.join(out,'chart-export.png');await (await pngDownload).saveAs(pngPath);
  assert.equal(fs.readFileSync(pngPath).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const printPage=signup.waitForEvent('popup');
  await signup.getByRole('button',{name:'▤ In / PDF',exact:true}).click();
  const printable=await printPage;await printable.locator('.star-appendix').waitFor();
  const pdf=await printable.pdf({preferCSSPageSize:true,printBackground:true,path:path.join(out,'chart-print.pdf')});
  assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.ok(pdf.length>1000);await printable.close();
  record({case:'12 palace board, PNG download and printable PDF with star appendix',verdict:'PASS'});
  signup.once('dialog',dialog=>dialog.accept());
  const saved=signup.waitForResponse(r=>r.url().endsWith('/api/charts')&&r.request().method()==='POST');
  await signup.getByRole('button',{name:'♡ Lưu lá số',exact:true}).click();
  assert.equal((await saved).status(),201);
  await signup.goto(origin+'/collection',{waitUntil:'networkidle'});
  const savedItem=signup.locator('.saved-item').filter({hasText:'QA journey 2004'});
  await savedItem.getByRole('button',{name:'Mở',exact:true}).click();
  await signup.locator('.astrology-grid').waitFor({state:'attached'});
  await signup.locator('.astrology-grid').evaluate(el=>el.scrollIntoView({block:'center'}));
  await signup.locator('.astrology-grid').waitFor();
  assert.equal(await signup.locator('.astrology-grid .house').count(),12);
  const chartSnapshot=await pg.query("SELECT COUNT(*)::int AS n FROM charts WHERE user_id=$1",[(await anonymous.request.get(origin+'/api/auth/me').then(r=>r.json())).user.id]);
  assert.equal(chartSnapshot.rows[0].n,1);
  await signup.getByRole('button',{name:'Mở tài khoản',exact:true}).click();
  const logoutResponse=signup.waitForResponse(r=>r.url().endsWith('/api/auth/logout')&&r.request().method()==='POST');
  await signup.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  assert.equal((await logoutResponse).status(),200);
  await signup.goto(origin+'/collection',{waitUntil:'networkidle'});
  await signup.waitForURL('**/login?next=*');
  await signup.getByRole('dialog').waitFor();
  assert.equal((await anonymous.request.get(origin+'/api/auth/me').then(r=>r.json())).user,null);
  assert.equal(await signup.locator('.saved-item').count(),0);
  record({case:'UI chart calculation, explicit SQL save, reopen and logout protect private collection',verdict:'PASS'});
  if(process.env.THIENDO_JOURNEY_ONLY==='true')return;
  await anonymous.request.post(origin+'/api/auth/logout');
  const login=await anonymous.request.post(origin+'/api/auth/login',{data:{email:'NEW_RESEARCHER',password,remember:false}});assert.equal(login.status(),200);assert.ok(!/Max-Age|Expires=/i.test(login.headers()['set-cookie']));
  const cookie=(await anonymous.cookies()).find(c=>c.name==='thiendo_session');assert.ok(cookie.httpOnly);assert.equal(cookie.expires,-1);
  const dup=await anonymous.request.post(origin+'/api/auth/register',{data:{email:'second@example.invalid',username:'NEW_RESEARCHER',password}});assert.equal(dup.status(),409);assert.equal((await pg.query("SELECT COUNT(*)::int AS n FROM users WHERE email='second@example.invalid'")).rows[0].n,0);
  record({case:'username login, browser-session cookie and duplicate rollback operate through HTTP',verdict:'PASS'});
  const remembered=await anonymous.request.post(origin+'/api/auth/login',{data:{identifier:'new_researcher',password,remember:true}});assert.equal(remembered.status(),200);assert.match(remembered.headers()['set-cookie'],/Max-Age=604800/);
  const blocked=await anonymous.request.get(origin+'/api/admin/insights/dashboard?days=7');assert.ok([401,403].includes(blocked.status()));
  const dashboard=await owner.context.request.get(origin+'/api/admin/insights/dashboard?days=7');assert.equal(dashboard.status(),200,await dashboard.text());const report=await dashboard.json();assert.equal(report.metrics.find(m=>m.id==='users.total').value,3);assert.equal(report.metrics.find(m=>m.id==='traffic.views').value,null);assert.equal(report.daily.length,7);
  assert.equal((await owner.context.request.get(origin+'/api/admin/insights/dashboard?days=100')).status(),400);
  record({case:'MFA owner dashboard returns actual counts, missing tracking remains null, member denied',verdict:'PASS'});
  await page.goto(origin+'/admin',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Toàn cảnh Thiên Đồ'}).waitFor();
  await page.getByText('Chưa tải được số liệu',{exact:true}).waitFor({state:'hidden'});
  assert.ok(!(await page.locator('.topbar .crumb b').evaluate(el=>getComputedStyle(el).transitionProperty)).split(',').map(v=>v.trim()).some(v=>['all','color','background-color'].includes(v)),'Final shared theme CSS must be loaded');
  for(const mode of ['dark','light']){await theme(mode);await shot('admin-'+mode);await page.getByRole('button',{name:'Mở trợ lý AI',exact:true}).click();const panel=page.getByRole('dialog',{name:'Thiên Đồ AI'});await panel.waitFor();await panel.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));await shot('chat-'+mode);assert.equal(await panel.locator('input[type=checkbox]').isDisabled(),true);await panel.getByLabel('Câu hỏi quản trị',{exact:true}).fill('Doanh thu 7 ngày gần đây thế nào?');await panel.getByRole('button',{name:'Xem báo cáo',exact:true}).click();await panel.getByRole('article',{name:'Báo cáo dữ liệu quản trị'}).waitFor();assert.ok((await panel.innerText()).includes('Tổng thu trước hoàn tiền'));await panel.getByRole('button',{name:'Đóng và xóa hội thoại AI'}).click();await panel.waitFor({state:'hidden'});}
  record({case:'new finance chatbot report and both real dashboard themes render',verdict:'PASS'});
  await page.getByRole('button',{name:'Thu gọn thanh điều hướng',exact:true}).click();assert.equal(await page.locator('.site').getAttribute('data-navigation'),'compact');await page.locator('#thiendo-sidebar a[title]').first().focus();await page.getByRole('tooltip').waitFor();await shot('navigation-compact');await page.getByRole('button',{name:'Mở rộng thanh điều hướng',exact:true}).click();
  await page.getByLabel('Chọn dữ liệu biểu đồ').selectOption('posts');await page.getByRole('button',{name:'Cột',exact:true}).click();await page.getByRole('button',{name:'Đường',exact:true}).click();await page.getByRole('button',{name:'Miền',exact:true}).click();
  record({case:'activity chart switches data and all three chart presentations',verdict:'PASS'});
  const routes=process.env.THIENDO_ADMIN_FINAL_ONLY==='true'?['/admin','/admin/books','/admin/van-kho','/admin/forum','/admin/tinh-canh','/admin/huyen-giai','/admin/finance','/admin/huong-dan','/admin/tro-ly','/tinh-canh']:['/','/huyen-hoc','/chart','/bazi','/mai-hoa','/luc-hao','/ky-mon','/western-astrology','/huyen-giai','/study','/books','/van-kho','/forum','/tinh-canh','/membership','/consultation','/huong-dan','/admin','/admin/books','/admin/van-kho','/admin/forum','/admin/tinh-canh','/admin/huyen-giai','/admin/finance','/admin/huong-dan'];
  const matrix=[];
  console.log('START responsive matrix');
  for(const width of (process.env.THIENDO_A11Y_ONLY==='true'?[]:[320,360,390,768,1024,1440,1920])){
    await page.setViewportSize({width,height:1000});
    for(const mode of ['dark','light']){
      await theme(mode);
      for(const route of routes){
        // Dashboard reads are rate limited; expire only this disposable fixture's audit window.
        await pg.query("UPDATE admin_audit SET created_at=clock_timestamp()-INTERVAL '2 minutes' WHERE action='dashboard.read'");
        const response=await page.goto(origin+route,{waitUntil:'networkidle'});assert.ok(response.status()<400,route+' HTTP '+response.status());
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,route+' @ '+width+' '+mode);
        matrix.push({route,width,theme:mode,http:response.status(),overflow,labPerformance:await page.evaluate(()=>({...window.__tdPerf,ttfb:performance.getEntriesByType('navigation')[0]?.responseStart,resourceTransferBytes:performance.getEntriesByType('resource').reduce((n,e)=>n+e.transferSize,0)}))});
        if([390,1440].includes(width)&&['/','/chart','/books','/forum','/admin','/admin/finance'].includes(route))await shot(route.replaceAll('/','-').replace(/^-/,'')+'-'+width+'-'+mode);
      }
    }
    fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify(matrix,null,2));console.log('MATRIX '+width+' complete');
  }
  const staticRoutes=process.env.THIENDO_ADMIN_FINAL_ONLY==='true'||process.env.THIENDO_A11Y_ONLY==='true'?[]:Object.entries(JSON.parse(fs.readFileSync(path.join(root,'apps/web/.next/app-path-routes-manifest.json'),'utf8'))).filter(([key])=>key.endsWith('/page')).map(([,route])=>route).filter(r=>!r.includes('[')&&!r.startsWith('/_')&&!routes.includes(r)&&r!=='/login');
  for(const width of [390,1440]){await page.setViewportSize({width,height:1000});for(const mode of ['dark','light']){await theme(mode);for(const route of staticRoutes){await page.goto(origin+route,{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' overflow '+width);matrix.push({route,width,theme:mode,supplemental:true});}}}
  const a11y=[];if(process.env.THIENDO_AXE_MODULE){const {default:AxeBuilder}=require(process.env.THIENDO_AXE_MODULE);for(const route of ['/','/admin','/books','/forum']){await page.goto(origin+route,{waitUntil:'networkidle'});for(const mode of ['dark','light']){await theme(mode);const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();a11y.push({route,theme:mode,violations:scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:scan.incomplete.map(v=>v.id)});}}fs.writeFileSync(path.join(out,'accessibility.json'),JSON.stringify(a11y,null,2));assert.equal(a11y.reduce((sum,s)=>sum+s.violations.length,0),0,'Automated accessibility violations remain');}
  await page.setViewportSize({width:390,height:700});await page.goto(origin+'/admin',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Mở menu',exact:true}).first().click();await page.locator('#thiendo-sidebar').waitFor();await shot('mobile-menu');await page.keyboard.press('Escape');assert.equal(await page.locator('#thiendo-sidebar').evaluate(el=>el.inert),true);
  await page.getByRole('button',{name:'Mở trợ lý AI',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.getByRole('dialog',{name:'Thiên Đồ AI'}).evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  record({case:'mobile drawer Escape, inert state and reduced-motion chatbot',verdict:'PASS'});
  await signup.goto(origin+'/');await signup.setViewportSize({width:1440,height:1000});for(let i=0;i<3;i++){await signup.locator('.theme-button').click();await signup.waitForTimeout(1200);}await anonymous.close();
  fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify(matrix,null,2));fs.writeFileSync(path.join(out,'lab-memory.json'),JSON.stringify({scope:'Combined Next/Nest/PGlite QA process; not production server measurement',bytes:process.memoryUsage()},null,2));assert.deepEqual(pageErrors,[]);record({case:'all browser pages free of uncaught JavaScript errors',verdict:'PASS'});
 }catch(error){console.error('BROWSER FAILED',error);for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web){web.closeAllConnections();await new Promise(r=>web.close(r));}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});fs.rmSync(webWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
