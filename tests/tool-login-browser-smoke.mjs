/** Production UI login/return flow with mocked account HTTP, never SQL proof. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
const origin=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const {chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright');
for(const width of [390,768,1440]){
 const browser=await chromium.launch({headless:true,executablePath:process.env.THIENDO_CHROMIUM_PATH,args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON||'[]')});
 try{
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  let signed=false;const user={id:'11111111-1111-4111-8111-111111111111',email:'access@example.invalid'};
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/auth/me',r=>r.fulfill({json:{user:signed?user:null}}));
  await context.route('**/api/auth/google/config',r=>r.fulfill({json:{enabled:false,clientId:null}}));
  await context.route('**/api/auth/login',r=>{signed=true;return r.fulfill({json:{user}});});
  await page.goto(origin+'/huyen-hoc');assert.equal(new URL(page.url()).pathname,'/huyen-hoc');
  await page.goto(origin+'/bazi');await page.waitForURL('**/login?next=*');
  assert.equal(new URL(page.url()).searchParams.get('next'),'/bazi');
  assert.equal(await page.getByRole('button',{name:/Lập Bát Tự/}).count(),0);
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  await dialog.getByLabel('Email',{exact:true}).fill(user.email);
  await dialog.getByLabel('Mật khẩu',{exact:true}).fill('TEST-only-password');
  await dialog.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.waitForURL(origin+'/bazi');await page.getByRole('button',{name:/Lập Bát Tự/}).waitFor();
  assert.equal(await dialog.count(),0);
  signed=false;await page.goto(origin+'/login?next='+encodeURIComponent('//evil.invalid/'));
  await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByLabel('Email',{exact:true}).fill(user.email);
  await page.getByRole('dialog').getByLabel('Mật khẩu',{exact:true}).fill('TEST-only-password');
  await page.getByRole('dialog').getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.waitForURL(origin+'/chart');assert.equal(new URL(page.url()).origin,origin);
  assert.deepEqual(errors,[]);console.log(`PASS Tool login ${width}px: public browse, guarded tools, login/resume, external return rejection`);
 }finally{await browser.close();}
}
