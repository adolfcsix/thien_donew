/** Real Chromium checks for public guide center and policy pages; no mock screenshots. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
let chromium;
try{({chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright'));}catch{throw Error('BLOCKED: Isolated Playwright is required');}
const origin=process.env.NEXT_BASE_URL||'http://127.0.0.1:3000';
if(!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin))throw Error('Only disposable loopback is supported');
const widths=[320,390,768,1440];
const routes=['/huong-dan','/huong-dan/tu-vi','/huong-dan/huyen-giai','/huong-dan/luan-dan','/huong-dan/goi-thanh-toan','/phap-ly','/phap-ly/quyen-rieng-tu','/phap-ly/du-lieu-ca-nhan','/ho-tro'];
const dir=resolve('browser-evidence/v11163');await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
try{for(const width of widths){const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});const page=await context.newPage();for(const route of routes){const result={width,route,passed:false,error:null};try{
 const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:30000});if(!response||response.status()>=400)throw Error('HTTP '+(response?.status()??'none'));
 await page.locator('#main-content h1').waitFor({timeout:12000});
 const state=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,footer:!!document.querySelector('.thiendo-legal-footer')}));
 if(state.scroll>state.inner+2)throw Error('Horizontal overflow '+(state.scroll-state.inner)+'px');if(!state.footer)throw Error('No legal footer');
 if(route==='/huong-dan'){
  const count=await page.locator('article').count();if(count!==15)throw Error('Guide index must show 15 chapters, found '+count);
  const search=page.getByRole('searchbox');await search.fill('Kỳ Môn Độn Giáp');await page.getByRole('status').waitFor();
  if(await page.locator('article').count()<1)throw Error('Unicode Vietnamese search missing Kỳ Môn');await search.fill('');
 }
 if(route.startsWith('/huong-dan/')&&!route.endsWith('/huong-dan')){
  const links=page.locator('nav[aria-label="Mục lục của bài"] a');if(await links.count()<10)throw Error('Missing expert long-form table of contents');
 }
 if(route.startsWith('/phap-ly/')){
  if(!await page.getByText('Bản dự thảo kỹ thuật',{exact:false}).count())throw Error('Legal review status must be visible');
 }
 if(width===320&&['/huong-dan','/huong-dan/tu-vi','/phap-ly/quyen-rieng-tu'].includes(route))await page.screenshot({path:resolve(dir,'320-'+route.replaceAll('/','-')+'.png'),fullPage:true});
 if(width===1440&&['/huong-dan','/huong-dan/tu-vi','/phap-ly/quyen-rieng-tu'].includes(route))await page.screenshot({path:resolve(dir,'1440-'+route.replaceAll('/','-')+'.png'),fullPage:true});
 result.passed=true;
 }catch(error){result.error=String(error?.message||error);}
 results.push(result);console.log(result.passed?'PASS':'FAIL',width,route,result.error||'');
 }await context.close();}}
finally{await browser.close();}
await writeFile(resolve(dir,'results.json'),JSON.stringify(results,null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
