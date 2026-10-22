/** V11.107: real browser + real disposable PostgreSQL. Never mocks /api. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {assertSafeE2ETarget} from '../infrastructure/scripts/e2e-guard.mjs';
import {localE2EFetch,localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
import {verifiedDatabaseIdentity} from '../infrastructure/scripts/check-e2e-database.mjs';
import {assertMatchedApiInstance} from '../infrastructure/scripts/e2e-db-policy.mjs';
import {cleanupDisposableTestAccounts} from '../infrastructure/scripts/e2e-account-cleanup.mjs';
const target=assertSafeE2ETarget();
const base=process.env.NEXT_BASE_URL||'http://127.0.0.1:3000';
localTestOrigin(base);
async function request(path,{method='GET',body,cookie}={}){
 const r=await localE2EFetch(base,path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}: {})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,json:await r.json(),cookie:(r.headers.get('set-cookie')||'').split(';')[0]};
}
const proof=await request('/api/health/e2e');
assert.equal(proof.status,200);assert.equal(proof.json.database,target.databaseName);
assertMatchedApiInstance(verifiedDatabaseIdentity,proof.json);
const playwrightModule=process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright';
const {chromium}=await import(playwrightModule);
const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{})});
const accounts=[];
async function assertRestoredControls(page,snapshot){
 const labels=snapshot.mode==='manual'
  ? [['Tiết khí đã xác nhận',snapshot.solarTermIndex],['Can Chi ngày đã xác nhận',snapshot.dayCycleIndex],['Can Chi giờ theo Ngũ Tý Độn',snapshot.hourBranchIndex]]
  : [['Ngày dương (Việt Nam, UTC+7)',snapshot.date],['Giờ địa phương (0–23)',snapshot.hour],['Phút',snapshot.minute],['Quy ước bắt đầu ngày Can Chi',snapshot.dayBoundary]];
 for(const [label,value] of labels)assert.equal(await page.getByLabel(label,{exact:true}).inputValue(),String(value),`Restored control: ${label}`);
 assert.equal(await page.getByLabel('Tính địa bàn, thời bàn và Tuần Không khi có giờ').isChecked(),snapshot.withHour);
 if(snapshot.mode==='auto')assert.equal(await page.getByLabel(/Tôi đã xác nhận quy ước đổi ngày/).isChecked(),snapshot.lateZiAcknowledged);
}
const earthBoardState=page=>page.getByRole('group',{name:'Địa bàn chín cung Lạc Thư có Tam Kỳ Lục Nghi',exact:true}).getByRole('button').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.accept());
  const account={email:`qimen-${randomUUID()}@example.invalid`,password:`TEST!${randomUUID()}`,registered:false,cookie:''};accounts.push(account);
  const registered=await context.request.post(base+'/api/auth/register',{data:{email:account.email,password:account.password}});
  assert.equal(registered.status(),201);account.registered=true;
  account.cookie=(registered.headers()['set-cookie']||'').split(';')[0];
  const snapshots=[
   {mode:'manual',withHour:true,solarTermIndex:3,dayCycleIndex:52,hourBranchIndex:5},
   {mode:'manual',withHour:false,solarTermIndex:12,dayCycleIndex:14,hourBranchIndex:0},
   {mode:'auto',withHour:true,date:'2026-10-12',hour:23,minute:15,dayBoundary:'late-zi',lateZiAcknowledged:true}
  ];
  for(const snapshot of snapshots){
   // Load actual form controls; do not build the initial board via restore URL.
   await page.goto(base+'/ky-mon');
   if(snapshot.mode==='manual'){
    await page.getByRole('button',{name:'Nhập thông tin đã đối chiếu'}).click();
    await page.getByLabel('Tiết khí đã xác nhận').selectOption(String(snapshot.solarTermIndex));
    await page.getByLabel('Can Chi ngày đã xác nhận').selectOption(String(snapshot.dayCycleIndex));
    await page.getByLabel('Can Chi giờ theo Ngũ Tý Độn').selectOption(String(snapshot.hourBranchIndex));
   }else{
    await page.getByLabel('Ngày dương (Việt Nam, UTC+7)').fill(snapshot.date);
    await page.getByLabel('Giờ địa phương (0–23)').selectOption(String(snapshot.hour));
    await page.getByLabel('Phút',{exact:true}).selectOption(String(snapshot.minute));
    await page.getByLabel('Quy ước bắt đầu ngày Can Chi').selectOption(snapshot.dayBoundary);
    await page.getByLabel(/Tôi đã xác nhận quy ước đổi ngày/).check();
   }
   await page.getByLabel('Tính địa bàn, thời bàn và Tuần Không khi có giờ').setChecked(snapshot.withHour);
   const expert=page.getByRole('button',{name:/Khám phá Chuyên sâu/});if(await expert.count())await expert.click();
   const summary=page.locator('summary').filter({hasText:'Mã Tinh và Lục Nghi Kích Hình'});
   if(snapshot.withHour){await summary.click();await page.getByText('Truy nguyên Mã Tinh giờ:',{exact:false}).waitFor();}
   else assert.equal(await summary.count(),0);
   await assertRestoredControls(page,snapshot);
   const earthBoard=await earthBoardState(page);assert.equal(earthBoard.length,9);
   const boardHeading=await page.getByRole('heading',{name:/^(Dương|Âm) độn · \d cục$/}).textContent();
   await page.getByRole('button',{name:'✧ Lưu hồ sơ nghiên cứu'}).click();
   await page.getByText('Đã lưu vào Thư phòng cá nhân.',{exact:true}).waitFor();
   const listing=await request('/api/study',{cookie:account.cookie});assert.equal(listing.status,200);
   const entry=listing.json.entries.find(e=>Object.entries(snapshot).every(([k,v])=>e.snapshot[k]===v));assert.ok(entry,'Missing persisted snapshot');
   await page.goto(base+'/study');
   const card=page.locator('article').filter({has:page.getByRole('heading',{name:entry.title,exact:true})}).first();
   await card.getByRole('link',{name:'↗ Mở lại tham số'}).click();
   await page.getByRole('heading',{name:/^(Dương|Âm) độn · \d cục$/}).waitFor();
   assert.equal(await page.getByRole('heading',{name:/^(Dương|Âm) độn · \d cục$/}).textContent(),boardHeading);
   await assertRestoredControls(page,snapshot);
   assert.deepEqual(await earthBoardState(page),earthBoard);
   await page.reload();await page.getByRole('heading',{name:/^(Dương|Âm) độn · \d cục$/}).waitFor();
   assert.equal(await page.getByRole('heading',{name:/^(Dương|Âm) độn · \d cục$/}).textContent(),boardHeading);
   await assertRestoredControls(page,snapshot);
   assert.deepEqual(await earthBoardState(page),earthBoard);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);assert.equal(overflow,false,'Horizontal document overflow');
   console.log(`PASS browser ${viewport.width}px: ${snapshot.mode}, withHour=${snapshot.withHour}`);
   assert.equal((await request('/api/study/'+entry.id,{method:'DELETE',cookie:account.cookie})).status,200);
  }
  assert.deepEqual(errors,[]);await context.close();
 }
}finally{
 try{await cleanupDisposableTestAccounts(request,accounts);}finally{await browser.close();}
}
console.log('PASS Kỳ Môn browser/real-PostgreSQL round trip; desktop + mobile viewports (not a physical phone test)');
