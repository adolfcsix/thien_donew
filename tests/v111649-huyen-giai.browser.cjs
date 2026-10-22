/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v111649-huyen-giai');
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
  const query=async(c,sql,params)=>{try{const r=await c.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};}catch(error){console.error('SQL integration error',error.code,error.message);throw error;}};
  const db={query:(sql,p)=>query(pg,sql,p),transaction:work=>pg.transaction(tx=>work({query:(sql,p)=>query(tx,sql,p)}))};
  require('reflect-metadata');const {NestFactory}=require('@nestjs/core'),{Module}=require('@nestjs/common');
  const {AppModule}=require(path.join(root,'apps/api/dist/app.module.js')),{DatabaseService}=require(path.join(root,'apps/api/dist/common/database.service.js'));
  const delivered=new Map();require(path.join(root,'apps/api/dist/modules/auth/email-code.js')).sendVerificationCode=async(email,code)=>delivered.set(email,code);
  class BrowserSqlModule{};Module({controllers:Reflect.getMetadata('controllers',AppModule),providers:Reflect.getMetadata('providers',AppModule).map(p=>p===DatabaseService?{provide:DatabaseService,useValue:db}:p)})(BrowserSqlModule);
  api=await NestFactory.create(BrowserSqlModule,{logger:false});await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3610});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3610,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3610',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}

  const member=await register('ai-member-browser@example.invalid'),other=await register('ai-other-browser@example.invalid');
  const chartResponse=await member.context.request.post(origin+'/api/charts',{data:{label:'Lá số AI kiểm thử',date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'}});assert.equal(chartResponse.status(),201);const chartId=(await chartResponse.json()).id;
  const {randomUUID}=require('node:crypto');const conversations=[];
  // Operator-owned historical fixtures exercise real SQL/history/ownership, not Gemini generation.
  for(let i=0;i<2;i++){
   const id=randomUUID(),usage=randomUUID(),message=randomUUID();conversations.push({id,message,question:'Câu hỏi lịch sử '+i});
   await pg.query("INSERT INTO ai_conversations(id,user_id,chart_id,mode,topic,updated_at) VALUES($1,$2,$3,'basic','overview',$4)",[id,member.user.id,chartId,`2026-10-${10+i}T00:00:00Z`]);
   await pg.query("INSERT INTO ai_usage(id,user_id,conversation_id,model,status,reserved_microusd) VALUES($1,$2,$3,'qa-history-fixture','completed',0)",[usage,member.user.id,id]);
   await pg.query('INSERT INTO ai_messages(id,conversation_id,user_id,usage_id,question,response,engine_revision,facts_sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[message,id,member.user.id,usage,'Câu hỏi lịch sử '+i,JSON.stringify({summary:'Dữ liệu QA lịch sử '+i,findings:[{kind:'uncertain',text:'Nội dung kiểm thử, không phải Gemini.',evidenceIds:[]}],missingData:['Không dùng làm luận giải thật.']}),'qa-fixture','0'.repeat(64)]);
  }
  const page=await member.context.newPage();page.setDefaultTimeout(12000);await page.goto(origin+'/huyen-giai',{waitUntil:'networkidle'});
  console.log('AI UI build',fs.readFileSync(path.join(root,'apps/web/.next/BUILD_ID'),'utf8'),'refresh controls',await page.getByRole('button',{name:'Làm mới dữ liệu AI',exact:true}).count());
  // Reject stale HTML/chunks before accepting any browser result for this source build.
  for(const url of await page.locator('script[src]').evaluateAll(nodes=>nodes.map(node=>node.src))){
    const pathname=new URL(url).pathname;
    if(!pathname.startsWith('/_next/static/'))continue;
    const served=await (await member.context.request.get(url)).body();
    assert.deepEqual(served,fs.readFileSync(path.join(root,'apps/web/.next',pathname.slice('/_next/'.length))),'Served JavaScript must match current build bytes');
  }
  const history=page.locator('aside').filter({hasText:'Lịch sử của bạn'}),historyButtons=history.getByRole('button').filter({hasText:'lượt ·'});
  try{await historyButtons.nth(1).waitFor()}catch(error){console.error('AI initial UI diagnostic',await page.locator('#main-content').innerText(),pageErrors);console.error('AI actual session',await page.evaluate(async()=>await (await fetch('/api/auth/me')).json()));throw error}let pending,releaseReady;const ready=new Promise(r=>releaseReady=r);
  await page.route('**/api/huyen-giai/conversations/'+conversations[1].id,async route=>{const response=await route.fetch();pending={route,response};releaseReady()});
  await historyButtons.nth(0).click();await ready;await historyButtons.nth(1).click();
  await page.getByText('Câu hỏi: '+conversations[0].question,{exact:true}).waitFor();
  try{await pending.route.fulfill({response:pending.response})}catch{/* A superseded browser request may already be canceled. */}
  await page.waitForTimeout(300);assert.equal(await page.getByText('Câu hỏi: '+conversations[1].question,{exact:true}).count(),0,'A late older history response must not replace the most recently selected conversation');
  assert.equal(await page.getByText('Câu hỏi: '+conversations[0].question,{exact:true}).count(),1);
  record({case:'latest history selection wins over a delayed real API response',verdict:'PASS'});
  await page.unrouteAll({behavior:'ignoreErrors'});
  if(process.env.THIENDO_BROWSER_PHASE==='before')return;

  // Reset cancels pending history; a delayed real response cannot resurrect old content.
  let resetPending,resetReady;const resetRequested=new Promise(r=>resetReady=r);
  await page.route('**/api/huyen-giai/conversations/'+conversations[1].id,async route=>{const response=await route.fetch();resetPending={route,response};resetReady()});
  await historyButtons.nth(0).click();await resetRequested;await page.getByRole('button',{name:'+ Cuộc mới',exact:true}).click();
  try{await resetPending.route.fulfill({response:resetPending.response})}catch{}
  await page.waitForTimeout(200);assert.equal(await page.locator('article').filter({hasText:'Câu hỏi lịch sử'}).count(),0);assert.equal(await history.locator('[aria-current="page"]').count(),0);
  record({case:'new conversation cancels pending history without resurrecting messages',verdict:'PASS'});await page.unrouteAll({behavior:'ignoreErrors'});

  let statusPending,statusReady;const statusRequested=new Promise(r=>statusReady=r);
  await page.route('**/api/huyen-giai/status',async route=>{statusPending=route;statusReady()});
  await page.reload({waitUntil:'domcontentloaded'});await Promise.race([statusRequested,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Status route not requested')),12000))]);
  await page.getByRole('status').filter({hasText:'Đang kiểm tra kết nối và hạn mức AI'}).waitFor();
  assert.equal(await page.getByText(/Thiên Đồ AI chưa được Admin kích hoạt/).count(),0);assert.equal(await page.getByText('Chưa có bản luận giải nào.',{exact:true}).count(),0);
  await statusPending.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Controlled AI catalog outage'})});
  await page.getByRole('alert').filter({hasText:'Controlled AI catalog outage'}).waitFor();await page.unrouteAll({behavior:'ignoreErrors'});
  await page.getByRole('button',{name:'Làm mới dữ liệu AI',exact:true}).click();await historyButtons.nth(1).waitFor();await page.getByText(/Thiên Đồ AI chưa được Admin kích hoạt/).waitFor();
  assert.equal(await page.locator('#main-content').getByRole('alert').count(),0);record({case:'AI catalog loading, outage and retry are distinct from disabled provider and empty history',verdict:'PASS'});

  await page.route('**/api/huyen-giai/conversations/'+conversations[0].id,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({conversation:{id:conversations[0].id}})}));
  await historyButtons.nth(1).click();await page.getByRole('alert').filter({hasText:'Phản hồi dữ liệu AI không hợp lệ'}).waitFor();
  await page.unrouteAll({behavior:'ignoreErrors'});await historyButtons.nth(1).click();await page.getByText('Câu hỏi: '+conversations[0].question,{exact:true}).waitFor();
  record({case:'malformed history is rejected and a real history read can be retried without page crash',verdict:'PASS'});

  await page.route('**/api/huyen-giai/disclosure/*',route=>route.fulfill({status:200,contentType:'application/json',body:'{"factPack":{}}'}));
  await page.reload({waitUntil:'networkidle'});await page.getByText('Xem chính xác dữ liệu gửi đến Gemini',{exact:true}).click();
  await page.getByRole('button',{name:'Tải lại dữ liệu gửi AI',exact:true}).waitFor();
  assert.equal(await page.getByRole('checkbox').isDisabled(),true);
  await page.unrouteAll({behavior:'ignoreErrors'});await page.getByRole('button',{name:'Tải lại dữ liệu gửi AI',exact:true}).click();await page.getByText(/Dấu vân tay dữ liệu:/).waitFor();
  assert.equal(await page.getByRole('checkbox').isDisabled(),false);record({case:'malformed disclosure blocks consent; retry loads actual twelve-palace engine disclosure',verdict:'PASS'});

  const secondChart=await member.context.request.post(origin+'/api/charts',{data:{label:'Lá số AI thứ hai',date:'2004-02-03',hour:9,minute:15,calendar:'solar',leap:false,gender:'Nữ'}});assert.equal(secondChart.status(),201);const secondId=(await secondChart.json()).id;
  await page.getByRole('button',{name:'Làm mới dữ liệu AI',exact:true}).click();await page.getByRole('option',{name:'Lá số AI thứ hai',exact:true}).waitFor({state:'attached'});
  await page.getByRole('checkbox').check();let disclosurePending,disclosureReady;const disclosureRequested=new Promise(r=>disclosureReady=r);
  await page.route('**/api/huyen-giai/disclosure/'+secondId,async route=>{disclosurePending={route,response:await route.fetch()};disclosureReady()});
  await page.getByRole('combobox',{name:/^Lá số đã lưu/}).selectOption(secondId);await disclosureRequested;
  assert.equal(await page.getByRole('checkbox').isChecked(),false);assert.equal(await page.getByRole('checkbox').isDisabled(),true);
  await disclosurePending.route.fulfill({response:disclosurePending.response});await page.getByText(/Dấu vân tay dữ liệu:/).waitFor();
  assert.equal(await page.getByRole('checkbox').isChecked(),false);await page.unrouteAll({behavior:'ignoreErrors'});record({case:'switching charts clears consent immediately and waits for the matching engine disclosure',verdict:'PASS'});

  await historyButtons.nth(1).click();await page.getByText('Câu hỏi: '+conversations[0].question,{exact:true}).waitFor();
  let feedbackCalls=0,feedbackPending,feedbackReady;const feedbackRequested=new Promise(r=>feedbackReady=r);
  await page.route('**/api/huyen-giai/feedback/*',async route=>{feedbackCalls++;feedbackPending={route,response:await route.fetch()};feedbackReady()});
  await page.getByRole('button',{name:'Hữu ích',exact:true}).evaluate(button=>{button.click();button.click()});await feedbackRequested;
  assert.equal(await page.getByRole('button',{name:'+ Cuộc mới',exact:true}).isDisabled(),true);assert.equal(await historyButtons.nth(0).isDisabled(),true);
  await feedbackPending.route.fulfill({response:feedbackPending.response});await page.getByText('Đã ghi nhận phản hồi chất lượng.',{exact:true}).waitFor();
  assert.equal(feedbackCalls,1);assert.equal((await pg.query('SELECT helpful FROM ai_feedback WHERE message_id=$1',[conversations[0].message])).rows[0].helpful,true);
  await page.unrouteAll({behavior:'ignoreErrors'});record({case:'feedback double click makes one real API/SQL write; workspace controls lock while pending',verdict:'PASS'});

  await page.route('**/api/huyen-giai/feedback/*',route=>route.fulfill({status:200,contentType:'application/json',body:'{"saved":false}'}));
  await page.getByRole('button',{name:'Chưa chính xác',exact:true}).click();await page.getByRole('alert').filter({hasText:'Chưa xác nhận được việc lưu phản hồi'}).waitFor();assert.equal(await page.getByText('Đã ghi nhận phản hồi chất lượng.',{exact:true}).count(),0);
  await page.unrouteAll({behavior:'ignoreErrors'});await page.getByRole('button',{name:'Chưa chính xác',exact:true}).click();await page.getByText('Đã ghi nhận phản hồi chất lượng.',{exact:true}).waitFor();
  assert.equal((await pg.query('SELECT helpful FROM ai_feedback WHERE message_id=$1',[conversations[0].message])).rows[0].helpful,false);
  record({case:'invalid feedback receipt cannot claim success; real retry updates SQL',verdict:'PASS'});

  assert.equal((await other.context.request.get(origin+'/api/huyen-giai/conversations/'+conversations[0].id)).status(),404);
  assert.equal((await other.context.request.delete(origin+'/api/huyen-giai/conversations/'+conversations[0].id)).status(),404);
  assert.equal((await other.context.request.post(origin+'/api/huyen-giai/feedback/'+conversations[0].message,{data:{helpful:true}})).status(),404);
  record({case:'other account cannot read, delete or rate a private AI conversation through real API',verdict:'PASS'});

  let deletes=0,deletePending,deleteReady;const deleteRequested=new Promise(r=>deleteReady=r);let confirmations=0;
  page.on('dialog',async dialog=>{confirmations++;await dialog.accept()});
  await page.route('**/api/huyen-giai/conversations/'+conversations[0].id,async route=>{if(route.request().method()!=='DELETE')return route.continue();deletes++;deletePending={route,response:await route.fetch()};deleteReady()});
  await history.getByRole('button',{name:'Xóa cuộc luận giải',exact:true}).nth(1).evaluate(button=>{button.click();button.click()});await deleteRequested;
  await deletePending.route.fulfill({response:deletePending.response});await page.getByText('Đã xóa cuộc luận giải.',{exact:true}).waitFor();
  assert.equal(deletes,1);assert.equal(confirmations,1);assert.equal((await pg.query('SELECT id FROM ai_messages WHERE conversation_id=$1',[conversations[0].id])).rows.length,0);
  assert.equal(await page.getByText('Câu hỏi: '+conversations[0].question,{exact:true}).count(),0);await page.unrouteAll({behavior:'ignoreErrors'});
  record({case:'deletion is confirmed once, committed through SQL and clears selected messages',verdict:'PASS'});

  assert.equal((await member.context.request.delete(origin+'/api/charts/'+chartId)).status(),200);
  await historyButtons.nth(0).click();await page.getByText('Câu hỏi: '+conversations[1].question,{exact:true}).waitFor();
  await page.getByText('Lá số gốc đã bị xóa.',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Hỏi tiếp',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Làm mới dữ liệu AI',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Làm mới dữ liệu AI'&&!button.disabled));
  assert.equal(await page.getByRole('combobox',{name:/^Lá số đã lưu/}).inputValue(),'','Catalog refresh must not bind another chart to a historical conversation whose chart was deleted');
  assert.equal(await page.getByRole('button',{name:'Hỏi tiếp',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'+ Cuộc mới',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:/^Lá số đã lưu/}).inputValue(),secondId);
  await historyButtons.nth(0).click();await page.getByText('Câu hỏi: '+conversations[1].question,{exact:true}).waitFor();
  record({case:'deleted-chart history stays unbound after catalog refresh; only a new conversation selects another chart',verdict:'PASS'});
  assert.equal((await member.context.request.post(origin+'/api/auth/logout',{data:{}})).status(),200);
  assert.equal((await member.context.request.post(origin+'/api/auth/login',{data:{email:other.email,password}})).status(),200);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.getByText('Chưa có bản luận giải nào.',{exact:true}).waitFor();
  assert.equal(await page.getByText('Câu hỏi: '+conversations[1].question,{exact:true}).count(),0);assert.equal(await page.getByRole('option',{name:'Lá số AI kiểm thử',exact:true}).count(),0);
  await page.getByRole('link',{name:'Lập và lưu lá số ↗',exact:true}).waitFor();record({case:'same mounted page switches real accounts without retaining private history or chart choices',verdict:'PASS'});
  for(const width of [390,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);record({case:'AI empty account layout has no horizontal overflow',width,verdict:'PASS'})}

  assert.deepEqual(pageErrors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Next/Nest/PGlite history fixtures and controlled faults; no real Gemini generation or native PostgreSQL acceptance',results,pageErrors},null,2));
 }finally{await browser?.close();if(web)await new Promise(r=>web.close(r));await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
