'use strict';
const assert=require('node:assert/strict');
module.exports=async function({owner,member,password,pg,origin,record,pageErrors,out}){
 const {totpCode}=require('../apps/api/dist/modules/auth/totp.js');
 const setup=await owner.context.request.post(origin+'/api/auth/mfa/setup',{data:{password}});assert.equal(setup.status(),200);const secret=await setup.json();
 const confirmed=await owner.context.request.post(origin+'/api/auth/mfa/confirm',{data:{code:totpCode(secret.manualKey,Math.floor(Date.now()/30000))}});assert.equal(confirmed.status(),200);
 assert.equal((await owner.context.request.get(origin+'/api/community/advanced-research')).status(),200);
 const denied=await member.context.request.get(origin+'/api/community/advanced-research');assert.equal(denied.status(),403);assert.equal((await denied.json()).chapters,undefined);
 record({case:'real protected API denies unpaid member; MFA admin reads without a purchased plan',verdict:'PASS'});
 // Exercise an Admin with the default capability set, rather than Owner-only UI.
 await pg.query("UPDATE admin_memberships SET role='admin' WHERE user_id=$1",[owner.user.id]);
 const admin=await owner.context.newPage(),reader=await member.context.newPage();for(const page of [admin,reader])page.on('pageerror',e=>pageErrors.push(e.message));
 try{
  await admin.goto(origin+'/admin?panel=orders',{waitUntil:'networkidle'});
  await admin.getByRole('button',{name:'Đơn & quyền',exact:true}).click();
  await admin.locator('form select').nth(0).selectOption(member.user.id);
  await admin.locator('form select').nth(1).selectOption('lifetime');assert.equal(await admin.getByLabel('Số ngày',{exact:true}).count(),0);
  await admin.getByLabel('Lý do hỗ trợ',{exact:true}).fill('Browser verified lifetime support decision');admin.on('dialog',d=>d.accept(d.type()==='prompt'?'Browser verified support withdrawal':undefined));
  const gift=admin.waitForResponse(r=>r.url().endsWith('/api/admin/console/pro/'+member.user.id+'/gift')&&r.request().method()==='POST');
  await admin.getByRole('button',{name:'Cấp quyền hỗ trợ',exact:true}).click();assert.equal((await gift).status(),201);
  await admin.getByRole('status').filter({hasText:'Đã lưu thay đổi'}).waitFor();
  const access=await(await member.context.request.get(origin+'/api/billing/access')).json();assert.equal(access.lifetime,true);assert.equal(access.expiresAt,null);
  record({case:'Admin grants lifetime Pro through the main orders/rights UI and actual API',verdict:'PASS'});
  await reader.goto(origin+'/membership',{waitUntil:'networkidle'});await reader.getByText(/Pro vĩnh viễn/).first().waitFor();
  await reader.goto(origin+'/research/advanced',{waitUntil:'networkidle'});await reader.getByRole('heading',{name:'Xưởng nghiên cứu chuyên sâu',exact:true}).waitFor();
  for(const width of [390,1440]){await admin.setViewportSize({width,height:1000});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'admin overflow '+width);}
  if(out)await admin.screenshot({path:require('node:path').join(out,'lifetime-pro-admin.png'),fullPage:true});
  const row=admin.getByRole('row').filter({hasText:member.email}).filter({hasText:'Vĩnh viễn'});await row.getByRole('button',{name:'Thu hồi quyền',exact:true}).click();
  await admin.getByRole('status').filter({hasText:'Đã lưu thay đổi'}).waitFor();assert.equal((await member.context.request.get(origin+'/api/community/advanced-research')).status(),403);
  await reader.reload({waitUntil:'networkidle'});await reader.getByRole('heading',{name:'Không gian nghiên cứu Pro',exact:true}).waitFor();
  record({case:'lifetime displays in member profile; Admin revocation closes protected API and refreshed page, preserving history',verdict:'PASS'});
  await reader.evaluate(()=>localStorage.setItem('thiendo-view-mode','basic'));
  for(const route of ['/western-astrology','/tarot','/numerology']){
   await reader.goto(origin+route,{waitUntil:'networkidle'});assert.equal(await reader.locator('[data-observatory]').count(),0);
   await reader.getByRole('button',{name:'Mở Chuyên sâu: Xưởng học biểu tượng 3D',exact:true}).click();
   await reader.locator('[data-step]').first().waitFor({state:'visible'});
   await reader.evaluate(()=>localStorage.setItem('thiendo-view-mode','basic'));
  }
  record({case:'three Western pages default to concise Basic and open deferred expert tools on demand',verdict:'PASS'});
 }catch(error){console.log('LIFETIME_UI_FAILURE',admin.url(),(await admin.locator('body').innerText()).slice(-4500));if(out)await admin.screenshot({path:require('node:path').join(out,'lifetime-ui-failure.png'),fullPage:true});throw error;}finally{await admin.close();await reader.close();}
};
