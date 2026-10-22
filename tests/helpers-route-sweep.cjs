const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function({browser,origin,owner,member,password,root,out,record,pageErrors}){
 const app=path.join(root,'apps/web/src/app'),files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name==='page.tsx')files.push(p)}}walk(app);
 const routes=files.map(p=>({source:path.relative(root,p),route:'/'+path.relative(app,path.dirname(p)).split(path.sep).filter(p=>p&&!p.startsWith('(')).join('/')})).sort((a,b)=>a.route.localeCompare(b.route));
 const rows=[],skipped=routes.filter(x=>x.route.includes('['));
 const contexts={guest:await browser.newContext({viewport:{width:390,height:900}}),member:await browser.newContext({viewport:{width:1440,height:1000}}),owner:await browser.newContext({viewport:{width:1440,height:1000},storageState:await owner.context.storageState()})};
 assert.equal((await contexts.member.request.post(origin+'/api/auth/login',{data:{email:member.email,password}})).status(),200);
 const pages={};for(const [role,c]of Object.entries(contexts)){pages[role]=await c.newPage();pages[role].on('pageerror',e=>pageErrors.push(e.message));await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());}
 const {requiresToolLogin}=require(path.join(root,'apps/web/src/lib/tool-access.cjs'));
 try{for(const [i,item]of routes.filter(x=>!x.route.includes('[')).entries()){
  const role=item.route==='/admin'||item.route.startsWith('/admin/')?'owner':requiresToolLogin(item.route)||item.route==='/messages'?'member':'guest',p=pages[role];
  const errors=[],onError=e=>errors.push(e.message);p.on('pageerror',onError);
  let row={...item,role:role==='member'?'limited-admin':role,width:role==='guest'?390:1440};
  try{
   const response=await p.goto(origin+item.route,{waitUntil:'networkidle',timeout:30000});const theme=p.locator('.theme-button').first();if(i%2&&await theme.isVisible()&&await p.getByRole('dialog').count()===0)await theme.click();await p.waitForTimeout(180);
   const body=await p.locator('body').innerText();row={...row,status:response.status(),finalPath:new URL(p.url()).pathname,theme:await p.locator('.site').first().evaluate(n=>n.classList.contains('light')?'light':'dark'),overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),bodyCharacters:body.length,crashText:/Application error:|Internal Server Error|This page could not be found\./.test(body),pageErrors:errors};
  }catch(error){row.error=error.message;row.finalPath=new URL(p.url()).pathname;row.bodySnippet=(await p.locator('body').innerText().catch(()=>'' )).slice(0,2000);row.pageErrors=errors}finally{p.off('pageerror',onError);rows.push(row);console.log('SWEEP '+item.route+' '+(row.error||row.status));}
 }}finally{await Promise.all(Object.values(contexts).map(c=>c.close()));fs.writeFileSync(path.join(out,'route-sweep.json'),JSON.stringify({scope:'Static page smoke: navigation/render/overflow/uncaught errors only; guest mobile and authenticated desktop; rotating light/dark, not every theme/viewport per route. Non-owner authenticated sweep account is an overview-only administrator; ordinary-member rights are tested separately in account/system suites. Dynamic pages excluded from sweep and partially covered by business suites.',rows,skippedDynamicPages:skipped},null,2));}
 assert.deepEqual(rows.filter(r=>r.error||r.status!==200||r.overflow||r.crashText||r.pageErrors?.length),[]);record({case:rows.length+' authored static pages render without document overflow, application crash or uncaught page error; dynamic routes inventoried separately',verdict:'PASS'});
};
