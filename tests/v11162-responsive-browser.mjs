/** Browser-only read-only acceptance. Do not infer production authorization or E2E validity. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
let chromium;
try{({chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright'));}
catch{throw Error('BLOCKED: Playwright/Chromium must be installed in the supported CI environment');}
const origin=process.env.NEXT_BASE_URL||'http://127.0.0.1:3000';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw Error('BLOCKED: tests may only target a loopback, disposable site');
const widths=[320,375,390,768,1024,1440,1920];
const pages=['/','/huyen-hoc','/books','/van-kho','/forum'];
const out=resolve(process.env.THIENDO_BROWSER_REPORT_DIR||'docs/reports','v11162-ui');
await mkdir(out,{recursive:true});
const evidence=[],browser=await chromium.launch({headless:true});
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.addInitScript(()=>{
   window.__thiendoLabVitals={cls:0,lcp:0,longTasks:0};
   try{new PerformanceObserver(list=>{for(const e of list.getEntries()){if(!e.hadRecentInput)window.__thiendoLabVitals.cls+=e.value;}}).observe({type:'layout-shift',buffered:true});}catch{}
   try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__thiendoLabVitals.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
   try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__thiendoLabVitals.longTasks+=Math.max(0,e.duration-50);}).observe({type:'longtask',buffered:true});}catch{}
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of pages){
   const result={width,route,status:'PASS',overflow:0,issue:null,labVitals:null};
   try{
    const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:35000});
    if(!response||response.status()>=500)throw Error('HTTP 5xx or no response');
    await page.locator('#main-content').waitFor({timeout:14000});
    await page.waitForTimeout(180);
    const dims=await page.evaluate(()=>({inner:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
    result.overflow=Math.max(dims.html,dims.body)-dims.inner;
    result.labVitals=await page.evaluate(()=>({
      ...window.__thiendoLabVitals,
      fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,
      navigation:performance.getEntriesByType('navigation')[0]?.duration??null,
    }));
    if(result.overflow>2)throw Error('Horizontal overflow '+result.overflow+'px');
    if(errors.length)throw Error('Uncaught page errors: '+errors.join('; ').slice(0,450));
    if(route==='/'){
      const search=page.getByRole('button',{name:'Tìm nhanh trang và công cụ'});
      if(await search.count()!==1)throw Error('Global search must have one trigger');
      await search.click();
      await page.getByRole('dialog',{name:'Tìm nhanh trang và công cụ'}).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog',{name:'Tìm nhanh trang và công cụ'}).waitFor({state:'hidden'});
      if(width<=680){
       const count=await page.locator('nav[aria-label="Điều hướng điện thoại"] > a').count();
       if(count!==4)throw Error(`Expected four mobile shortcuts + menu; found ${count}`);
      }
    }
    if(width===320&&route==='/')await page.screenshot({path:resolve(out,'home-mobile-320.png')});
    if(width===1440&&route==='/')await page.screenshot({path:resolve(out,'home-desktop-1440.png')});
   }catch(e){result.status='FAIL';result.issue=String(e.message||e);await page.screenshot({path:resolve(out,`failure-${width}-${route.slice(1)||'home'}.png`)}).catch(()=>{});}
   console.log(result.status,width,route,result.issue||'');evidence.push(result);errors.length=0;
  }
  await context.close();
 }
}finally{await browser.close()}
const pass=evidence.filter(x=>x.status==='PASS').length;
const performanceWarnings=evidence.flatMap(item=>{const v=item.labVitals;if(!v)return [];const warnings=[];if(v.lcp>2500)warnings.push('LCP > 2.5s');if(v.cls>.1)warnings.push('CLS > 0.1');return warnings.length?[{width:item.width,route:item.route,warnings}]:[];});
await writeFile(resolve(out,'results.json'),JSON.stringify({scope:'Anonymous Chromium, 7 widths x 5 routes. No claim of real login, API payment or physical-device testing.',pass,total:evidence.length,performanceWarnings,evidence},null,2)+'\n');
console.log(`CHROMIUM responsive ${pass}/${evidence.length} PASS. Lab performance warnings: ${performanceWarnings.length} (non-gating; investigate before GO)`);
if(pass!==evidence.length)process.exitCode=1;
