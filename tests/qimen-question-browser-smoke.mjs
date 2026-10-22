/** V11.110.1: live Next/Chromium contract for confirmation and evidence rendering.
 * Only /api/auth/me is stubbed. No PostgreSQL, login or browser-on-phone claims.
 * Requires a built and running Next server and Playwright with Chromium installed.
 */
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import formation from '../apps/web/src/features/ky-mon/formation.cjs';
import hour from '../apps/web/src/features/ky-mon/hour-plate.cjs';
import reader from '../apps/web/src/features/ky-mon/question-reading.cjs';

const origin=process.env.NEXT_BASE_URL||'http://127.0.0.1:3000';
localTestOrigin(origin);
const moduleName=process.env.THIENDO_PLAYWRIGHT_MODULE
 ?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright';
const {chromium}=await import(moduleName);
const browser=await chromium.launch({headless:true,
 ...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),
 ...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
const base=formation.makeBaseFormation({solarTermIndex:3,dayCycleIndex:52,
 hourCycleIndex:formation.hourForDayBranch(52,5).index});
const plate=hour.buildRotatingHourPlate(base);
const selectedDoor=plate.byPalace[3].door;
const otherDoor=plate.byPalace[6].door;
assert.notEqual(selectedDoor,otherDoor);
const initial={topic:'career',indicatorId:`door:${selectedDoor}`,referencePalace:1,confirmed:true,questionNote:'Thẩm định công việc'};
const expected=reader.readQuestionBoard(base,plate,initial);
assert.equal(expected.usePalace,3);

try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/api/auth/me',route=>route.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));
  await page.goto(origin+'/ky-mon');
  await page.getByRole('button',{name:'Nhập thông tin đã đối chiếu',exact:true}).click();
  await page.getByLabel('Tiết khí đã xác nhận').selectOption('3');
  await page.getByLabel('Can Chi ngày đã xác nhận').selectOption('52');
  await page.getByLabel('Can Chi giờ theo Ngũ Tý Độn').selectOption('5');
  assert.equal(await page.getByRole('region',{name:'Đọc bàn theo câu hỏi'}).count(),0);
  await page.getByRole('button',{name:/Khám phá Chuyên sâu/}).click();
  const panel=page.getByRole('region',{name:'Đọc bàn theo câu hỏi'});
  await panel.waitFor();
  const topic=panel.getByRole('combobox',{name:/Chủ đề muốn xem/});
  const indicator=panel.getByRole('combobox',{name:/Dụng thần/});
  const reference=panel.getByRole('combobox',{name:/Cung tham chiếu/});
  const question=panel.getByRole('textbox',{name:/Diễn đạt câu hỏi/});
  const confirm=panel.getByRole('button',{name:'Xác nhận chủ đề và Dụng thần'});
  const result=panel.locator('[data-question-status]');
  async function assertUnconfirmed(){assert.equal(await result.count(),0);}
  async function assertConfirmed(status='evidence-ready'){
   assert.equal(await result.count(),1);
   assert.equal(await result.getAttribute('data-question-status'),status);
  }
  await assertUnconfirmed();assert.equal(await confirm.isDisabled(),true);
  await topic.selectOption('career');await indicator.selectOption(`door:${selectedDoor}`);
  await reference.selectOption('1');await question.fill(initial.questionNote);
  await assertUnconfirmed();assert.equal(await confirm.isEnabled(),true);
  await confirm.click();await assertConfirmed();
  const relation=expected.relations.find(r=>r.role==='reference-to-use');
  assert.ok(relation);
  await result.locator('[data-evidence-kind="five-elements"]').filter({hasText:relation.description}).waitFor();
  assert.ok(await result.getByText('Những điều chưa đủ dữ kiện / chưa thẩm định').count());
  await result.getByRole('button',{name:/Xem cung Dụng thần 3 trên bàn/}).click();
  assert.equal(await page.locator('#ky-mon-palace-detail + h2').textContent(),'Cung 3 — Đông');
  // A -> B -> A must NOT revive a previously granted confirmation.
  await indicator.selectOption(`door:${otherDoor}`);await assertUnconfirmed();
  await indicator.selectOption(`door:${selectedDoor}`);await assertUnconfirmed();
  await confirm.click();await assertConfirmed();
  await question.fill('Thẩm định lại');await assertUnconfirmed();
  await question.fill(initial.questionNote);await assertUnconfirmed();
  await confirm.click();await assertConfirmed();
  await topic.selectOption('study');await assertUnconfirmed();
  await topic.selectOption('career');await assertUnconfirmed();
  await confirm.click();await assertConfirmed();
  await reference.selectOption('2');await assertUnconfirmed();
  await reference.selectOption('1');await assertUnconfirmed();
  await confirm.click();await assertConfirmed();
  // The time plate changes even when the user eventually returns to the old time.
  await page.getByLabel('Can Chi ngày đã xác nhận').selectOption('14');
  await assertUnconfirmed();
  await page.getByLabel('Can Chi ngày đã xác nhận').selectOption('52');
  await assertUnconfirmed();
  await confirm.click();await assertConfirmed();
  await page.getByLabel('Tính địa bàn, thời bàn và Tuần Không khi có giờ').uncheck();
  await assertUnconfirmed();
  await confirm.click();await assertConfirmed('not-computed');
  assert.ok(await result.getByText(/Chưa có thời bàn/).count());
  await page.getByLabel('Tính địa bàn, thời bàn và Tuần Không khi có giờ').check();
  await assertUnconfirmed();
  // No silent overflow for desktop/mobile viewport.
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  if(process.env.THIENDO_UI_DEBUG_DIR){
   mkdirSync(process.env.THIENDO_UI_DEBUG_DIR,{recursive:true});
   await panel.screenshot({path:join(process.env.THIENDO_UI_DEBUG_DIR,`question-${viewport.width}.png`)});
  }
  await page.getByRole('button',{name:/Chuyển về Cơ bản/}).click();
  assert.equal(await panel.isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log(`PASS question-reading Chromium ${viewport.width}x${viewport.height}: confirmed evidence, relation, jump, reversible edits, board invalidation, no-hour and basic mode`);
  await context.close();
 }
}finally{await browser.close();}
