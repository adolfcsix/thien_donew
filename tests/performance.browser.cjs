/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'reports/browser');
(async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 process.env.GEMINI_API_KEY='';process.env.WEB_ANALYTICS_ENABLED='false';process.env.PAYOS_CLIENT_ID='';process.env.PAYOS_API_KEY='';process.env.PAYOS_CHECKSUM_KEY='';
 process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.AUTH_OTP_SECRET=randomBytes(32).toString('hex');process.env.COOKIE_SECURE='false';
 const privateWork=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'thiendo-browser-files-')),assetRoot=path.join(privateWork,'private');fs.mkdirSync(path.join(assetRoot,'books'),{recursive:true});fs.mkdirSync(path.join(assetRoot,'van-kho-media'));process.env.BOOK_PRIVATE_STORAGE_DIR=path.join(assetRoot,'books');process.env.VAN_KHO_PRIVATE_MEDIA_DIR=path.join(assetRoot,'van-kho-media');
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
  // Exercise the actual packaged standalone artifact; no next-start compatibility wrapper.
  const server=path.join(root,'apps/web/.next/standalone/apps/web/server.js');
  web=spawn(process.execPath,[server],{cwd:path.dirname(server),env:{...process.env,NODE_ENV:'production',PORT:'3614',HOSTNAME:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  let webOutput='';for(const stream of [web.stdout,web.stderr])stream.on('data',chunk=>{webOutput=(webOutput+chunk).slice(-8000);});
  let ready=false;for(let attempt=0;attempt<100;attempt++){
   if(web.exitCode!==null)throw Error('Standalone exited: '+webOutput);
   try{const response=await fetch('http://127.0.0.1:3614',{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break;}}catch{}
   await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(ready,'Standalone web did not become ready: '+webOutput);
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // The standalone frontend is production; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3614',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password,username:email.startsWith('owner-')?'qa_owner':'qa_member'}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const owner=await register('owner-browser@example.invalid'),member=await register('member-browser@example.invalid');
  await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.user.id]);
  async function post(context,url,data){const r=await context.request.post(origin+url,{data});assert.equal(r.status(),200,url+' '+await r.text());return r.json();}
  const sent=await post(owner.context,'/api/auth/email/send',{});await post(owner.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(owner.email)});




 const page=await member.context.newPage();page.setDefaultTimeout(15000);
 const measurements=[];await page.addInitScript(()=>{window.__lab={lcp:null,cls:0,events:[]};new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__lab.lcp=e.startTime;window.__lab.lcpElement={tag:e.element?.tagName,id:e.element?.id,url:e.url,size:e.size,loadTime:e.loadTime,renderTime:e.renderTime}}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__lab.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.interactionId)window.__lab.events.push({duration:e.duration,interactionId:e.interactionId,inputDelayMs:e.processingStart-e.startTime,processingMs:e.processingEnd-e.processingStart,presentationMs:e.startTime+e.duration-e.processingEnd})}).observe({type:'event',buffered:true,durationThreshold:16});});
 for(const repeat of [1,2,3])for(const width of [390,1440])for(const route of ['/tarot','/western-astrology','/chart']){await page.setViewportSize({width,height:900});await page.goto(origin+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);const cdp=await member.context.newCDPSession(page);await cdp.send('Performance.enable');for(let i=0;i<3;i++){await page.locator('.theme-button').click();await page.waitForTimeout(1000);}const lab=await page.evaluate(()=>({...window.__lab,domNodes:document.getElementsByTagName('*').length,resources:performance.getEntriesByType('resource').reduce((a,r)=>a+r.transferSize,0),fontResources:performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.endsWith('.woff2')).map(r=>({path:new URL(r.name).pathname,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,duration:r.duration}))}));const metrics=(await cdp.send('Performance.getMetrics')).metrics;measurements.push({repeat,route,width,...lab,jsHeapBytes:metrics.find(x=>x.name==='JSHeapUsedSize')?.value,taskDurationSeconds:metrics.find(x=>x.name==='TaskDuration')?.value});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await cdp.detach();}
 fs.writeFileSync(path.join(out,'performance-lab.json'),JSON.stringify({environment:'Chromium Linux; same-host production Next/Nest; no CPU/network throttling; synthetic viewports, not actual phones; three observations per case; theme interactions separated by one second; independent quiet runner',targets:{lcpMs:2500,cls:0.1,interactionMs:200},limitations:'EventTiming records observed interactions only, not field INP or a production percentile. TaskDuration is renderer CPU time, not GPU utilization. No native device or production load certification.',measurements},null,2));
 record({case:'18 production lab samples with separated theme interactions and LCP element attribution',verdict:'PASS'});
 const populated=[];
 for(const width of [390,1440])for(const route of ['/chart','/western-astrology']){
  await page.setViewportSize({width,height:900});await page.goto(origin+route,{waitUntil:'networkidle'});
  if(route==='/chart'){await page.getByLabel('Tên lá số',{exact:true}).fill('QA benchmark');await page.getByRole('button',{name:/Tính lá số/}).click();await page.locator('.astrology-grid').waitFor();}
  else{await page.getByLabel('Vĩ độ nơi sinh (Bắc dương)',{exact:true}).fill('21.0285');await page.getByLabel('Kinh độ nơi sinh (Đông dương)',{exact:true}).fill('105.8542');await page.getByLabel('Tôi đã kiểm tra độ lệch UTC tại thời điểm sinh, gồm DST nếu có',{exact:true}).check();await page.getByRole('button',{name:'Lập Natal Chart',exact:true}).click();await page.locator('[data-precision-wheel=natal]').waitFor();}
  await page.locator(route==='/chart'?'.chart-scene':'.natal-engraved-sky').scrollIntoViewIfNeeded();const cdp=await member.context.newCDPSession(page);await cdp.send('Performance.enable');
  for(const motion of ['no-preference','reduce']){await page.emulateMedia({reducedMotion:motion});const before=(await cdp.send('Performance.getMetrics')).metrics;const frames=await page.evaluate(async()=>{const a=[];let last=performance.now();for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);const now=performance.now();a.push(now-last);last=now;}return a;});const after=(await cdp.send('Performance.getMetrics')).metrics;populated.push({route,width,motion,frames,rendererTaskSeconds:after.find(x=>x.name==='TaskDuration').value-before.find(x=>x.name==='TaskDuration').value,jsHeapBytes:after.find(x=>x.name==='JSHeapUsedSize').value,domNodes:await page.locator('*').count()});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  await cdp.detach();await page.emulateMedia({reducedMotion:'no-preference'});
 }
 fs.writeFileSync(path.join(out,'populated-motion-lab.json'),JSON.stringify({environment:'Quiet Chromium Linux, production build, GPU disabled, synthetic chart data; one60-frame observation per case',scope:'Calculated TuVi/Natal, two viewports, normal/reduced motion. Renderer CPU/frame/heap observations do not certify device/GPU/field-INP or absence of memory leaks.',samples:populated},null,2));record({case:'eight60-frame observations of populated TuVi/Natal normal/reduced motion retain viewport fit; no device certification',verdict:'PASS'});

 assert.deepEqual(pageErrors,[]);
 }catch(error){console.error('BROWSER FAILED',error);for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web&&web.exitCode===null){const done=new Promise(r=>web.once('exit',r));web.kill('SIGTERM');await done;}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true,maxRetries:6,retryDelay:100});}
})().catch(e=>{console.error(e);process.exitCode=1;});

