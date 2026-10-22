/** Real Next public UI; controlled network faults only for forum race/retry scenarios.
 * DOM table fixtures exercise observer cleanup. No provider/SQL integration claim.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v111647-ux');
(async()=>{
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');let api,app,server,browser;const results=[],errors=[];
 const record=(name,data={})=>{results.push({case:name,status:'PASS',...data});console.log('PASS',name,JSON.stringify(data))};
 try{
  require('reflect-metadata');const {NestFactory}=require('@nestjs/core');const {AppModule}=require(path.join(root,'apps/api/dist/app.module.js'));
  api=await NestFactory.create(AppModule,{logger:false});await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3608});await app.prepare();
  server=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>server.listen(3608,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const page=await browser.newPage({viewport:{width:390,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__resizeTargets=new Set();window.__tableScans=0;
   const Native=window.ResizeObserver;window.ResizeObserver=class extends Native{constructor(cb){super(cb);this.nodes=new Set()}observe(n,o){this.nodes.add(n);window.__resizeTargets.add(n);super.observe(n,o)}unobserve(n){this.nodes.delete(n);window.__resizeTargets.delete(n);super.unobserve(n)}disconnect(){this.nodes.forEach(n=>window.__resizeTargets.delete(n));this.nodes.clear();super.disconnect()}};
   const nativeQuery=Element.prototype.querySelectorAll;Element.prototype.querySelectorAll=function(selector){if(this.id==='main-content'&&selector==='table')window.__tableScans++;return nativeQuery.call(this,selector)};
  });
  await page.goto('http://127.0.0.1:3608/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Tìm nhanh trang và công cụ',exact:true}).click();
  await page.getByRole('combobox',{name:'Nhập tên công cụ cần tìm'}).fill('Tàng Thư Các');
  const started=Date.now();await page.getByRole('combobox',{name:'Nhập tên công cụ cần tìm'}).press('Enter');
  await page.waitForURL('**/books');await page.getByRole('heading',{name:'Tàng Thư Các',exact:true}).waitFor();
  assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.locator('body').evaluate(n=>n.style.overflow),'');
  record('keyboard quick search navigates to a real page and unlocks body',{clientNavigationMs:Date.now()-started});
  let loginRoute,loginReady;const loginPending=new Promise(resolve=>loginReady=resolve);
  await page.route('**/api/auth/login',async route=>{loginRoute=route;loginReady()});
  await page.getByRole('button',{name:'Mở tài khoản',exact:true}).click();
  await page.locator('#account-email').fill('controlled@example.invalid');await page.getByLabel('Mật khẩu',{exact:true}).fill('ControlledPassword!');
  await page.locator('form.account-form-stack button[type="submit"]').click();await loginPending;
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur()});await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(),true);assert.equal(await page.getByRole('button',{name:'Đóng cửa sổ tài khoản',exact:true}).isDisabled(),true);
  await loginRoute.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Controlled login outage'})});
  await page.getByRole('button',{name:'Đóng cửa sổ tài khoản',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.account-close')?.disabled);
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur()});await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  record('Escape outside dialog focus respects pending authentication and closes after failure');
  // Table semantics must respond to actual overflow and removed tables must be released.
  await page.evaluate(()=>{const fixture=document.createElement('div');fixture.id='table-fixture';fixture.style.cssText='width:120px;overflow-x:auto';fixture.innerHTML='<table style="width:600px"><thead><tr><th>Nội dung</th></tr></thead><tbody><tr><td>Thử cuộn</td></tr></tbody></table>';document.getElementById('main-content').append(fixture)});
  await page.waitForFunction(()=>document.getElementById('table-fixture').getAttribute('tabindex')==='0');
  assert.equal(await page.locator('#table-fixture').getAttribute('role'),'region');
  await page.waitForTimeout(150);const scans=await page.evaluate(()=>window.__tableScans);
  await page.evaluate(()=>{const p=document.createElement('p');p.id='non-table-fixture';document.getElementById('main-content').append(p);for(let i=0;i<100;i++)p.textContent='Nội dung '+i});
  await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__tableScans),scans);
  await page.evaluate(()=>document.getElementById('table-fixture').remove());await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>[...window.__resizeTargets].filter(n=>!n.isConnected).length),0);
  record('table accessibility preserved; unrelated mutations avoid scans; detached observers released');
  let pending,resolvePending;const pendingReady=new Promise(r=>resolvePending=r);let moreCalls=0,fault=true,categoriesFault=true;
  const item=title=>({id:title,title,body:'Test fixture',category:'test',authorId:'fixture-author',author:'QA',visibility:'public',pinned:false,locked:false,commentsCount:0,updatedAt:'2026-10-16T00:00:00Z'});
  await page.route('**/api/forum/categories',async route=>{if(categoriesFault){categoriesFault=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Controlled category outage'})});return;}await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({categories:[{id:'test',name:'Chuyên mục thử',summary:'QA'}]})})});
  await page.route('**/api/forum/threads?*',async route=>{const url=new URL(route.request().url());if(url.searchParams.get('offset')==='1'){moreCalls++;pending=route;resolvePending();return;}if(url.searchParams.get('q')==='force-error'&&fault){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Controlled thread outage'})});return;}const filtered=url.searchParams.get('q')==='Mới';await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({threads:[item(filtered?'Filtered thread':'Initial thread')],nextOffset:filtered?null:1})})});
  await page.goto('http://127.0.0.1:3608/forum',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Initial thread',exact:true}).waitFor();
  await page.getByRole('button',{name:'Tải lại chuyên mục',exact:true}).click();await page.getByRole('option',{name:'Chuyên mục thử',exact:true}).waitFor({state:'attached'});
  record('forum category outage has working retry');
  await page.getByRole('button',{name:'Xem thêm',exact:true}).evaluate(n=>{n.click();n.click()});await pendingReady;
  await page.getByRole('searchbox',{name:'Tìm kiếm',exact:true}).fill('Mới');await page.getByRole('heading',{name:'Filtered thread',exact:true}).waitFor();
  try{await pending.fulfill({status:200,contentType:'application/json',body:JSON.stringify({threads:[item('Stale thread')],nextOffset:null})})}catch{/* The browser may already have canceled the old request. */}
  await page.waitForTimeout(300);assert.equal(moreCalls,1);assert.equal(await page.getByRole('heading',{name:'Stale thread',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Initial thread',exact:true}).count(),0);
  record('forum pagination cannot outlive filters or duplicate synchronous clicks');
  await page.getByRole('searchbox',{name:'Tìm kiếm',exact:true}).fill('force-error');await page.getByRole('button',{name:'Tải lại thảo luận',exact:true}).waitFor();fault=false;
  await page.getByRole('button',{name:'Tải lại thảo luận',exact:true}).click();await page.getByRole('heading',{name:'Initial thread',exact:true}).waitFor();
  record('forum thread outage has working retry');
  await page.unrouteAll({behavior:'ignoreErrors'});assert.deepEqual(errors,[]);
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Public UI + controlled forum network fault injection + DOM table fixture',results,pageErrors:errors},null,2));
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await app?.close();await api?.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
