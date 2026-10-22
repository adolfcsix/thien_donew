/** Local UI acceptance using a production Next build and real Nest controllers.
 * No successful auth/payment/DB acceptance is inferred from these public screens.
 * Supply THIENDO_PLAYWRIGHT_MODULE and optionally THIENDO_CHROMIUM_PATH.
 */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v111642-browser');
(async()=>{
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 require('reflect-metadata');const {NestFactory}=require('@nestjs/core');
 const {AppModule}=require(path.join(root,'apps/api/dist/app.module.js'));
 let api,web,app,browser;const results=[];fs.mkdirSync(out,{recursive:true});
 try{
  api=await NestFactory.create(AppModule,{logger:false});await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3400});await app.prepare();
  web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3400,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  for(const width of [320,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
   for(const mode of ['login','register','recover']){
    const res=await page.goto(`http://127.0.0.1:3400/login?mode=${mode}`,{waitUntil:'networkidle'});assert.equal(res.status(),200);
    const dialog=page.getByRole('dialog');await dialog.waitFor();
    const geometry=await page.evaluate(()=>{const d=document.querySelector('[role=dialog]'),c=document.querySelector('.account-dialog-content'),i=document.querySelector('.account-screen input');return {overflow:document.documentElement.scrollWidth>innerWidth+1,width:d.getBoundingClientRect().width,contentWidth:c.getBoundingClientRect().width,inputWidth:i.getBoundingClientRect().width};});
    assert.equal(geometry.overflow,false);if(width===1440){assert.ok(geometry.width>=800,'desktop account dialog collapsed by global CSS');assert.ok(geometry.inputWidth>=300);}
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});results.push({viewportWidth:width,mode,...geometry,escape:'PASS'});
   }
   await context.close();
  }
  const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto('http://127.0.0.1:3400/tinh-canh',{waitUntil:'networkidle'});
  const medals=page.locator('svg[data-level]');await medals.nth(17).waitFor();assert.equal(await medals.count(),18);
  const apex=page.locator('svg[data-level="18"]');await apex.scrollIntoViewIfNeeded();await page.waitForTimeout(250);assert.equal(await apex.getAttribute('data-paused'),'false');
  await apex.evaluate(node=>{for(let parent=node.parentElement;parent;parent=parent.parentElement)parent.scrollTop=0;window.scrollTo(0,0);});await page.waitForFunction(()=>document.querySelector('svg[data-level="18"]')?.getAttribute('data-paused')==='true');assert.equal(await apex.getAttribute('data-paused'),'true');
  await page.emulateMedia({reducedMotion:'reduce'});const moving=await medals.evaluateAll(nodes=>nodes.flatMap(n=>[n,...n.querySelectorAll('*')]).filter(n=>getComputedStyle(n).animationName!=='none').length);assert.equal(moving,0);
  results.push({medals:18,offscreenPause:'PASS',reducedMotion:'PASS'});
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Public UI only; no native PostgreSQL or successful authentication',results},null,2));console.log('PASS account geometry, Escape, eighteen medals, offscreen pause and reduced motion');
 }finally{await browser?.close();if(web)await new Promise(r=>web.close(r));await app?.close();await api?.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
