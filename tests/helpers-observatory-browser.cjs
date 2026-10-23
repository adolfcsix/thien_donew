'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function({context,origin,record,pageErrors,out}){
 for(const [route,discipline] of [['western-astrology','astrology'],['tarot','tarot'],['numerology','numerology']]){
  for(const width of [320,390,768,1440,1920]) for(const theme of ['dark','light']){
   const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
   await page.setViewportSize({width,height:900});await page.addInitScript(v=>localStorage.setItem('thiendo-theme',v),theme);
   try{
    await page.goto(origin+'/'+route,{waitUntil:'networkidle'});
    const lab=page.locator('[data-observatory="'+discipline+'"]'),scene=lab.locator('[data-step]'),rotor=scene.locator('[class*="rotor"]');
    await lab.scrollIntoViewIfNeeded();await scene.scrollIntoViewIfNeeded();
    await page.waitForFunction(d=>document.querySelector('[data-observatory="'+d+'"] [data-paused]')?.dataset.paused==='false',discipline);
    assert.equal(await rotor.evaluate(n=>getComputedStyle(n).animationPlayState),'paused');
    const steps=lab.getByRole('group',{name:'Chọn lớp học biểu tượng'}).getByRole('button');
    for(let i=0;i<4;i++){
     await steps.nth(i).focus();await page.keyboard.press('Enter');assert.equal(await scene.getAttribute('data-step'),String(i));
     assert.equal(await steps.nth(i).getAttribute('aria-pressed'),'true');
     assert.ok((await lab.locator('article').innerText()).includes('Thực hành'));
    }
    const split=lab.getByRole('button',{name:'Tách các lớp',exact:true});await split.click();assert.equal(await scene.getAttribute('data-separated'),'false');
    const range=lab.getByRole('slider');await range.focus();await page.keyboard.press('ArrowRight');assert.equal(await range.inputValue(),'5');
    await lab.getByRole('button',{name:'Tự xoay mô hình',exact:true}).click();await scene.scrollIntoViewIfNeeded();
    assert.equal(await rotor.evaluate(n=>getComputedStyle(n).animationPlayState),'running');
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await rotor.evaluate(n=>getComputedStyle(n).animationName),'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>document.documentElement.dataset.thiendoEffects='reduced');assert.equal(await rotor.evaluate(n=>getComputedStyle(n).animationName),'none');
    await page.evaluate(()=>delete document.documentElement.dataset.thiendoEffects);
    await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
    await page.waitForFunction(d=>document.querySelector('[data-observatory="'+d+'"] [data-paused]')?.dataset.paused==='true',discipline);
    assert.equal(await rotor.evaluate(n=>getComputedStyle(n).animationPlayState),'paused');
    await lab.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).click();assert.equal(await range.inputValue(),'0');assert.equal(await scene.getAttribute('data-running'),'false');
    assert.equal(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)>innerWidth+2),false);
    if(out && [390,1440].includes(width)){await steps.nth(2).click();await page.waitForTimeout(800);await lab.screenshot({path:path.join(out,discipline+'-'+width+'-'+theme+'.png')});}
    record({case:'3D lessons, keyboard angle/layers, reset, reduced motion, offscreen pause and responsive layout',route,width,theme,verdict:'PASS'});
   }finally{await page.close();}
  }
 }
};
