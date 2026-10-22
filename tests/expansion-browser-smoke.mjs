/** Production Next/Chromium UI checks; auth/storage HTTP mocked explicitly. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
const origin=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const {chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright');
const userId='11111111-1111-4111-8111-111111111111',entryId='22222222-2222-4222-8222-222222222222';
for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
 try{
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];let signedIn=true,posts=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const snapshot={method:'pythagorean-segmented-v1',name:'Ada Lovelace',date:'1980-10-22',year:2026,yMode:'consonant',masters:true};
  await context.route('**/api/auth/me',r=>r.fulfill({json:{user:signedIn?{id:userId,email:'ui@example.invalid'}:null}}));
  await context.route('**/api/study/'+entryId,r=>r.fulfill({json:{entry:{id:entryId,discipline:'numerology',title:'Fixture',summary:'',notes:'',tags:[],snapshot,pinned:false,createdAt:'2026-10-13',updatedAt:'2026-10-13'}}}));
  await context.route('**/api/study',r=>{posts.push(r.request().postDataJSON());return r.fulfill({json:{id:entryId}});});
  await page.goto(origin+'/numerology');await page.getByLabel('Họ tên theo giấy khai sinh').fill('Ada Lovelace');await page.getByLabel('Ngày sinh dương lịch',{exact:true}).fill('1980-10-22');await page.getByRole('button',{name:'Tính và đối chiếu',exact:true}).click();
  await page.getByRole('heading',{name:'02 / Những chỉ số đã tính',exact:true}).waitFor();
  assert.equal(await page.locator('article').filter({has:page.getByText('Đường đời',{exact:true})}).locator('strong').innerText(),'5');assert.equal(posts.length,0);assert.ok(!page.url().includes('Ada'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  if(process.env.THIENDO_UI_SCREENSHOT_DIR)await page.screenshot({path:process.env.THIENDO_UI_SCREENSHOT_DIR+`/numerology-${viewport.width}.png`});
  console.log(`PASS Pythagoras trace/result ${viewport.width}: published fixture5, no implicit save or horizontal overflow`);
  await page.getByLabel('Họ tên theo giấy khai sinh').fill('Lynn');await page.getByLabel('Quy ước chữ Y').selectOption('vowel');await page.getByRole('button',{name:'Tính và đối chiếu',exact:true}).click();assert.equal(await page.locator('article').filter({has:page.getByText('Linh hồn',{exact:true})}).locator('strong').innerText(),'7');
  console.log(`PASS explicit Y convention ${viewport.width}`);
  signedIn=true;await page.goto(origin+'/numerology?entry='+entryId);await page.getByRole('status').filter({hasText:'Đã mở lại đầu vào'}).waitFor();assert.equal(await page.getByLabel('Họ tên theo giấy khai sinh').inputValue(),'Ada Lovelace');
  await page.getByRole('button',{name:'✧ Lưu hồ sơ nghiên cứu',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu vào Thư phòng cá nhân.'}).waitFor();assert.equal(posts.length,1);assert.deepEqual(posts[0].snapshot,snapshot);
  console.log(`PASS study reopen and explicit save ${viewport.width}: exact inputs retained, no name in URL`);
  await page.goto(origin+'/western-astrology');await page.getByText('Học vòng Hoàng đạo và lộ trình nâng cao',{exact:true}).click();await page.getByRole('button',{name:'♐ Nhân Mã',exact:true}).click();assert.equal(await page.getByRole('button',{name:'♐ Nhân Mã',exact:true}).getAttribute('aria-pressed'),'true');await page.getByText('Phần 9 của vòng Hoàng đạo:',{exact:false}).waitFor();assert.ok((await page.locator('body').innerText()).includes('Công cụ Natal theo phạm vi'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  if(process.env.THIENDO_UI_SCREENSHOT_DIR)await page.screenshot({path:process.env.THIENDO_UI_SCREENSHOT_DIR+`/western-${viewport.width}.png`});
  console.log(`PASS western educational wheel ${viewport.width}: accessible selection, scoped calculator status honest`);
  console.log('Opening development',viewport.width);await page.goto(origin+'/research/development');await page.getByRole('searchbox',{name:'Tìm chuyên môn hoặc phần thiếu',exact:true}).fill('Thiết Bản');assert.equal(await page.getByRole('table').locator('tbody tr').count(),1);assert.ok((await page.getByRole('table').locator('tbody').innerText()).includes('Chưa triển khai'));console.log(`PASS development filters ${viewport.width}`);
  await page.goto(origin+'/chart');await page.getByLabel('Tên lá số',{exact:true}).fill('QA Chart');await page.getByRole('button',{name:/Tính lá số/}).click();await page.getByText('Kiểm kê sao của lá số:',{exact:false}).waitFor();assert.ok((await page.getByText('Kiểm kê sao của lá số:',{exact:false}).innerText()).includes('14 chính tinh · 90 phụ tinh'));
  const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'▤ In / PDF',exact:true}).click();const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');assert.equal(await popup.locator('.star-appendix article').count(),12);assert.ok((await popup.locator('.star-appendix').innerText()).includes('Vòng Tràng Sinh'));await popup.close();console.log(`PASS Tu Vi inventory and full print appendix ${viewport.width}`);
  assert.deepEqual(errors,[]);
 }catch(error){console.error('BROWSER_FAILURE',error.stack);console.error((await browser.contexts()[0]?.pages()[0]?.locator('body').innerText())?.slice(0,1600));throw error;}finally{await browser.close();}
}
