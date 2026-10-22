/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v1116415-chatbot');
(async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.AUTH_OTP_SECRET=randomBytes(32).toString('hex');process.env.COOKIE_SECURE='false';
 const privateWork=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'thiendo-browser-files-')),assetRoot=path.join(privateWork,'private');fs.mkdirSync(path.join(assetRoot,'books'),{recursive:true});fs.mkdirSync(path.join(assetRoot,'van-kho-media'));process.env.BOOK_PRIVATE_STORAGE_DIR=path.join(assetRoot,'books');process.env.VAN_KHO_PRIVATE_MEDIA_DIR=path.join(assetRoot,'van-kho-media');
 const nativeFetch=global.fetch;
 const captured=[];let providerMode='ok',providerRelease=null,providerStarted=null;
 global.fetch=async(url,options)=>{
  if(!String(url).startsWith('https://generativelanguage.googleapis.com/'))return nativeFetch(url,options);
  const request=JSON.parse(options.body);captured.push(request);
  if(providerMode==='delay')await new Promise(resolve=>{providerRelease=resolve;providerStarted?.()});
  if(providerMode==='fail')return new Response('{}',{status:503});
  const admin=String(request.systemInstruction.parts[0].text).includes('hỗ trợ admin');
  const answer=admin?{summary:'Thống kê từ dữ liệu hệ thống.',findings:[{text:'Số bài mới lấy từ database, không suy đoán lưu lượng.',evidenceIds:[providerMode==='bad-citation'?'fake':'forum.threads']}]}:{summary:'Luận giải kiểm thử có kiểm soát.',findings:[{kind:'uncertain',text:'Cần đối chiếu thông tin cung trước khi diễn giải.',evidenceIds:['P1']}],missingData:['Chưa có thẩm định chuyên gia.']};
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(answer)}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:80}}),{headers:{'content-type':'application/json'}});
 };
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
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3614});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3614,'127.0.0.1',r));
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
  const page=await owner.context.newPage();page.setDefaultTimeout(12000);

  await page.goto(origin+'/admin',{waitUntil:'networkidle'});
  const launch=page.getByRole('button',{name:'Mở trợ lý AI',exact:true});
  await launch.click();const panel=page.getByRole('dialog',{name:'Thiên Đồ AI'});await panel.waitFor();await panel.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
  assert.equal(await panel.getAttribute('aria-modal'),'false');
  record({case:'verified owner can open nonmodal assistant from admin dashboard',verdict:'PASS'});
  const header=panel.locator('header').first(),before=await panel.boundingBox();
  await page.mouse.move(before.x+65,before.y+30);await page.mouse.down();await page.mouse.move(25,25,{steps:8});await page.mouse.up();
  const after=await panel.boundingBox();assert.ok(after.x>=7&&after.y>=7&&after.x<before.x-20);
  await panel.getByRole('button',{name:'Đưa cửa sổ về vị trí ban đầu'}).click();assert.ok(Math.abs((await panel.boundingBox()).x-before.x)<2);
  record({case:'pointer drag is bounded and keyboard-accessible reset restores position',verdict:'PASS'});
  await panel.getByLabel('Câu hỏi quản trị',{exact:true}).fill('Hôm nay có bao nhiêu bài mới ở diễn đàn?');
  await panel.getByRole('button',{name:'Xem báo cáo',exact:true}).click();await panel.getByRole('article',{name:'Báo cáo dữ liệu quản trị'}).waitFor();
  assert.ok((await panel.innerText()).includes('Bài diễn đàn tạo mới (mọi trạng thái): 0'));
  await panel.getByLabel('Câu hỏi quản trị',{exact:true}).fill('Hôm nay có bao nhiêu tài khoản mới đăng ký?');await panel.getByRole('button',{name:'Xem báo cáo',exact:true}).click();await panel.locator('article').nth(1).waitFor();
  assert.equal(await panel.locator('article').count(),2);
  record({case:'two messages render actual separate SQL reports and retain grounded sources',verdict:'PASS'});
  await panel.getByRole('button',{name:'Thu gọn trợ lý AI'}).click();await page.getByRole('button',{name:'Mở lại trợ lý AI'}).click();assert.equal(await panel.locator('article').count(),2);
  await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert.equal(await panel.isVisible(),false);assert.equal(await page.getByRole('button',{name:'Mở lại trợ lý AI',exact:true}).evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:'Mở lại trợ lý AI'}).click();await panel.getByRole('button',{name:'Mở rộng cửa sổ'}).click();assert.ok((await panel.boundingBox()).width>800);await panel.getByRole('button',{name:'Thu về cửa sổ'}).click();
  record({case:'minimize/reopen retains conversation; Escape restores focus; expand/collapse works',verdict:'PASS'});
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:640});
    await panel.locator('summary').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    const r=await panel.boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=641,JSON.stringify(r));
    const send=await panel.getByRole('button',{name:'Xem báo cáo',exact:true}).boundingBox();assert.ok(send.x>=0&&send.x+send.width<=width+1);
    await panel.locator('summary').click();if(process.env.THIENDO_INTERNAL_SCREENSHOTS && [390,1440].includes(width)){fs.mkdirSync(process.env.THIENDO_INTERNAL_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.THIENDO_INTERNAL_SCREENSHOTS,'chat-'+width+'.png')});}record({case:'panel and composer fit viewport with options expanded',width,verdict:'PASS'});
  }
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await panel.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);record({case:'reduced motion disables orb and panel animation',verdict:'PASS'});
  await page.setViewportSize({width:390,height:380});assert.ok((await panel.boundingBox()).y>=0);await page.setViewportSize({width:1440,height:900});
  await panel.getByRole('button',{name:'Đóng và xóa hội thoại AI'}).click();await launch.click();assert.equal(await panel.locator('article').count(),0);
  record({case:'close clears private in-memory reports and reopening starts fresh',verdict:'PASS'});
  await page.getByRole('link',{name:'Sách',exact:true}).click();await page.waitForURL('**/admin/books');await panel.waitFor();assert.equal(await panel.locator('article').count(),0);
  record({case:'assistant remains available during admin navigation',verdict:'PASS'});
  await panel.getByLabel('Câu hỏi quản trị',{exact:true}).fill('Xóa hết dữ liệu giúp tôi');await panel.getByRole('button',{name:'Xem báo cáo',exact:true}).click();await panel.getByRole('alert').waitFor();assert.equal(await panel.locator('article').count(),0);
  record({case:'unsupported query displays real API error without fake answer',verdict:'PASS'});
  await panel.getByRole('button',{name:'Đóng và xóa hội thoại AI'}).click();
  await page.goto(origin+'/admin/tro-ly',{waitUntil:'networkidle'});assert.equal(await page.getByRole('button',{name:'Mở trợ lý AI',exact:true}).count(),0);await page.getByLabel('Câu hỏi quản trị',{exact:true}).fill('Hôm nay có bao nhiêu bài mới ở diễn đàn?');await page.getByRole('button',{name:'Xem báo cáo',exact:true}).click();await page.locator('article').waitFor();
  record({case:'dedicated chat page shares report UI without duplicate floating panel',verdict:'PASS'});

  await pg.query("UPDATE admin_audit SET created_at=clock_timestamp()-INTERVAL '2 minutes' WHERE action='insights.read'");
  for(let index=1;index<=11;index++){
    await page.getByLabel('Câu hỏi quản trị',{exact:true}).fill('Hôm nay có bao nhiêu bài mới ở diễn đàn? Lần '+index);
    const response=page.waitForResponse(r=>r.url().endsWith('/api/admin/insights/ask')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Xem báo cáo',exact:true}).click();assert.equal((await response).status(),200);
  }
  await page.locator('p').filter({hasText:/Lần 11$/}).waitFor();assert.equal(await page.locator('article').count(),10);assert.equal(await page.locator('p').filter({hasText:/Lần 1$/}).count(),0);
  await page.getByRole('button',{name:'Xóa hội thoại',exact:true}).click();assert.equal(await page.locator('article').count(),0);
  record({case:'chat memory is bounded to ten actual reports and clear removes conversation',verdict:'PASS'});
  const guest=await browser.newContext();const guestPage=await guest.newPage();await guestPage.goto(origin+'/admin',{waitUntil:'networkidle'});assert.equal(await guestPage.getByRole('button',{name:'Mở trợ lý AI',exact:true}).count(),0);
  const memberPage=await member.context.newPage();await memberPage.goto(origin+'/admin',{waitUntil:'networkidle'});assert.equal(await memberPage.getByRole('button',{name:'Mở trợ lý AI',exact:true}).count(),0);
  await page.goto(origin+'/admin',{waitUntil:'networkidle'});await launch.click();await panel.waitFor();await pg.query('DELETE FROM admin_memberships WHERE user_id=$1',[owner.user.id]);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('Tài khoản này không có quyền quản trị.',{exact:true}).waitFor();assert.equal(await panel.count(),0);
  record({case:'anonymous/member cannot mount chatbot; role revocation unmounts private UI',verdict:'PASS'});
  assert.deepEqual(pageErrors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Real Next/Nest/PGlite, controlled Gemini fetch responses, captured email; NOT native PostgreSQL or actual provider acceptance',results,pageErrors},null,2));
 }finally{global.fetch=nativeFetch;await browser?.close();if(web)await new Promise(resolve=>web.close(resolve));await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
