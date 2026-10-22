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




 if(process.env.THIENDO_A66_POINTER_PROBE){await require('./helpers-a66-pointer-browser.cjs')({browser,origin,member,out,record,pageErrors});return;}
 if(process.env.THIENDO_A65_VISUAL_PROBE){await require('./helpers-a65-visual-audit.cjs')({browser,origin,owner,password,root,out,record,pageErrors});return;}
 if(process.env.THIENDO_A64_MERGE_PROBE){await require('./helpers-a64-merge-browser.cjs')({browser,origin,owner,member,password,root,pg,record,pageErrors});return;}
 if(process.env.THIENDO_DOCUMENT_DRAFT_PROBE){await require('./helpers-document-draft-browser.cjs')({browser,origin,owner,password,root,pg,record,pageErrors});return;}
 if(process.env.THIENDO_UPLOAD_RECOVERY_PROBE){await require('./helpers-upload-recovery-browser.cjs')({browser,origin,owner,member,pg,root,record,pageErrors});return;}
 if(process.env.THIENDO_A59_ADMIN_PROBE){await require('./helpers-a59-book-admin-browser.cjs')({browser,origin,owner,password,root,record,pageErrors});return;}
 if(process.env.THIENDO_A59_PROBE){await require('./helpers-a59-resilience-browser.cjs')({browser,origin,owner,member,password,pg,root,record,pageErrors});return;}
 if(process.env.THIENDO_THEME_TRACE_PROBE){await require('./helpers-theme-trace-browser.cjs')({browser,origin,member,out,record});return;}
 if(process.env.THIENDO_THEME_RECOVERY_PROBE){await require('./helpers-theme-recovery-browser.cjs')({browser,origin,member,record,pageErrors});return;}
 if(process.env.THIENDO_INBOX_RECOVERY_PROBE){await require('./helpers-inbox-recovery-browser.cjs')({browser,origin,owner,pg,record,pageErrors});return;}
 if(process.env.THIENDO_RECOVERY_PROBE){await require('./helpers-chat-recovery-browser.cjs')({browser,origin,owner,member,password,pg,record,pageErrors});return;}
 await require('./helpers-session-chat-browser.cjs')({browser,origin,owner,member,password,pg,record,pageErrors});if(process.env.THIENDO_A49_PROBE)return;
 const {totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));
 const guest=await browser.newContext();assert.equal((await guest.request.get(origin+'/api/admin/insights/dashboard')).status(),401);await guest.close();assert.equal((await member.context.request.post(origin+'/api/admin/insights/ask',{data:{question:'Doanh thu hôm nay'}})).status(),403);
 await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'admin')",[member.user.id]);await pg.query('INSERT INTO admin_permission_sets(user_id,capabilities) VALUES($1,$2)',[member.user.id,JSON.stringify(['overview.read'])]);assert.equal((await member.context.request.get(origin+'/api/admin/insights/dashboard')).status(),403);
 record({case:'anonymous/member and an administrator without completed MFA cannot read operational reports',verdict:'PASS'});
 async function enroll(account,verified=false){if(!verified){const sent=await post(account.context,'/api/auth/email/send',{});await post(account.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(account.email)});}const setup=await post(account.context,'/api/auth/mfa/setup',{password});await post(account.context,'/api/auth/mfa/confirm',{code:totpCode(setup.manualKey,Math.floor(Date.now()/30000))});}
 await enroll(owner,true);await enroll(member);
 const dashboard=await member.context.request.get(origin+'/api/admin/insights/dashboard');assert.equal(dashboard.status(),200);const limited=await dashboard.json();assert.equal(limited.metrics.some(m=>m.id==='revenue.gross'||m.id==='users.total'),false);assert.deepEqual(limited.orders,[]);assert.ok(limited.restricted.includes('finance'));assert.ok(limited.daily.every(x=>x.registrations===null&&x.posts===null));for(const question of ['Doanh thu hôm nay','Bài diễn đàn mới','Báo cáo tổng quan hôm nay'])assert.equal((await member.context.request.post(origin+'/api/admin/insights/ask',{data:{question,explain:true}})).status(),403);assert.equal((await member.context.request.post(origin+'/api/admin/insights/ask',{data:{question:'Lượt xem hôm nay'}})).status(),200);
 record({case:'real SQL-backed MFA session with overview-only capability cannot query finance/community or obtain their dashboard metrics',verdict:'PASS'});
 const page=await member.context.newPage();page.setDefaultTimeout(15000);await page.goto(origin+'/admin',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Toàn cảnh Thiên Đồ',exact:true}).waitFor();assert.equal(await page.getByText('Tổng thu đã xác nhận',{exact:true}).count(),0);assert.equal(await page.getByRole('option',{name:'Đăng ký',exact:true}).count(),0);await page.screenshot({path:path.join(out,'limited-dashboard.png')});await page.goto(origin+'/admin/tro-ly',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Hỏi dữ liệu hệ thống',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Doanh thu 7 ngày gần đây thế nào?',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Hôm nay có bao nhiêu lượt truy cập web?',exact:true}).count(),1);
 record({case:'limited admin dashboard and assistant suggestions reflect the actual authorized domains',verdict:'PASS'});
 const full=await owner.context.request.get(origin+'/api/admin/insights/dashboard');assert.equal(full.status(),200);const all=await full.json();assert.ok(all.metrics.some(m=>m.id==='revenue.gross'));assert.ok(all.metrics.some(m=>m.id==='users.total'));assert.deepEqual(all.restricted,[]);const finance=await post(owner.context,'/api/admin/insights/ask',{question:'Doanh thu hôm nay'});assert.ok(finance.facts.some(f=>f.id==='finance.gross'));assert.equal(finance.timeZone,'Asia/Ho_Chi_Minh');
 record({case:'Owner retains complete dashboard and SQL finance facts with Vietnamese time boundaries and evidence sources',verdict:'PASS'});
 await require('./helpers-admin-authority-browser.cjs')({browser,origin,owner,member,password,pg,record,pageErrors,delivered});if(process.env.THIENDO_A51_PROBE)return;
 await require('./helpers-profile-showcase-browser.cjs')({owner,member,origin,pg,record,pageErrors});
 if(process.env.THIENDO_A49_SWEEP){await require('./helpers-route-sweep.cjs')({browser,origin,owner,member,password,root,out,record,pageErrors});return;}
 await require('./helpers-motion-browser.cjs')({browser,origin,owner,out,record,pageErrors});if(process.env.THIENDO_MOTION_LAB&&process.env.THIENDO_MOTION_LAB!=='final')return;
 // External traffic is blocked from here onward; same-origin web/API assets remain live.
 await member.context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();return route.abort();});
 await page.goto(origin+'/tarot',{waitUntil:'networkidle'});const manifest=JSON.parse(fs.readFileSync(path.join(root,'infrastructure/assets/tarot-manifest.json'),'utf8'));const images=manifest.records.flatMap(r=>[r,r.thumbnail]);
 for(let i=0;i<images.length;i+=8){const batch=images.slice(i,i+8);const dimensions=await page.evaluate(async files=>Promise.all(files.map(async f=>{const image=new Image();image.src='/'+f.path.replace('apps/web/public/','');await image.decode();return {width:image.naturalWidth,height:image.naturalHeight}})),batch);assert.deepEqual(dimensions,batch.map(f=>({width:f.width,height:f.height})));}
 record({case:'all 156 original Tarot images and 156 derived thumbnails decode from the production artifact with every external origin blocked',verdict:'PASS'});
 for(const deck of ['rws-1909','gearberry-modern']){await page.getByRole('combobox',{name:/Bộ hình minh họa/}).selectOption(deck);assert.equal(await page.getByRole('button').filter({has:page.locator('img')}).count()>=78,true);await page.getByRole('button',{name:'✧ Xáo và rút bài',exact:true}).click();await page.getByRole('region',{name:'Tổng hợp chiều sâu trải bài',exact:true}).waitFor();assert.equal(await page.locator('.tarot-evidence-position').count(),3);await page.locator('[data-tarot-cloth] img').evaluateAll(async ns=>{await Promise.all(ns.map(n=>n.decode()));if(!ns.every(n=>n.naturalWidth>=700))throw Error('Full reading art was replaced by a thumbnail');});assert.equal(await page.getByLabel('Danh mục Tarot',{exact:true}).locator('button').count(),78);}
 const before=await page.locator('.tarot-evidence-position').evaluateAll(ns=>ns.map(n=>n.textContent));await page.getByRole('combobox',{name:/Bộ hình minh họa/}).selectOption('rws-1909');assert.deepEqual(await page.locator('.tarot-evidence-position').evaluateAll(ns=>ns.map(n=>n.textContent)),before);await page.locator('[data-tarot-cloth]').first().scrollIntoViewIfNeeded();await page.locator('[data-tarot-cloth] img').evaluateAll(async ns=>{await Promise.all(ns.map(n=>n.decode()));if(!ns.every(n=>n.naturalWidth>=700))throw Error('Artwork not ready for evidence');});await page.locator('[data-tarot-cloth]').first().screenshot({path:path.join(out,'tarot-offline.png')});
 record({case:'both local decks render full-resolution drawn cards, 78 catalogue entries and unchanged meanings when switching artwork',verdict:'PASS'});
 await page.route('**/tarot/thumbnails/rws-1909/ar00.webp',r=>r.fulfill({status:404,body:''}));await page.reload({waitUntil:'networkidle'});const first=page.getByLabel('Danh mục Tarot',{exact:true}).locator('img').first();await first.scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const n=document.querySelector('[aria-label="Danh mục Tarot"] img');return n?.complete&&n.naturalWidth>=700&&n.src.includes('/tarot/rws-1909/ar00.jpg')});await page.unroute('**/tarot/thumbnails/rws-1909/ar00.webp');
 record({case:'missing catalogue thumbnail retries the correct full local card before external/placeholder fallback, without changing deck',verdict:'PASS'});
 // A45: new browser contexts give independent cold HTTP caches; archive bytes are not page bytes.
 const payload=[];
 for(const width of [390,1440]){
  const cold=await browser.newContext({viewport:{width,height:900},storageState:await member.context.storageState()});
  await cold.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const p=await cold.newPage();p.on('pageerror',e=>pageErrors.push(e.message));
  await p.goto(origin+'/tarot',{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
  const initial=await p.evaluate(()=>performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,transferBytes:r.transferSize,bodyBytes:r.encodedBodySize})));
  const originals=initial.filter(r=>/^\/tarot\/(rws-1909|gearberry-modern)\//.test(r.path));
  assert.ok(originals.length<=1,'Initial catalogue may load its one selected detail card, never all originals');
  assert.ok(originals.every(r=>r.path==='/tarot/rws-1909/ar00.jpg'),'Only the default Fool detail may load before a draw');
  assert.ok(initial.some(r=>r.path.startsWith('/tarot/thumbnails/')),'Catalogue uses local thumbnails');
  await p.getByRole('button',{name:'✧ Xáo và rút bài',exact:true}).click();await p.getByRole('region',{name:'Tổng hợp chiều sâu trải bài',exact:true}).waitFor();
  await p.locator('[data-tarot-cloth] img').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));
  const afterDraw=await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/^\/tarot\/(rws-1909|gearberry-modern)\//.test(new URL(r.name).pathname)).map(r=>({path:new URL(r.name).pathname,bodyBytes:r.encodedBodySize})));
  const drawn=await p.locator('[data-tarot-cloth] img').evaluateAll(ns=>ns.map(n=>new URL(n.src).pathname));
  assert.equal(new Set(drawn).size,3,'Reading keeps three distinct full-size cards');
  assert.ok(drawn.every(src=>afterDraw.some(r=>r.path===src)),'All three drawn images load successfully');
  assert.ok(new Set(afterDraw.map(r=>r.path)).size<=4,'Only the selected detail plus three drawn originals load');
  payload.push({width,initialResourceTransferBytes:initial.reduce((a,r)=>a+r.transferBytes,0),initialOriginals:originals.length,initialThumbnailRequests:initial.filter(r=>r.path.startsWith('/tarot/thumbnails/')).length,fullOriginalRequestsAfterDraw:afterDraw.length,drawnCards:drawn.length,drawImageBodyBytes:afterDraw.reduce((a,r)=>a+r.bodyBytes,0),resources:initial});
  await cold.close();
 }
 fs.writeFileSync(path.join(out,'payload-lab.json'),JSON.stringify({scope:'Two fresh Chromium contexts, production Next/Nest on Linux, external origins blocked, no scroll; resource transfer excludes main HTML. Actual phones/GPU/field INP not tested.',payload},null,2));
 record({case:'cold mobile/desktop Tarot uses thumbnails plus at most one selected detail, then three full-size drawn cards',verdict:'PASS'});
 const measurements=[];await page.addInitScript(()=>{window.__lab={lcp:null,cls:0,events:[]};new PerformanceObserver(list=>{for(const e of list.getEntries())window.__lab.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__lab.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.interactionId)window.__lab.events.push({duration:e.duration,interactionId:e.interactionId})}).observe({type:'event',buffered:true,durationThreshold:16});});
 for(const width of [390,1440])for(const route of ['/tarot','/western-astrology','/chart']){await page.setViewportSize({width,height:900});await page.goto(origin+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);const cdp=await member.context.newCDPSession(page);await cdp.send('Performance.enable');for(let i=0;i<3;i++){await page.locator('.theme-button').click();}const lab=await page.evaluate(()=>({...window.__lab,domNodes:document.getElementsByTagName('*').length,resources:performance.getEntriesByType('resource').reduce((a,r)=>a+r.transferSize,0)}));const metrics=(await cdp.send('Performance.getMetrics')).metrics;measurements.push({route,width,...lab,jsHeapBytes:metrics.find(x=>x.name==='JSHeapUsedSize')?.value,taskDurationSeconds:metrics.find(x=>x.name==='TaskDuration')?.value});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await cdp.detach();}
 fs.writeFileSync(path.join(out,'performance-lab.json'),JSON.stringify({environment:'Chromium Linux; same-host production Next/Nest; no CPU/network throttling; synthetic viewports, not actual phones; one observation per case',targets:{lcpMs:2500,cls:0.1,interactionMs:200},limitations:'EventTiming records observed interactions only, not field INP or a production percentile. TaskDuration is renderer CPU time, not GPU utilization. No native device or production load certification.',measurements},null,2));
 record({case:'six production lab route/viewport samples record LCP, CLS, EventTiming, renderer CPU and heap; navigation remains within viewport',verdict:'PASS'});
 assert.deepEqual(pageErrors,[]);
 }catch(error){console.error('BROWSER FAILED',error);for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web&&web.exitCode===null){const done=new Promise(r=>web.once('exit',r));web.kill('SIGTERM');await done;}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true,maxRetries:6,retryDelay:100});}
})().catch(e=>{console.error(e);process.exitCode=1;});

