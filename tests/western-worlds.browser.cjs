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
 await page.goto(origin+'/',{waitUntil:'networkidle'});
 const brand=async()=>page.locator('.thien-mon-approved-icon').evaluate(el=>{const c=getComputedStyle(el);return {image:c.backgroundImage,size:c.backgroundSize,position:c.backgroundPosition,filter:c.filter}});
 async function theme(mode){const light=await page.locator('.site').evaluate(el=>el.classList.contains('light'));if(light!==(mode==='light'))await page.locator('.theme-button').click();await page.waitForTimeout(950)}
 await theme('dark');const darkBrand=await brand();await theme('light');const lightBrand=await brand();
 const originalName=await page.locator('.brand strong').textContent();
 // Real client navigation: one brightness preference must persist across all five Western worlds and the main site.
 const marker=await page.evaluate(()=>window.__westernTestMarker=Math.random());
 await page.getByRole('button',{name:/Phương Tây & Biểu tượng/}).click();await page.locator('#thiendo-sidebar a[href="/numerology"]').click();await page.locator('.site[data-western-world="numerology"]').waitFor();assert.equal(await page.evaluate(()=>window.__westernTestMarker),marker);
 await theme('dark');assert.equal(await page.evaluate(()=>localStorage.getItem('thiendo-theme')),'dark');
 const nav=()=>page.getByRole('navigation',{name:'Các nhánh Phương Tây và Biểu tượng'});
 await nav().locator('a[href="/tarot"]').click();await page.locator('.site[data-western-world="tarot"]').waitFor();assert.equal(await page.locator('.site').evaluate(el=>el.classList.contains('light')),false);
 await theme('light');assert.equal(await page.evaluate(()=>localStorage.getItem('thiendo-theme')),'light');
 await nav().locator('a[href="/numerology"]').click();await page.locator('.site[data-western-world="numerology"]').waitFor();assert.equal(await page.locator('.site').evaluate(el=>el.classList.contains('light')),true);
 await nav().locator('a[href="/western-astrology"]').click();await page.locator('.site[data-western-world="astrology"]').waitFor();assert.equal(await page.locator('.site').evaluate(el=>el.classList.contains('light')),true);
 await page.locator('.brand').click();await page.waitForURL(origin+'/');assert.equal(await page.locator('.site').getAttribute('data-western-world'),null);assert.equal(await page.locator('.site').evaluate(el=>el.classList.contains('light')),true);assert.equal(await page.evaluate(()=>window.__westernTestMarker),marker);assert.equal(await page.evaluate(()=>document.documentElement.dataset.westernWorld),undefined);
 await page.goBack({waitUntil:'networkidle'});await page.locator('.site[data-western-world="astrology"]').waitFor();assert.equal(await page.locator('.site').evaluate(el=>el.classList.contains('light')),true);
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.site').evaluate(el=>el.classList.contains('light')),true);
 record({case:'SPA route switch/back/reload: one global light/dark preference, five distinct visual worlds, html scope cleaned',verdict:'PASS'});
 const worlds=[['/western-astrology','astrology'],['/tarot','tarot'],['/numerology','numerology'],['/western-symbols','symbols'],['/research/development','research']];
 const matrix=[],a11y=[],requests=[];
 page.on('response',response=>{if(response.url().includes('/theme/western/'))requests.push({url:new URL(response.url()).pathname,status:response.status()})});
 for(const [route,id] of worlds){
  await page.goto(origin+route,{waitUntil:'networkidle'});await page.locator('.western-world-page').waitFor();
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});for(const mode of ['dark','light']){
   await theme(mode);
   assert.equal(await page.locator('.site').getAttribute('data-western-world'),id);assert.equal(await page.evaluate(()=>document.documentElement.dataset.westernWorld),id);
   assert.equal(await nav().locator('a').count(),5);assert.equal(await nav().locator('[aria-current="page"]').getAttribute('href'),route);
   const computed=await page.locator('.site').evaluate(el=>({before:getComputedStyle(el,'::before').backgroundImage,after:getComputedStyle(el,'::after').backgroundImage,text:getComputedStyle(el).getPropertyValue('--text'),surface:getComputedStyle(el).getPropertyValue('--panel')}));
   assert.ok(computed.before.includes('/'+id+'-dark.webp'));assert.ok(computed.after.includes('/'+id+'-light.webp'));
   const hero=await page.locator('.western-world-page>header').evaluate(el=>({dark:getComputedStyle(el,'::before').backgroundImage,light:getComputedStyle(el,'::after').backgroundImage,darkOpacity:Number(getComputedStyle(el,'::before').opacity),lightOpacity:Number(getComputedStyle(el,'::after').opacity)}));
   assert.ok(hero.dark.includes(id+'-dark.webp'));assert.ok(hero.light.includes(id+'-light.webp'));
   assert.ok(Math.abs(hero.lightOpacity-(mode==='light'?1:0))<.02);assert.ok(Math.abs(hero.darkOpacity-(mode==='light'?0:1))<.02);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' '+width+' '+mode+' horizontal overflow');
   assert.deepEqual(await brand(),mode==='light'?lightBrand:darkBrand,'approved brand must remain identical');assert.equal(await page.locator('.brand strong').textContent(),originalName);
   if([1440,390].includes(width))await page.screenshot({path:path.join(out,id+'-'+width+'-'+mode+'.png')});
   if(width===1440&&process.env.THIENDO_AXE_MODULE){const{default:AxeBuilder}=require(process.env.THIENDO_AXE_MODULE);const scan=await new AxeBuilder({page}).include('.western-world-page').include('#thiendo-sidebar').include('.topbar').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();a11y.push({id,mode,violations:scan.violations,incomplete:scan.incomplete.map(x=>x.id)});fs.writeFileSync(path.join(out,'accessibility.json'),JSON.stringify(a11y,null,2));/* Collect every world before asserting the complete accessibility matrix. */}
   matrix.push({route,id,width,mode,computed,overflow:false});
  }}
 }
 fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify(matrix,null,2));fs.writeFileSync(path.join(out,'asset-requests.json'),JSON.stringify(requests,null,2));assert.ok(requests.length>0);assert.ok(requests.every(r=>[200,304].includes(r.status)),JSON.stringify(requests.filter(r=>![200,304].includes(r.status))));for(const [,id] of worlds)for(const mode of ['dark','light']){const asset=await page.request.get(origin+'/theme/western/'+id+'-'+mode+'.webp');assert.equal(asset.status(),200);assert.equal((await asset.body()).toString('ascii',0,4),'RIFF');}
 assert.equal(a11y.reduce((n,row)=>n+row.violations.length,0),0,'Western world accessibility matrix');
 record({case:'5 worlds x 3 viewport sizes x 2 themes: correct artwork, menu/hero styling, original logo, zero document overflow, loaded image responses',verdict:'PASS'});
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/western-astrology/relationship',{waitUntil:'networkidle'});await page.locator('.site[data-western-world="astrology"]').waitFor();
 for(const route of ['/chart','/bazi','/forum','/admin','/research/schools','/']){await page.goto(origin+route,{waitUntil:'networkidle'});assert.equal(await page.locator('.site').getAttribute('data-western-world'),null,route);assert.equal(await page.evaluate(()=>document.documentElement.dataset.westernWorld),undefined,route)}
 record({case:'Western subroute inherits its world; Eastern/forum/admin/research outside target/main routes retain default presentation',verdict:'PASS'});
 await page.goto(origin+'/numerology',{waitUntil:'networkidle'});await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Mở menu',exact:true}).first().click();await page.locator('#thiendo-sidebar').waitFor();await page.screenshot({path:path.join(out,'numerology-mobile-menu.png')});await page.keyboard.press('Escape');assert.equal(await page.locator('#thiendo-sidebar').evaluate(el=>el.inert),true);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.site').evaluate(el=>getComputedStyle(el,'::after').transitionDuration),'0s');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Mở tài khoản',exact:true}).click();await page.locator('.account-settings').waitFor();await page.getByRole('progressbar').waitFor();
 const modalColors=await page.locator('.modal.account-modal').evaluate(el=>({ink:getComputedStyle(el).getPropertyValue('--account-text').trim(),bg:getComputedStyle(el).getPropertyValue('--account-bg').trim()}));const worldColors=await page.locator('.site').evaluate(el=>({ink:getComputedStyle(el).getPropertyValue('--text').trim(),bg:getComputedStyle(el).getPropertyValue('--panel').trim()}));assert.deepEqual(modalColors,worldColors);
 record({case:'responsive drawer, reduced motion, account overlay palette and rank stay functional in a Western world',verdict:'PASS'});
 assert.deepEqual(pageErrors,[]);
 }catch(error){console.error('BROWSER FAILED',error);for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web){web.closeAllConnections();await new Promise(r=>web.close(r));}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});fs.rmSync(webWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
