const assert=require('node:assert/strict');
module.exports=async function({browser,origin,owner,member,password,pg,record,pageErrors}){
 const selected=process.env.THIENDO_A49_PROBE;
 if(!selected||selected==='profile'){
  await owner.context.request.patch(origin+'/api/auth/profile',{data:{displayName:'QA Alpha'}});
  await member.context.request.patch(origin+'/api/auth/profile',{data:{displayName:'QA Beta'}});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});assert.equal((await context.request.post(origin+'/api/auth/login',{data:{email:owner.email,password}})).status(),200);const p=await context.newPage();p.on('pageerror',e=>pageErrors.push(e.message));p.setDefaultTimeout(15000);
  let release,committed;const gate=new Promise(r=>release=r),saved=new Promise(r=>committed=r);let blockReads=false;
  try{
   await p.goto(origin,{waitUntil:'networkidle'});await p.getByRole('button',{name:'Mở tài khoản',exact:true}).click();const dialog=p.getByRole('dialog');await dialog.getByLabel('Tên hiển thị',{exact:true}).fill('QA Alpha Late');
   await p.route('**/api/auth/profile',async route=>{if(route.request().method()!=='PATCH')return route.continue();const response=await route.fetch();committed();await gate;await route.fulfill({response});});
   await p.route('**/api/auth/me',route=>blockReads?route.fulfill({status:503,json:{message:'Controlled profile read outage'}}):route.continue());
   await dialog.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await saved;
   assert.equal((await context.request.post(origin+'/api/auth/login',{data:{email:member.email,password}})).status(),200);
   const peer=await context.newPage();await peer.goto(origin,{waitUntil:'networkidle'});await peer.evaluate(()=>{const c=new BroadcastChannel('thiendo.auth-session.v1');c.postMessage({type:'signed-in'});c.close();});
   await dialog.getByText(member.email,{exact:true}).waitFor();await p.waitForFunction(()=>document.querySelector('#account-display-name')?.value==='QA Beta');
   blockReads=true;const response=p.waitForResponse(r=>r.url().endsWith('/api/auth/profile')&&r.request().method()==='PATCH');release();await response;await p.waitForTimeout(700);
   assert.equal(await dialog.getByLabel('Tên hiển thị',{exact:true}).inputValue(),'QA Beta','late save from account A must not overwrite account B UI');
   assert.equal((await pg.query('SELECT display_name FROM users WHERE id=$1',[member.user.id])).rows[0].display_name,'QA Beta');
   record({case:'late committed profile response after cross-tab account switch and /me outage cannot patch the new account',verdict:'PASS'});
  }finally{release();await context.close();await pg.query('UPDATE users SET display_name=$1 WHERE id=$2',[owner.user.displayName||null,owner.user.id]);await pg.query('UPDATE users SET display_name=$1 WHERE id=$2',[member.user.displayName||null,member.user.id]);}
 }
 if(!selected||selected==='draft'||selected==='paging'){
  const other=await browser.newContext();const registered=await other.request.post(origin+'/api/auth/register',{data:{email:'third-browser@example.invalid',username:'qa_third_browser',password}});assert.equal(registered.status(),201);const third=(await registered.json()).user;
  async function open(peerId){const r=await owner.context.request.post(origin+'/api/community/conversations/'+peerId,{data:{}});assert.equal(r.status(),201);return (await r.json()).id;}
  const first=await open(member.user.id),second=await open(third.id);
  const context=await browser.newContext({viewport:{width:1440,height:1000},storageState:await owner.context.storageState()}),p=await context.newPage();p.on('pageerror',e=>pageErrors.push(e.message));p.setDefaultTimeout(15000);
  try{
   if(selected==='paging'||!selected)for(let i=0;i<65;i++)await pg.query('INSERT INTO direct_messages(conversation_id,sender_id,client_id,body) VALUES($1,$2,$3,$4)',[first,member.user.id,require('node:crypto').randomUUID(),'QA history '+String(i).padStart(2,'0')]);
   await p.goto(origin+'/messages?conversation='+first,{waitUntil:'networkidle'});const input=p.getByRole('textbox',{name:'Tin nhắn',exact:true});await input.waitFor();
   if(!selected||selected==='draft'){
    await input.fill('Bản nháp riêng thứ nhất');const inbox=p.getByRole('complementary',{name:'Danh sách cuộc trò chuyện'});await inbox.getByRole('button').filter({has:p.locator('strong')}).filter({hasText:'qa_third_browser'}).click();await p.waitForFunction(id=>document.querySelector('.hub-chat-heading a')?.getAttribute('href')==='/forum/members/'+id,third.id);await input.waitFor();await input.fill('Bản nháp riêng thứ hai');await inbox.getByRole('button').filter({hasText:'qa_member'}).click();await p.waitForFunction(id=>document.querySelector('.hub-chat-heading a')?.getAttribute('href')==='/forum/members/'+id,member.user.id);await input.waitFor();assert.equal(await input.inputValue(),'Bản nháp riêng thứ nhất');await inbox.getByRole('button').filter({hasText:'qa_third_browser'}).click();await p.waitForFunction(id=>document.querySelector('.hub-chat-heading a')?.getAttribute('href')==='/forum/members/'+id,third.id);await input.waitFor();assert.equal(await input.inputValue(),'Bản nháp riêng thứ hai');await inbox.getByRole('button').filter({hasText:'qa_member'}).click();await p.waitForFunction(id=>document.querySelector('.hub-chat-heading a')?.getAttribute('href')==='/forum/members/'+id,member.user.id);await input.waitFor();
    record({case:'each conversation keeps its own unsent draft when switching peers within the inbox',verdict:'PASS'});
   }
   if(!selected||selected==='paging'){
    await p.getByRole('button',{name:'Tin nhắn cũ hơn',exact:true}).click();await p.getByText('QA history 00',{exact:true}).waitFor();assert.equal(await p.locator('.hub-messages li').count(),65);
    await input.fill('QA fresh message after history');await p.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();await p.getByLabel('Lịch sử tin nhắn',{exact:true}).getByText('QA fresh message after history',{exact:true}).waitFor();await p.getByRole('status').filter({hasText:'Đã gửi tin nhắn'}).waitFor();assert.equal(await p.locator('.hub-messages li').count(),66,'sending must keep previously loaded history');await p.getByText('QA history 00',{exact:true}).waitFor();
    record({case:'sending a real message retains all loaded older pages without duplicates or shrinking history',verdict:'PASS'});
   }
   if(!selected){
    const scenery=p.locator('[data-engraving=landscape]');assert.equal(await scenery.count(),1);assert.equal(await scenery.getAttribute('aria-hidden'),'true');assert.equal(await scenery.getAttribute('data-motion'),'false');assert.equal(await scenery.getAttribute('preserveAspectRatio'),'xMidYMax meet');assert.equal(await p.locator('.hub-letterhead svg').count(),1);assert.equal(await p.locator('.hub-message-field > [data-engraving=landscape]').count(),1);assert.equal(await scenery.evaluate(n=>getComputedStyle(n).pointerEvents),'none');
    const search=p.getByRole('searchbox',{name:'Tìm trong hội thoại đã tải',exact:true});await search.fill('third_browser');assert.equal(await p.locator('.hub-conversation').count(),1);await search.fill('not-existing-peer');await p.getByText('Không có hội thoại đã tải khớp tên này.',{exact:true}).waitFor();await search.fill('');assert.equal(await p.locator('.hub-conversation').count(),2);
    for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:900});for(const theme of ['light','dark']){await p.evaluate(t=>{localStorage.setItem('thiendo-theme',t);window.dispatchEvent(new StorageEvent('storage',{key:'thiendo-theme'}))},theme);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'chat overflow '+width+' '+theme);if(width===390&&process.env.THIENDO_BROWSER_REPORT_DIR)await p.screenshot({path:require('node:path').join(process.env.THIENDO_BROWSER_REPORT_DIR,'internal-chat-'+theme+'.png')});}}
    record({case:'polished private inbox searches only loaded conversations and populated chat fits four widths/light-dark without losing messages',verdict:'PASS'});
    record({case:'A53 production chat mounts vector brand mark and complete static mountain-river/Bagua scene inside message field without intercepting input',verdict:'PASS'});
    let firstAttempt=true;const ids=[];await p.route('**/api/community/conversations/'+first+'/messages',async route=>{if(route.request().method()!=='POST')return route.continue();ids.push(route.request().postDataJSON().clientId);const response=await route.fetch();if(firstAttempt){firstAttempt=false;await route.fulfill({status:503,json:{message:'Controlled lost send receipt'}});}else await route.fulfill({response});});
    await input.fill('QA uncertain delivery');await p.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();await p.getByRole('alert').filter({hasText:'Controlled lost send receipt'}).waitFor();
    const inbox=p.getByRole('complementary',{name:'Danh sách cuộc trò chuyện'});await inbox.getByRole('button').filter({hasText:'qa_third_browser'}).click();await p.waitForFunction(id=>document.querySelector('.hub-chat-heading a')?.getAttribute('href')==='/forum/members/'+id,third.id);await inbox.getByRole('button').filter({hasText:'qa_member'}).click();await p.waitForFunction(id=>document.querySelector('.hub-chat-heading a')?.getAttribute('href')==='/forum/members/'+id,member.user.id);
    assert.equal(await input.inputValue(),'QA uncertain delivery');await p.getByRole('button',{name:'Gửi tin nhắn',exact:true}).click();await p.getByRole('status').filter({hasText:'Đã gửi tin nhắn'}).waitFor();assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);assert.equal((await pg.query('SELECT count(*)::int AS n FROM direct_messages WHERE conversation_id=$1 AND body=$2',[first,'QA uncertain delivery'])).rows[0].n,1);assert.equal(await input.inputValue(),'');
    record({case:'lost committed send receipt retains its idempotency key across peer switches; retry creates exactly one database message',verdict:'PASS'});
   }
  }finally{await context.close();await other.close();await pg.query('DELETE FROM direct_conversations WHERE id=ANY($1::uuid[])',[[first,second]]);await pg.query('DELETE FROM users WHERE id=$1',[third.id]);}
 }
};
