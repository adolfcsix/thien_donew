const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async({browser,origin,owner,member,password,root,pg,record,pageErrors})=>{
 const setup=await owner.context.request.post(origin+'/api/auth/mfa/setup',{data:{password}});assert.equal(setup.status(),200);
 const {manualKey}=await setup.json(),{totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));
 assert.equal((await owner.context.request.post(origin+'/api/auth/mfa/confirm',{data:{code:totpCode(manualKey,Math.floor(Date.now()/30000))}})).status(),200);
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},storageState:await owner.context.storageState()});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>pageErrors.push(e.message));
  let fail=true,posts=0;
  await page.route('**/api/tinh-canh/admin/specialty-badges',async route=>{
   const method=route.request().method();if(method==='POST')posts++;
   if(method==='GET'&&fail)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic readback unavailable'})});
   return route.continue();
  });
  try{
   await page.goto(origin+'/admin/tinh-canh',{waitUntil:'networkidle'});
   const section=page.getByRole('region',{name:'Danh hiệu chuyên môn đặc biệt',exact:true});
   await section.getByRole('alert').waitFor();assert.equal(await section.getByRole('button',{name:'Trao huy hiệu chuyên môn'}).isDisabled(),true);
   fail=false;await section.getByRole('button',{name:'Tải lại danh hiệu'}).click();await section.getByRole('alert').waitFor({state:'detached'});
   await section.getByLabel('UUID thành viên',{exact:true}).fill(member.user.id);
   await section.getByRole('combobox',{name:/Chọn danh hiệu/}).selectOption({index:width===1440?0:1});
   const reason='Synthetic browser grant evidence '+width;
   await section.getByLabel('Lý do công nhận (12–600 ký tự)',{exact:true}).fill(reason);
   fail=true;page.once('dialog',d=>d.accept());await section.getByRole('button',{name:'Trao huy hiệu chuyên môn'}).click();
   await section.getByRole('status').filter({hasText:'Đã cấp danh hiệu chuyên môn'}).waitFor();await section.getByRole('alert').waitFor();
   assert.equal(posts,1);assert.equal(await section.getByLabel('Lý do công nhận (12–600 ký tự)',{exact:true}).inputValue(),'');
   fail=false;await section.getByRole('button',{name:'Tải lại danh hiệu'}).click();await section.getByRole('alert').waitFor({state:'detached'});
   await section.locator('article').filter({hasText:reason}).waitFor();assert.equal(await section.locator('article').filter({hasText:reason}).count(),1);assert.equal(posts,1);
   record({case:'A64 specialty load retry and acknowledged grant survives readback failure',width});
   const badge=section.locator('[data-badge-id]').first();await badge.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[aria-label="Danh hiệu chuyên môn đặc biệt"] [data-badge-id]')?.dataset.paused==='false');
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await badge.locator('span').first().evaluate(n=>getComputedStyle(n).animationName),'none');
   await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForFunction(()=>document.querySelector('[aria-label="Danh hiệu chuyên môn đặc biệt"] [data-badge-id]')?.dataset.paused==='true');
   record({case:'A64 specialty motion respects viewport and reduced motion',width});
  }finally{await context.close();}
 }
};
