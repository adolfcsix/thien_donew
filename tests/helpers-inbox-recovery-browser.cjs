const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
module.exports=async({browser,origin,owner,pg,record,pageErrors})=>{
 const failures=[];
 const peers=[];
 for(let i=0;i<31;i++){const peer=randomUUID(),id=randomUUID();await pg.query("INSERT INTO users(id,email,password_hash,salt,display_name) VALUES($1,$2,'qa','qa',$3)",[peer,'inbox-'+peer+'@example.invalid','Page peer '+i]);await pg.query('INSERT INTO direct_conversations(id,first_user,second_user,initiated_by,updated_at) VALUES($1,$2,$3,$2,$4)',[id,...[owner.user.id,peer].sort(),'2026-01-'+String(31-i).padStart(2,'0')+'T00:00:00Z']);await pg.query('INSERT INTO direct_messages(conversation_id,sender_id,client_id,body) VALUES($1,$2,$3,$4)',[id,peer,randomUUID(),'Old preview '+i]);peers.push({peer,id});}
 // Keep exactly 31 conversations for this account in this isolated DB.
 await pg.query('DELETE FROM direct_conversations WHERE (first_user=$1 OR second_user=$1) AND NOT(id=ANY($2::uuid[]))',[owner.user.id,peers.map(x=>x.id)]);
 for(const width of [1440,390])for(const mode of (process.env.THIENDO_INBOX_CASE?[process.env.THIENDO_INBOX_CASE]:['preview','read','newer-page','read-only'])){
 const context=await browser.newContext({viewport:{width,height:900},storageState:await owner.context.storageState()}),p=await context.newPage();p.on('pageerror',e=>pageErrors.push(e.message));p.setDefaultTimeout(12000);let release=()=>{};
 try{
 const target=peers[mode==='read-only'?29:30];for(let i=0;i<31;i++)await pg.query('UPDATE direct_conversations SET updated_at=$2 WHERE id=$1',[peers[i].id,'2026-01-'+String(31-i).padStart(2,'0')+'T00:00:00Z']);await pg.query('DELETE FROM direct_read_receipts WHERE conversation_id=$1',[target.id]);
 await p.goto(origin+'/messages',{waitUntil:'networkidle'});assert.equal(await p.locator('.hub-conversation').count(),30);
 let ready;const gate=new Promise(r=>release=r),held=new Promise(r=>ready=r);
 await p.route('**/api/community/conversations?offset=30',async route=>{if(mode==='newer-page'){await pg.query('INSERT INTO direct_messages(conversation_id,sender_id,client_id,body) VALUES($1,$2,$3,$4)',[target.id,target.peer,randomUUID(),'Newer page '+width]);}const response=await route.fetch();ready();await gate;await route.fulfill({response});});
 if(mode==='read-only')await pg.query('UPDATE direct_conversations SET updated_at=clock_timestamp() WHERE id=$1',[peers[30].id]);
 await p.getByRole('button',{name:'Thêm cuộc trò chuyện',exact:true}).click();await held;
 if(mode==='read-only'){const button=p.locator('.hub-conversation').filter({hasText:'Page peer 29'});await button.click();await p.locator('.hub-messages li').last().waitFor();await p.waitForTimeout(8500);assert.equal(await button.locator('.hub-unread').count(),0);release();await p.waitForTimeout(300);assert.equal(await button.locator('.hub-unread').count(),0);record({case:'unchanged updatedAt read receipt beats stale page @'+width,verdict:'PASS'});continue;}
 if(mode!=='newer-page'){
 const body='Fresh preview '+width+' '+mode;await pg.query('INSERT INTO direct_messages(conversation_id,sender_id,client_id,body) VALUES($1,$2,$3,$4)',[target.id,target.peer,randomUUID(),body]);await pg.query('UPDATE direct_conversations SET updated_at=clock_timestamp() WHERE id=$1',[target.id]);
 await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.locator('.hub-conversation').filter({hasText:body}).waitFor();
 if(mode==='read'){await p.locator('.hub-conversation').filter({hasText:body}).click();await p.locator('.hub-messages li').last().waitFor();await p.waitForTimeout(8500);await p.waitForFunction(text=>{const b=[...document.querySelectorAll('.hub-conversation')].find(n=>n.textContent.includes(text));return b&&!b.querySelector('.hub-unread')},body);}
 release();await p.waitForTimeout(300);assert.equal(await p.locator('.hub-conversation').filter({hasText:body}).count(),1);
 if(mode==='read')assert.equal(await p.locator('.hub-conversation').filter({hasText:body}).locator('.hub-unread').count(),0);
 }else{release();await p.getByText('Newer page '+width,{exact:true}).waitFor();}
 assert.equal(await p.locator('.hub-conversation').count(),31);assert.equal(new Set(await p.locator('.hub-conversation strong').allTextContents()).size,31);
 record({case:'31 conversation held page '+mode+' @'+width,verdict:'PASS'});
 }catch(e){failures.push(mode+' @'+width+': '+e.message);console.log('NEGATIVE '+failures.at(-1));}finally{release();await context.close();}
 }
 assert.deepEqual(failures,[]);
};
