/** Built Next/Chromium, local chart engine. Only anonymous auth response is mocked. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import E from '../packages/astrology-engine/src/tuvi.js';
import M from '../packages/knowledge/src/star-system-matrix.cjs';
const origin=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const {chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright');
async function exported(page,panel){const event=page.waitForEvent('download');await panel.getByRole('button',{name:'↓ Xuất ma trận JSON',exact:true}).click();const stream=await(await event).createReadStream();let raw='';for await(const chunk of stream)raw+=chunk.toString();return JSON.parse(raw);}
for(const width of [390,1440]){
 const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
 try{
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/api/auth/me',r=>r.fulfill({json:{user:{id:'11111111-1111-4111-8111-111111111111',email:'tool-ui@example.invalid'}}}));
  await page.goto(origin+'/research/star-system');const panel=page.getByRole('region',{name:'Ma trận hệ thống sao Tử Vi',exact:true}),table=panel.getByRole('table',{name:'Ma trận tên sao và lớp dữ liệu',exact:true});await table.waitFor();assert.equal(await table.locator('tbody tr').count(),127);
  const layer=panel.getByRole('combobox',{name:'Lớp sao trong ma trận',exact:true}),search=panel.getByRole('searchbox',{name:'Tìm trong ma trận sao',exact:true});
  for(const [id,count] of [['main',14],['support',54],['cycle',36],['annual',12],['special',11]]){await layer.selectOption(id);await panel.getByRole('status').filter({hasText:`Ma trận: ${count} /`}).waitFor();assert.equal(await table.locator('tbody tr').count(),count);}
  await layer.selectOption('cycle');await search.fill('truong sinh');await panel.getByRole('status').filter({hasText:'Ma trận: 1 /'}).waitFor();assert.ok((await table.innerText()).includes('Tràng Sinh'));assert.ok((await table.innerText()).includes('liên kết thuật ngữ'));
  await search.fill('unknown-star-xyz');await panel.getByText('Không có định danh phù hợp. Thử từ khóa hoặc lớp sao khác.',{exact:true}).waitFor();assert.equal(await panel.getByRole('table').count(),0);
  await search.fill('');await layer.selectOption('all');await panel.getByRole('status').filter({hasText:'Ma trận: 127 /'}).waitFor();const catalog=await exported(page,panel);assert.equal(catalog.counts.natalAndCycle,104);assert.equal(catalog.counts.annual,12);assert.equal(catalog.resolutions.length,15);assert.ok(catalog.rows.every(r=>r.placements.length===0));
  await panel.getByText('Tiến độ phân xử 11 tên thiếu và 4 dị danh',{exact:true}).click();await panel.getByRole('combobox',{name:'Nhóm hồ sơ phân xử',exact:true}).selectOption('alias');assert.equal(await panel.locator('article').count(),4);await panel.getByRole('heading',{name:'Trường Sinh → đối chiếu Tràng Sinh',exact:true}).waitFor();
  const study=page.getByRole('region',{name:'Bảng ứng viên sao theo can năm sinh',exact:true});await study.getByRole('combobox',{name:'Can năm sinh để đối chiếu',exact:true}).selectOption('3');await study.getByRole('status').filter({hasText:'Can Đinh'}).waitFor();const candidate=study.getByRole('table');assert.equal(await candidate.locator('tbody tr').count(),3);assert.deepEqual(await candidate.locator('tbody tr').locator('td:first-of-type').allTextContents(),['Mùi','Dần','Dậu']);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);console.log(`PASS star matrix catalog ${width}px: 127 layer IDs, 14/54/36/12/11 filters, qualified term, empty result, 15 decisions and export`);
  await page.goto(origin+'/chart');await page.getByLabel('Tên lá số',{exact:true}).fill('QA Chart');await page.getByRole('button',{name:/Tính lá số/}).click();await page.getByText('Ma trận chính / phụ / lưu tinh theo lá số',{exact:true}).waitFor();await page.getByText('Ma trận chính / phụ / lưu tinh theo lá số',{exact:true}).click();
  const live=page.getByRole('region',{name:'Ma trận hệ thống sao Tử Vi',exact:true});await live.getByRole('table').waitFor();
  const expert=page.getByRole('group',{name:'Chế độ hiển thị',exact:true}).getByRole('button',{name:'Chuyên sâu',exact:true});if(await expert.count())await expert.click();
  const c=E.calculate({date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'});
  const year=page.getByRole('combobox',{name:'Năm âm lịch cần xem',exact:true});let first;
  for(const value of ['2025','2026']){await year.selectOption(value);await live.getByText(new RegExp(`lưu niên ${value}`)).waitFor();const output=await exported(page,live);assert.equal(output.annualYear,Number(value));assert.deepEqual(output.rows,M.buildChartMatrix(c,E.annualOverview(c,Number(value))).rows);assert.ok(output.rows.filter(r=>r.layer==='obstruction').every(r=>r.placements.length===2));if(first){const natal=m=>m.rows.filter(r=>['natal','cycle','obstruction','natal-transformation'].includes(r.layer));assert.deepEqual(natal(first),natal(output));}first=output;}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);console.log(`PASS live star matrix ${width}px: local chart, computed placements, paired markers, year synchronization and immutable natal layer`);
 }finally{await browser.close();}
}
