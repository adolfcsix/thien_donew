const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async function({browser,origin,owner,out,record,pageErrors}){
 const samples=[];
 for(const route of (!process.env.THIENDO_MOTION_LAB||process.env.THIENDO_MOTION_SKIP_LAB==='1'?[]:process.env.THIENDO_MOTION_LAB==='home'?['/']:['/','/admin']))for(const width of [390,1440])for(let repeat=0;repeat<3;repeat++){
  const context=await browser.newContext({viewport:{width,height:900},...(route==='/admin'?{storageState:await owner.context.storageState()}:{})});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.addInitScript(()=>{
   window.__motionLab={lcp:0,cls:0,longTasks:0,animationCalls:0};
   for(const [type,key] of [['largest-contentful-paint','lcp'],['layout-shift','cls'],['longtask','longTasks']])new PerformanceObserver(list=>{for(const e of list.getEntries()){if(key==='lcp')window.__motionLab[key]=e.startTime;else if(key==='cls'){if(!e.hadRecentInput)window.__motionLab[key]+=e.value;}else window.__motionLab[key]+=e.duration;}}).observe({type,buffered:true});
   const animate=Element.prototype.animate;Element.prototype.animate=function(...args){if(args[1]?.id==='thiendo-reveal')window.__motionLab.animationCalls++;return animate.apply(this,args);};
  });
  const p=await context.newPage();p.on('pageerror',e=>pageErrors.push(e.message));await p.goto(origin+route,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
  if(route==='/admin')await p.getByRole('heading',{name:'Toàn cảnh Thiên Đồ',exact:true}).waitFor();
  await p.waitForTimeout(500);
  const initial=await p.evaluate(()=>({...window.__motionLab,jsBytes:performance.getEntriesByType('resource').filter(r=>new URL(r.name).pathname.endsWith('.js')).reduce((n,r)=>n+r.encodedBodySize,0)}));
  const frames=await p.evaluate(async()=>{const times=[];let last=performance.now();for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);const now=performance.now();times.push(now-last);last=now;scrollBy({top:40,behavior:'instant'});}return times;});
  await p.waitForTimeout(600);
  const post=await p.evaluate(()=>({...window.__motionLab,overflow:document.documentElement.scrollWidth>innerWidth+1,activeReveals:document.getAnimations().filter(a=>a.id==='thiendo-reveal').length}));
  if(post.overflow||post.activeReveals)fs.writeFileSync(path.join(out,'motion-failure.json'),JSON.stringify({route,width,repeat,initial,post,animations:await p.evaluate(()=>document.getAnimations().filter(a=>a.id==='thiendo-reveal').map(a=>({state:a.playState,time:a.currentTime,timing:a.effect.getComputedTiming()})))},null,2));
  assert.equal(post.overflow,false);assert.equal(post.activeReveals,0);
  samples.push({route,width,repeat,initial,post,scrollFrameMs:{median:frames.sort((a,b)=>a-b)[30],p95:frames[57],max:Math.max(...frames)}});
  if(repeat===0)await p.screenshot({path:path.join(out,`motion-${route==='/'?'home':'admin'}-${width}.png`)});
  await context.close();
 }
 const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),noJsPage=await noJs.newPage();const noJsResponse=await noJsPage.goto(origin,{waitUntil:'networkidle'});const html=await noJsResponse.text();assert.ok(html.includes('data-home'));fs.writeFileSync(path.join(out,'no-js-scope.json'),JSON.stringify({serverHtmlContainsHome:true,homeVisible:await noJsPage.locator('[data-home]').isVisible(),scope:'Public home is present in SSR HTML but Next streaming/loading requires JS to reveal it. Motion adds no hidden CSS or wrapper; this is not a full no-JS application acceptance.'},null,2));await noJs.close();
 fs.writeFileSync(path.join(out,'motion-lab.json'),JSON.stringify({mode:process.env.THIENDO_MOTION_LAB,environment:'Linux Chromium; production standalone Next/Nest; PGlite; fresh contexts; local HTTP; GPU disabled; no CPU/network throttle. Three samples per route/viewport. rAF scroll is a synthetic lab, not touch/GPU/field INP.',samples},null,2));
 if(!process.env.THIENDO_MOTION_LAB||process.env.THIENDO_MOTION_LAB==='final')await checkMotion({browser,origin,owner,out,record,pageErrors});
 if(samples.length)record({case:samples.length+' cold home/admin lab samples: JS payload, LCP/CLS, long tasks and 60 scroll frames; no overflow or lingering reveal animations',verdict:'PASS'});
};

async function checkMotion({browser,origin,owner,out,record,pageErrors}){
 for(const option of [{reducedMotion:'reduce'},{unsupported:true},{noAnimation:true}]){
  const {unsupported,noAnimation,...settings}=option;
  const c=await browser.newContext({viewport:{width:390,height:900},...settings});
  if(unsupported)await c.addInitScript(()=>{window.IntersectionObserver=undefined;});
  if(noAnimation)await c.addInitScript(()=>{Element.prototype.animate=undefined;});
  const p=await c.newPage();p.on('pageerror',e=>pageErrors.push(e.message));await p.goto(origin,{waitUntil:'networkidle'});
  const card=p.locator('[data-home] [data-tone="jade"]');await card.scrollIntoViewIfNeeded();assert.equal(await card.isVisible(),true);assert.equal(await card.evaluate(n=>getComputedStyle(n).opacity),'1');assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.id==='thiendo-reveal').length),0);assert.equal(await card.getAttribute('href'),'/books');await c.close();
 }
 record({case:'home remains visible and usable without IntersectionObserver/Web Animations and with reduced motion',verdict:'PASS'});
 for(const width of [320,390,768,1440,1920]){
  const c=await browser.newContext({viewport:{width,height:900}}),p=await c.newPage();p.on('pageerror',e=>pageErrors.push(e.message));
  await p.goto(origin,{waitUntil:'networkidle'});const text=await p.locator('[data-home]').innerText();
  for(const theme of ['dark','light']){
   if(await p.locator('.site').first().evaluate(n=>n.classList.contains('light'))!==(theme==='light'))await p.locator('.theme-button').click();
   const card=p.locator('[data-home] [data-tone="jade"]');await card.focus();assert.equal(await card.evaluate(n=>n===document.activeElement),true);assert.equal(await card.evaluate(n=>getComputedStyle(n).opacity),'1');
   await p.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));await p.waitForTimeout(600);
   await p.waitForFunction(()=>document.getAnimations().filter(a=>a.id==='thiendo-reveal').length===0,null,{timeout:2500});
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await p.locator('[data-home]').innerText(),text);assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.id==='thiendo-reveal').length),0);
   if(width===390||width===1440)await p.screenshot({path:path.join(out,`home-${theme}-${width}.png`)});
  }
  const directory=p.locator('#bo-mon');await directory.getByRole('button',{name:'Phương Tây',exact:true}).click();const count=await directory.locator('[data-tool]').count();assert.ok(count>0);await directory.getByRole('button',{name:'Tất cả',exact:true}).click();assert.ok(await directory.locator('[data-tool]').count()>count);await c.close();
 }
 record({case:'home keyboard focus, unchanged content, filtered tool links and no horizontal clipping at 320–1920px in light/dark',verdict:'PASS'});
 const c=await browser.newContext({viewport:{width:1440,height:1000},storageState:await owner.context.storageState()}),p=await c.newPage();p.on('pageerror',e=>pageErrors.push(e.message));
 await p.goto(origin+'/admin',{waitUntil:'networkidle'});const metrics=p.locator('[data-admin-dashboard] article[data-scroll-reveal] > strong');assert.ok(await metrics.count()>0);const before=await metrics.allTextContents();
 await p.getByRole('button',{name:'Cột',exact:true}).click();const point=p.locator('[data-admin-dashboard] svg[role="group"] g[role="button"]').first();await point.focus();await point.press('Enter');assert.match(await point.getAttribute('aria-label'),/\d{4}-\d{2}-\d{2}/);await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.id==='thiendo-reveal').length),0);assert.deepEqual(await metrics.allTextContents(),before);
 await p.locator('[data-admin-dashboard]').getByRole('button',{name:'Làm mới ↻',exact:true}).click();await p.locator('[data-admin-dashboard][aria-busy="false"]').waitFor();assert.deepEqual(await metrics.allTextContents(),before);await c.close();
 record({case:'Owner dashboard retains real metric values, refresh and keyboard chart selection; runtime reduced-motion change cancels reveals',verdict:'PASS'});
}
