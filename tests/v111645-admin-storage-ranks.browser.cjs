/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v111645-browser');
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

  // Actual private-file endpoints and SQL, with operator-owned QA fixtures only.
  const bookData={slug:'qa-private-book',title:'Sách kiểm thử lưu trữ',author:'Thiên Đồ QA',subject:'tu-vi',accessLevel:'member',status:'draft',featured:false,tags:[],synopsis:'Tài liệu do bộ kiểm thử tự tạo.',licenseName:'QA fixture',licenseProof:'Do bộ kiểm thử tự tạo; không phải sách thương mại.'};
  const created=await owner.context.request.post(origin+'/api/books/admin',{data:bookData});assert.equal(created.status(),201);const privateBook=(await created.json()).id;
  const objects=['<</Type/Catalog/Pages 2 0 R>>','<</Type/Pages/Kids[3 0 R]/Count 1>>','<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R>>','<</Length 0>>\nstream\n\nendstream'];let pdfText='%PDF-1.4\n',offsets=[0];objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(pdfText));pdfText+=(i+1)+' 0 obj\n'+object+'\nendobj\n'});const xref=Buffer.byteLength(pdfText);pdfText+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<</Size 5/Root 1 0 R>>\nstartxref\n'+xref+'\n%%EOF\n';const pdf=Buffer.from(pdfText);
  const upload=await owner.context.request.post(origin+'/api/books/admin/'+privateBook+'/assets/book/pdf',{data:pdf,headers:{'content-type':'application/octet-stream'}});assert.equal(upload.status(),201,await upload.text());
  assert.equal((await owner.context.request.patch(origin+'/api/books/admin/'+privateBook,{data:{...bookData,status:'published'}})).status(),200);
  const anonymous=await browser.newContext();assert.equal((await anonymous.request.get(origin+'/api/books/'+bookData.slug+'/file')).status(),401);
  const bookFile=await member.context.request.get(origin+'/api/books/'+bookData.slug+'/file');assert.equal(bookFile.status(),200);assert.deepEqual(await bookFile.body(),pdf);
  const range=await member.context.request.get(origin+'/api/books/'+bookData.slug+'/file',{headers:{Range:'bytes=0-15'}});assert.equal(range.status(),206);assert.deepEqual(await range.body(),pdf.subarray(0,16));
  assert.equal((await owner.context.request.patch(origin+'/api/books/admin/'+privateBook,{data:{...bookData,status:'published',accessLevel:'pro'}})).status(),200);
  assert.equal((await member.context.request.get(origin+'/api/books/'+bookData.slug+'/file')).status(),403);
  assert.equal((await owner.context.request.patch(origin+'/api/books/admin/'+privateBook,{data:{...bookData,status:'published'}})).status(),200);await anonymous.close();
  record({case:'real PDF upload, publication, member/anonymous/Pro authorization and HTTP byte ranges',verdict:'PASS'});
  const imageDoc={slug:'qa-media-document',title:'Tài liệu kiểm thử ảnh',subject:'tu-vi',body:'Nội dung do QA tự tạo để kiểm tra ảnh.',tags:['kiem thu'],excerpt:'Kiểm tra ảnh riêng'};
  const docCreated=await owner.context.request.post(origin+'/api/van-kho/admin/documents',{data:imageDoc});assert.equal(docCreated.status(),201);const imageDocId=(await docCreated.json()).id;
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ4sAAAAASUVORK5CYII=','base64');
  const imageUpload=await owner.context.request.post(origin+'/api/van-kho/admin/documents/'+imageDocId+'/images/png',{data:png,headers:{'content-type':'application/octet-stream','x-image-alt':encodeURIComponent('Ảnh do QA tạo'),'x-image-rights':encodeURIComponent('Ảnh kiểm thử tự tạo, không dùng nội dung bên thứ ba')}});assert.equal(imageUpload.status(),201,await imageUpload.text());const image=await imageUpload.json();
  assert.equal((await owner.context.request.patch(origin+'/api/van-kho/admin/documents/'+imageDocId,{data:{...imageDoc,body:imageDoc.body+'\n'+image.markdown,expectedRevision:1}})).status(),200);
  assert.equal((await owner.context.request.post(origin+'/api/van-kho/admin/documents/'+imageDocId+'/submit',{data:{}})).status(),201);
  assert.equal((await staff.context.request.post(origin+'/api/van-kho/admin/documents/'+imageDocId+'/approve',{data:{}})).status(),201);
  assert.equal((await owner.context.request.post(origin+'/api/van-kho/admin/documents/'+imageDocId+'/publish',{data:{}})).status(),409);
  assert.equal((await owner.context.request.post(origin+'/api/van-kho/admin/documents/'+imageDocId+'/images/'+image.id+'/verify',{data:{}})).status(),403);
  assert.equal((await staff.context.request.post(origin+'/api/van-kho/admin/documents/'+imageDocId+'/images/'+image.id+'/verify',{data:{}})).status(),201);
  assert.equal((await owner.context.request.post(origin+'/api/van-kho/admin/documents/'+imageDocId+'/publish',{data:{}})).status(),201);
  const imageUrl=origin+'/api/van-kho/'+imageDoc.slug+'/images/'+image.id;const imageRead=await member.context.request.get(imageUrl);assert.equal(imageRead.status(),200);assert.deepEqual(await imageRead.body(),png);
  record({case:'real Van Kho image upload, independent rights review and published image delivery',verdict:'PASS'});
  const {spawnSync}=require('node:child_process'),bundle=path.join(privateWork,'assets.tda'),restored=path.join(privateWork,'restored');
  const packed=spawnSync(process.execPath,[path.join(root,'infrastructure/production/file-bundle.mjs'),'pack',assetRoot],{maxBuffer:10*1024*1024});assert.equal(packed.status,0,packed.stderr.toString());fs.writeFileSync(bundle,packed.stdout);
  const indexFile=path.join(privateWork,'asset-index.json');fs.writeFileSync(indexFile,JSON.stringify((await pg.query(fs.readFileSync(path.join(root,'infrastructure/production/private-assets-index.sql'),'utf8'))).rows[0].asset_index));
  const indexed=spawnSync(process.execPath,[path.join(root,'infrastructure/production/file-bundle.mjs'),'verify-index',bundle,indexFile],{encoding:'utf8'});assert.equal(indexed.status,0,indexed.stderr);assert.equal(JSON.parse(indexed.stdout).references,2);
  const unpacked=spawnSync(process.execPath,[path.join(root,'infrastructure/production/file-bundle.mjs'),'unpack',bundle,restored],{encoding:'utf8'});assert.equal(unpacked.status,0,unpacked.stderr);
  process.env.BOOK_PRIVATE_STORAGE_DIR=path.join(restored,'books');process.env.VAN_KHO_PRIVATE_MEDIA_DIR=path.join(restored,'van-kho-media');
  await api.close();api=await NestFactory.create(BrowserSqlModule,{logger:false});await api.listen(8080,'127.0.0.1');
  assert.deepEqual(await (await member.context.request.get(origin+'/api/books/'+bookData.slug+'/file')).body(),pdf);assert.deepEqual(await (await member.context.request.get(imageUrl)).body(),png);
  record({case:'checksummed file restore to new directory and API restart still serve identical PDF/PNG (PGlite DB retained)',verdict:'PASS'});
  // Every manual level is observed through the member UI, without changing points.
  await userPage.goto(origin+'/tinh-canh',{waitUntil:'networkidle'});const personal=userPage.getByRole('region',{name:'Cảnh giới cá nhân',exact:true});await personal.waitFor();
  const beforePoints=(await (await member.context.request.get(origin+'/api/tinh-canh/me')).json()).progress.points;
  for(let level=1;level<=17;level++){
   const decision=await owner.context.request.post(origin+'/api/tinh-canh/admin/rank-grants',{data:{userId:member.user.id,level,reason:'Đối chứng cảnh giới qua SQL và trình duyệt'}});assert.equal(decision.status(),201,await decision.text());
   await userPage.evaluate(()=>window.dispatchEvent(new Event('focus')));await personal.locator('svg[data-level="'+level+'"]').waitFor();await personal.getByText(/Huy chương do Admin cấp/).waitFor();
   assert.equal((await (await member.context.request.get(origin+'/api/tinh-canh/me')).json()).progress.points,beforePoints);
   record({case:'admin manual rank reflected on member focus without changing points',level,verdict:'PASS'});
  }
  await page.goto(origin+'/admin/tinh-canh',{waitUntil:'networkidle'});await page.getByLabel('UUID thành viên',{exact:true}).fill(member.user.id);await page.getByLabel('Chọn cảnh giới',{exact:true}).selectOption('18');await page.getByLabel('Lý do cấp (12–600 ký tự)',{exact:true}).fill('Nghiệm thu huy hiệu Vô Cực Tinh Đồ qua giao diện');
  const rankResponse=page.waitForResponse(r=>r.url().endsWith('/api/tinh-canh/admin/rank-grants')&&r.request().method()==='POST');await page.getByRole('button',{name:'Cấp / thay đổi cảnh giới',exact:true}).click();assert.equal((await rankResponse).status(),201);
  await userPage.evaluate(()=>window.dispatchEvent(new Event('focus')));await personal.locator('svg[data-level="18"]').waitFor();await personal.getByText('Vô Cực Tinh Đồ',{exact:true}).waitFor();
  record({case:'admin UI grants level 18; existing member page refreshes to named apex medal',verdict:'PASS'});
  const revokeResponse=page.waitForResponse(r=>r.url().includes('/api/tinh-canh/admin/rank-grants/')&&r.url().endsWith('/revoke'));page.once('dialog',d=>d.accept('Thu hồi quyết định QA sau khi kiểm chứng đầy đủ'));await page.getByRole('button',{name:'Thu hồi',exact:true}).click();assert.equal((await revokeResponse).status(),201);
  await userPage.evaluate(()=>window.dispatchEvent(new Event('focus')));await personal.locator('svg[data-level="1"]').waitFor();assert.equal((await (await member.context.request.get(origin+'/api/tinh-canh/me')).json()).progress.points,beforePoints);
  record({case:'admin UI revokes medal; member returns to earned rank without changing points',verdict:'PASS'});
  userPage.on('response',async response=>{if(response.url().endsWith('/api/tinh-canh/me/privacy'))console.log('Privacy HTTP',response.status(),await response.text().catch(()=>'<closed>'))});
  const privacy=userPage.getByLabel('Hiện hồ sơ trên danh bảng công khai',{exact:true});const hiddenResponse=userPage.waitForResponse(r=>r.url().endsWith('/api/tinh-canh/me/privacy')&&r.status()===200);try{await Promise.all([hiddenResponse,privacy.uncheck()])}catch(error){console.log('Privacy loaded chunks',await userPage.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src)));console.log('Privacy diagnostic',await privacy.evaluate(n=>({checked:n.checked,disabled:n.disabled,html:n.outerHTML})),await userPage.locator('[role=alert]').allTextContents(),await (await member.context.request.get(origin+'/api/tinh-canh/me')).json());throw error;}assert.equal((await (await member.context.request.get(origin+'/api/tinh-canh/me')).json()).publicRank,false);const publicResponse=userPage.waitForResponse(r=>r.url().endsWith('/api/tinh-canh/me/privacy')&&r.status()===200);await Promise.all([publicResponse,privacy.check()]);
  record({case:'member can persist leaderboard privacy through actual API and SQL',verdict:'PASS'});
  const memberEmail=await post(member.context,'/api/auth/email/send',{});await post(member.context,'/api/auth/email/verify',{challengeId:memberEmail.challengeId,code:delivered.get(member.email)});
  const threadData={category:'nghien-cuu',visibility:'public',title:'Thảo luận kiểm thử xuyên suốt',body:'Nội dung QA tự tạo để kiểm tra vòng đời thảo luận và kiểm duyệt.'};
  const threadCreated=await member.context.request.post(origin+'/api/forum/threads',{data:threadData});assert.equal(threadCreated.status(),201,await threadCreated.text());const threadId=(await threadCreated.json()).id;
  await userPage.goto(origin+'/forum/'+threadId,{waitUntil:'networkidle'});await userPage.getByRole('heading',{name:threadData.title,exact:true}).waitFor();record({case:'verified member creates real forum thread visible in browser',verdict:'PASS'});
  assert.equal((await staff.context.request.patch(origin+'/api/forum/threads/'+threadId,{data:{...threadData,title:'Không được sửa bài người khác',expectedRevision:1}})).status(),403);
  assert.equal((await member.context.request.patch(origin+'/api/forum/threads/'+threadId,{data:{...threadData,title:'Thảo luận QA đã cập nhật',expectedRevision:1}})).status(),200);
  assert.equal((await member.context.request.patch(origin+'/api/forum/threads/'+threadId,{data:{...threadData,expectedRevision:1}})).status(),409);
  record({case:'forum author authorization and revision conflict reject foreign/stale edits',verdict:'PASS'});
  for(const action of ['like','bookmark','follow'])assert.equal((await staff.context.request.post(origin+'/api/forum/threads/'+threadId+'/'+action,{data:{}})).status(),201);
  const commentCreated=await staff.context.request.post(origin+'/api/forum/threads/'+threadId+'/comments',{data:{body:'Bình luận QA có nội dung rõ ràng.'}});assert.equal(commentCreated.status(),201,await commentCreated.text());
  const notifications=(await (await member.context.request.get(origin+'/api/forum/notifications')).json()).notifications;const notification=notifications.find(x=>x.threadId===threadId);assert.ok(notification);assert.equal((await staff.context.request.patch(origin+'/api/forum/notifications/'+notification.id+'/seen',{data:{}})).status(),404);assert.equal((await member.context.request.patch(origin+'/api/forum/notifications/'+notification.id+'/seen',{data:{}})).status(),200);
  record({case:'forum reactions/comment create private notification; another user cannot mark it seen',verdict:'PASS'});
  const modUrl=origin+'/api/forum/moderation/threads/'+threadId;
  assert.equal((await staff.context.request.post(modUrl,{data:{action:'lock',reason:'Khóa thảo luận trong kiểm thử QA'}})).status(),201);
  assert.equal((await member.context.request.post(origin+'/api/forum/threads/'+threadId+'/comments',{data:{body:'Không được ghi khi đã khóa.'}})).status(),403);
  assert.equal((await staff.context.request.post(modUrl,{data:{action:'unlock',reason:'Mở khóa sau khi kiểm tra QA'}})).status(),201);
  assert.equal((await staff.context.request.post(modUrl,{data:{action:'hide',reason:'Ẩn nội dung trong kiểm thử QA'}})).status(),201);
  assert.equal((await member.context.request.get(origin+'/api/forum/threads/'+threadId)).status(),404);
  assert.equal((await staff.context.request.post(modUrl,{data:{action:'restore',reason:'Khôi phục nội dung sau kiểm thử QA'}})).status(),201);
  assert.equal((await member.context.request.get(origin+'/api/forum/threads/'+threadId)).status(),200);
  record({case:'admin lock/hide/restore is enforced on member reads and writes',verdict:'PASS'});
  const reportResult=await member.context.request.post(origin+'/api/forum/reports/threads/'+threadId,{data:{reason:'other',explanation:'Báo cáo QA để kiểm chứng hàng đợi.'}});assert.equal(reportResult.status(),201);
  const queue=(await (await staff.context.request.get(origin+'/api/forum/moderation/queue')).json()).reports;assert.ok(queue.some(x=>x.threadId===threadId||x.thread_id===threadId));
  assert.equal((await member.context.request.post(origin+'/api/forum/threads',{data:{...threadData,body:'<script>alert("QA")</script>'}})).status(),400);
  record({case:'forum report reaches moderation queue and unsafe markup is rejected',verdict:'PASS'});
  await userPage.goto(origin+'/tinh-canh',{waitUntil:'networkidle'});await personal.waitFor();
  await userPage.route('**/api/tinh-canh/me/privacy',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Fixture privacy outage'})}));
  await privacy.click();await userPage.getByRole('alert').filter({hasText:'Chưa xác nhận được lựa chọn hiển thị'}).waitFor();await privacy.waitFor();assert.equal(await privacy.isChecked(),true);assert.equal((await (await member.context.request.get(origin+'/api/tinh-canh/me')).json()).publicRank,true);await userPage.unroute('**/api/tinh-canh/me/privacy');
  record({case:'privacy API failure rolls back checkbox and preserves server preference (UI fault injection)',verdict:'PASS'});
  await userPage.getByRole('button',{name:'Mở tài khoản',exact:true}).click();await userPage.getByRole('button',{name:'Đăng xuất',exact:true}).click();await personal.waitFor({state:'hidden'});await userPage.getByRole('button',{name:'Đăng nhập để xem cảnh giới',exact:true}).waitFor();
  record({case:'sign-out removes personal medal/history from existing public rank page',verdict:'PASS'});

  // UI-only fault injection below; not native database or catalog acceptance.
  for(const catalog of [{route:'/books',endpoint:'/api/books',field:'books',more:'Tải thêm sách',search:'Tìm tên sách hoặc tác giả'},{route:'/van-kho',endpoint:'/api/van-kho',field:'documents',more:'Tải thêm tài liệu',search:'Tìm kiếm'}]){
   let pending,resolvePending,fault=true;const requested=new Promise(resolve=>{resolvePending=resolve});
   const item=title=>({id:member.user.id,slug:'qa-catalog-item',title,author:'QA',subject:'bat-tu',accessLevel:'free',synopsis:'UI fixture',excerpt:'UI fixture',featured:false,format:null,hasCover:false,tags:[],updatedAt:new Date().toISOString(),publishedAt:null});
   await userPage.route('**'+catalog.endpoint+'?*',async route=>{const url=new URL(route.request().url());if(url.searchParams.get('offset')==='1'){pending=route;resolvePending();return;}if(url.searchParams.get('q')==='force-error'&&fault){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Fixture outage'})});return;}const filtered=url.searchParams.get('subject')==='bat-tu';await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({[catalog.field]:[item(filtered?'Filtered item':'Initial item')],nextOffset:filtered?null:1})});});
   await userPage.goto(origin+catalog.route,{waitUntil:'networkidle'});await userPage.getByRole('button',{name:catalog.more,exact:true}).click();await requested;
   await userPage.getByLabel('Bộ môn',{exact:true}).selectOption('bat-tu');await userPage.getByRole('heading',{name:'Filtered item',exact:true}).waitFor();
   await pending.fulfill({status:200,contentType:'application/json',body:JSON.stringify({[catalog.field]:[item('Stale item')],nextOffset:null})}).catch(()=>{});await userPage.waitForTimeout(100);assert.equal(await userPage.getByText('Stale item',{exact:true}).count(),0);
   await userPage.getByLabel(catalog.search,{exact:true}).fill('force-error');await userPage.getByRole('button',{name:'Thử tải lại',exact:true}).waitFor();fault=false;await userPage.getByRole('button',{name:'Thử tải lại',exact:true}).click();await userPage.getByRole('heading',{name:'Filtered item',exact:true}).waitFor();await userPage.unroute('**'+catalog.endpoint+'?*');
   record({case:'catalog stale pagination isolation and outage retry (UI fault injection)',route:catalog.route,verdict:'PASS'});
  }

  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});for(const route of ['/admin','/admin/books','/admin/finance','/admin/forum','/admin/tinh-canh','/admin/van-kho','/admin/huong-dan','/admin/huyen-giai']){await page.goto(origin+route,{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' overflows '+width);record({case:'admin responsive',width,route,verdict:'PASS'});if(process.env.THIENDO_BROWSER_SCREENSHOTS_DIR&&[390,1440].includes(width)&&['/admin','/admin/books'].includes(route)){fs.mkdirSync(process.env.THIENDO_BROWSER_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.THIENDO_BROWSER_SCREENSHOTS_DIR,route.replaceAll('/','-')+'-'+width+'.png'),fullPage:false});}}}
  // Revoke role without changing user ID, then focus to exercise shared permission refresh.
  await pg.query('DELETE FROM admin_memberships WHERE user_id=$1',[owner.user.id]);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('alert').filter({hasText:'không có quyền quản trị'}).waitFor();assert.equal(await page.getByRole('navigation',{name:'Điều hướng quản trị'}).count(),0);await page.getByRole('link',{name:'Quản trị',exact:true}).waitFor({state:'hidden'});record({case:'role revoked: shared admin UI removed on focus',verdict:'PASS'});
  assert.deepEqual(pageErrors,[],'Uncaught browser errors');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Browser/Next/Nest/PGlite; email captured; no native PostgreSQL/provider or main.ts security acceptance',results},null,2));console.log('PASS '+results.length+' admin-user browser checks');
 }finally{await browser?.close();if(web)await new Promise(r=>web.close(r));await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
