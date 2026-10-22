const assert=require('node:assert/strict');
module.exports=async({browser,origin,member,record,pageErrors})=>{
 for(const width of [390,1440]){
 const c=await browser.newContext({viewport:{width,height:900},storageState:await member.context.storageState()}),p=await c.newPage();p.on('pageerror',e=>pageErrors.push(e.message));
 await p.addInitScript(()=>{if(!localStorage.getItem('thiendo-theme'))localStorage.setItem('thiendo-theme','light')});
 await p.goto(origin+'/tarot',{waitUntil:'networkidle'});
 async function synced(theme){await p.waitForFunction(t=>document.documentElement.dataset.thiendoTheme===t&&document.querySelector('.site')?.classList.contains('light')===(t==='light'),theme);await p.waitForFunction(()=>!document.documentElement.hasAttribute('data-thiendo-theme-changing'));}
 await synced('light');
 await p.evaluate(()=>{window.__themeMismatch=[];function sample(){const site=document.querySelector('.site'),theme=document.documentElement.dataset.thiendoTheme;if(site?.dataset.themeReady==='true'&&theme&&site.classList.contains('light')!==(theme==='light'))window.__themeMismatch.push({theme,light:site.classList.contains('light')});requestAnimationFrame(sample);}requestAnimationFrame(sample);});
 for(const motion of ['no-preference','reduce']){await p.emulateMedia({reducedMotion:motion});for(let i=0;i<7;i++)await p.locator('.theme-button').click();await synced(motion==='reduce'?'light':'dark');}
 await p.evaluate(()=>{localStorage.setItem('thiendo-theme','dark');window.dispatchEvent(new StorageEvent('storage',{key:'thiendo-theme'}));});await synced('dark');
 await p.getByRole('button',{name:'Mở tài khoản',exact:true}).click();await p.getByRole('dialog').waitFor();assert.equal(await p.locator('.account-modal input').first().evaluate(n=>getComputedStyle(n).color),'rgb(255, 241, 242)');await p.evaluate(()=>{localStorage.setItem('thiendo-theme','light');window.dispatchEvent(new StorageEvent('storage',{key:'thiendo-theme'}));});await synced('light');assert.equal(await p.locator('#account-display-name').evaluate(n=>getComputedStyle(n).color),'rgb(62, 36, 59)');await p.keyboard.press('Escape');await p.evaluate(()=>{localStorage.setItem('thiendo-theme','dark');window.dispatchEvent(new StorageEvent('storage',{key:'thiendo-theme'}));});await synced('dark');
 assert.deepEqual(await p.evaluate(()=>window.__themeMismatch),[],'No rendered frame may mix html and site brightness');
 for(const route of ['/numerology','/western-astrology','/chart']){await p.goto(origin+route,{waitUntil:'networkidle'});await synced('dark');}
 await p.locator('.theme-button').click();await synced('light');assert.equal(await p.evaluate(()=>localStorage.getItem('thiendo-theme')),'light');
 record({case:'theme hydration, rapid commits, storage, modal, routes and reduced motion @'+width,verdict:'PASS'});await c.close();
 }
};
