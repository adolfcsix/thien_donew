/** Live production Next, anonymous auth/me stub only; no DB or real login claims. */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import formation from '../apps/web/src/features/ky-mon/formation.cjs';
import hour from '../apps/web/src/features/ky-mon/hour-plate.cjs';
const origin=process.env.NEXT_BASE_URL||'http://127.0.0.1:3000';localTestOrigin(origin);
const moduleName=process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright';
const {chromium}=await import(moduleName);
const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
const errors=[],downloads=process.env.THIENDO_DOWNLOAD_TEST_DIR||'/tmp/thien-do-workbook-exports';mkdirSync(downloads,{recursive:true});
const base=formation.makeBaseFormation({solarTermIndex:3,dayCycleIndex:52,hourCycleIndex:formation.hourForDayBranch(52,5).index}),plate=hour.buildRotatingHourPlate(base);
async function expert(page){await page.getByRole('button',{name:'Chuyên sâu',exact:true}).click();await page.getByRole('button',{name:/Chuyển về Cơ bản/}).waitFor();}
async function openDetails(panel){for(const details of await panel.locator('details').all())if(await details.getAttribute('open')===null)await details.locator('summary').first().click();}
async function download(page,panel,file){const event=page.waitForEvent('download');await panel.getByRole('button',{name:'Tải hồ sơ Markdown',exact:true}).click();const d=await event;await d.saveAs(join(downloads,file));const text=readFileSync(join(downloads,file),'utf8');assert.ok(text.includes('Căn cứ:')&&text.includes('Điều chưa hoàn tất'));return text;}
try{
 const crawl=await browser.newContext({viewport:{width:1440,height:900}}),cp=await crawl.newPage();cp.on('pageerror',e=>errors.push(e.message));await crawl.route('**/api/auth/me',route=>route.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));
 const routes=['/','/chart','/bazi','/calendar','/good-days','/huyen-hoc','/iching','/mai-hoa','/luc-hao','/ky-mon','/phong-thuy','/ngu-hanh','/star-atlas','/collection','/study','/academy','/library','/research','/research/examples','/research/schools'];
 const lessons=JSON.parse(readFileSync(new URL('../apps/web/src/features/academy/lessons.json',import.meta.url),'utf8'));
 for(const route of [...routes,...lessons.map(l=>'/academy/'+l.slug)]){const response=await cp.goto(origin+route,{waitUntil:'networkidle',timeout:20000});assert.equal(response.status(),200,route);assert.ok((await cp.locator('body').textContent()).trim().length>80,route);}
 console.log(`PASS anonymous route crawl: ${routes.length} pages and ${lessons.length} academy lessons; HTTP 200 and nonempty content`);await crawl.close();
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await context.route('**/api/auth/me',route=>route.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));
  await page.goto(origin+'/mai-hoa',{waitUntil:'networkidle'});await page.getByText('Mở công cụ ba phương pháp trước V11.129',{exact:true}).click();await expert(page);await page.getByRole('button',{name:'Theo hai con số',exact:true}).click();await page.getByLabel('Số thứ nhất · thượng quái').fill('3');await page.getByLabel('Số thứ hai · hạ quái').fill('8');
  const mai=page.getByRole('region',{name:'Hồ sơ nghiên cứu mai-hoa',exact:true});await mai.waitFor();assert.equal(await mai.getAttribute('data-workbook-status'),'ready');await openDetails(mai);assert.ok((await mai.textContent()).includes('Hào được đảo'));
  await download(page,mai,`mai-${width}.md`);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.getByLabel('Số thứ nhất · thượng quái').fill('0');assert.equal(await mai.count(),0);
  await page.goto(origin+'/ky-mon',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Nhập thông tin đã đối chiếu',exact:true}).click();await expert(page);await page.getByLabel('Tiết khí đã xác nhận').selectOption('3');await page.getByLabel('Can Chi ngày đã xác nhận').selectOption('52');await page.getByLabel('Can Chi giờ theo Ngũ Tý Độn').selectOption('5');
  const questions=page.getByRole('region',{name:'Đọc bàn theo câu hỏi',exact:true});await questions.getByRole('combobox',{name:/Chủ đề muốn xem/}).selectOption('career');await questions.getByRole('combobox',{name:/Dụng thần/}).selectOption('door:'+plate.byPalace[3].door);await questions.getByRole('combobox',{name:/Cung tham chiếu/}).selectOption('1');await questions.getByRole('textbox',{name:/Diễn đạt câu hỏi/}).fill('PRIVATE-QUESTION-NOT-FOR-EXPORT');await questions.getByRole('button',{name:'Xác nhận chủ đề và Dụng thần'}).click();
  const qi=page.getByRole('region',{name:'Hồ sơ nghiên cứu ky-mon',exact:true});await qi.waitFor();await openDetails(qi);assert.ok((await qi.textContent()).includes('Nguyệt khí riêng của Dụng thần'));assert.ok(!(await questions.getByRole('heading',{name:'Những điều chưa đủ dữ kiện / chưa thẩm định',exact:true}).locator('..').textContent()).includes('Chưa lượng hóa'));
  const exported=await download(page,qi,`qimen-${width}.md`);assert.ok(!exported.includes('PRIVATE-QUESTION-NOT-FOR-EXPORT'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await questions.getByRole('combobox',{name:/Dụng thần/}).selectOption('deity:'+plate.byPalace[3].deity);assert.equal(await qi.count(),0);await questions.getByRole('button',{name:'Xác nhận chủ đề và Dụng thần'}).click();await openDetails(qi);await qi.getByText('Ngoài phạm vi vượng suy hiện có',{exact:true}).waitFor();
  await page.goto(origin+'/luc-hao',{waitUntil:'networkidle'});await page.getByText('Mở công cụ Lục Hào trước V11.130',{exact:true}).click();await expert(page);const picker=page.getByRole('region',{name:'Lục Hào: câu hỏi và ứng viên hiện phục',exact:true});await picker.getByRole('combobox',{name:'Phạm vi câu hỏi Lục Hào'}).selectOption('money-owned-assets');await picker.getByRole('checkbox',{name:/Tôi xác nhận Lục Thân/}).check();await picker.getByRole('button',{name:'Xác nhận hồ sơ Lục Hào',exact:true}).click();
  const luc=page.getByRole('region',{name:'Hồ sơ nghiên cứu luc-hao',exact:true});await luc.waitFor();await openDetails(luc);assert.ok((await luc.textContent()).includes('Chưa có dữ kiện'));await download(page,luc,`luc-${width}.md`);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.getByLabel('Hào 1',{exact:true}).selectOption('9');assert.equal(await luc.count(),0);await page.getByLabel('Hào 1',{exact:true}).selectOption('7');assert.equal(await luc.count(),0);
  await page.getByRole('button',{name:'Nhập Can Chi đã kiểm chứng',exact:true}).click();await page.getByLabel('Nhật can').selectOption('Giáp');await page.getByLabel('Nhật chi').selectOption('Mão');await page.getByLabel('Nguyệt kiến (tháng theo tiết khí)').selectOption('Dần');assert.equal(await picker.getByRole('button',{name:'Xác nhận hồ sơ Lục Hào',exact:true}).isDisabled(),true);
  await page.getByLabel('Nhật chi').selectOption('Tý');assert.equal(await picker.getByRole('button',{name:'Xác nhận hồ sơ Lục Hào',exact:true}).isEnabled(),true);await picker.getByRole('button',{name:'Xác nhận hồ sơ Lục Hào',exact:true}).click();await luc.waitFor();
  if(process.env.THIENDO_UI_DEBUG_DIR){mkdirSync(process.env.THIENDO_UI_DEBUG_DIR,{recursive:true});await luc.screenshot({path:join(process.env.THIENDO_UI_DEBUG_DIR,`luc-workbook-${width}.png`)});}
  await page.goto(origin+'/luc-hao?restore=1&mode=manual&lines=7,8,7,8,7,8&dayStem=Giáp&dayBranch=Mão&monthBranch=Dần');await page.getByText('Bản mở lại có tham số không hợp lệ; đang giữ dữ liệu mẫu, chưa khôi phục.',{exact:true}).waitFor();
  console.log(`PASS depth workbooks ${width}px: Mai Hoa evidence and invalid input, Qimen symbol-specific strength/deity/privacy export, Luc Hao confirmation/unknown calendar/A-B-A/invalid Can-Chi/restore, downloads and no overflow`);await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
