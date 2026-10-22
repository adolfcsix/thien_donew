const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async ({browser, origin, owner, password, root, pg, record, pageErrors}) => {
  const setup = await owner.context.request.post(origin + '/api/auth/mfa/setup', {data: {password}});
  assert.equal(setup.status(), 200);
  const {manualKey} = await setup.json();
  const {totpCode} = require(path.join(root, 'apps/api/dist/modules/auth/totp.js'));
  assert.equal((await owner.context.request.post(origin + '/api/auth/mfa/confirm', {data: {code: totpCode(manualKey, Math.floor(Date.now()/30000))}})).status(), 200);
  const failures = [];
  let sequence = 0;
  async function create() {
    const n = ++sequence;
    const data = {slug: 'draft-recovery-' + n, title: 'Document QA ' + n, body: 'Original body ' + n, excerpt: '', subject: 'nhap-mon', tags: [], authorId: null};
    const r = await owner.context.request.post(origin + '/api/van-kho/admin/documents', {data});
    assert.equal(r.status(), 201, await r.text());
    return {...data, ...(await r.json())};
  }
  async function dirty(p) {
    return p.evaluate(() => {const e = new Event('beforeunload', {cancelable:true}); window.dispatchEvent(e); return e.defaultPrevented;});
  }
  for (const width of [1440, 390]) {
    for (const scenario of ['switch', 'reset', 'history', 'submit', 'readback', 'restore']) {
      const doc = await create(), other = await create();
      const c = await browser.newContext({viewport:{width,height:900}, storageState:await owner.context.storageState()});
      const p = await c.newPage(); p.setDefaultTimeout(10000); p.on('pageerror', e=>pageErrors.push(e.message));
      try {
        await p.goto(origin+'/admin/van-kho', {waitUntil:'networkidle'});
        const tile = title=>p.locator('article').filter({has:p.locator('strong', {hasText:title})});
        await tile(doc.title).getByRole('button',{name:'Xem trước / Sửa',exact:true}).click();
        const title = p.getByLabel('Tiêu đề',{exact:true}), body = p.getByLabel('Nội dung Markdown',{exact:true});
        await p.waitForFunction(value=>document.querySelector('input[maxlength="220"]')?.value===value,doc.title);
        await title.fill('Unsaved '+scenario+' '+width);
        if (scenario==='switch' || scenario==='reset') {
          await p.getByLabel('Chọn ảnh',{exact:true}).setInputFiles({name:'pending.png',mimeType:'image/png',buffer:Buffer.alloc(64)});
          let requests=0; p.on('request',r=>{if(r.url().endsWith('/'+other.id+'/preview'))requests++;});
          let dialogs=0; const cancel=d=>{dialogs++;return d.dismiss();}; p.on('dialog',cancel);
          const button=scenario==='switch'?tile(other.title).getByRole('button',{name:'Xem trước / Sửa',exact:true}):p.getByRole('button',{name:'Tạo mới',exact:true});
          await button.click();
          assert.equal(await title.inputValue(),'Unsaved '+scenario+' '+width);
          assert.equal(dialogs,1); assert.equal(requests,0);
          assert.equal(await p.getByLabel('Chọn ảnh',{exact:true}).evaluate(n=>n.files.length),1);
          assert.equal(await dirty(p),true);
          if(scenario==='reset') {
            await p.getByRole('button',{name:'Bỏ ảnh chưa tải',exact:true}).click();
            assert.equal(await title.inputValue(),'Unsaved '+scenario+' '+width);
            assert.equal(await p.getByLabel('Chọn ảnh',{exact:true}).evaluate(n=>n.files.length),0);
          }
          p.off('dialog',cancel); p.once('dialog',d=>d.accept()); await button.click();
          await p.waitForFunction(value=>document.querySelector('input[maxlength="220"]')?.value===value,scenario==='switch'?other.title:'');
          assert.equal(await dirty(p),false);
        } else if (scenario==='history') {
          await body.fill('Unsaved body');
          let gets=0;p.on('request',r=>{if(r.url().endsWith('/revisions/1'))gets++;});
          p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'Xem nội dung',exact:true}).click();
          assert.equal(await body.inputValue(),'Unsaved body');assert.equal(gets,0);
          p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Xem nội dung',exact:true}).click();
          await p.waitForFunction(value=>document.querySelector('textarea')?.value===value,doc.body);
          assert.equal(await title.inputValue(),'Unsaved '+scenario+' '+width);assert.equal(await dirty(p),true);
        } else if (scenario==='submit') {
          assert.equal(await tile(doc.title).getByRole('button',{name:'Gửi duyệt',exact:true}).isDisabled(),true);
          assert.equal((await pg.query('SELECT status FROM van_kho_documents WHERE id=$1',[doc.id])).rows[0].status,'draft');
          await p.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
          await p.getByRole('status').filter({hasText:'Cần duyệt lại'}).waitFor();
          assert.equal(await dirty(p),false);
          await tile('Unsaved '+scenario+' '+width).getByRole('button',{name:'Gửi duyệt',exact:true}).click();
          await p.getByRole('status').filter({hasText:'Đã cập nhật trạng thái'}).waitFor();
          const row=(await pg.query('SELECT status,revision,title FROM van_kho_documents WHERE id=$1',[doc.id])).rows[0];
          assert.equal(row.status,'pending');assert.equal(row.revision,2);assert.equal(row.title,'Unsaved '+scenario+' '+width);
        } else if (scenario==='readback') {
          const url='**/api/van-kho/admin/documents/'+doc.id+'/revisions';
          await p.route(url,r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA extras unavailable'})}));
          await p.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
          await p.getByRole('alert').filter({hasText:'QA extras unavailable'}).waitFor();
          assert.equal(await dirty(p),false);await p.getByRole('heading',{name:'Biên tập phiên bản 2',exact:true}).waitFor();
          await p.unroute(url);await title.fill('Next saved title '+width);
          await p.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
          await p.getByRole('status').filter({hasText:'Cần duyệt lại'}).waitFor();
          const row=(await pg.query('SELECT revision,title FROM van_kho_documents WHERE id=$1',[doc.id])).rows[0];assert.equal(row.revision,3);assert.equal(row.title,'Next saved title '+width);
        } else {
          p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'Khôi phục',exact:true}).click();
          assert.equal(await title.inputValue(),'Unsaved '+scenario+' '+width);
          assert.equal((await pg.query('SELECT revision FROM van_kho_documents WHERE id=$1',[doc.id])).rows[0].revision,1);
          const url='**/api/van-kho/admin/documents/'+doc.id+'/preview';
          await p.route(url,r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA preview unavailable'})}));
          p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Khôi phục',exact:true}).click();
          await p.getByRole('alert').filter({hasText:'QA preview unavailable'}).waitFor();
          assert.equal(await p.getByRole('button',{name:'Lưu bản nháp',exact:true}).isDisabled(),true);
          assert.equal((await pg.query('SELECT revision FROM van_kho_documents WHERE id=$1',[doc.id])).rows[0].revision,2);
          await p.unroute(url);p.once('dialog',d=>d.accept());await tile(doc.title).getByRole('button',{name:'Xem trước / Sửa',exact:true}).click();
          await p.getByRole('heading',{name:'Biên tập phiên bản 2',exact:true}).waitFor();assert.equal(await title.inputValue(),doc.title);
        }
        record({case:'document draft '+scenario+' @'+width,verdict:'PASS'});
      } catch(e) {failures.push({scenario,width,error:e.message});console.log('FAIL '+scenario+' @'+width+': '+e.message);}
      finally {await c.close();}
    }
  }
  await pg.query("UPDATE admin_memberships SET role='admin' WHERE user_id=$1",[owner.user.id]);
  await pg.query('INSERT INTO admin_permission_sets(user_id,capabilities) VALUES($1,$2)',[owner.user.id,JSON.stringify(['library.read'])]);
  for(const width of [1440,390]) {
    const c=await browser.newContext({viewport:{width,height:900},storageState:await owner.context.storageState()}),p=await c.newPage();
    p.setDefaultTimeout(10000);p.on('pageerror',e=>pageErrors.push(e.message));
    try {
      await p.goto(origin+'/admin/van-kho',{waitUntil:'networkidle'});
      await p.getByRole('button',{name:'Xem trước / Sửa',exact:true}).first().click();
      await p.getByRole('button',{name:'Xem nội dung',exact:true}).first().waitFor();
      let dialogs=0;p.on('dialog',d=>{dialogs++;return d.dismiss();});
      await p.getByRole('button',{name:'Xem nội dung',exact:true}).first().click();
      await p.getByRole('status').filter({hasText:'Đang xem nội dung lịch sử'}).waitFor();
      assert.equal(dialogs,0);assert.equal(await dirty(p),false);
      assert.equal(await p.getByRole('button',{name:'Lưu bản nháp',exact:true}).isDisabled(),true);
      const list=await (await c.request.get(origin+'/api/van-kho/admin/documents')).json();const doc=list.documents[0];
      const response=await c.request.patch(origin+'/api/van-kho/admin/documents/'+doc.id,{data:{slug:doc.slug,title:'Denied',body:'Denied',subject:'nhap-mon',tags:[],expectedRevision:doc.revision}});
      assert.equal(response.status(),403);
      record({case:'document readonly history and backend capability enforcement @'+width,verdict:'PASS'});
    }catch(e){failures.push({scenario:'readonly',width,error:e.message});}finally{await c.close();}
  }
  assert.deepEqual(pageErrors,[]); assert.deepEqual(failures,[]);
};
