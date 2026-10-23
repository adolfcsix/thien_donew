/** Real Next/React UI with intercepted book APIs. Complements SQL tests; not full-stack E2E. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{browserLaunchOptions}=require('./helpers-browser-launch.cjs');
if(!process.env.THIENDO_PLAYWRIGHT_MODULE)throw Error('Explicit Playwright module required');
const runtime=process.env.THIENDO_PLAYWRIGHT_MODULE;
const {chromium}=await import(pathToFileURL(/\.(?:mjs|js)$/.test(runtime)?runtime:join(runtime,'index.mjs')).href);
const buildRoot=resolve(process.env.THIENDO_BUILD_ROOT||'.'),origin='http://127.0.0.1:3124';
const output=resolve(process.env.THIENDO_READER_REPORT_DIR||'verification/reader-audit');await mkdir(output,{recursive:true});
let web,browser;const errors=[],results=[],log=[];
try{
 web=spawn(process.execPath,[join(buildRoot,'apps/web/.next/standalone/apps/web/server.js')],{cwd:buildRoot,env:{...process.env,PORT:'3124',HOSTNAME:'127.0.0.1'},stdio:['ignore','pipe','pipe']});web.stdout.on('data',v=>log.push(v.toString()));web.stderr.on('data',v=>log.push(v.toString()));
 let ready=false;for(let i=0;i<100;i++){if(web.exitCode!==null)break;try{const response=await fetch(origin,{signal:AbortSignal.timeout(1000)});await response.arrayBuffer();if(response.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Real standalone web must start');
 browser=await chromium.launch(browserLaunchOptions());
 for(const width of [320,390,768,1440])for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(t=>localStorage.setItem('thiendo-theme',t),theme);
  const writes=[];let failChapter=true;
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;let value={};
   if(path==='/api/auth/me')value={user:null};
   else if(path==='/api/books/reader-qa')value={book:{id:'10000000-0000-4000-8000-000000000001',slug:'reader-qa',title:'Sách đối chiếu trình đọc',format:'epub',accessLevel:'free'},canRead:true,progress:null};
   else if(path.endsWith('/open'))value={allowed:true,format:'epub'};
   else if(path.endsWith('/chapters'))value={chapters:[{index:0,title:'Khởi đầu'},{index:1,title:'Đối chiếu'},{index:2,title:'Chương dài'}]};
   else if(/\/chapters\/\d+$/.test(path)){const index=Number(path.split('/').at(-1));if(index===1&&failChapter){failChapter=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Lỗi chương có kiểm soát'})});}value={chapter:{index,title:'Chương '+(index+1),text:index===0?'Nội dung chương đầu':index===1?'Nội dung chương đối chiếu':'Văn bản dài đã giới hạn',truncated:index===2,originalCharacters:index===2?125000:30},total:3};}
   else if(path.endsWith('/progress')){writes.push(route.request().postData());value={saved:true};}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
  });
  await page.goto(origin+'/books/reader-qa/read',{waitUntil:'domcontentloaded'});await page.locator('article').filter({hasText:'Nội dung chương đầu'}).waitFor();
  await page.getByRole('button',{name:'Sau →',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Thử tải chương',exact:true}).waitFor();assert.equal(await page.locator('article').count(),0);await page.getByRole('button',{name:'Thử tải chương',exact:true}).click();await page.locator('article').filter({hasText:'Nội dung chương đối chiếu'}).waitFor();
  await page.getByRole('searchbox',{name:'Tìm chương'}).fill('chuong dai');assert.equal(await page.getByRole('navigation',{name:'Mục lục EPUB'}).getByRole('button').count(),1);await page.getByRole('navigation',{name:'Mục lục EPUB'}).getByRole('button').click();await page.locator('article').filter({hasText:'Văn bản dài'}).waitFor();await page.getByRole('link',{name:'Tải tệp EPUB gốc để đọc đầy đủ'}).waitFor();
  const before=await page.locator('article').evaluate(e=>getComputedStyle(e).fontSize);await page.getByRole('button',{name:'Chữ lớn +',exact:true}).click();assert.notEqual(await page.locator('article').evaluate(e=>getComputedStyle(e).fontSize),before);
  await page.getByRole('spinbutton',{name:'Đến chương'}).fill('1');await page.getByRole('button',{name:'Mở vị trí',exact:true}).click();await page.locator('article').filter({hasText:'Nội dung chương đầu'}).waitFor();
  const dimensions=await page.evaluate(()=>({inner:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert.ok(Math.max(dimensions.html,dimensions.body)-dimensions.inner<=2,JSON.stringify(dimensions));assert.equal(writes.length,0,'Guest may not write account progress');
  results.push({width,theme,status:'PASS',checks:['keyboard navigation','chapter failure clears stale text','retry','accent-insensitive search','chapter selection','truncation notice','font size','jump','no horizontal overflow','guest no PATCH']});await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{
 await browser?.close();if(web?.exitCode===null){web.kill('SIGTERM');await Promise.race([new Promise(r=>web.once('exit',r)),new Promise(r=>setTimeout(r,2000))]);if(web.exitCode===null)web.kill('SIGKILL');}
 await writeFile(join(output,'reader-browser.json'),JSON.stringify({scope:'Real Next UI; intercepted APIs; Chromium Linux only; not native devices, backend E2E, full WCAG or field performance',buildRoot,results,pageErrors:errors},null,2));await writeFile(join(output,'reader-browser-web.log'),log.join(''));
}
console.log(JSON.stringify({groups:results.length,pageErrors:errors.length,status:'PASS'}));
