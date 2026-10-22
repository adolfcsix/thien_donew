/** Actual Next/Chromium UI; auth/me is anonymous-stubbed. No DB/save claims. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import formation from '../apps/web/src/features/ky-mon/formation.cjs';
import hour from '../apps/web/src/features/ky-mon/hour-plate.cjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/qimen-v11112-month-strength-independent.json',import.meta.url),'utf8'));
const base=process.env.NEXT_BASE_URL||'http://127.0.0.1:3000';localTestOrigin(base);
const moduleName=process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright';
const {chromium}=await import(moduleName);
const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
const errors=[];
const wanted=(element,month,star)=>fixture[star?'starRows':'genericRows'][fixture.elementOrder.indexOf(element)][fixture.elementOrder.indexOf(month)];
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await context.route('**/api/auth/me',route=>route.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));
  await page.goto(base+'/ky-mon');await page.getByRole('button',{name:'Nhập thông tin đã đối chiếu',exact:true}).click();await page.getByRole('button',{name:/Khám phá Chuyên sâu/}).click();
  for(const input of [{term:3,day:52,branch:5},{term:14,day:14,branch:10}]){
   await page.getByLabel('Tính địa bàn, thời bàn và Tuần Không khi có giờ').check();
   await page.getByLabel('Tiết khí đã xác nhận').selectOption(String(input.term));await page.getByLabel('Can Chi ngày đã xác nhận').selectOption(String(input.day));await page.getByLabel('Can Chi giờ theo Ngũ Tý Độn').selectOption(String(input.branch));
   const b=formation.makeBaseFormation({solarTermIndex:input.term,dayCycleIndex:input.day,hourCycleIndex:formation.hourForDayBranch(input.day,input.branch).index}),plate=hour.buildRotatingHourPlate(b),month=fixture.branchElements[fixture.termBranches[input.term]];
   for(const number of [1,2,3,4,5,6,7,8,9]){
    await page.getByRole('button',{name:new RegExp(`^Cung ${number},`)}).click();
    const panel=page.getByRole('region',{name:`Vượng suy nguyệt lệnh tại cung ${number}`,exact:true});await panel.waitFor();
    assert.ok((await panel.textContent()).includes(`tháng ${fixture.termBranches[input.term]}, hành ${month}`));
    const cell=plate.byPalace[number];
    if(number===5){assert.equal(await panel.locator('[data-month-state="convention"]').count(),2);await panel.getByRole('button',{name:/Xem Thiên Cầm ký/}).click();assert.ok(await page.getByRole('region',{name:`Vượng suy nguyệt lệnh tại cung ${plate.palaces.find(p=>p.lodgedTianQin).number}`,exact:true}).isVisible());continue;}
    for(const [kind,state] of [['Bát Môn',wanted(fixture.doorElements[cell.door],month,false)],['Thiên Can',wanted(fixture.stemElements[cell.heavenStem],month,false)],['Cửu Tinh',wanted(fixture.starElements[cell.star],month,true)]])assert.equal(await panel.locator(`[data-month-kind="${kind}"]`).getAttribute('data-month-state'),state);
    assert.equal(await panel.locator('[data-month-kind="Thiên Cầm ký"]').count(),cell.lodgedTianQin?1:0);
    const patterns=page.getByRole('region',{name:`Cách cục Can tại cung ${number}`,exact:true});assert.ok(await patterns.isVisible());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   }
  }
  await page.getByRole('button',{name:/^Cung 1,/}).click();
  const panel=page.getByRole('region',{name:'Vượng suy nguyệt lệnh tại cung 1',exact:true});
  await panel.getByText('Hai bảng nguyệt khí và dị bản',{exact:true}).click();assert.equal(await panel.locator('a').count(),3);
  await page.getByLabel('Tính địa bàn, thời bàn và Tuần Không khi có giờ').uncheck();assert.equal(await panel.locator('[data-month-state="not-computed"]').count(),2);assert.equal(await panel.locator('[data-month-kind="Cửu Tinh"]').count(),0);
  const patternPanel=page.getByRole('region',{name:'Cách cục Can tại cung 1',exact:true});assert.equal(await patternPanel.locator('[data-pattern-state="not-computed"]').count(),2);
  await page.getByRole('button',{name:/Chuyển về Cơ bản/}).click();assert.equal(await panel.isVisible(),false);assert.equal(await patternPanel.isVisible(),false);
  console.log(`PASS month-strength and pattern UI ${width}px: independent tables, two boards, nine palaces, center link, no-hour, sources, basic mode, no overflow`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
