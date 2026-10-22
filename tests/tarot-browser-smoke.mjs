/** Production Next/Chromium; auth/storage responses are mocked, never native DB proof. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import tarot from '../packages/astrology-engine/src/tarot-rws.cjs';
const origin=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const {chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright');
const userId='11111111-1111-4111-8111-111111111111',entryId='22222222-2222-4222-8222-222222222222';
for(const width of [390,1440]){
 const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
 try{
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],posts=[];let signedIn=true,snapshot;
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
  await context.route('**/api/auth/me',r=>r.fulfill({json:{user:signedIn?{id:userId,email:'tarot@example.invalid'}:null}}));
  await context.route('**/api/study/'+entryId,r=>r.fulfill({json:{entry:{id:entryId,discipline:'tarot',title:'Fixture',summary:'',notes:'',tags:[],snapshot,pinned:false,createdAt:'2026-10-13',updatedAt:'2026-10-13'}}}));
  await context.route('**/api/study',r=>{if(r.request().method()==='GET')return r.fulfill({json:{entries:snapshot?[{id:entryId,discipline:'tarot',title:'Fixture',summary:'',notes:'',tags:[],snapshot,pinned:false,createdAt:'2026-10-13',updatedAt:'2026-10-13'}]:[]}});posts.push(r.request().postDataJSON());return r.fulfill({json:{id:entryId}});});
  await page.goto(origin+'/tarot');await page.getByRole('heading',{name:'Thư viện 78 lá',exact:true}).waitFor();
  const catalog=page.locator('[aria-label="Danh mục Tarot"]');assert.equal(await catalog.getByRole('button').count(),78);assert.equal(await catalog.locator('img').count(),78);assert.match(await catalog.locator('img').first().getAttribute('src'),/ar00\.jpg$/);
  for(const [name,count] of [['Ẩn chính',22],['Gậy',14],['Cốc',14],['Kiếm',14],['Tiền',14]]){await page.getByRole('button',{name,exact:true}).click();assert.equal(await catalog.getByRole('button').count(),count);}
  await page.getByLabel('Tìm lá bài').fill('NO-SUCH-CARD-XYZ');assert.equal(await catalog.getByRole('button').count(),0);assert.equal(await page.getByRole('heading',{name:'Nghĩa xuôi',exact:true}).count(),0);
  await page.getByLabel('Tìm lá bài').fill('');await page.getByRole('button',{name:'Tất cả',exact:true}).click();
  await page.getByLabel('Cho phép lá ngược').check();await page.getByRole('button',{name:'✧ Xáo và rút bài',exact:true}).click();
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'↓ Xuất JSON trải bài',exact:true}).click();
  const download=await downloadEvent,stream=await download.createReadStream();let raw='';for await(const chunk of stream)raw+=chunk.toString();snapshot=tarot.parseReadingExport(raw);assert.equal(snapshot.draw.length,3);assert.equal(new Set(snapshot.draw.map(c=>c.id)).size,3);
  const upload=body=>page.getByLabel('Chọn tệp JSON trải bài Tarot').setInputFiles({name:'reading.json',mimeType:'application/json',buffer:Buffer.from(body)});
  await page.getByLabel('Một lá',{exact:true}).check();assert.equal(await page.getByRole('button',{name:'↓ Xuất JSON trải bài',exact:true}).count(),0);
  await upload(raw);await page.getByRole('status').filter({hasText:'Đã nhập trải bài từ JSON'}).waitFor();assert.equal(posts.length,0);
  const again=page.waitForEvent('download');await page.getByRole('button',{name:'↓ Xuất JSON trải bài',exact:true}).click();let restored='';for await(const chunk of await(await again).createReadStream())restored+=chunk.toString();assert.deepEqual(tarot.parseReadingExport(restored),snapshot);
  await upload('{broken');await page.getByRole('status').filter({hasText:/JSON/}).first().waitFor();assert.equal(await page.getByRole('button',{name:'↓ Xuất JSON trải bài',exact:true}).count(),0);
  await upload('x'.repeat(tarot.TAROT_ARCHIVE.maxBytes+1));await page.getByRole('status').filter({hasText:'16 KB'}).waitFor();assert.equal(posts.length,0);
  signedIn=true;await page.goto(origin+'/tarot?entry='+entryId);await page.getByRole('status').filter({hasText:'Đã khôi phục chính xác'}).waitFor();
  await page.getByRole('button',{name:'✧ Lưu hồ sơ nghiên cứu',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu vào Thư phòng cá nhân.'}).waitFor();assert.equal(posts.length,1);assert.deepEqual(posts[0].snapshot,snapshot);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);
  console.log(`PASS Tarot ${width}px: 78-card filters, empty results, distinct draw, JSON round trip, malformed/oversize rejection, mocked account reopen/explicit save and no overflow`);
 }finally{await browser.close();}
}
