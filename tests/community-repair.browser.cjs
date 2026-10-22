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
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const owner=await register('owner-browser@example.invalid'),member=await register('member-browser@example.invalid');
  await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.user.id]);
  async function post(context,url,data){const r=await context.request.post(origin+url,{data});assert.equal(r.status(),200,url+' '+await r.text());return r.json();}
  const sent=await post(owner.context,'/api/auth/email/send',{});await post(owner.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(owner.email)});
  const setup=await post(owner.context,'/api/auth/mfa/setup',{password});const {totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));await post(owner.context,'/api/auth/mfa/confirm',{code:totpCode(setup.manualKey,Math.floor(Date.now()/30000))});



 const page=await member.context.newPage();page.setDefaultTimeout(15000);
 await page.goto(origin+'/',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Mở tài khoản',exact:true}).click();await page.locator('.account-settings').waitFor();
 await page.getByRole('progressbar',{name:'Tiến độ điểm tới cảnh giới tiếp theo'}).waitFor();
 assert.ok((await page.locator('.account-rank').innerText()).includes('Tinh Mầm'));assert.equal(await page.getByRole('progressbar').getAttribute('value'),'0');
 await page.getByLabel('Tên hiển thị',{exact:true}).fill('Nghiên cứu Thiên Đồ');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã cập nhật tên hiển thị.'}).waitFor();
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=420;c.height=300;const x=c.getContext('2d');x.fillStyle='#24785d';x.fillRect(0,0,420,300);return c.toDataURL('image/png').split(',')[1]});
 await page.locator('input[type=file]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await page.getByRole('button',{name:'Lưu ảnh đại diện',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã cập nhật ảnh đại diện.'}).waitFor();
 let r=await member.context.request.get(origin+'/api/auth/avatar');assert.equal(r.status(),200);assert.match(r.headers()['content-type'],/^image\/jpeg/);assert.equal((await r.body())[0],255);
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Mở tài khoản',exact:true}).click();await page.locator('.account-profile-avatar img').waitFor();assert.equal(await page.locator('.account-profile-avatar img').evaluate(x=>x.complete&&x.naturalWidth===256),true);
 // A picker without MIME should still allow a decodable PNG. HEIC gets an actionable error.
 await page.locator('input[type=file]').setInputFiles({name:'avatar.png',mimeType:'',buffer:Buffer.from(image,'base64')});await page.getByRole('button',{name:'Lưu ảnh đại diện',exact:true}).waitFor();await page.getByRole('button',{name:'Hủy',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'photo.heic',mimeType:'image/heic',buffer:Buffer.from('not-an-image')});await page.getByRole('alert').filter({hasText:'HEIC/HEIF'}).waitFor();
 // Bad source image and a server failure must not be reported as saved.
 await page.locator('input[type=file]').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('invalid-image')});await page.getByRole('alert').filter({hasText:'Không thể đọc ảnh'}).waitFor();assert.equal(await page.getByRole('button',{name:'Lưu ảnh đại diện',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Hủy',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await page.route('**/api/auth/avatar',route=>route.request().method()==='POST'?route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Lỗi thử nghiệm lưu ảnh'})}):route.continue());await page.getByRole('button',{name:'Lưu ảnh đại diện',exact:true}).click();await page.getByRole('alert').filter({hasText:'Lỗi thử nghiệm lưu ảnh'}).waitFor();await page.unroute('**/api/auth/avatar');await page.getByRole('button',{name:'Lưu ảnh đại diện',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã cập nhật ảnh đại diện.'}).waitFor();

 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});for(const theme of ['dark','light']){
  const light=await page.locator('.site').evaluate(el=>el.classList.contains('light'));if(light!==(theme==='light'))await page.evaluate(()=>document.querySelector('.theme-button').click());await page.waitForTimeout(350);
  const action=page.getByRole('button',{name:'Chọn ảnh mới',exact:true});assert.equal(await action.isEnabled(),true);
  const colors=await action.evaluate(el=>{const c=getComputedStyle(el);return {foreground:c.color,background:c.backgroundColor}});assert.notEqual(colors.foreground,colors.background);
  if(process.env.THIENDO_AXE_MODULE){const{default:AxeBuilder}=require(process.env.THIENDO_AXE_MODULE);const scan=await new AxeBuilder({page}).include('.account-settings').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();fs.writeFileSync(path.join(out,'profile-a11y-'+width+'-'+theme+'.json'),JSON.stringify({violations:scan.violations,incomplete:scan.incomplete.map(x=>x.id)},null,2));assert.equal(scan.violations.length,0,'profile a11y '+width+' '+theme);}
  await page.screenshot({path:path.join(out,'profile-'+width+'-'+theme+'.png')});
 }}
 await page.screenshot({path:path.join(out,'profile-after.png')});

 await page.getByRole('button',{name:'Xóa ảnh',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã xóa ảnh'}).waitFor();assert.equal((await member.context.request.get(origin+'/api/auth/me').then(r=>r.json())).user.hasAvatar,false);
 record({case:'profile: actual avatar crop/upload/read/reload/delete; empty MIME, HEIC, corrupt file, server failure and retry; initial rank/progress',verdict:'PASS'});
 // Server ledger decides privacy and rank: hiding a public badge never hides own progress.
 await member.context.request.patch(origin+'/api/tinh-canh/me/privacy',{data:{publicRank:false}});
 await pg.query("INSERT INTO tinh_van_awards(user_id,kind,direction,subject,source_id,points,actor_id,ruleset) VALUES($1,'research-reviewed','hoc-gia','nghien-cuu',$2,22,$3,'tinh-canh-v11.159.0')",[member.user.id,require('node:crypto').randomUUID(),owner.user.id]);
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Mở tài khoản',exact:true}).click();await page.getByRole('progressbar').waitFor();assert.ok((await page.locator('.account-rank').innerText()).includes('Sơ Kiến'));assert.ok(Math.abs(Number(await page.getByRole('progressbar').getAttribute('value'))-6.6666666667)<.01);
 record({case:'profile private rank and earned points progress from SQL ledger',verdict:'PASS'});
 const memberSent=await post(member.context,'/api/auth/email/send',{});await post(member.context,'/api/auth/email/verify',{challengeId:memberSent.challengeId,code:delivered.get(member.email)});
 const categories=await member.context.request.get(origin+'/api/forum/categories').then(r=>r.json());const category=categories.categories[0].id;
 let created=await member.context.request.post(origin+'/api/forum/threads',{data:{category,title:'Cộng đồng Thiên Đồ',body:'Trao đổi phương pháp và cùng nghiên cứu.',visibility:'public'}});assert.equal(created.status(),201,await created.text());const threadId=(await created.json()).id;
 let comment=await owner.context.request.post(origin+'/api/forum/threads/'+threadId+'/comments',{data:{body:'Cùng đối chiếu dữ liệu nghiên cứu.'}});assert.equal(comment.status(),201,await comment.text());
 const guest=await browser.newContext({viewport:{width:390,height:844}}),forum=await guest.newPage();
 await forum.goto(origin+'/forum',{waitUntil:'networkidle'});await forum.getByRole('link',{name:/Nghiên cứu Thiên Đồ/}).waitFor();await forum.screenshot({path:path.join(out,'forum-after.png')});
 await forum.goto(origin+'/forum/'+threadId,{waitUntil:'networkidle'});await forum.getByRole('link',{name:/Nghiên cứu Thiên Đồ/}).waitFor();await forum.getByRole('link',{name:/Thành viên ·/}).waitFor();assert.equal((await forum.innerText('main')).includes('@example.invalid'),false);
 await forum.getByRole('link',{name:/Nghiên cứu Thiên Đồ/}).click();await forum.getByRole('heading',{name:'Nghiên cứu Thiên Đồ',exact:true}).waitFor();assert.equal(await forum.getByText('member-browser@example.invalid').count(),0);
 record({case:'forum: public author names and unique legacy identities, profile links, comments; no email disclosure',verdict:'PASS'});
 await page.goto(origin+'/admin',{waitUntil:'networkidle'});await page.getByRole('alert').filter({hasText:'không có quyền'}).waitFor();assert.ok([401,403].includes((await member.context.request.get(origin+'/api/admin/insights/dashboard?days=7')).status()));
 const fresh=await browser.newContext(),admin=await fresh.newPage();await admin.goto(origin+'/admin',{waitUntil:'networkidle'});await admin.getByRole('button',{name:'Đăng nhập quản trị',exact:true}).click();await admin.getByRole('dialog').waitFor();
 await admin.getByLabel('Username hoặc email',{exact:true}).fill(owner.email);await admin.getByLabel('Mật khẩu',{exact:true}).fill(password);await admin.getByRole('dialog').getByRole('button',{name:'Đăng nhập',exact:true}).click();await admin.getByRole('dialog').waitFor({state:'hidden'});
 await admin.reload({waitUntil:'networkidle'});await admin.getByRole('heading',{name:'Bảo vệ khu vực quản trị'}).waitFor();assert.equal((await fresh.request.get(origin+'/api/admin/insights/dashboard?days=7')).status(),403);
 await admin.getByLabel('Mã Authenticator 6 chữ số (không phải mã email)').fill(totpCode(setup.manualKey,Math.floor(Date.now()/30000)+1));await admin.getByRole('button',{name:'Xác minh và vào Bàn điều hành',exact:true}).click();await admin.getByRole('heading',{name:'Toàn cảnh Thiên Đồ'}).waitFor();
 await admin.screenshot({path:path.join(out,'admin-after.png')});record({case:'admin: guest login gate, denied ordinary member, fresh owner login, enforced MFA, successful dashboard',verdict:'PASS'});
 const matrix=[];
 for(const route of ['/western-astrology','/tarot','/numerology','/western-symbols']){
  await page.goto(origin+route,{waitUntil:'networkidle'});
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});for(const theme of ['dark','light']){
   const light=await page.locator('.site').evaluate(el=>el.classList.contains('light'));if(light!==(theme==='light'))await page.locator('.theme-button').click();await page.waitForTimeout(350);
   const nav=page.getByRole('navigation',{name:'Các nhánh Phương Tây và Biểu tượng'});assert.equal(await nav.locator('a').count(),5);assert.equal(await nav.locator('[aria-current=page]').getAttribute('href'),route);assert.equal(await nav.locator('svg').count(),5);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' overflow '+width+' '+theme);
   if(width===1440||width===390)await page.screenshot({path:path.join(out,route.slice(1)+'-'+width+'-'+theme+'.png')});
   matrix.push({route,width,theme,overflow:false});
  }}
 }

 await page.goto(origin+'/western-astrology',{waitUntil:'networkidle'});await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Lập Natal Chart',exact:true}).click();await page.getByRole('region',{name:'Luận Natal chuyên sâu',exact:true}).waitFor();
 await page.goto(origin+'/numerology',{waitUntil:'networkidle'});await page.getByLabel('Họ tên theo giấy khai sinh').fill('Nguyen Van An');await page.getByRole('button',{name:'Tính và đối chiếu',exact:true}).click();await page.getByRole('button',{name:'↓ Xuất JSON đầy đủ (có tên và ngày sinh)',exact:true}).waitFor();
 await page.goto(origin+'/tarot',{waitUntil:'networkidle'});assert.equal(await page.locator('[aria-label="Danh mục Tarot"]').getByRole('button').count(),78);await page.getByRole('button',{name:'✧ Xáo và rút bài',exact:true}).click();await page.getByRole('button',{name:'↓ Xuất JSON trải bài',exact:true}).waitFor();
 await page.goto(origin+'/western-symbols',{waitUntil:'networkidle'});await page.getByLabel('Trường phái nghiên cứu').selectOption('jewish-source-only');assert.equal(await page.getByText('Không gán Tarot',{exact:true}).count(),22);
 record({case:'Western functional smoke: Natal calculation/depth, numerology calculation/export availability, all 78 Tarot cards/draw/export availability, atlas tradition selector',verdict:'PASS'});
 fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify(matrix,null,2));assert.deepEqual(pageErrors,[]);record({case:'Western branches: 24 viewport/theme combinations, vector icon/navigation/active state, no horizontal page overflow or JS exceptions',verdict:'PASS'});
 }catch(error){console.error('BROWSER FAILED',error);for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web){web.closeAllConnections();await new Promise(r=>web.close(r));}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});fs.rmSync(webWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
