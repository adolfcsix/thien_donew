/** Browser colors across both theme directions. QA only; no provider/database writes.
 * Conservative backdrop bounds for the shared breadcrumb, not WCAG certification. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'reports/theme-transition');
(async()=>{
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 const app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:0});
 let server,browser;const checks=[];
 fs.mkdirSync(out,{recursive:true});
 try{
  await app.prepare();server=require('node:http').createServer(app.getRequestHandler());
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.addInitScript(()=>localStorage.setItem('thiendo-theme','dark'));
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
  await page.locator('.site[data-theme-ready="true"]').waitFor();
  for(const mode of ['light','dark']){
   await page.locator('.theme-button').click();
   const frames=await page.evaluate(async()=>{
    const rows=[];const start=performance.now();
    do{
     const surface=getComputedStyle(document.querySelector('.topbar'));
     const text=getComputedStyle(document.querySelector('.topbar .crumb b'));
     rows.push({time:performance.now()-start,color:text.color,background:surface.backgroundColor,textTransition:text.transitionProperty,surfaceTransition:surface.transitionProperty});
     await new Promise(requestAnimationFrame);
    }while(performance.now()-start<900);
    return rows;
   });
   const rgb=value=>value.match(/[\d.]+/g).map(Number);
   const lum=rgb=>rgb.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
   for(const f of frames){
    assert.ok(!/(^|,\s*)(?:color|background-color|all)(,|$)/.test(f.textTransition),f.textTransition);
    assert.ok(!/(^|,\s*)(?:color|background-color|all)(,|$)/.test(f.surfaceTransition),f.surfaceTransition);
    const fg=rgb(f.color),bg=rgb(f.background),alpha=bg[3]??1;
    f.minimumBackdropContrast=Math.min(...[0,255].map(extreme=>{
     const a=lum(fg),b=lum(bg.slice(0,3).map(x=>x*alpha+extreme*(1-alpha)));
     return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    }));
    assert.ok(f.minimumBackdropContrast>=4.5,`${mode}: ${f.minimumBackdropContrast}`);
   }
   await page.screenshot({path:path.join(out,mode+'.png')});
   checks.push({mode,frames,minimum:Math.min(...frames.map(f=>f.minimumBackdropContrast))});
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',scope:'Desktop shared breadcrumb/topbar only; conservative black/white backdrop bounds',checks},null,2));
  console.log(JSON.stringify({status:'PASS',checks:checks.map(({mode,frames,minimum})=>({mode,frames:frames.length,minimum}))}));
 }finally{
  await browser?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await app.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
