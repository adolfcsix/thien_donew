/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v111643-browser');
(async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.AUTH_OTP_SECRET=randomBytes(32).toString('hex');process.env.COOKIE_SECURE='false';
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
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3500});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3500,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3500',password='Browser!'+randomBytes(16).toString('hex');
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
  await page.getByRole('button',{name:'+ Sách mới',exact:true}).click();
  for(const [label,value] of Object.entries({'Tên sách':'Browser SQL book','Đường dẫn sách':'browser-sql-book','Tác giả':'Thiên Đồ QA'}))await page.getByLabel(label,{exact:true}).fill(value);
  const tags=page.getByLabel('Tags (phân tách bằng dấu phẩy)',{exact:true});await tags.pressSequentially('tu vi, kiem thu');assert.equal(await tags.inputValue(),'tu vi, kiem thu');
  const saveResponse=page.waitForResponse(r=>r.url().endsWith('/api/books/admin')&&r.request().method()==='POST');await page.getByRole('button',{name:'Lưu thông tin sách',exact:true}).click();const saveResult=await saveResponse;console.log('Book save HTTP',saveResult.status(),await saveResult.text());assert.equal(saveResult.status(),201);await page.getByRole('status').filter({hasText:'Đã lưu bản ghi'}).waitFor();
  const bookRecord=(await pg.query("SELECT id,tags FROM library_books WHERE slug='browser-sql-book'")).rows[0];assert.deepEqual(bookRecord.tags,['tu vi','kiem thu']);record({case:'book tags typed and persisted through UI/API/SQL',verdict:'PASS'});
  await page.getByLabel('Tên sách',{exact:true}).fill('Browser SQL book updated');const editResponse=page.waitForResponse(r=>r.url().endsWith('/api/books/admin/'+bookRecord.id)&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Lưu thông tin sách',exact:true}).click();assert.equal((await editResponse).status(),200);assert.equal((await pg.query('SELECT title FROM library_books WHERE id=$1',[bookRecord.id])).rows[0].title,'Browser SQL book updated');record({case:'book update persists without SQL parameter type conflict',verdict:'PASS'});
  await page.goto(origin+'/admin',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Đơn & quyền',exact:true}).click();
  await page.getByRole('combobox',{name:/^Tài khoản/}).selectOption(member.user.id);await page.getByLabel('Lý do hỗ trợ',{exact:true}).fill('Browser verified support grant');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Cấp quyền hỗ trợ',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu thay đổi'}).waitFor();
  const userPage=await member.context.newPage();await userPage.goto(origin+'/membership',{waitUntil:'networkidle'});await userPage.getByText(/Đang có quyền Pro/).waitFor();record({case:'admin grant visible to real member session',verdict:'PASS'});
  await page.getByRole('button',{name:'Thu hồi quyền',exact:true}).click({trial:true});page.once('dialog',d=>d.accept('Browser verified revoke'));await page.getByRole('button',{name:'Thu hồi quyền',exact:true}).click();await page.getByText('Đã thu hồi',{exact:true}).waitFor();await userPage.reload({waitUntil:'networkidle'});await userPage.getByText('Bạn đang dùng tài khoản miễn phí.',{exact:true}).waitFor();record({case:'admin revoke removes member Pro view',verdict:'PASS'});
  await userPage.goto(origin+'/admin/books',{waitUntil:'networkidle'});await userPage.getByRole('alert').filter({hasText:'không có quyền quản trị'}).waitFor();assert.equal(await userPage.getByRole('button',{name:'+ Sách mới',exact:true}).count(),0);record({case:'member cannot mount admin editor',verdict:'PASS'});
  await page.goto(origin+'/admin',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Nội dung',exact:true}).click();
  await page.getByLabel('Đường dẫn (không dấu)',{exact:true}).fill('browser-public-post');await page.getByLabel('Tiêu đề',{exact:true}).fill('Nội dung admin đã kiểm chứng');await page.getByLabel('Nội dung',{exact:true}).fill('Nội dung được lưu qua UI, API và SQL thực.');await page.getByLabel('Xuất bản công khai',{exact:true}).check();await page.getByRole('button',{name:'Lưu bài viết',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu thay đổi'}).waitFor();
  await userPage.goto(origin+'/articles',{waitUntil:'networkidle'});await userPage.getByRole('heading',{name:'Nội dung admin đã kiểm chứng',exact:true}).waitFor();record({case:'admin publication visible on user page',verdict:'PASS'});
  const staff=await register('staff-browser@example.invalid');
  await page.getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByLabel('Tìm tài khoản theo email',{exact:true}).fill(staff.email);await page.getByRole('button',{name:'Tìm',exact:true}).click();
  const staffRow=page.getByRole('row').filter({hasText:staff.email});page.once('dialog',d=>d.accept());await staffRow.getByRole('button',{name:'Cấp quản trị',exact:true}).click();await staffRow.getByRole('button',{name:'Gỡ quản trị',exact:true}).waitFor();
  const staffSent=await post(staff.context,'/api/auth/email/send',{});await post(staff.context,'/api/auth/email/verify',{challengeId:staffSent.challengeId,code:delivered.get(staff.email)});
  const staffSetup=await post(staff.context,'/api/auth/mfa/setup',{password});await post(staff.context,'/api/auth/mfa/confirm',{code:totpCode(staffSetup.manualKey,Math.floor(Date.now()/30000))});
  const staffPage=await staff.context.newPage();await staffPage.goto(origin+'/admin/huyen-giai',{waitUntil:'networkidle'});const configSave=staffPage.getByRole('button',{name:'Lưu cấu hình',exact:true});await configSave.waitFor();assert.equal(await configSave.isDisabled(),true);record({case:'owner grants staff role via UI; staff AI configuration remains read-only',verdict:'PASS'});
  const portalDraft={title:'Browser guide revision',summary:'Isolated integration guide',body:'Nội dung hướng dẫn kiểm thử đầy đủ được lưu qua API và SQL. '.repeat(3),toolHref:'/chart',relatedHref:'/huong-dan',expectedRevision:null};
  assert.equal((await owner.context.request.put(origin+'/api/portal/admin/guide/browser-guide',{data:portalDraft})).status(),200);
  assert.equal((await owner.context.request.post(origin+'/api/portal/admin/guide/browser-guide/submit',{data:{}})).status(),201);
  assert.equal((await owner.context.request.post(origin+'/api/portal/admin/guide/browser-guide/approve',{data:{}})).status(),403);
  assert.equal((await staff.context.request.post(origin+'/api/portal/admin/guide/browser-guide/approve',{data:{}})).status(),201);
  assert.equal((await owner.context.request.post(origin+'/api/portal/admin/guide/browser-guide/publish',{data:{}})).status(),201);
  assert.equal((await member.context.request.get(origin+'/api/portal/public/guide/browser-guide')).status(),200);record({case:'guide workflow SQL and independent approval to public API',verdict:'PASS'});
  const docResponse=await owner.context.request.post(origin+'/api/van-kho/admin/documents',{data:{slug:'browser-document',title:'Tài liệu admin đã kiểm chứng',subject:'tu-vi',body:'Nội dung Văn Khố được kiểm chứng bằng SQL và trình duyệt.',tags:['kiem thu'],excerpt:'Tài liệu kiểm thử'}});assert.equal(docResponse.status(),201);const docId=(await docResponse.json()).id;
  assert.equal((await owner.context.request.post(origin+'/api/van-kho/admin/documents/'+docId+'/submit',{data:{}})).status(),201);
  assert.equal((await owner.context.request.post(origin+'/api/van-kho/admin/documents/'+docId+'/approve',{data:{}})).status(),403);
  assert.equal((await staff.context.request.post(origin+'/api/van-kho/admin/documents/'+docId+'/approve',{data:{}})).status(),201);
  assert.equal((await owner.context.request.post(origin+'/api/van-kho/admin/documents/'+docId+'/publish',{data:{}})).status(),201);
  await userPage.goto(origin+'/van-kho/browser-document',{waitUntil:'networkidle'});await userPage.getByRole('heading',{name:'Tài liệu admin đã kiểm chứng',exact:true}).waitFor();record({case:'Van Kho independent approval publishes to member UI',verdict:'PASS'});
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});for(const route of ['/admin','/admin/books','/admin/finance','/admin/forum','/admin/tinh-canh','/admin/van-kho','/admin/huong-dan','/admin/huyen-giai']){await page.goto(origin+route,{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' overflows '+width);record({case:'admin responsive',width,route,verdict:'PASS'});if(process.env.THIENDO_BROWSER_SCREENSHOTS_DIR&&[390,1440].includes(width)&&['/admin','/admin/books'].includes(route)){fs.mkdirSync(process.env.THIENDO_BROWSER_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.THIENDO_BROWSER_SCREENSHOTS_DIR,route.replaceAll('/','-')+'-'+width+'.png'),fullPage:false});}}}
  // Revoke role without changing user ID, then focus to exercise shared permission refresh.
  await pg.query('DELETE FROM admin_memberships WHERE user_id=$1',[owner.user.id]);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('alert').filter({hasText:'không có quyền quản trị'}).waitFor();assert.equal(await page.getByRole('navigation',{name:'Điều hướng quản trị'}).count(),0);await page.getByRole('link',{name:'Quản trị',exact:true}).waitFor({state:'hidden'});record({case:'role revoked: shared admin UI removed on focus',verdict:'PASS'});
  assert.deepEqual(pageErrors,[],'Uncaught browser errors');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Browser/Next/Nest/PGlite; email captured; no native PostgreSQL/provider or main.ts security acceptance',results},null,2));console.log('PASS '+results.length+' admin-user browser checks');
 }finally{await browser?.close();if(web)await new Promise(r=>web.close(r));await app?.close();await api?.close();await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
