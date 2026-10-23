'use strict';
const assert=require('node:assert/strict');
module.exports=async function({context,origin,record,pageErrors,out}){
 for(const width of (process.env.THIENDO_TAB_BAZI_ONLY?[]:[320,390,768,1440]))for(const theme of ['dark','light']){
  const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));await page.setViewportSize({width,height:900});await page.addInitScript(v=>localStorage.setItem('thiendo-theme',v),theme);
  let requests=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/calculations/western/catalog')requests++;});
  async function fits(){assert.equal(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)>innerWidth+2),false);}
  async function ready(library){await library.locator('[aria-busy=false] article').waitFor();}
  try{
   await page.goto(origin+'/western-astrology',{waitUntil:'networkidle'});
   const library=page.getByRole('region',{name:'Thư viện tri thức phương Tây',exact:true}).first();await ready(library);
   const tabs=library.getByRole('tablist',{name:'Nhóm tri thức Natal'}),item=library.getByRole('combobox',{name:'Mục tri thức Natal'});
   await item.selectOption('9');await ready(library);const initial=requests;
   await tabs.getByRole('tab').first().focus();await page.keyboard.press('ArrowRight');assert.equal(requests,initial);
   await page.keyboard.press('Enter');await ready(library);assert.equal(await item.locator('option').count(),12);await item.selectOption('11');await ready(library);
   const loaded=requests;await tabs.getByRole('tab').first().click();assert.equal(await item.inputValue(),'9');await ready(library);assert.equal(requests,loaded);
   await tabs.getByRole('tab').nth(1).click();assert.equal(await item.inputValue(),'11');await ready(library);assert.equal(requests,loaded);
   await tabs.getByRole('tab').nth(1).focus();await page.keyboard.press('End');await page.keyboard.press('Enter');await ready(library);assert.equal(await item.locator('option').count(),5);
   assert.equal(await library.getByRole('tabpanel').count(),1);await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await library.getByRole('tabpanel').evaluate(n=>getComputedStyle(n).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});await fits();
   if(out&&[390,1440].includes(width)){await library.scrollIntoViewIfNeeded();await page.screenshot({path:require('node:path').join(out,'catalog-'+width+'-'+theme+'.png')});}
   record({case:'Natal catalog keyboard activation, per-group selection, cached requests and reduced motion',width,theme,verdict:'PASS'});
   await page.goto(origin+'/western-symbols',{waitUntil:'networkidle'});
   for(const label of ['Truyền thống Tarot','Lớp biểu tượng']){
    const row=page.getByRole('tablist',{name:label}),buttons=row.getByRole('tab');await buttons.first().focus();await page.keyboard.press('End');await page.keyboard.press('Enter');assert.equal(await buttons.last().getAttribute('aria-selected'),'true');await page.keyboard.press('Home');await page.keyboard.press('Enter');assert.equal(await buttons.first().getAttribute('aria-selected'),'true');
   }
   assert.equal(await page.getByRole('tabpanel').count(),2);await fits();record({case:'Atlas independent tab sets, Home/End keyboard and responsive layout',width,theme,verdict:'PASS'});
  }finally{await page.close();}
 }
 if(!process.env.THIENDO_TAB_BAZI_ONLY){const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
 try{await page.goto(origin+'/ky-mon',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Nhập thông tin đã đối chiếu',exact:true}).click();const open=page.getByRole('button',{name:'Mở Chuyên sâu: Chi tiết từng cung và Chuyển Bàn thời gian',exact:true});if(await open.count())await open.click();const summary=page.locator('summary').filter({hasText:'Mã Tinh và Lục Nghi Kích Hình'});await summary.waitFor({state:'visible'});await summary.click();await page.getByText('Truy nguyên Mã Tinh giờ:',{exact:false}).waitFor();record({case:'Kỳ Môn advanced entry opens the previously hidden hour evidence',verdict:'PASS'});}finally{await page.close();}
 }
 const {spawn}=require('node:child_process'),path=require('node:path');
 const receipt=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[path.join(__dirname,'bazi-naoj-browser-smoke.mjs')],{env:{...process.env,NEXT_BASE_URL:origin,THIENDO_PLAYWRIGHT_MODULE:process.env.THIENDO_PLAYWRIGHT_MODULE.replace(/\/$/,'')+'/index.mjs'},stdio:['ignore','pipe','pipe']});
  const timer=setTimeout(()=>child.kill('SIGTERM'),180000);
  let output='';child.stdout.on('data',s=>output+=s);child.stderr.on('data',s=>output+=s);child.on('error',error=>{clearTimeout(timer);reject(error);});child.on('close',code=>{clearTimeout(timer);resolve({code,output});});
 });
 assert.equal(receipt.code,0,receipt.output);assert.equal((receipt.output.match(/PASS Bát Tự/g)||[]).length,3);
 record({case:'Bát Tự NAOJ 390/768/1440px UI with consistent captured account/profile reads',verdict:'PASS'});

};
