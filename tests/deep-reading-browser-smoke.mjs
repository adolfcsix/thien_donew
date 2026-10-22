/** Actual built Next and local chart/annual engine; anonymous auth stub only. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import E from '../packages/astrology-engine/src/tuvi.js';
import D from '../packages/interpretation/src/deep-chart-reading.cjs';
const origin=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const {chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright');
const chart=E.calculate({date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'});
async function exported(page,panel){const ev=page.waitForEvent('download');await panel.getByRole('button',{name:'Xuất bài luận JSON',exact:true}).click();const stream=await(await ev).createReadStream();let raw='';for await(const c of stream)raw+=c.toString();return JSON.parse(raw);}
for(const width of [390,1440]){
 const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
 try{
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));
  await page.goto(origin+'/chart');await page.getByLabel('Tên lá số',{exact:true}).fill('QA Chart');await page.getByRole('button',{name:/Tính lá số/}).click();
  const panel=page.getByRole('region',{name:'Luận giải chuyên sâu Tử Vi',exact:true});assert.equal(await panel.count(),0);
  await page.getByRole('button',{name:'Đọc toàn lá số · 12 cung',exact:true}).click();await panel.waitFor();await panel.getByRole('status').filter({hasText:'12 / 12 cung'}).waitFor();
  const expert=page.getByRole('group',{name:'Chế độ hiển thị',exact:true}).getByRole('button',{name:'Chuyên sâu',exact:true});await expert.click();
  const year=page.getByRole('combobox',{name:'Năm âm lịch cần xem',exact:true});await year.selectOption('2026');await panel.getByRole('status').filter({hasText:'Năm âm lịch 2026'}).waitFor();
  const json=await exported(page,panel);assert.deepEqual(json,D.buildDeepChartReading(chart,2026));
  const select=panel.getByRole('combobox',{name:'Cung trong bài luận chuyên sâu',exact:true});
  for(const p of ['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ']){
   await select.selectOption(p);await panel.getByRole('status').filter({hasText:'1 / 12 cung'}).waitFor();assert.ok((await panel.innerText()).includes(`${p} (`));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  }
  await select.selectOption('Mệnh');await panel.getByText('Bốn vị trí trong tứ chính',{exact:true}).click();assert.equal(await panel.getByRole('table',{name:'Tứ chính của Mệnh',exact:true}).locator('tbody tr').count(),4);
  await panel.getByText('Tứ Hóa: sao đích, cung và lớp áp dụng',{exact:true}).click();const hoa=panel.getByRole('table',{name:'Đối chiếu Tứ Hóa bản mệnh và năm xem',exact:true});assert.equal(await hoa.locator('tbody tr').count(),8);
  const layer=panel.getByRole('combobox',{name:'Lớp luận chuyên sâu',exact:true});await layer.selectOption('natal');assert.equal(await hoa.locator('tbody tr').count(),4);assert.equal(await panel.getByRole('region',{name:'Năm 2026 cung Mệnh',exact:true}).count(),0);
  await layer.selectOption('annual');assert.equal(await hoa.locator('tbody tr').count(),4);assert.equal(await panel.locator('[aria-label="Bản mệnh cung Mệnh"]').count(),0);
  await layer.selectOption('both');await select.selectOption('all');await panel.getByRole('checkbox',{name:'Chỉ cung cần kiểm tra',exact:true}).check();await panel.getByRole('status').filter({hasText:'0 / 12 cung'}).waitFor();await panel.getByText('Không có cung cần kiểm tra theo bộ điều kiện dữ liệu hiện tại. Điều này chưa xác nhận nội dung luận đoán.',{exact:true}).waitFor();await panel.getByRole('checkbox',{name:'Chỉ cung cần kiểm tra',exact:true}).uncheck();
  await year.selectOption('2025');await panel.getByRole('status').filter({hasText:'Năm âm lịch 2025'}).waitFor();const next=await exported(page,panel);assert.equal(next.year,2025);assert.deepEqual(next.palaces.map(p=>p.natal),json.palaces.map(p=>p.natal));assert.notDeepEqual(next.annualTransformations,json.annualTransformations);
  await select.selectOption('Mệnh');
  const toLight=page.getByRole('button',{name:'Chuyển sang giao diện sáng',exact:true});if(await toLight.count())await toLight.click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  if(process.env.THIENDO_UI_DEBUG_DIR){mkdirSync(process.env.THIENDO_UI_DEBUG_DIR,{recursive:true});await panel.screenshot({path:join(process.env.THIENDO_UI_DEBUG_DIR,`deep-reading-light-${width}.png`)});}
  await page.getByRole('button',{name:'Chuyển sang giao diện tối',exact:true}).click();
  if(process.env.THIENDO_UI_DEBUG_DIR){mkdirSync(process.env.THIENDO_UI_DEBUG_DIR,{recursive:true});await panel.screenshot({path:join(process.env.THIENDO_UI_DEBUG_DIR,`deep-reading-${width}.png`)});}
  await page.getByRole('button',{name:'Ẩn bài đọc 12 cung',exact:true}).click();assert.equal(await panel.count(),0);await page.getByRole('button',{name:'Đọc toàn lá số · 12 cung',exact:true}).click();await panel.getByRole('status').filter({hasText:'Năm âm lịch 2025'}).waitFor();
  assert.deepEqual(errors,[]);console.log(`PASS deep reading ${width}px: 12 palaces, 4 court roles, 4+4 Hoa, 3 layers, review empty-state, lazy mounting, local chart JSON export, year synchronization, natal invariance and no overflow/errors`);
 }finally{await browser.close();}
}
