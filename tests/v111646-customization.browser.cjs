/** Real production Next + Chromium; public customization only, no database/provider claim. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v111646-browser');
const copy=require('../apps/web/src/customize/home.json');
const colors=require('../apps/web/src/customize/medal-colors.json');
(async()=>{
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 let app,server,browser,api;const results=[],errors=[];
 try{
  require('reflect-metadata');
  const {NestFactory}=require('@nestjs/core');
  const {AppModule}=require(path.join(root,'apps/api/dist/app.module.js'));
  api=await NestFactory.create(AppModule,{logger:false});await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3606});await app.prepare();
  server=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>server.listen(3606,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto('http://127.0.0.1:3606/',{waitUntil:'networkidle'});assert.equal(response.status(),200);
   const home=page.locator('[data-home]');await home.waitFor();
   const text=await home.textContent();
   for(const [key,value] of Object.entries(copy)){
    if(key==='pathsLabel')assert.equal(await home.locator('[aria-label]').first().getAttribute('aria-label'),value);
    else assert.ok(text.includes(value),'Missing configured text: '+key);
   }
   const geometry=await home.evaluate(n=>({overflow:document.documentElement.scrollWidth>innerWidth+1,heroRadius:getComputedStyle(n.querySelector('section')).borderTopLeftRadius,gap:getComputedStyle(n).rowGap}));
   assert.equal(geometry.overflow,false);assert.equal(geometry.heroRadius,'16px');assert.equal(geometry.gap,width<=680?'28px':'40px');
   for(const href of ['/books','/van-kho','/forum','/huyen-giai','/academy','/birth-profiles','/study','/library'])assert.ok(await home.locator(`a[href="${href}"]`).count(),href);
   results.push({case:'all configured home copy, links and responsive CSS',width,fields:Object.keys(copy).length,...geometry,status:'PASS'});
   await page.goto('http://127.0.0.1:3606/tinh-canh',{waitUntil:'networkidle'});
   const medals=page.locator('section[aria-label="18 huy chương"] svg[data-level]');await medals.nth(17).waitFor();assert.equal(await medals.count(),18);
   for(let level=1;level<=18;level++){
    // Read the actual SVG attrs: palettes are imported into client code, not just documented.
    const palette=await page.locator(`section[aria-label="18 huy chương"] svg[data-level="${level}"]`).evaluate(n=>[n.querySelector('polygon').getAttribute('fill'),n.querySelector('radialGradient stop').getAttribute('stop-color')]);
    assert.deepEqual(palette,colors[Math.floor((level-1)/3)]);
   }
   results.push({case:'six configured palettes reach all eighteen medal SVGs',width,levels:18,status:'PASS'});
   await page.close();
  }
  assert.deepEqual(errors,[]);fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Public production Next UI; database/providers not exercised',results,pageErrors:errors},null,2));
  console.log(JSON.stringify({verdict:'PASS',checks:results.length,results},null,2));
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await app?.close();await api?.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
