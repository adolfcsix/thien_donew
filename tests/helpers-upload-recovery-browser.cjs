const assert=require('node:assert/strict');
module.exports=async({browser,origin,owner,member,pg,record,pageErrors})=>{
 await pg.query('UPDATE users SET email_verified_at=clock_timestamp() WHERE id=$1',[member.user.id]);
 await pg.query("INSERT INTO expert_credentials(user_id,specialty,granted_by,reason)VALUES($1,'QA permission recovery',$2,'Isolated fixture') ON CONFLICT(user_id) DO UPDATE SET revoked_at=NULL",[member.user.id,owner.user.id]);
 const draft={slug:'http-recovery-book',title:'HTTP recovery book',author:'QA',subject:'tu-vi',publisher:'',publishedYear:null,synopsis:'Synthetic QA only',tags:[],accessLevel:'free',status:'draft',featured:false,licenseName:'QA',licenseProof:'Synthetic fixture'};
 const created=await member.context.request.post(origin+'/api/books/expert',{data:draft});assert.equal(created.status(),201);const id=(await created.json()).id;
 const bytes=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'),failures=[];
 for(const width of [1440,390])for(const mode of ['html-forbidden','permission-forbidden','list-recovery']){
 const c=await browser.newContext({viewport:{width,height:900},storageState:await member.context.storageState()}),p=await c.newPage();p.setDefaultTimeout(7000);p.on('pageerror',e=>pageErrors.push(e.message));let calls=0;
 try{
  if(mode==='list-recovery')await p.route('**/api/books/expert/mine',route=>++calls===1?route.fulfill({status:403,contentType:'text/html',body:'<html>Proxy denied</html>'}):route.continue());
  await p.goto(origin+'/books/contribute',{waitUntil:'networkidle'});
  if(mode==='list-recovery'){
   await p.getByRole('alert').filter({hasText:'HTTP 403'}).waitFor();
   await p.getByRole('button',{name:'Kiểm tra danh sách sách',exact:true}).click();
   await p.getByRole('status').filter({hasText:'Đã kiểm tra danh sách sách'}).waitFor();
   assert.deepEqual((await p.getByRole('alert').allTextContents()).filter(text=>text.trim()),[]);assert.equal(await p.getByRole('button',{name:'Tạo sách mới',exact:true}).isEnabled(),true);
   await p.getByRole('button',{name:/HTTP recovery book ·/}).click();assert.equal(await p.getByLabel('Tên sách',{exact:true}).isEnabled(),true);
  }else{
   await p.getByRole('button',{name:/HTTP recovery book ·/}).click();
   await p.getByLabel('Tệp riêng tư',{exact:true}).setInputFiles({name:'qa.pdf',mimeType:'application/pdf',buffer:bytes});
   await p.route('**/api/books/expert/'+id+'/assets/book/pdf',async route=>{
    calls++;if(calls===1&&mode==='html-forbidden')return route.fulfill({status:403,contentType:'text/html',body:'<html>Proxy denied</html>'});
    return route.continue();
   });
   if(mode==='permission-forbidden')await pg.query('UPDATE expert_credentials SET revoked_at=clock_timestamp() WHERE user_id=$1',[member.user.id]);
   const before=(await pg.query('SELECT count(*)::int n FROM library_assets WHERE book_id=$1',[id])).rows[0].n;
   await p.getByRole('button',{name:'Tải tệp lên',exact:true}).click();
   await p.getByRole('alert').filter({hasText:mode==='html-forbidden'?'HTTP 403':'Cần huy hiệu Chuyên gia'}).waitFor();
   assert.equal(calls,1,'forbidden upload must not auto retry');assert.equal(await p.getByLabel('Tệp riêng tư',{exact:true}).evaluate(n=>n.files.length),1);
   assert.equal((await pg.query('SELECT count(*)::int n FROM library_assets WHERE book_id=$1',[id])).rows[0].n,before,'denial must not write an asset');
   await pg.query('UPDATE expert_credentials SET revoked_at=NULL WHERE user_id=$1',[member.user.id]);
   await p.getByRole('button',{name:'Tải tệp lên',exact:true}).click();await p.getByRole('status').filter({hasText:'Đã tải tệp lên kho riêng tư'}).waitFor();
   assert.equal(calls,2);assert.equal(await p.getByLabel('Tệp riêng tư',{exact:true}).inputValue(),'');assert.equal((await pg.query("SELECT count(*)::int n FROM library_assets WHERE book_id=$1 AND kind='book'",[id])).rows[0].n,1);
  }
  record({case:mode+' preserves permissions, file and explicit recovery @'+width,verdict:'PASS'});
 }catch(e){failures.push(mode+' @'+width+': '+e.message);console.log('NEGATIVE '+failures.at(-1));}finally{await pg.query('UPDATE expert_credentials SET revoked_at=NULL WHERE user_id=$1',[member.user.id]);await c.close();}
 }
 assert.deepEqual(failures,[]);assert.deepEqual(pageErrors,[]);
};
