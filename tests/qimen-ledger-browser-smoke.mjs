/** V11.108 frontend-only browser smoke. Only anonymous auth/me is stubbed.
 * Does not test PostgreSQL, authentication, saving or physical mobile devices. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import formation from '../apps/web/src/features/ky-mon/formation.cjs';
import hour from '../apps/web/src/features/ky-mon/hour-plate.cjs';
import evidence from '../apps/web/src/features/ky-mon/palace-ledger.cjs';
const base=process.env.NEXT_BASE_URL||'http://127.0.0.1:3000';localTestOrigin(base);
const moduleName=process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright';
const {chromium}=await import(moduleName);
const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
const f=formation.makeBaseFormation({solarTermIndex:3,dayCycleIndex:52,hourCycleIndex:formation.hourForDayBranch(52,5).index});
const ledger=evidence.buildPalaceLedger(f,hour.buildRotatingHourPlate(f));
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/auth/me',route=>route.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));
  await page.goto(base+'/ky-mon');
  await page.getByRole('button',{name:'Nhập thông tin đã đối chiếu',exact:true}).click();
  await page.getByLabel('Tiết khí đã xác nhận').selectOption('3');
  await page.getByLabel('Can Chi ngày đã xác nhận').selectOption('52');
  await page.getByLabel('Can Chi giờ theo Ngũ Tý Độn').selectOption('5');
  await page.locator('section[aria-label^="Bảng đối chiếu chuyên sâu cung"]').waitFor({state:'hidden'});assert.equal(await page.locator('section[aria-label^="Bảng đối chiếu chuyên sâu cung"]').isVisible(),false);
  await page.getByRole('button',{name:/Khám phá Chuyên sâu/}).click();
  let panel=page.locator('section[aria-label^="Bảng đối chiếu chuyên sâu cung"]');
  await panel.waitFor();
  await panel.locator('summary').filter({hasText:'Đối chiếu chín cung trên cùng bàn'}).click();
  assert.equal(await panel.locator('tbody tr').count(),9);
  for(const entry of ledger.entries){
   await panel.getByRole('button',{name:`Cung ${entry.number} · ${entry.direction}`,exact:true}).click();
   panel=page.getByRole('region',{name:`Bảng đối chiếu chuyên sâu cung ${entry.number}`,exact:true});
   await panel.waitFor();assert.equal(await panel.locator('dl>div').count(),9);
   const states=await panel.locator('dl>div').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-state')));
   assert.deepEqual(states,entry.fields.map(f=>f.status));
   const values=await panel.locator('dl>div dd strong').allTextContents();
   assert.deepEqual(values,entry.fields.map(f=>f.value??(f.status==='convention'?'Không an riêng':'—')));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  }
  const center=page.getByRole('button',{name:'Cung 5 · Trung cung',exact:true});await center.click();
  panel=page.getByRole('region',{name:'Bảng đối chiếu chuyên sâu cung 5',exact:true});
  const star=panel.locator('dl>div').filter({has:page.locator('dt').filter({hasText:'Cửu Tinh'})});
  const host=ledger.byPalace[5].fields.find(f=>f.key==='star').sourcePalace;
  await star.getByRole('button',{name:`Đối chiếu Cửu Tinh tại cung ${host}`,exact:true}).click();
  await page.getByRole('region',{name:`Bảng đối chiếu chuyên sâu cung ${host}`,exact:true}).waitFor();
  panel=page.locator('section[aria-label^="Bảng đối chiếu chuyên sâu cung"]');
  await panel.locator('summary').filter({hasText:'Từng bước an bàn và quy ước ký cung'}).click();
  assert.equal(await panel.locator('ol li').count(),6);
  if(process.env.THIENDO_UI_DEBUG_DIR){mkdirSync(process.env.THIENDO_UI_DEBUG_DIR,{recursive:true});await panel.screenshot({path:join(process.env.THIENDO_UI_DEBUG_DIR,`ledger-${viewport.width}.png`)});}
  await page.getByLabel('Tính địa bàn, thời bàn và Tuần Không khi có giờ').uncheck();
  assert.equal(await panel.locator('[data-evidence-state="not-computed"]').count(),8);
  assert.equal(await page.locator('summary').filter({hasText:'Mã Tinh và Lục Nghi Kích Hình'}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.getByRole('button',{name:/Chuyển về Cơ bản/}).click();
  await page.locator('section[aria-label^="Bảng đối chiếu chuyên sâu cung"]').waitFor({state:'hidden'});assert.equal(await page.locator('section[aria-label^="Bảng đối chiếu chuyên sâu cung"]').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log(`PASS ledger UI ${viewport.width}x${viewport.height}: nine palaces, source navigation, steps, earth-only and mode switch; anonymous auth/me stubbed`);
  await context.close();
 }
}finally{await browser.close();}
