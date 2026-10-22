/** Built Next + Chromium recovery UI checks; auth and storage responses are mocked.
 * Every viewport starts a new browser, including single-process runtimes.
 */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {localTestOrigin} from '../infrastructure/scripts/e2e-http.mjs';
const origin=localTestOrigin(process.env.NEXT_BASE_URL||'http://127.0.0.1:3000');
const {chromium}=await import(process.env.THIENDO_PLAYWRIGHT_MODULE?pathToFileURL(process.env.THIENDO_PLAYWRIGHT_MODULE).href:'playwright');
const userId='11111111-1111-4111-8111-111111111111',entryId='22222222-2222-4222-8222-222222222222';
for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 const browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),...(process.env.THIENDO_CHROMIUM_ARGS_JSON?{args:JSON.parse(process.env.THIENDO_CHROMIUM_ARGS_JSON)}:{})});
 try{
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
  page.on('console',message=>{if(message.type()==='error')console.error('BROWSER_CONSOLE',message.text());});
  page.on('pageerror',error=>{errors.push(error.message);console.error('PAGEERROR',error.stack);});page.on('dialog',dialog=>dialog.accept());
  let mode='malformed-list',written=false,pendingPost,seenPost;
  const imports=[];
  await context.route('**/api/auth/me',route=>route.fulfill({json:{user:{id:userId,email:'ui@example.invalid'}}}));
  await context.route('**/api/study/import/**',route=>route.fulfill({json:{importId:entryId,imported:1,committed:true}}));
  await context.route('**/api/study/import',route=>{
   const body=route.request().postDataJSON();imports.push(body.importId);
   return mode==='receipt-success'?route.fulfill({json:{importId:body.importId,imported:1,replayed:true}}):route.fulfill({status:503,json:{message:'temporary outage'}});
  });
  await context.route('**/api/study',route=>{
   if(route.request().method()==='POST'){
    if(mode==='lost-refresh'){pendingPost=route;seenPost();return;}
    return route.fulfill({json:{message:'unconfirmed'}});
   }
   if(mode==='malformed-list')return route.fulfill({json:{entries:[{}]}});
   if(mode==='lost-refresh'&&written)return route.fulfill({status:503,json:{message:'refresh offline'}});
   return route.fulfill({json:{entries:[]}});
  });
  await page.goto(origin+'/study');
  await page.getByRole('status').filter({hasText:'Phản hồi máy chủ không hợp lệ'}).waitFor();
  assert.deepEqual(errors,[]);console.log(`PASS malformed list ${viewport.width}: feedback without rendering crash`);
  mode='lost-refresh';await page.reload();
  const title=page.getByLabel('Tiêu đề (tối đa 100 ký tự)',{exact:true});await title.fill('Safe note');
  const observed=new Promise(resolve=>seenPost=resolve);
  await page.getByRole('button',{name:'Lưu ghi chú',exact:true}).click();await observed;
  assert.equal(await title.isDisabled(),true);written=true;await pendingPost.fulfill({json:{id:entryId}});
  await page.getByRole('status').filter({hasText:'Đã tạo ghi chú. Danh sách chưa đồng bộ.'}).waitFor();
  assert.equal(await title.inputValue(),'');assert.equal(await title.isDisabled(),false);
  console.log(`PASS confirmed save + refresh failure ${viewport.width}: pending inputs locked, honest synchronization feedback`);
  mode='malformed-save';written=false;await page.reload();await title.fill('Keep my draft');
  await page.getByRole('button',{name:'Lưu ghi chú',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Phản hồi máy chủ không hợp lệ'}).waitFor();
  assert.equal(await title.inputValue(),'Keep my draft');console.log(`PASS unconfirmed save ${viewport.width}: draft retained`);
  mode='receipt-unknown';await page.reload();
  await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'thien-do.study-export',version:1,entries:[{discipline:'general',title:'Backup note',summary:'',notes:'',tags:[],snapshot:{},pinned:false}]}))});
  const restore=page.getByRole('button',{name:'Khôi phục 1 hồ sơ',exact:true});await restore.click();
  await page.getByRole('status').filter({hasText:'Chưa xác nhận kết quả:'}).waitFor();assert.equal(await restore.isEnabled(),true);
  const pending=await page.evaluate(userId=>JSON.parse(sessionStorage.getItem('thien-do.study-import-retry.v1.'+userId)||'[]'),userId);assert.equal(pending.length,1);
  mode='receipt-success';await restore.click();
  await page.getByRole('status').filter({hasText:'Đã xác nhận lần nhập trước'}).waitFor();assert.equal(await restore.count(),0);
  assert.equal(imports.length,2);assert.equal(imports[0],imports[1]);
  assert.equal(await page.evaluate(userId=>sessionStorage.getItem('thien-do.study-import-retry.v1.'+userId),userId),null);
  assert.deepEqual(errors,[]);console.log(`PASS mismatched receipt + retry ${viewport.width}: pending ID retained, same ID retried, cleared only on matching confirmation`);
 }catch(error){console.error('UI diagnostic:',error.message);console.error((await browser.contexts()[0]?.pages()[0]?.locator('body').innerText())?.slice(0,5000));throw error;}finally{await browser.close();}
}
