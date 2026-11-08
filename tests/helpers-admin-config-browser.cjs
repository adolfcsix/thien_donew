const assert=require('node:assert/strict');
module.exports=async({owner,origin,record})=>{
 const page=await owner.context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [390,1440])for(const [configured,enabled] of [[false,true],[false,false],[true,true]]){
  await page.setViewportSize({width,height:900});await page.route('**/api/auth/mfa/status',r=>r.fulfill({json:{configured,enabled,verified:false,stepUp:false,role:'owner',handle:'qa_owner'}}));
  await page.goto(origin+'/admin');await page.getByRole('heading',{name:'Xác thực quản trị',exact:true}).waitFor();
  const input=page.getByLabel('Mã Authenticator 6 chữ số',{exact:true});
  if(configured){await input.waitFor();await input.fill('123456');assert.equal(await page.getByRole('button',{name:'Xác minh và vào Bàn điều hành',exact:true}).isEnabled(),true);}
  else{await page.getByRole('alert').filter({hasText:'Xác thực quản trị chưa sẵn sàng'}).waitFor();assert.equal(await input.count(),0);assert.equal(await page.getByRole('heading',{name:'Nhập mã Authenticator để vào Bàn điều hành',exact:true}).count(),0);if(enabled)assert.equal(await page.getByText('npm.cmd run admin:mfa:init',{exact:true}).count(),0);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:`/tmp/admin-config-${width}-${configured}-${enabled}.png`});
  await page.unroute('**/api/auth/mfa/status');record({case:`admin MFA configured=${configured} enabled=${enabled} ${width}px`,verdict:'PASS'});
 }
 assert.deepEqual(errors,[]);await page.close();
};
