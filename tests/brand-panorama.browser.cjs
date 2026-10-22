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


 const page=await owner.context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>pageErrors.push(e.message));
 const matrix=[],a11y=[];
 await page.goto(origin+'/',{waitUntil:'networkidle'});
 for(const width of [1440,1280,1024,390]){
  await page.setViewportSize({width,height:1000});
  for(const theme of ['dark','light']){
   const light=await page.locator('.site').evaluate(el=>el.classList.contains('light'));if(light!==(theme==='light'))await page.locator('.theme-button').click();
   await page.waitForTimeout(1000);
   const hero=page.locator('.thien-mon-home-hero'),art=page.locator('.thien-mon-home-art');
   const h=await hero.boundingBox(),a=await art.boundingBox();
   assert.ok(Math.abs(h.width-a.width)<=2.1&&Math.abs(h.height-a.height)<=2.1,'art must span entire hero rectangle');
   assert.equal(await page.locator('.thien-mon-home-caption').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal page overflow '+width+' '+theme);
   const material=await art.evaluate(el=>{const c=getComputedStyle(el);return{border:c.borderTopWidth,radius:c.borderRadius,position:c.position,aspect:c.aspectRatio}});assert.equal(material.border,'0px');assert.equal(material.radius,'0px');assert.equal(material.position,'absolute');
   const scene=page.locator('.thien-mon-home-scene--'+theme);assert.equal(await scene.evaluate(el=>getComputedStyle(el).opacity),'1');assert.ok((await scene.evaluate(el=>getComputedStyle(el).backgroundImage)).includes('thien-mon-hero-'+theme+'.webp'));
   assert.equal(await page.locator('.thien-mon-home-copy .btn').count(),2);
   if(width>=1280){const logo=page.locator('.brand-seal');const box=await logo.boundingBox();assert.ok(Math.abs(box.width-box.height)<=.1,'sidebar logo square geometry');const fit=await page.locator('.thien-mon-approved-icon').evaluate(el=>({size:getComputedStyle(el).backgroundSize,position:getComputedStyle(el).backgroundPosition}));assert.ok(fit.size.includes('122%'));await logo.screenshot({path:path.join(out,`sidebar-logo-${width}-${theme}.png`)});}
   await hero.screenshot({path:path.join(out,`hero-${width}-${theme}.png`),style:'.topbar{visibility:hidden!important}'});
   if(process.env.THIENDO_AXE_MODULE&&[1440,390].includes(width)){const{default:AxeBuilder}=require(process.env.THIENDO_AXE_MODULE);const scan=await new AxeBuilder({page}).include('.thien-mon-home-hero').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();a11y.push({width,theme,violations:scan.violations,incomplete:scan.incomplete.map(x=>x.id)});fs.writeFileSync(path.join(out,'accessibility.json'),JSON.stringify(a11y,null,2));assert.equal(scan.violations.length,0,width+' '+theme+' hero accessibility');}
   matrix.push({width,theme,hero:h,art:a,material,pageOverflow:false});
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await page.locator('.thien-mon-home-scene--light').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Preserve the existing primary and learning navigation.
 assert.equal(await page.locator('.thien-mon-home-copy .btn').first().getAttribute('href'),'#bo-mon');assert.equal(await page.locator('.thien-mon-home-copy .btn').last().getAttribute('href'),'/academy');
 fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify(matrix,null,2));assert.deepEqual(pageErrors,[]);record({case:'8 viewport/theme combinations: full-rectangle panorama, no caption/card, square fitted logo, CTA links and reduced motion; no page errors/overflow',verdict:'PASS'});

 }catch(error){console.error('BROWSER FAILED',error);for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web){web.closeAllConnections();await new Promise(r=>web.close(r));}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});fs.rmSync(webWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
