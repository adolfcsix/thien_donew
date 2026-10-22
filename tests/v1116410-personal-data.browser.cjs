/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v1116410-personal');
(async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.AUTH_OTP_SECRET=randomBytes(32).toString('hex');process.env.COOKIE_SECURE='false';
 const privateWork=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'thiendo-browser-files-')),assetRoot=path.join(privateWork,'private');fs.mkdirSync(path.join(assetRoot,'books'),{recursive:true});fs.mkdirSync(path.join(assetRoot,'van-kho-media'));process.env.BOOK_PRIVATE_STORAGE_DIR=path.join(assetRoot,'books');process.env.VAN_KHO_PRIVATE_MEDIA_DIR=path.join(assetRoot,'van-kho-media');
 const pg=await PGlite.create({dataDir:'memory://'});let api,web,app,browser;const results=[],pageErrors=[];fs.mkdirSync(out,{recursive:true});function record(result){results.push(result);console.log('PASS '+result.case+(result.route?' '+result.route+' @ '+result.width:''));}
 try{
  await pg.exec('CREATE ROLE thiendo_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO thiendo_app; CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,checksum CHAR(64),applied_at TIMESTAMPTZ DEFAULT NOW())');
  for(const name of fs.readdirSync(path.join(root,'infrastructure/db')).filter(x=>/^\d{3}_.*\.sql$/.test(x)).sort()){
   const sql=fs.readFileSync(path.join(root,'infrastructure/db',name),'utf8');await pg.transaction(async tx=>{await tx.exec(sql);await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,createHash('sha256').update(sql).digest('hex')]);});
  }
  const selectProbe=await pg.query('SELECT 1 AS value');console.log('PGlite SELECT semantics',{affectedRows:selectProbe.affectedRows,rows:selectProbe.rows.length});
  const query=async(c,sql,params)=>{try{const r=await c.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows||r.rows.length};}catch(error){console.error('SQL integration error',error.code,error.message);throw error;}};
  const db={query:(sql,p)=>query(pg,sql,p),transaction:work=>pg.transaction(tx=>work({query:(sql,p)=>query(tx,sql,p)}))};
  require('reflect-metadata');const {NestFactory}=require('@nestjs/core'),{Module}=require('@nestjs/common');
  const {AppModule}=require(path.join(root,'apps/api/dist/app.module.js')),{DatabaseService}=require(path.join(root,'apps/api/dist/common/database.service.js'));
  const delivered=new Map();require(path.join(root,'apps/api/dist/modules/auth/email-code.js')).sendVerificationCode=async(email,code)=>delivered.set(email,code);
  class BrowserSqlModule{};Module({controllers:Reflect.getMetadata('controllers',AppModule),providers:Reflect.getMetadata('providers',AppModule).map(p=>p===DatabaseService?{provide:DatabaseService,useValue:db}:p)})(BrowserSqlModule);
  api=await NestFactory.create(BrowserSqlModule,{logger:false});await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3611});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3611,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3611',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}


  const member=await register('personal-member@example.invalid'),other=await register('personal-other@example.invalid');
  const page=await member.context.newPage();page.setDefaultTimeout(12000);
  const phase=process.env.THIENDO_BROWSER_PHASE||'after';
  const responseFault=message=>({status:503,contentType:'application/json',body:JSON.stringify({message})});
  if(phase==='after'||phase==='before-profiles'){
    await page.goto(origin+'/birth-profiles',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Tạo hồ sơ',exact:true}).waitFor();await page.getByLabel('Tên hồ sơ',{exact:true}).fill('Hồ sơ QA một lần');
    let calls=0,pending=[],ready;const requested=new Promise(r=>ready=r);
    await page.route('**/api/birth-profiles',async route=>{if(route.request().method()!=='POST')return route.continue();calls++;pending.push({route,response:await route.fetch()});ready()});
    await page.getByRole('button',{name:'Tạo hồ sơ',exact:true}).evaluate(button=>{button.click();button.click()});await requested;await page.waitForTimeout(200);
    assert.equal(calls,1,'Synchronous profile double submit must create a single profile');
    for(const p of pending)await p.route.fulfill({response:p.response});await page.getByRole('heading',{name:'Hồ sơ QA một lần',exact:true}).waitFor();
    assert.equal((await pg.query('SELECT id FROM birth_profiles WHERE user_id=$1 AND name=$2',[member.user.id,'Hồ sơ QA một lần'])).rows.length,1);
    await page.unrouteAll({behavior:'ignoreErrors'});record({case:'profile synchronous double submit creates one real SQL record',verdict:'PASS'});
  }
  if(phase==='after'||phase==='before-study'){
    await page.goto(origin+'/study',{waitUntil:'networkidle'});const form=page.getByRole('region',{name:'Tạo ghi chú nghiên cứu',exact:true});
    await form.getByLabel('Tiêu đề (tối đa 100 ký tự)',{exact:true}).fill('Ghi chú QA một lần');await form.getByLabel('Nội dung (tối đa 3.000 ký tự)',{exact:true}).fill('Nội dung riêng tư kiểm thử.');
    let calls=0,pending=[],ready;const requested=new Promise(r=>ready=r);
    await page.route('**/api/study',async route=>{if(route.request().method()!=='POST')return route.continue();calls++;pending.push({route,response:await route.fetch()});ready()});
    await page.getByRole('button',{name:'Lưu ghi chú',exact:true}).evaluate(button=>{button.click();button.click()});await requested;await page.waitForTimeout(200);
    assert.equal(calls,1,'Synchronous study double submit must create a single note');for(const p of pending)await p.route.fulfill({response:p.response});
    await page.getByRole('heading',{name:'Ghi chú QA một lần',exact:true}).waitFor();assert.equal((await pg.query('SELECT id FROM study_entries WHERE user_id=$1 AND title=$2',[member.user.id,'Ghi chú QA một lần'])).rows.length,1);
    await page.unrouteAll({behavior:'ignoreErrors'});record({case:'study synchronous double submit creates one real SQL note',verdict:'PASS'});
  }
  if(phase==='after'||phase==='before-collection'){
    await page.route('**/api/charts',route=>route.fulfill(responseFault('Controlled collection list outage')));
    await page.goto(origin+'/collection',{waitUntil:'networkidle'});assert.equal(await page.getByText('Chưa có lá số. Vào phòng lập lá số để tạo và lưu.',{exact:true}).count(),0,'A failed list load must not claim an empty collection');
    await page.getByRole('alert').filter({hasText:'Controlled collection list outage'}).waitFor();await page.unrouteAll({behavior:'ignoreErrors'});
    await page.getByRole('button',{name:/Làm mới/}).click();await page.getByRole('link',{name:'Lập và lưu lá số ↗',exact:true}).waitFor();record({case:'collection list failure is distinct from a verified empty collection and retry succeeds',verdict:'PASS'});
  }

  if(phase==='after'||phase==='before-tool'){
    await page.goto(origin+'/numerology',{waitUntil:'networkidle'});await page.getByPlaceholder('Nhập tên hoặc bản chuyển tự muốn nghiên cứu').fill('QA data');await page.getByRole('button',{name:'Tính và đối chiếu',exact:true}).click();
    let calls=0,pending=[],ready,confirmations=0;const requested=new Promise(r=>ready=r);const accept=async dialog=>{confirmations++;await dialog.accept()};page.on('dialog',accept);
    await page.route('**/api/study',async route=>{if(route.request().method()!=='POST')return route.continue();calls++;pending.push({route,response:await route.fetch()});ready()});
    await page.getByRole('button',{name:'✧ Lưu hồ sơ nghiên cứu',exact:true}).evaluate(button=>{button.click();button.click()});await requested;await page.waitForTimeout(200);
    assert.equal(calls,1,'Shared calculator SaveStudy must not create duplicate snapshots on synchronous double click');assert.equal(confirmations,1);
    for(const p of pending)await p.route.fulfill({response:p.response});await page.getByText('Đã lưu vào Thư phòng cá nhân.',{exact:true}).waitFor();await page.unrouteAll({behavior:'ignoreErrors'});page.off('dialog',accept);
    record({case:'shared calculator save confirms once and creates one real canonical SQL snapshot',verdict:'PASS'});
  }

  if(phase==='after'||phase==='before-chart'){
    await page.goto(origin+'/chart',{waitUntil:'networkidle'});await page.getByLabel('Tên lá số',{exact:true}).fill('QA saved chart');await page.locator('#tuvi-workspace form button[type="submit"]').click();await page.locator('.chart-explorer').first().waitFor();
    let calls=0,pending=[],ready,confirmations=0;const requested=new Promise(r=>ready=r);const accept=async dialog=>{confirmations++;await dialog.accept()};page.on('dialog',accept);
    await page.route('**/api/charts',async route=>{if(route.request().method()!=='POST')return route.continue();calls++;pending.push({route,response:await route.fetch()});ready()});
    await page.getByRole('button',{name:'♡ Lưu lá số',exact:true}).evaluate(button=>{button.click();button.click()});await requested;await page.waitForTimeout(200);assert.equal(calls,1,'Synchronous chart save must make one request');assert.equal(confirmations,1);
    for(const p of pending)await p.route.fulfill({response:p.response});await page.getByText('Đã lưu lá số vào tài khoản. Mở mục Lá số của tôi để xem lại.',{exact:true}).waitFor();await page.unrouteAll({behavior:'ignoreErrors'});page.off('dialog',accept);record({case:'chart double save confirms and commits once without altering engine result',verdict:'PASS'});
  }
  if(phase!=='after')return;

  // Read failure is not an empty list; retry is a real owner-scoped read.
  await page.route('**/api/birth-profiles',route=>route.fulfill(responseFault('Controlled profile list outage')));await page.goto(origin+'/birth-profiles',{waitUntil:'networkidle'});
  await page.getByRole('alert').filter({hasText:'Controlled profile list outage'}).waitFor();assert.equal(await page.getByText('Chưa có hồ sơ sinh. Tạo mới hoặc chuyển từ một lá số Tử Vi đã lưu.',{exact:true}).count(),0);
  await page.unrouteAll({behavior:'ignoreErrors'});await page.getByRole('button',{name:'Tải lại hồ sơ sinh',exact:true}).click();await page.getByRole('heading',{name:'Hồ sơ QA một lần',exact:true}).waitFor();record({case:'profile list 503 is not empty; real retry restores existing records',verdict:'PASS'});

  // A successful create must keep its ID if the follow-up list cannot be read.
  await page.getByLabel('Tên hồ sơ',{exact:true}).fill('Hồ sơ liên kết QA');let failRead=false,profilePosts=0,profileUpdates=0,profileId;
  await page.route('**/api/birth-profiles',async route=>{if(route.request().method()==='POST'){profilePosts++;const response=await route.fetch();profileId=(await response.json()).id;failRead=true;return route.fulfill({response})}if(failRead){failRead=false;return route.fulfill(responseFault('Controlled committed profile read-back outage'))}return route.continue()});
  await page.getByRole('button',{name:'Tạo hồ sơ',exact:true}).click();await page.getByRole('alert').filter({hasText:'Controlled committed profile read-back outage'}).waitFor();await page.getByRole('button',{name:'Cập nhật hồ sơ',exact:true}).waitFor();
  await page.unrouteAll({behavior:'ignoreErrors'});await page.route('**/api/birth-profiles/'+profileId,async route=>{if(route.request().method()==='PATCH')profileUpdates++;return route.continue()});
  await page.getByLabel('Ngày sinh theo loại lịch đã chọn',{exact:true}).fill('2004-01-01');await page.getByRole('combobox',{name:/^Độ chắc chắn giờ sinh/}).selectOption('exact');await page.getByRole('combobox',{name:/^Giới tính theo quy ước/}).selectOption('Nam');
  await page.getByLabel('Giờ (0–23)',{exact:true}).fill('0');await page.getByLabel('Phút (0–59)',{exact:true}).fill('30');await page.getByLabel('Ghi chú riêng tư (tối đa 1.000 ký tự)',{exact:true}).fill('Giữ nguyên múi giờ và đầu vào.');
  await page.getByRole('button',{name:'Cập nhật hồ sơ',exact:true}).click();await page.getByRole('heading',{name:'Hồ sơ liên kết QA',exact:true}).waitFor();assert.equal(profilePosts,1);assert.equal(profileUpdates,1);
  const storedProfile=(await pg.query('SELECT id,hour,minute,notes FROM birth_profiles WHERE id=$1',[profileId])).rows[0];assert.equal(storedProfile.hour,0);assert.equal(storedProfile.minute,30);assert.equal(storedProfile.notes,'Giữ nguyên múi giờ và đầu vào.');
  await page.unrouteAll({behavior:'ignoreErrors'});record({case:'committed profile survives failed read-back; retry updates same ID and preserves midnight input',verdict:'PASS'});

  const profileCard=page.locator('article').filter({has:page.getByRole('heading',{name:'Hồ sơ liên kết QA',exact:true})});
  await profileCard.getByRole('link',{name:'Dùng lập Tử Vi ↗',exact:true}).click();await page.getByText('Đã nạp đầu vào hồ sơ sinh. Hãy kiểm tra và bấm Lập lá số; dữ liệu chưa được lưu thêm.',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Tên lá số',{exact:true}).inputValue(),'Hồ sơ liên kết QA');
  await page.locator('#tuvi-workspace form button[type="submit"]').click();await page.locator('.chart-explorer').first().waitFor();page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'♡ Lưu lá số',exact:true}).click();await page.getByText('Đã lưu lá số vào tài khoản. Mở mục Lá số của tôi để xem lại.',{exact:true}).waitFor();
  const linkedChart=(await pg.query('SELECT id,birth_profile_id,hour,minute FROM charts WHERE user_id=$1 AND birth_profile_id=$2',[member.user.id,profileId])).rows[0];assert.ok(linkedChart);assert.equal(linkedChart.hour,0);assert.equal(linkedChart.minute,30);
  record({case:'profile UI opens real Tu Vi input, calculates and saves a chart linked to the same profile',verdict:'PASS'});

  // Retry the common profile selector, then preserve a complete calculator snapshot.
  await page.route('**/api/birth-profiles',route=>route.fulfill(responseFault('Controlled calculator profiles outage')));await page.goto(origin+'/numerology',{waitUntil:'networkidle'});
  await page.getByPlaceholder('Nhập tên hoặc bản chuyển tự muốn nghiên cứu').fill('QA linked');await page.getByRole('button',{name:'Tính và đối chiếu',exact:true}).click();await page.getByRole('button',{name:'Tải lại hồ sơ liên kết',exact:true}).waitFor();
  await page.unrouteAll({behavior:'ignoreErrors'});await page.getByRole('button',{name:'Tải lại hồ sơ liên kết',exact:true}).click();await page.getByRole('option',{name:'Hồ sơ liên kết QA',exact:true}).waitFor({state:'attached'});
  await page.getByRole('combobox',{name:/^Liên kết hồ sơ sinh/}).selectOption(profileId);page.once('dialog',dialog=>dialog.accept());const linkedSave=page.waitForResponse(response=>response.url().endsWith('/api/study')&&response.request().method()==='POST');await page.getByRole('button',{name:'✧ Lưu hồ sơ nghiên cứu',exact:true}).click();const linkedSaveResponse=await linkedSave;assert.equal(linkedSaveResponse.status(),201,await linkedSaveResponse.text());await page.getByText('Đã lưu vào Thư phòng cá nhân.',{exact:true}).waitFor();
  const linkedStudy=(await pg.query('SELECT id,snapshot,birth_profile_id FROM study_entries WHERE user_id=$1 AND birth_profile_id=$2',[member.user.id,profileId])).rows[0];assert.equal(linkedStudy.snapshot.name,'QA linked');assert.equal(linkedStudy.snapshot.date,'2000-01-01');
  await page.goto(origin+'/numerology?entry='+linkedStudy.id,{waitUntil:'networkidle'});assert.equal(await page.getByPlaceholder('Nhập tên hoặc bản chuyển tự muốn nghiên cứu').inputValue(),'QA linked');
  record({case:'common profile-selector retry works; linked calculator snapshot reopens exact inputs',verdict:'PASS'});

  for(const [url,method,data] of [['/api/birth-profiles/'+profileId,'GET'],['/api/birth-profiles/'+profileId,'DELETE'],['/api/charts/'+linkedChart.id,'GET'],['/api/study/'+linkedStudy.id,'GET'],['/api/study/'+linkedStudy.id,'DELETE']]){
    const response=await other.context.request.fetch(origin+url,{method,...(data?{data}:{})});assert.equal(response.status(),404,url);
  }
  const foreignLink=await other.context.request.post(origin+'/api/study',{data:{discipline:'general',title:'Foreign link rejected',snapshot:{},birthProfileId:profileId}});assert.equal(foreignLink.status(),404);
  record({case:'another account cannot read/delete private records or attach a foreign birth profile',verdict:'PASS'});

  // Unified refresh must refresh all collections, not only the note list.
  await page.route('**/api/birth-profiles',route=>route.fulfill(responseFault('Controlled unified profile outage')));await page.goto(origin+'/study',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Tải lại hồ sơ và lá số',exact:true}).waitFor();await page.unrouteAll({behavior:'ignoreErrors'});await page.getByRole('button',{name:'Tải lại hồ sơ và lá số',exact:true}).click();
  await page.getByRole('option',{name:'Hồ sơ liên kết QA',exact:true}).first().waitFor({state:'attached'});await page.getByRole('alert').filter({hasText:'Chưa tải đủ hồ sơ sinh'}).waitFor({state:'hidden'});
  record({case:'unified room has an actual profile/chart catalog retry without falsely blaming migrations',verdict:'PASS'});
  const initialNote=page.locator('article').filter({has:page.getByRole('heading',{name:'Ghi chú QA một lần',exact:true})});await initialNote.getByRole('button',{name:'Ghi chú / đổi tên / liên kết',exact:true}).click();
  await initialNote.getByLabel('Tiêu đề',{exact:true}).fill('Ghi chú QA đã sửa');await initialNote.getByRole('textbox',{name:/^Ghi chú/}).fill('Nội dung cập nhật và giữ riêng tư.');await initialNote.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  const editedNote=page.locator('article').filter({has:page.getByRole('heading',{name:'Ghi chú QA đã sửa',exact:true})});await editedNote.getByRole('button',{name:'Ghim Ghi chú QA đã sửa',exact:true}).click();await editedNote.getByLabel('Đã ghim',{exact:true}).waitFor();
  const editedSql=(await pg.query('SELECT notes,pinned FROM study_entries WHERE user_id=$1 AND title=$2',[member.user.id,'Ghi chú QA đã sửa'])).rows[0];assert.equal(editedSql.notes,'Nội dung cập nhật và giữ riêng tư.');assert.equal(editedSql.pinned,true);
  record({case:'study edit and pin persist through UI/API/SQL',verdict:'PASS'});

  await page.route('**/api/study',async route=>route.request().method()==='GET'?route.fulfill(responseFault('Controlled study list outage')):route.continue());await page.reload({waitUntil:'networkidle'});await page.getByRole('alert').filter({hasText:'Controlled study list outage'}).waitFor();assert.equal(await page.getByText('Không có hồ sơ phù hợp. Hãy thử một bộ môn hoặc thêm ghi chú mới.',{exact:true}).count(),0);
  await page.unrouteAll({behavior:'ignoreErrors'});await page.getByRole('button',{name:'Làm mới',exact:true}).click();await page.getByRole('heading',{name:'Ghi chú QA đã sửa',exact:true}).waitFor();record({case:'study list 503 does not masquerade as no matches; full refresh recovers',verdict:'PASS'});

  async function jsonDownload(button){const downloading=page.waitForEvent('download');await button.click();const download=await downloading,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
  const studyArchive=await jsonDownload(page.getByRole('button',{name:'↓ Xuất riêng nghiên cứu',exact:true}));assert.equal(studyArchive.format,'thien-do.study-export');assert.ok(studyArchive.entries.some(entry=>entry.pinned));const studyBefore=(await pg.query('SELECT count(*)::int AS n FROM study_entries WHERE user_id=$1',[member.user.id])).rows[0].n;
  await page.locator('input[type=file]').setInputFiles({name:'study-archive.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(studyArchive))});await page.getByRole('button',{name:/^Khôi phục \d+ hồ sơ$/}).waitFor();
  let importId,studyImports=0;await page.route('**/api/study/import',async route=>{studyImports++;importId=route.request().postDataJSON().importId;const response=await route.fetch();assert.equal(response.status(),201);return route.fulfill(responseFault('Controlled lost COMMIT response'))});
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:/^Khôi phục \d+ hồ sơ$/}).click();await page.getByText(/Máy chủ xác nhận đã nhập thành công/).waitFor();await page.unrouteAll({behavior:'ignoreErrors'});
  assert.equal(studyImports,1);assert.equal((await pg.query('SELECT count(*)::int AS n FROM study_entries WHERE user_id=$1',[member.user.id])).rows[0].n,studyBefore+studyArchive.entries.length);
  const durable=await member.context.request.get(origin+'/api/study/import/'+importId);assert.equal(durable.status(),200);assert.equal((await durable.json()).committed,true);
  record({case:'study backup preserves pinned data; lost POST after real COMMIT is resolved by durable SQL receipt without duplicate import',verdict:'PASS'});

  const secondInput={label:'Lá số đối chiếu QA',date:'2004-02-03',hour:13,minute:45,calendar:'solar',leap:false,gender:'Nữ'};const secondSaved=await member.context.request.post(origin+'/api/charts',{data:secondInput});assert.equal(secondSaved.status(),201);const secondChartId=(await secondSaved.json()).id;
  await page.goto(origin+'/collection',{waitUntil:'networkidle'});let detailPending,detailReady;const detailRequested=new Promise(r=>detailReady=r);
  await page.route('**/api/charts/'+linkedChart.id,async route=>{detailPending={route,response:await route.fetch()};detailReady()});
  await page.locator('.saved-item').filter({hasText:'Hồ sơ liên kết QA'}).getByRole('button',{name:'Mở',exact:true}).click();await detailRequested;await page.getByRole('status').filter({hasText:'Đang mở lá số'}).waitFor();
  await page.locator('.saved-item').filter({hasText:'Lá số đối chiếu QA'}).getByRole('button',{name:'Mở',exact:true}).click();const visibleChart=page.locator('.chart-experience');await visibleChart.waitFor();await visibleChart.locator('.astrology-grid .house').first().waitFor();assert.equal(await visibleChart.locator('.astrology-grid .house').count(),12);assert.ok((await visibleChart.textContent()).includes('13:45'));
  try{await detailPending.route.fulfill({response:detailPending.response})}catch{}await page.waitForTimeout(200);assert.ok((await visibleChart.textContent()).includes('13:45'));await page.unrouteAll({behavior:'ignoreErrors'});
  record({case:'collection displays loading and latest real chart selection wins after deferred board import',verdict:'PASS'});

  const chartArchive=await jsonDownload(page.getByRole('button',{name:'↓ Sao lưu JSON',exact:true}));assert.equal(chartArchive.format,'thien-do.saved-charts');const ownerCharts=(await (await member.context.request.get(origin+'/api/charts')).json()).charts;assert.equal(chartArchive.charts.length,ownerCharts.length);
  page.once('dialog',dialog=>dialog.accept());await page.getByLabel('Chọn bản sao lưu THIÊN ĐỒ',{exact:true}).setInputFiles({name:'charts.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(chartArchive))});await page.getByText(new RegExp('Khôi phục thành công: thêm 0, bỏ qua '+chartArchive.charts.length)).waitFor();
  assert.equal((await (await member.context.request.get(origin+'/api/charts')).json()).charts.length,ownerCharts.length);record({case:'collection exports fresh owner data and restores the same backup without duplicate charts',verdict:'PASS'});
  const importPage=await other.context.newPage();await importPage.goto(origin+'/collection',{waitUntil:'networkidle'});importPage.once('dialog',dialog=>dialog.accept());await importPage.getByLabel('Chọn bản sao lưu THIÊN ĐỒ',{exact:true}).setInputFiles({name:'charts.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(chartArchive))});await importPage.getByText(new RegExp('Khôi phục thành công: thêm '+chartArchive.charts.length)).waitFor();
  const otherCharts=(await (await other.context.request.get(origin+'/api/charts')).json()).charts;assert.equal(otherCharts.length,chartArchive.charts.length);assert.ok(otherCharts.every(chart=>!ownerCharts.some(original=>original.id===chart.id)));const chartInputs=charts=>charts.map(chart=>JSON.stringify([chart.label,chart.date,chart.hour,chart.minute,chart.calendar,chart.leap,chart.gender])).sort();assert.deepEqual(chartInputs(otherCharts),chartInputs(ownerCharts));assert.ok(otherCharts.every(chart=>chart.birthProfileId===null));record({case:'chart restore into another real account creates fresh owner-scoped IDs and preserves inputs',verdict:'PASS'});

  let oversizedWrites=0;await page.route('**/api/charts/import',route=>{oversizedWrites++;return route.continue()});await page.getByLabel('Chọn bản sao lưu THIÊN ĐỒ',{exact:true}).setInputFiles({name:'too-large.json',mimeType:'application/json',buffer:Buffer.alloc(65537,32)});await page.getByRole('alert').filter({hasText:'Tệp JSON lớn hơn 64 KB'}).waitFor();assert.equal(oversizedWrites,0);assert.equal(await page.getByRole('button',{name:'↑ Khôi phục JSON',exact:true}).isDisabled(),false);await page.unrouteAll({behavior:'ignoreErrors'});record({case:'oversized chart backup never reaches API and releases operation lock',verdict:'PASS'});

  const oldChart=(await (await member.context.request.get(origin+'/api/charts/'+linkedChart.id)).json()).result;
  await page.goto(origin+'/birth-profiles',{waitUntil:'networkidle'});const deletingProfile=page.locator('article').filter({has:page.getByRole('heading',{name:'Hồ sơ liên kết QA',exact:true})});await deletingProfile.getByRole('button',{name:'Chỉnh sửa',exact:true}).click();page.once('dialog',dialog=>dialog.accept());await deletingProfile.getByRole('button',{name:'Xóa',exact:true}).click();await page.getByText('Đã xóa hồ sơ sinh. Bản nghiên cứu và lá số cũ vẫn được giữ lại.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Tạo hồ sơ',exact:true}).count(),1);const detached=await member.context.request.get(origin+'/api/charts/'+linkedChart.id);assert.equal(detached.status(),200);const detachedBody=await detached.json();assert.equal(detachedBody.chart.birthProfileId,null);assert.deepEqual(detachedBody.result,oldChart);assert.equal((await pg.query('SELECT birth_profile_id FROM study_entries WHERE id=$1',[linkedStudy.id])).rows[0].birth_profile_id,null);
  record({case:'deleting the profile being edited clears the editor and detaches links without losing chart/study data or changing calculation',verdict:'PASS'});

  await page.goto(origin+'/collection',{waitUntil:'networkidle'});let deleteCalls=0,pendingDelete,deleteReady,confirmations=0;const deleteRequested=new Promise(r=>deleteReady=r);const acceptDelete=async dialog=>{confirmations++;await dialog.accept()};page.on('dialog',acceptDelete);
  await page.route('**/api/charts/'+secondChartId,async route=>{if(route.request().method()!=='DELETE')return route.continue();deleteCalls++;pendingDelete={route,response:await route.fetch()};deleteReady()});
  await page.locator('.saved-item').filter({hasText:'Lá số đối chiếu QA'}).getByRole('button',{name:'Xóa',exact:true}).evaluate(button=>{button.click();button.click()});await deleteRequested;assert.equal(await page.getByRole('button',{name:'↓ Sao lưu JSON',exact:true}).isDisabled(),true);await pendingDelete.route.fulfill({response:pendingDelete.response});await page.getByText('Đã xóa lá số.',{exact:true}).waitFor();assert.equal(deleteCalls,1);assert.equal(confirmations,1);assert.equal((await member.context.request.get(origin+'/api/charts/'+secondChartId)).status(),404);await page.unrouteAll({behavior:'ignoreErrors'});page.off('dialog',acceptDelete);record({case:'collection double delete confirms and writes once while backup/view controls are locked',verdict:'PASS'});

  let staleDetail,staleReady;const staleRequested=new Promise(r=>staleReady=r);await page.route('**/api/charts/'+linkedChart.id,async route=>{staleDetail={route,response:await route.fetch()};staleReady()});await page.locator('.saved-item').filter({hasText:'Hồ sơ liên kết QA'}).getByRole('button',{name:'Mở',exact:true}).click();await staleRequested;
  assert.equal((await member.context.request.post(origin+'/api/auth/logout',{data:{}})).status(),200);assert.equal((await member.context.request.post(origin+'/api/auth/login',{data:{email:other.email,password}})).status(),200);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await page.waitForFunction(count=>document.querySelectorAll('.saved-item').length===count,otherCharts.length);try{await staleDetail.route.fulfill({response:staleDetail.response})}catch{}await page.waitForTimeout(200);assert.equal(await page.locator('.chart-explorer').count(),0);await page.unrouteAll({behavior:'ignoreErrors'});record({case:'account switch cancels old detail before a new private collection is shown',verdict:'PASS'});
  for(const width of [390,1440])for(const route of ['/birth-profiles','/study','/collection']){await page.setViewportSize({width,height:1000});await page.goto(origin+route,{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);record({case:'private workspace geometry',route,width,verdict:'PASS'})}

  assert.deepEqual(pageErrors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Next/Nest controllers/PGlite and browser-controlled faults; no native PostgreSQL/provider acceptance',results,pageErrors},null,2));
 }finally{await browser?.close();if(web)await new Promise(r=>web.close(r));await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
