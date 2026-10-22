/** Actual Chromium/Next UI; only anonymous auth/me stubbed. No database/save claims. */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import formation from '../apps/web/src/features/ky-mon/formation.cjs';
import hour from '../apps/web/src/features/ky-mon/hour-plate.cjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/qimen-v11109-independent.json',import.meta.url),'utf8'));
const base=process.env.NEXT_BASE_URL||'http://127.0.0.1:3000';localTestOrigin(base);
const moduleName=process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright';
const {chromium}=await import(moduleName);
const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
const errors=[];
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/auth/me',route=>route.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));
  await page.goto(base+'/ky-mon');await page.getByRole('button',{name:'Nhập thông tin đã đối chiếu',exact:true}).click();
  await page.getByRole('button',{name:/Khám phá Chuyên sâu/}).click();
  for(const input of [{term:3,day:52,branch:5},{term:14,day:14,branch:10}]){
   await page.getByLabel('Tính địa bàn, thời bàn và Tuần Không khi có giờ').check();
   await page.getByLabel('Tiết khí đã xác nhận').selectOption(String(input.term));await page.getByLabel('Can Chi ngày đã xác nhận').selectOption(String(input.day));await page.getByLabel('Can Chi giờ theo Ngũ Tý Độn').selectOption(String(input.branch));
   const basePlate=formation.makeBaseFormation({solarTermIndex:input.term,dayCycleIndex:input.day,hourCycleIndex:formation.hourForDayBranch(input.day,input.branch).index});const plate=hour.buildRotatingHourPlate(basePlate);
   for(const number of [...fixture.palaces,5]){
    await page.getByRole('button',{name:new RegExp(`^Cung ${number},`)}).click();
    const panel=page.getByRole('region',{name:`Dấu cấu trúc Môn Bách và Tam Kỳ Nhập Mộ tại cung ${number}`,exact:true});await panel.waitFor();
    const cell=plate.byPalace[number],column=fixture.palaces.indexOf(number);
    const doorExpected=number===5?'convention':fixture.doorControlsPalaceRows[fixture.doorOrder.indexOf(cell.door)][column]==='1'?'present':'absent';
    const stemRow=fixture.threeWonderOrder.indexOf(cell.heavenStem);const graveExpected=number===5?'convention':stemRow<0?'out-of-scope':fixture.selectedGraveRows[stemRow][column]==='1'?'present':'absent';
    assert.equal(await panel.locator('[data-structural-kind="door"]').getAttribute('data-structural-state'),doorExpected);
    assert.equal(await panel.locator('[data-structural-kind="grave"]').getAttribute('data-structural-state'),graveExpected);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   }
   if(input.term===3){
    await page.getByRole('button',{name:/^Cung 9,/}).click();
    const sourcePanel=page.getByRole('region',{name:'Dấu cấu trúc Môn Bách và Tam Kỳ Nhập Mộ tại cung 9',exact:true});
    await sourcePanel.getByRole('button',{name:'Đối chiếu cung mộ 6 ↗',exact:true}).click();
    await page.getByRole('region',{name:'Dấu cấu trúc Môn Bách và Tam Kỳ Nhập Mộ tại cung 6',exact:true}).waitFor();
   }
  }
  let panel=page.getByRole('region',{name:'Dấu cấu trúc Môn Bách và Tam Kỳ Nhập Mộ tại cung 5',exact:true});
  await panel.locator('summary').filter({hasText:'Quy ước, nguồn và bảng đối chiếu độc lập'}).click();
  const rows=await panel.locator('tbody tr th').allTextContents();assert.deepEqual(rows,fixture.doorOrder);
  for(const row of await panel.locator('tbody tr').all()){const door=await row.locator('th').textContent();const value=await row.locator('td').nth(1).textContent();assert.deepEqual((value.match(/\d+/g)||[]).map(Number),fixture.explicitPositivePalaces[door]);}
  assert.equal(await panel.locator('a[href^="https://"]').count(),3);assert.deepEqual(await panel.locator('a[href^="https://"]').allTextContents(),['Độn Giáp Diễn Nghĩa','Kỳ Môn Bảo Giám Ngự Định','Kỳ Môn Độn Giáp Bí Kíp Đại Toàn']);await panel.getByText(/Bảo Giám dùng Đinh → Càn 6/).waitFor();
  await panel.locator('summary').filter({hasText:'Phân biệt dấu cấu trúc và luận đoán'}).click();await panel.getByText(/chưa đưa ra điểm cát hung/).waitFor();
  await panel.locator('summary').filter({hasText:'Độ phủ Tam Kỳ và Can chưa biểu diễn'}).click();
  assert.equal(plateCenterStem(14,14,10),'Ất');
  assert.ok(await panel.getByText(/bộ dựng chưa biểu diễn Can ký/).count()>0);
  if(process.env.THIENDO_UI_DEBUG_DIR){mkdirSync(process.env.THIENDO_UI_DEBUG_DIR,{recursive:true});await panel.screenshot({path:join(process.env.THIENDO_UI_DEBUG_DIR,`structural-${viewport.width}.png`)});}
  await page.getByLabel('Tính địa bàn, thời bàn và Tuần Không khi có giờ').uncheck();
  assert.equal(await panel.locator('[data-structural-state="not-computed"]').count(),2);
  assert.equal(await panel.locator('[data-structural-state="present"]').count(),0);
  await page.getByRole('button',{name:/Chuyển về Cơ bản/}).click();assert.equal(await panel.isVisible(),false);
  console.log(`PASS structural UI ${viewport.width}x${viewport.height}: two independent door/grave tables across two boards, nine palaces, sources, variants, no-hour and basic mode; anonymous auth/me stubbed`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
function plateCenterStem(term,day,branch){const p=formation.makeBaseFormation({solarTermIndex:term,dayCycleIndex:day,hourCycleIndex:formation.hourForDayBranch(day,branch).index});return p.plate.byPalace[5];}
