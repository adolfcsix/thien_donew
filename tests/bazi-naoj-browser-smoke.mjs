/** Built Next + Chromium. Anonymous auth is mocked; this does not certify SQL. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
const origin=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const {chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright');
for(const width of [390,768,1440]){
 const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
 try{
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));
  await context.addInitScript(()=>localStorage.setItem('thiendo-view-mode','expert'));
  await page.goto(origin+'/bazi');
  const panel=page.getByLabel('Đối chứng Tiết NAOJ 2017–2023 có giờ phút');
  const submit=async(date,hour,minute)=>{
   await page.getByLabel('Ngày dương lịch (Việt Nam)',{exact:true}).fill(date);
   await page.getByLabel('Giờ',{exact:true}).fill(String(hour));
   await page.getByLabel('Phút',{exact:true}).fill(String(minute));
   await page.getByRole('button',{name:/Lập Bát Tự/}).click();
  };
  await submit('2018-03-05',22,35);
  await panel.waitFor();assert.match(await panel.innerText(),/Kinh Trập/);
  await submit('2018-03-05',22,28);
  assert.match(await panel.innerText(),/Sinh sát giao Tiết/);
  await submit('2026-02-19',10,30);
  assert.equal(await panel.count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  assert.deepEqual(errors,[]);
  console.log(`PASS Bát Tự NAOJ ${width}px: hydration, in-range witness, ingress guard, out-of-range, no overflow/errors`);
 }finally{await browser.close();}
}
