'use strict';
const assert=require('node:assert/strict');
module.exports=async function({owner,member,origin,pg,record,pageErrors}){
 const page=await owner.context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));page.setDefaultTimeout(15000);
 try{
  await page.goto(origin+'/admin/profile',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Hồ sơ quản trị',exact:true}).waitFor();
  for(const level of [18,16,10])await page.getByRole('button',{name:'Trưng bày huy hiệu cảnh '+level,exact:true}).click();
  const saved=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/console/profile'&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Lưu hồ sơ quản trị',exact:true}).click();assert.equal((await saved).status(),200);
  await page.reload({waitUntil:'networkidle'});for(const level of [18,16,10]){const b=page.getByRole('button',{name:'Trưng bày huy hiệu cảnh '+level,exact:true});await b.waitFor();assert.equal(await b.getAttribute('aria-pressed'),'true');}
  const identity=(await(await owner.context.request.get(origin+'/api/community/identity/'+owner.user.id)).json()).identity;assert.deepEqual(identity.showcaseLevels,[18,16,10]);assert.equal(identity.role,'owner');assert.equal((await pg.query('SELECT count(*)::int AS n FROM tinh_van_awards WHERE user_id=$1',[owner.user.id])).rows[0].n,0);
  assert.equal((await member.context.request.patch(origin+'/api/admin/console/profile',{data:{badgeStyle:'gate',badgeTone:'gold',motto:'',showcaseLevels:[19]}})).status(),400);
  record({case:'Owner chooses any18-rank showcase designs, persists order/reload/public identity without inventing TinhVan or changing Owner role',verdict:'PASS'});
  await page.goto(origin+'/forum/members/'+owner.user.id,{waitUntil:'networkidle'});const display=page.getByLabel('Huy hiệu trưng bày của quản trị',{exact:true});await display.waitFor();assert.equal(await display.locator('svg[data-level]').count(),3);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  record({case:'public administrator profile renders decorative badges beside truthful role identity without overflow at four widths',verdict:'PASS'});
 }finally{await page.close();}
};
