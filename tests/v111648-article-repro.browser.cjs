/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v111648-admin-user');
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
  const query=async(c,sql,params)=>{try{const r=await c.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};}catch(error){console.error('SQL integration error',error.code,error.message);throw error;}};
  const db={query:(sql,p)=>query(pg,sql,p),transaction:work=>pg.transaction(tx=>work({query:(sql,p)=>query(tx,sql,p)}))};
  require('reflect-metadata');const {NestFactory}=require('@nestjs/core'),{Module}=require('@nestjs/common');
  const {AppModule}=require(path.join(root,'apps/api/dist/app.module.js')),{DatabaseService}=require(path.join(root,'apps/api/dist/common/database.service.js'));
  const delivered=new Map();require(path.join(root,'apps/api/dist/modules/auth/email-code.js')).sendVerificationCode=async(email,code)=>delivered.set(email,code);
  class BrowserSqlModule{};Module({controllers:Reflect.getMetadata('controllers',AppModule),providers:Reflect.getMetadata('providers',AppModule).map(p=>p===DatabaseService?{provide:DatabaseService,useValue:db}:p)})(BrowserSqlModule);
  api=await NestFactory.create(BrowserSqlModule,{logger:false});await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3605});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3605,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3605',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const owner=await register('owner-browser@example.invalid'),member=await register('member-browser@example.invalid');
  await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.user.id]);
  async function post(context,url,data){const r=await context.request.post(origin+url,{data});assert.equal(r.status(),200,url+' '+await r.text());return r.json();}
  const sent=await post(owner.context,'/api/auth/email/send',{});await post(owner.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(owner.email)});
  const page=await owner.context.newPage();await page.goto(origin+'/admin/books',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Bảo vệ khu vực quản trị'}).waitFor();record({case:'direct admin subsection requires MFA',verdict:'PASS'});
  // Actual setup/confirm endpoints, no seeded assurance records.
  const setup=await post(owner.context,'/api/auth/mfa/setup',{password});const {totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));await post(owner.context,'/api/auth/mfa/confirm',{code:totpCode(setup.manualKey,Math.floor(Date.now()/30000))});
  await page.reload({waitUntil:'networkidle'});await page.getByRole('heading',{name:'Quản trị sách',exact:true}).waitFor();
  const userPage=await member.context.newPage();
  // Real CMS -> SQL -> public articles. Keep the same form after its initial save.
  await page.goto(origin+'/admin',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Nội dung',exact:true}).click();
  await page.getByRole('heading',{name:'Bài viết / bản nháp',exact:true}).waitFor();await page.getByRole('button',{name:'Bài mới',exact:true}).click();
  await page.getByLabel('Đường dẫn (không dấu)',{exact:true}).fill('runtime-article-648');await page.getByLabel('Tiêu đề',{exact:true}).fill('Kiểm thử bài viết 648');
  await page.getByLabel('Nội dung',{exact:true}).fill('Đây là <b>chữ nguyên văn</b> của bài thử.');
  async function saveArticle(){const response=page.waitForResponse(r=>r.url().endsWith('/api/admin/posts')&&r.request().method()==='POST');await page.getByRole('button',{name:'Lưu bài viết',exact:true}).click();const r=await response;assert.equal(r.status(),201,await r.text());await page.getByRole('button',{name:'Lưu bài viết',exact:true}).waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(n=>n.textContent==='Lưu bài viết'&&!n.disabled));}
  await saveArticle();await userPage.goto(origin+'/articles',{waitUntil:'networkidle'});await userPage.getByText('Chưa có bài viết được xuất bản.',{exact:true}).waitFor();assert.equal(await userPage.getByRole('heading',{name:'Kiểm thử bài viết 648',exact:true}).count(),0);
  const initialPost=(await pg.query("SELECT id,published FROM content_posts WHERE slug='runtime-article-648'")).rows[0];assert.equal(initialPost.published,false);record({case:'article draft saved in SQL is absent from public content',verdict:'PASS'});
  await page.getByLabel('Xuất bản công khai',{exact:true}).check();await saveArticle();
  assert.equal((await pg.query("SELECT id FROM content_posts WHERE slug='runtime-article-648'")).rows[0].id,initialPost.id);
  await userPage.reload({waitUntil:'networkidle'});await userPage.getByRole('heading',{name:'Kiểm thử bài viết 648',exact:true}).waitFor();assert.ok((await userPage.locator('article').innerText()).includes('<b>chữ nguyên văn</b>'));assert.equal(await userPage.locator('article b').count(),0);
  record({case:'same admin draft form publishes existing ID and public page renders text safely',verdict:'PASS'});
  let articleRoute,articleReady;const articleRequested=new Promise(resolve=>articleReady=resolve);
  await userPage.route('**/api/articles',async route=>{articleRoute=route;articleReady()});await userPage.goto(origin+'/articles',{waitUntil:'domcontentloaded'});await articleRequested;
  await userPage.getByRole('status').filter({hasText:'Đang tải ghi chép'}).waitFor();assert.equal(await userPage.getByText('Chưa có bài viết được xuất bản.',{exact:true}).count(),0);
  await articleRoute.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Controlled article outage'})});await userPage.getByRole('button',{name:'Tải lại ghi chép',exact:true}).waitFor();await userPage.unroute('**/api/articles');
  await userPage.getByRole('button',{name:'Tải lại ghi chép',exact:true}).click();await userPage.getByRole('heading',{name:'Kiểm thử bài viết 648',exact:true}).waitFor();record({case:'article pending state avoids false empty content; 503 retry reads real published SQL record (fault injection)',verdict:'PASS'});
  await page.getByLabel('Xuất bản công khai',{exact:true}).uncheck();await saveArticle();await userPage.reload({waitUntil:'networkidle'});await userPage.getByText('Chưa có bài viết được xuất bản.',{exact:true}).waitFor();assert.equal((await pg.query('SELECT published FROM content_posts WHERE id=$1',[initialPost.id])).rows[0].published,false);record({case:'unpublishing from the same admin form removes article from public page',verdict:'PASS'});

 }finally{await browser?.close();if(web)await new Promise(r=>web.close(r));await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
