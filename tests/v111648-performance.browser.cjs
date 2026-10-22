/** Repeatable local lab, production build + Nest controllers + real PGlite SQL.
 * 40 ms network latency / 800 KiB/s download / CPU x4 / cold browser contexts.
 * Not field Core Web Vitals, physical mobile, native PostgreSQL or load acceptance.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const {randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),phase=process.env.THIENDO_PERF_PHASE||'before';
const out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v111648-performance-'+phase);
(async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 const pg=await PGlite.create({dataDir:'memory://'});let api,app,server,browser;const results=[],errors=[];
 try{
  await pg.exec('CREATE ROLE thiendo_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO thiendo_app; CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,checksum CHAR(64),applied_at TIMESTAMPTZ DEFAULT NOW())');
  for(const name of fs.readdirSync(path.join(root,'infrastructure/db')).filter(x=>/^\d{3}_.*\.sql$/.test(x)).sort())await pg.transaction(async tx=>{await tx.exec(fs.readFileSync(path.join(root,'infrastructure/db',name),'utf8'));await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,createHash('sha256').update(fs.readFileSync(path.join(root,'infrastructure/db',name))).digest('hex')]);});
  const query=async(c,sql,p)=>{const r=await c.query(sql,p);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length}};
  const db={query:(sql,p)=>query(pg,sql,p),transaction:work=>pg.transaction(tx=>work({query:(sql,p)=>query(tx,sql,p)}))};
  require('reflect-metadata');const {NestFactory}=require('@nestjs/core'),{Module}=require('@nestjs/common');
  const {AppModule}=require(path.join(root,'apps/api/dist/app.module.js')),{DatabaseService}=require(path.join(root,'apps/api/dist/common/database.service.js'));
  class PerfSqlModule{};Module({controllers:Reflect.getMetadata('controllers',AppModule),providers:Reflect.getMetadata('providers',AppModule).map(p=>p===DatabaseService?{provide:DatabaseService,useValue:db}:p)})(PerfSqlModule);
  process.env.COOKIE_SECURE='false';api=await NestFactory.create(PerfSqlModule,{logger:false});await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3607});await app.prepare();
  server=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>server.listen(3607,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const owner=await browser.newContext();const registered=await owner.request.post('http://127.0.0.1:3607/api/auth/register',{data:{email:'perf@example.invalid',password:'Perf!'+randomBytes(16).toString('hex')}});assert.equal(registered.status(),201);const signedIn=await owner.storageState();await owner.close();
  // Three cold mobile repetitions for the primary pages; desktop coverage for six modules.
  for(const width of (process.env.THIENDO_PERF_QUICK?[390]:[390,1440]))for(const route of (process.env.THIENDO_PERF_QUICK?['/']:['/','/chart','/tinh-canh','/forum','/books','/van-kho']))for(let run=1;run<=(!process.env.THIENDO_PERF_QUICK&&width===390&&['/','/chart'].includes(route)?3:1);run++){
   const context=await browser.newContext({viewport:{width,height:900},...(process.env.THIENDO_PERF_NO_MOTION?{reducedMotion:'reduce'}:{}),...(route==='/chart'?{storageState:signedIn}:{})});
   const page=await context.newPage();page.on('pageerror',e=>{errors.push({route,message:e.message});console.error('PAGE_ERROR',route,e.message)});page.on('requestfailed',r=>console.error('REQUEST_FAILED',new URL(r.url()).pathname,r.failure()?.errorText));
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:800*1024,uploadThroughput:500*1024});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.addInitScript(()=>{window.__lab={lcp:0,lcpEntries:[],cls:0,shifts:[],longTasks:[]};for(const type of ['largest-contentful-paint','layout-shift','longtask'])new PerformanceObserver(list=>{for(const e of list.getEntries())if(type==='largest-contentful-paint'){window.__lab.lcp=e.startTime;window.__lab.lcpEntries.push({time:e.startTime,size:e.size,tag:e.element?.tagName,id:e.element?.id,className:e.element?.className,text:e.element?.textContent?.slice(0,140)});}else if(type==='layout-shift'){if(!e.hadRecentInput)window.__lab.cls+=e.value;window.__lab.shifts.push({value:e.value,sources:(e.sources||[]).map(s=>({node:s.node?.tagName,id:s.node?.id,className:s.node?.className,previous:s.previousRect,current:s.currentRect}))});}else window.__lab.longTasks.push(e.duration);}).observe({type,buffered:true});});
   const start=Date.now();const response=await page.goto('http://127.0.0.1:3607'+route,{waitUntil:'networkidle'});assert.equal(response.status(),200);
   await page.getByRole('button',{name:'Mở tài khoản',exact:true}).waitFor();
   if(route==='/chart')await page.locator('#tuvi-workspace form').waitFor();
   if(route==='/tinh-canh'){try{await page.locator('section[aria-label="18 huy chương"] svg[data-level="18"]').waitFor();}catch(error){console.error('RANK_DIAGNOSTIC',await page.locator('#main-content').innerText(),errors);throw error;}}
   await page.waitForTimeout(300);
   const metrics=await page.evaluate(()=>{const resources=performance.getEntriesByType('resource');const js=resources.filter(r=>r.name.includes('/_next/static/')&&r.name.split('?')[0].endsWith('.js'));return {...window.__lab,jsEncodedBytes:js.reduce((s,r)=>s+r.encodedBodySize,0),jsDecodedBytes:js.reduce((s,r)=>s+r.decodedBodySize,0),jsRequests:js.length,jsUrls:js.map(r=>({url:new URL(r.name).pathname,bytes:r.decodedBodySize})),apiRequests:resources.filter(r=>new URL(r.name).pathname.startsWith('/api/')).map(r=>new URL(r.name).pathname),overflow:document.documentElement.scrollWidth>innerWidth+1,navigation:{ttfb:performance.getEntriesByType('navigation')[0]?.responseStart,domContentLoaded:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd},paints:performance.getEntriesByType('paint').map(e=>({name:e.name,time:e.startTime})),domNodes:document.querySelectorAll('*').length};});
   metrics.settledMs=Date.now()-start;assert.equal(metrics.overflow,false,route+' horizontal overflow');
   if(route==='/'&&run===1){const opened=Date.now();await page.getByRole('button',{name:'Mở tài khoản',exact:true}).click();await page.getByRole('dialog').waitFor();metrics.accountOpenMs=Date.now()-opened;await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});}
   if(route==='/chart'&&run===1){await page.getByLabel('Tên lá số',{exact:true}).fill('Người khám phá');const calculated=Date.now();await page.locator('#tuvi-workspace form button[type="submit"]').click();await page.locator('.chart-explorer').first().waitFor();metrics.chartRenderMs=Date.now()-calculated;metrics.palaces=await page.locator('.astrology-grid .house').count();}
   if(phase==='after'&&route==='/chart'&&run===1){
    await page.getByRole('button',{name:'Mở tài khoản',exact:true}).click();
    await page.getByRole('tab',{name:'Cá nhân',exact:true}).waitFor();
    const name='Đo thử '+width;await page.getByLabel('Tên hiển thị',{exact:true}).fill(name);
    const saved=page.waitForResponse(r=>r.url().endsWith('/api/auth/profile')&&r.request().method()==='PATCH');
    await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();assert.equal((await saved).status(),200);
    const profile=await page.evaluate(async()=>{const response=await fetch('/api/auth/me',{credentials:'include',cache:'no-store'});if(!response.ok)throw Error('Cannot read profile');return (await response.json()).user;});assert.equal(profile.displayName,name);
    await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur()});await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});metrics.lazyAccountProfile='PASS real API/PGlite';
    if(width===1440){const download=page.waitForEvent('download');await page.getByRole('button',{name:'↓ PNG',exact:true}).click();const file=await download;assert.equal(await file.failure(),null);const bytes=fs.readFileSync(await file.path());assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');metrics.pngExport={status:'PASS',bytes:bytes.length};}
   }
   if(phase==='after'&&route==='/chart'&&run===1){
    assert.equal(await page.getByRole('region',{name:'Ma trận hệ thống sao Tử Vi',exact:true}).count(),0);
    await page.getByText('Ma trận chính / phụ / lưu tinh theo lá số',{exact:true}).click();
    await page.locator('section[aria-label="Ma trận hệ thống sao Tử Vi"] table').first().waitFor();
    metrics.deferredMatrix='PASS opens actual populated table';
    await page.getByRole('button',{name:'Đọc toàn lá số · 12 cung',exact:true}).click();
    await page.locator('section[aria-label="Bài đọc toàn lá số 12 cung"]').waitFor();metrics.deferredWalkthrough='PASS';
    const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'↓ JSON',exact:true}).click();const jsonFile=await downloaded;
    const chart=JSON.parse(fs.readFileSync(await jsonFile.path(),'utf8'));
    const expected=require('../packages/astrology-engine/src/tuvi.js').calculate({label:'Người khám phá',date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'});
    assert.deepEqual(chart,expected);metrics.unchangedChartJson='PASS exact canonical engine result';
    if(width===1440){const opened=page.waitForEvent('popup');await page.getByRole('button',{name:'▤ In / PDF',exact:true}).click();const popup=await opened;
     await popup.locator('.star-appendix article').nth(11).waitFor();assert.equal(await popup.locator('.star-appendix article').count(),12);assert.equal(await popup.locator('.print-page svg').count(),1);
     const pdf=await popup.pdf({preferCSSPageSize:true});assert.equal(pdf.subarray(0,5).toString(),'%PDF-');metrics.pdfExport={status:'PASS headless print document',bytes:pdf.length,appendixPalaces:12};await popup.close();}
   }
   results.push({route,width,run,...metrics});console.log('MEASURE',route,width,run,metrics.jsDecodedBytes,metrics.settledMs);
   await context.close();
  }
  assert.deepEqual(errors,[]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({phase,scope:'Local production Next + Nest controllers/PGlite. CPU x4, latency40ms, download800KiB/s, cold contexts; server caches warm. No field CWV claim.',results,errors},null,2));
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await app?.close();await api?.close();await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
