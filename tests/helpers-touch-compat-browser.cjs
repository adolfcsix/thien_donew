'use strict';
const assert=require('node:assert/strict');
module.exports=async function({browser,owner,member,delivered,origin,record,pageErrors}){
 const options={viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3};
 const guest=await browser.newContext(options),signed=await browser.newContext({...options,storageState:await member.context.storageState()});
 for(const context of [guest,signed])await context.addInitScript(()=>{Object.defineProperty(Crypto.prototype,'randomUUID',{value:undefined,configurable:true});Object.defineProperty(Crypto.prototype,'subtle',{value:undefined,configurable:true});const viewport=Object.assign(new EventTarget(),{height:844,width:390,offsetTop:0,offsetLeft:0,pageTop:0,pageLeft:0,scale:1});Object.defineProperty(window,'visualViewport',{value:viewport,configurable:true});});
 const page=await guest.newPage(),chat=await signed.newPage();
 let guestClosed=false;
 const guestErrors=[],inboxErrors=[];
 for(const [scope,p,errors] of [['guest-chart',page,guestErrors],['signed-inbox',chat,inboxErrors]]){
  p.on('pageerror',e=>{
   errors.push(e.message);pageErrors.push(e.message);
   const pathname=new URL(p.url()).pathname;
   console.error('TOUCH_PAGEERROR '+JSON.stringify({scope,pathname,message:e.message.slice(0,500)}));
  });
  p.on('requestfailed',request=>{
   const path=new URL(request.url()).pathname;
   if(['/api/analytics/page-view','/api/community/premium-sections','/api/community/conversations'].includes(path))
    console.error('TOUCH_FAILED_REQUEST '+JSON.stringify({scope,path,method:request.method(),failure:String(request.failure()||'unknown').slice(0,160)}));
  });
  p.setDefaultTimeout(15000);
 }
 try{
  await page.goto(origin+'/login?mode=register',{waitUntil:'networkidle'});const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await page.evaluate(()=>typeof crypto.randomUUID),'undefined');
  await page.evaluate(()=>{visualViewport.height=360;visualViewport.offsetTop=44;visualViewport.dispatchEvent(new Event('resize'));visualViewport.dispatchEvent(new Event('scroll'));});
  await page.waitForFunction(()=>document.querySelector('.account-backdrop')?.style.getPropertyValue('--account-viewport-height')==='360px');
  const box=await dialog.boundingBox();assert.ok(box.y>=43&&box.y+box.height<=405,JSON.stringify(box));
  const submit=dialog.getByRole('button',{name:'Tạo tài khoản',exact:true});await submit.scrollIntoViewIfNeeded();const button=await submit.boundingBox();assert.ok(button.y>=44&&button.y+button.height<=405,JSON.stringify(button));
  record({case:'touch layout without randomUUID renders registration; simulated keyboard keeps modal and submit inside the visual viewport',verdict:'PASS'});
  await page.evaluate(()=>{visualViewport.height=844;visualViewport.offsetTop=0;visualViewport.dispatchEvent(new Event('resize'));});
  await dialog.getByRole('button',{name:/Đóng/}).first().tap();await dialog.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  record({case:'touch close restores document scroll after keyboard viewport changes',verdict:'PASS'});
  await page.goto(origin+'/login?mode=register',{waitUntil:'networkidle'});await page.getByLabel('Username riêng',{exact:true}).fill('touch_compat_qa');await page.getByLabel('Email',{exact:true}).fill('touch-compat@example.invalid');await page.getByLabel('Mật khẩu',{exact:true}).fill('TouchCompat!123456');await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('TouchCompat!123456');await dialog.getByRole('button',{name:'Tạo tài khoản',exact:true}).tap();await page.waitForURL('**/chart');assert.ok((await(await guest.request.get(origin+'/api/auth/me')).json()).user.id);record({case:'real touch registration creates a session and routes to chart without native UUID or SubtleCrypto',verdict:'PASS'});
  assert.equal((await guest.request.post(origin+'/api/auth/logout',{data:{}})).status(),200);await page.goto(origin+'/login',{waitUntil:'networkidle'});await page.getByLabel('Username hoặc email',{exact:true}).fill('touch_compat_qa');await page.getByLabel('Mật khẩu',{exact:true}).fill('TouchCompat!123456');await page.getByRole('dialog').getByRole('button',{name:'Đăng nhập',exact:true}).tap();await page.waitForURL('**/chart');assert.ok((await(await guest.request.get(origin+'/api/auth/me')).json()).user.id);
  await page.waitForLoadState('networkidle');
  assert.deepEqual(guestErrors,[],'Unexpected JavaScript error from the signed-in chart, before checking the separate inbox');
  record({case:'real touch username login restores session and routes to chart without secure-context-only APIs',verdict:'PASS'});
  // Do not leave the unrelated chart's periodic effects running while checking inbox.
  // This also prevents an unrelated pageerror from being misattributed to /messages.
  await guest.close();guestClosed=true;
  const send=await signed.request.post(origin+'/api/auth/email/send',{data:{}});assert.equal(send.status(),200);const receipt=await send.json();assert.equal((await signed.request.post(origin+'/api/auth/email/verify',{data:{challengeId:receipt.challengeId,code:delivered.get(member.email)}})).status(),200);
  const opened=await signed.request.post(origin+'/api/community/conversations/'+owner.user.id,{data:{}});assert.equal(opened.status(),201);const conversation=await opened.json();
  await chat.goto(origin+'/messages?conversation='+conversation.id,{waitUntil:'networkidle'});await chat.getByRole('textbox',{name:'Tin nhắn',exact:true}).fill('Touch client without native UUID');
  const sent=chat.waitForResponse(r=>r.url().endsWith('/messages')&&r.request().method()==='POST');await chat.getByRole('button',{name:'Gửi tin nhắn',exact:true}).tap();assert.equal((await sent).status(),201);await chat.getByRole('list',{name:'Lịch sử tin nhắn',exact:true}).getByText('Touch client without native UUID',{exact:true}).waitFor();
  record({case:'touch send generates a cryptographic fallback UUID and persists a real message through API and SQL',verdict:'PASS'});
  // The inbox refreshes in the background. Let those same-origin requests settle
  // before navigating away; WebKit can report a navigation-aborted fetch as a
  // cross-origin error even on 127.0.0.1. Keep the strict pageerror check.
  await chat.waitForLoadState('networkidle');
  assert.deepEqual(inboxErrors,[],'Unexpected browser error from the inbox while it is stable');
  await chat.goto(origin+'/study',{waitUntil:'networkidle'});
  assert.deepEqual(inboxErrors,[],'Unexpected browser error from the inbox during inbox-to-study navigation');const backup={format:'thien-do.study-export',version:1,entries:[{discipline:'general',title:'Touch backup retry',summary:'',notes:'Local fixture',tags:[],snapshot:{},pinned:false}]};await chat.locator('input[type=file]').setInputFiles({name:'touch-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});const restore=chat.getByRole('button',{name:'Khôi phục 1 hồ sơ',exact:true});await restore.waitFor();chat.on('dialog',d=>d.accept());const imported=chat.waitForResponse(r=>r.url().endsWith('/api/study/import')&&r.request().method()==='POST');await restore.tap();assert.equal((await imported).status(),201);const entries=(await(await signed.request.get(origin+'/api/study')).json()).entries;assert.ok(entries.some(e=>e.title==='Touch backup retry'));record({case:'backup restore uses portable SHA-256 and fallback UUID and commits through actual API/SQL',verdict:'PASS'});
 }finally{if(!guestClosed)await guest.close();await signed.close();}
};
