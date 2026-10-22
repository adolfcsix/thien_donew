/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v111648-pages');
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
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3609});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3609,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3609',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const member=await register('review-member@example.invalid');
  const routes=Object.keys(JSON.parse(fs.readFileSync(path.join(root,'apps/web/.next/prerender-manifest.json'),'utf8')).routes).filter(p=>!p.startsWith('/_')).sort();
  for(const width of [390,1440]){
   const page=await member.context.newPage();await page.setViewportSize({width,height:900});
   for(const route of routes){
    const errors=[];const listener=e=>errors.push(e.message);page.on('pageerror',listener);
    try{
     const response=await page.goto(origin+route,{waitUntil:'networkidle',timeout:20000});
     const detail=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,headings:[...document.querySelectorAll('#main-content h1,#main-content h2')].map(n=>n.textContent),mainText:(document.querySelector('#main-content')||document.querySelector('.app-area'))?.innerText.slice(0,2000),actions:[...document.querySelectorAll('#main-content button')].map(n=>({text:n.innerText.trim(),label:n.getAttribute('aria-label'),disabled:n.disabled})),emptyLinks:[...document.querySelectorAll('#main-content a[href]')].filter(n=>!n.getAttribute('href')||n.getAttribute('href')==='#').map(n=>n.innerText),finalPath:location.pathname,alerts:[...document.querySelectorAll('[role=alert]')].map(n=>n.textContent)}));
     const result={case:'route content and geometry',route,width,status:response.status(),...detail,errors,coverage:'DOM inspection only; buttons enumerated, not all executed',state:/Bảo vệ khu vực quản trị/.test(detail.mainText)?'MFA guard; admin content tested separately':/chưa (?:được )?cấu hình|chưa bật|chưa xuất bản|Chưa có|dự thảo/i.test(detail.mainText)?'contains empty/configuration/draft disclosure':'rendered content'};results.push(result);console.log(JSON.stringify(result));
    }catch(e){results.push({case:'route content and geometry',route,width,error:e.message});}finally{page.off('pageerror',listener);}
   }
   await page.close();
  }
  const page=await member.context.newPage();await page.setViewportSize({width:390,height:900});
  await page.route('**/api/tinh-canh/rules',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Rules unavailable for UI fault injection'})}));
  await page.goto(origin+'/tinh-canh',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Tải lại huy chương'}).waitFor();
  await page.getByLabel('Hướng đóng góp').selectOption('hoc-gia');
  assert.equal(await page.getByRole('button',{name:'Tải lại huy chương'}).count(),1,'filter must not hide rules failure');
  await page.unroute('**/api/tinh-canh/rules');await page.getByRole('button',{name:'Tải lại huy chương'}).click();
  await page.locator('svg[data-level="18"]').waitFor();assert.equal(await page.locator('section[aria-label="18 huy chương"] svg[data-level]').count(),18);
  record({case:'rules failure remains visible after filtering and retry restores eighteen medals (UI fault injection)',verdict:'PASS'});
  const failures=results.filter(r=>r.route&&(r.error||r.status>=400||r.overflow||r.errors?.length||r.emptyLinks?.length||(!r.headings?.length&&r.route!=='/login')||!r.mainText?.trim()));
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:failures.length?'FAIL':'PASS',scope:'DOM content, headings, links and geometry; external providers and every button are not accepted. Authenticated member, Chromium production Next + Nest controllers + PGlite; no native PostgreSQL or real providers; route geometry/content inventory is not full workflow acceptance',routeCount:routes.length,results,failures,pageErrors},null,2));
  if(failures.length)process.exitCode=1;
 }finally{await browser?.close();if(web)await new Promise(r=>web.close(r));await app?.close();await api?.close();await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
