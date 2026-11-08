const assert=require('node:assert/strict');
module.exports=async({browser,owner,origin,record})=>{
 const errors=[];
 for(const [width,height,touch] of [[320,568,true],[390,844,true],[430,932,true],[844,390,true],[768,1024,true],[1024,768,true],[1366,768,false],[1920,1080,false]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch&&width<900,deviceScaleFactor:touch?2:1,storageState:await owner.context.storageState()}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [configured,enabled] of [[false,true],[false,false],[true,true]]){ await page.route('**/api/auth/mfa/status',r=>r.fulfill({json:{configured,enabled,verified:false,stepUp:false,role:'owner',handle:'qa_owner'}}));
  await page.goto(origin+'/admin');await page.getByRole('heading',{name:'Xác thực quản trị',exact:true}).waitFor();
  const input=page.getByLabel('Mã Authenticator 6 chữ số',{exact:true});
  if(configured){await input.waitFor();if(touch)await input.tap();await input.fill('123456');assert.equal(await page.getByRole('button',{name:'Xác minh và vào Bàn điều hành',exact:true}).isEnabled(),true);}
  else{await page.getByRole('alert').filter({hasText:'Xác thực quản trị chưa sẵn sàng'}).waitFor();assert.equal(await input.count(),0);assert.equal(await page.getByRole('heading',{name:'Nhập mã Authenticator để vào Bàn điều hành',exact:true}).count(),0);if(enabled)assert.equal(await page.getByText('npm.cmd run admin:mfa:init',{exact:true}).count(),0);}
  if(configured){const button=page.getByRole('button',{name:'Xác minh và vào Bàn điều hành',exact:true});await button.scrollIntoViewIfNeeded();assert.equal(await button.isVisible(),true);await page.setViewportSize({width,height:Math.min(height,360)});await input.scrollIntoViewIfNeeded();assert.equal(await input.inputValue(),'123456');await page.setViewportSize({width,height});}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:`/tmp/admin-config-${width}-${configured}-${enabled}.png`});
  await page.unroute('**/api/auth/mfa/status');record({case:`admin MFA configured=${configured} enabled=${enabled} ${width}x${height} touch=${touch}`,verdict:'PASS'});
 }
 await context.close();}
 assert.deepEqual(errors,[]);
};
