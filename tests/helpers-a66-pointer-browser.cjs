const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
/** Synthetic pointer cancellation/hybrid-device changes, not native touch certification. */
module.exports=async({browser,origin,member,out,record,pageErrors})=>{
 const c=await browser.newContext({viewport:{width:1440,height:1000},storageState:await member.context.storageState()});
 const p=await c.newPage();p.on('pageerror',e=>pageErrors.push(e.message));
 await p.addInitScript(()=>{
  const original=window.matchMedia.bind(window),listeners=new Set();let fine=true;
  window.matchMedia=query=>query==='(hover: hover) and (pointer: fine)'?{
   get matches(){return fine},media:query,onchange:null,
   addEventListener:(type,fn)=>{if(type==='change')listeners.add(fn)},
   removeEventListener:(type,fn)=>{if(type==='change')listeners.delete(fn)}
  }:original(query);
  window.__a66Fine=value=>{fine=value;for(const fn of listeners)fn({matches:fine})};
  window.__a66PointerListeners=()=>listeners.size;
 });
 await p.goto(origin+'/chart',{waitUntil:'networkidle'});
 await p.getByLabel('Tên lá số',{exact:true}).fill('Synthetic pointer lifecycle');
 await p.getByRole('button',{name:/Tính lá số/}).click();await p.locator('.astrology-grid').waitFor();
 const scene=p.locator('.chart-scene');await scene.scrollIntoViewIfNeeded();
 await p.waitForFunction(()=>document.querySelector('.chart-scene')?.dataset.motion==='active');
 const results=await scene.evaluate(async n=>{
  const frame=()=>new Promise(requestAnimationFrame),state=()=>[n.style.getPropertyValue('--scene-light-x'),n.style.getPropertyValue('--scene-light-y')];
  const real=n.getBoundingClientRect.bind(n),r=real(),move=(pointerType='mouse',x=.25)=>n.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+r.width*x,clientY:r.top+r.height*.75,pointerType}));
  const clear=()=>n.dispatchEvent(new PointerEvent('pointerleave'));
  const values=[];let reads=0;n.getBoundingClientRect=()=>{reads++;return real()};
  for(let i=0;i<20;i++)move('mouse',i===19?.25:.6);await frame();await frame();
  values.push({case:'20 pointer moves coalesce into one geometry read',pass:reads===1,reads,position:state()});
  values.push({case:'latest mouse coordinates retain the same normalized light position',pass:Math.abs(parseFloat(state()[0])-25)<.1&&Math.abs(parseFloat(state()[1])-75)<.1});
  clear();move();n.dispatchEvent(new PointerEvent('pointercancel',{pointerType:'mouse'}));await frame();await frame();
  values.push({case:'pointer cancellation cancels a queued light frame',pass:state().every(v=>!v),position:state()});
  clear();move('touch');await frame();await frame();
  values.push({case:'touch on a hybrid desktop does not activate hover light',pass:state().every(v=>!v),position:state()});
  clear();move();await frame();window.__a66Fine(false);await frame();
  values.push({case:'changing to a coarse pointer clears existing light',pass:state().every(v=>!v),position:state()});
  window.__a66Fine(true);move();await frame();window.dispatchEvent(new Event('blur'));await frame();
  values.push({case:'window blur clears existing hover light',pass:state().every(v=>!v),position:state()});
  clear();move();n.dispatchEvent(new PointerEvent('pointerleave'));await frame();await frame();
  values.push({case:'same-frame pointer leave remains cancelled',pass:state().every(v=>!v)});
  n.getBoundingClientRect=real;return values;
 });
 fs.writeFileSync(path.join(out,'pointer-lifecycle.json'),JSON.stringify({scope:'Production chart; synthetic mouse/touch events and controlled media-query change, no native-device certification',results},null,2));
 for(const result of results){if(result.pass)record({...result,verdict:'PASS'});else console.log('BASELINE FAILURE '+result.case);}
 if(!process.env.THIENDO_A66_BASELINE){
  // ChartBoard also subscribes to this query. Assert no growth across toggles,
  // then zero after SPA unmount, rather than assuming Scene is the only user.
  const listenerCount=await p.evaluate(()=>window.__a66PointerListeners());assert.ok(listenerCount>0);
  for(let i=0;i<3;i++){
   const toggle=scene.getByRole('button',{name:/Hiệu ứng chiều sâu và ánh sáng/});await toggle.click();await p.waitForFunction(()=>document.querySelector('.chart-scene').dataset.motion==='paused');
   assert.deepEqual(await scene.evaluate(n=>[n.style.getPropertyValue('--scene-light-x'),n.style.getPropertyValue('--scene-light-y')]),['','']);
   await toggle.click();await p.waitForFunction(()=>document.querySelector('.chart-scene').dataset.motion==='active');assert.equal(await p.evaluate(()=>window.__a66PointerListeners()),listenerCount);
  }
  // SPA navigation is necessary here: reload would create a new listener registry.
  const group=p.getByTitle('Phương Tây & Biểu tượng',{exact:true});if(await group.getAttribute('aria-expanded')!=='true')await group.click();
  await p.locator('a[href="/tarot"]').first().click();await p.waitForURL('**/tarot');await p.waitForFunction(()=>!document.querySelector('.chart-scene')&&window.__a66PointerListeners()===0);
  record({case:'depth toggle does not accumulate pointer listeners; SPA unmount removes all pointer-query listeners',listenerCountBefore:listenerCount,listenerCountAfter:0,verdict:'PASS'});
 }
 await c.close();
 const themes=[];
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:'dark',storageState:await member.context.storageState()}),page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('thiendo-theme','dark');const read=Storage.prototype.getItem;
   window.__a66StorageBlocked=false;Storage.prototype.getItem=function(key){if(window.__a66StorageBlocked&&key==='thiendo-theme')throw new DOMException('Synthetic unavailable storage','SecurityError');return read.call(this,key)};
  });
  await page.goto(origin+'/tarot',{waitUntil:'networkidle'});await page.locator('.theme-button').click();await page.waitForFunction(()=>document.documentElement.dataset.thiendoTheme==='light');
  await page.evaluate(()=>{window.__a66StorageBlocked=true;document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(150);
  const retained=await page.evaluate(()=>document.documentElement.dataset.thiendoTheme==='light'&&document.querySelector('.site').classList.contains('light'));
  themes.push({case:'unavailable storage retains the explicit in-memory theme after tab reactivation',width,pass:retained});
  await page.evaluate(()=>{window.__a66StorageBlocked=false;localStorage.setItem('thiendo-theme','dark');window.dispatchEvent(new StorageEvent('storage',{key:'thiendo-theme'}));});await page.waitForFunction(()=>document.documentElement.dataset.thiendoTheme==='dark'&&!document.documentElement.hasAttribute('data-thiendo-theme-changing'));
  themes.push({case:'cross-tab preference synchronizes again when storage recovers',width,pass:true});await context.close();
 }
 fs.writeFileSync(path.join(out,'theme-storage-lifecycle.json'),JSON.stringify({results:themes},null,2));
 for(const result of themes){if(result.pass)record({...result,verdict:'PASS'});else console.log('BASELINE FAILURE '+result.case+' @'+result.width);}
 if(!process.env.THIENDO_A66_BASELINE)assert.deepEqual([...results,...themes].filter(x=>!x.pass),[]);
};
