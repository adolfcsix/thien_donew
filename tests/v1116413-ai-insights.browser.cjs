/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'verification/v1116413-ai-insights');
(async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.AUTH_OTP_SECRET=randomBytes(32).toString('hex');process.env.COOKIE_SECURE='false';
 const privateWork=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'thiendo-browser-files-')),assetRoot=path.join(privateWork,'private');fs.mkdirSync(path.join(assetRoot,'books'),{recursive:true});fs.mkdirSync(path.join(assetRoot,'van-kho-media'));process.env.BOOK_PRIVATE_STORAGE_DIR=path.join(assetRoot,'books');process.env.VAN_KHO_PRIVATE_MEDIA_DIR=path.join(assetRoot,'van-kho-media');
 const nativeFetch=global.fetch;
 const captured=[];let providerMode='ok',providerRelease=null,providerStarted=null;
 global.fetch=async(url,options)=>{
  if(!String(url).startsWith('https://generativelanguage.googleapis.com/'))return nativeFetch(url,options);
  const request=JSON.parse(options.body);captured.push(request);
  if(providerMode==='delay')await new Promise(resolve=>{providerRelease=resolve;providerStarted?.()});
  if(providerMode==='fail')return new Response('{}',{status:503});
  const admin=String(request.systemInstruction.parts[0].text).includes('hỗ trợ admin');
  const answer=admin?{summary:'Thống kê từ dữ liệu hệ thống.',findings:[{text:'Số bài mới lấy từ database, không suy đoán lưu lượng.',evidenceIds:[providerMode==='bad-citation'?'fake':'forum.threads']}]}:{summary:'Luận giải kiểm thử có kiểm soát.',findings:[{kind:'uncertain',text:'Cần đối chiếu thông tin cung trước khi diễn giải.',evidenceIds:['P1']}],missingData:['Chưa có thẩm định chuyên gia.']};
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(answer)}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:80}}),{headers:{'content-type':'application/json'}});
 };
 const pg=await PGlite.create({dataDir:'memory://'});let api,web,app,browser;const results=[],pageErrors=[];fs.mkdirSync(out,{recursive:true});function record(result){results.push(result);console.log('PASS '+result.case+(result.route?' '+result.route+' @ '+result.width:''));}
 try{
  await pg.exec('CREATE ROLE thiendo_app; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO thiendo_app; CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,checksum CHAR(64),applied_at TIMESTAMPTZ DEFAULT NOW())');
  for(const name of fs.readdirSync(path.join(root,'infrastructure/db')).filter(x=>/^\d{3}_.*\.sql$/.test(x)).sort()){
   const sql=fs.readFileSync(path.join(root,'infrastructure/db',name),'utf8');await pg.transaction(async tx=>{await tx.exec(sql);await tx.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,createHash('sha256').update(sql).digest('hex')]);});
  }
  const query=async(c,sql,params)=>{try{const r=await c.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows||r.rows.length};}catch(error){console.error('SQL integration error',error.code,error.message);throw error;}};
  const db={query:(sql,p)=>query(pg,sql,p),transaction:work=>pg.transaction(tx=>work({query:(sql,p)=>query(tx,sql,p)}))};
  require('reflect-metadata');const {NestFactory}=require('@nestjs/core'),{Module}=require('@nestjs/common');
  const {AppModule}=require(path.join(root,'apps/api/dist/app.module.js')),{DatabaseService}=require(path.join(root,'apps/api/dist/common/database.service.js'));
  const delivered=new Map();require(path.join(root,'apps/api/dist/modules/auth/email-code.js')).sendVerificationCode=async(email,code)=>delivered.set(email,code);
  class BrowserSqlModule{};Module({controllers:Reflect.getMetadata('controllers',AppModule),providers:Reflect.getMetadata('providers',AppModule).map(p=>p===DatabaseService?{provide:DatabaseService,useValue:db}:p)})(BrowserSqlModule);
  api=await NestFactory.create(BrowserSqlModule,{logger:false});await api.listen(8080,'127.0.0.1');
  app=require('next')({dev:false,dir:path.join(root,'apps/web'),hostname:'127.0.0.1',port:3614});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3614,'127.0.0.1',r));
  browser=await chromium.launch(require('./helpers-browser-launch.cjs').browserLaunchOptions());
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3614',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const owner=await register('owner-browser@example.invalid'),member=await register('member-browser@example.invalid');
  await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.user.id]);
  async function post(context,url,data){const r=await context.request.post(origin+url,{data});assert.equal(r.status(),200,url+' '+await r.text());return r.json();}
  const sent=await post(owner.context,'/api/auth/email/send',{});await post(owner.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(owner.email)});
  const setup=await post(owner.context,'/api/auth/mfa/setup',{password});const {totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));await post(owner.context,'/api/auth/mfa/confirm',{code:totpCode(setup.manualKey,Math.floor(Date.now()/30000))});
  const page=await owner.context.newPage();page.setDefaultTimeout(12000);
  const ask=async(context,data)=>{const response=await context.request.post(origin+'/api/admin/insights/ask',{data});return {response,body:await response.json()}};
  const reportQuery={question:'Hôm nay có bao nhiêu bài mới ở diễn đàn?',period:'today',minLevel:10,explain:false};
  const anonymous=await browser.newContext();assert.equal((await ask(anonymous,reportQuery)).response.status(),401);assert.equal((await ask(member.context,reportQuery)).response.status(),403);
  await pg.query("DELETE FROM admin_session_assurance WHERE user_id=$1",[owner.user.id]);assert.equal((await ask(owner.context,reportQuery)).response.status(),403);
  await post(owner.context,'/api/auth/mfa/verify',{code:totpCode(setup.manualKey,Math.floor(Date.now()/30000)+1)});
  record({case:'admin reports reject anonymous, member and missing MFA',verdict:'PASS'});
  // Operator-owned SQL fixtures with timestamps selected by the database clock.
  const {randomUUID}=require('node:crypto');
  for(const [age,visibility,state] of [[0,'public','visible'],[0,'private','visible'],[0,'public','hidden'],[1,'public','visible']]){
    await pg.query(`INSERT INTO forum_threads(id,category_id,author_id,title,body,visibility,state,created_at) VALUES($1,'nghien-cuu',$2,'QA báo cáo','Nội dung thử riêng tư không gửi Gemini',$3,$4,(date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh')-$5::int*INTERVAL '1 day'+INTERVAL '1 second') AT TIME ZONE 'Asia/Ho_Chi_Minh')`,[randomUUID(),member.user.id,visibility,state,age]);
  }
  let report=await ask(owner.context,reportQuery);assert.equal(report.response.status(),200,JSON.stringify(report.body));assert.equal(report.body.facts.find(f=>f.id==='forum.threads').value,3);assert.equal(report.body.facts.find(f=>f.id==='forum.public').value,1);
  assert.equal(new Date(report.body.start).getUTCHours(),17);assert.equal(report.body.timeZone,'Asia/Ho_Chi_Minh');
  const yesterday=await ask(owner.context,{...reportQuery,question:'Hôm qua có bao nhiêu bài mới?',period:'auto'});assert.equal(yesterday.body.facts.find(f=>f.id==='forum.threads').value,1);
  record({case:'Vietnam-day boundaries and forum all-state/public counts match real SQL including private/hidden records without exposing bodies',verdict:'PASS'});
  const unknown=await ask(owner.context,{...reportQuery,question:'Xóa hết dữ liệu giúp tôi'});assert.equal(unknown.response.status(),400);assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM forum_threads')).rows[0].n,4);
  record({case:'unsupported command cannot execute mutations or arbitrary SQL',verdict:'PASS'});
  delete process.env.WEB_ANALYTICS_ENABLED;
  report=await ask(owner.context,{...reportQuery,question:'Hôm nay có bao nhiêu lượt truy cập web?'});assert.equal(report.body.facts.length,0);assert.equal(report.body.tracking.enabled,false);
  process.env.WEB_ANALYTICS_ENABLED='true';
  const eventId=randomUUID();let visit=await anonymous.request.post(origin+'/api/analytics/page-view',{data:{eventId}});assert.equal((await visit.json()).recorded,true);assert.equal((await(await anonymous.request.post(origin+'/api/analytics/page-view',{data:{eventId}})).json()).recorded,false);
  report=await ask(owner.context,{...reportQuery,question:'Hôm nay có bao nhiêu lượt truy cập web?'});assert.equal(report.body.facts[0].value,1);assert.ok(report.body.warnings.some(w=>w.includes('không phải số người')));
  record({case:'traffic disabled is unknown, enabled counter is idempotent and explicitly page views rather than people',verdict:'PASS'});
  const grant=await owner.context.request.post(origin+'/api/tinh-canh/admin/rank-grants',{data:{userId:member.user.id,level:18,reason:'QA cấp thử để đối chiếu báo cáo cảnh giới.'}});assert.equal(grant.status(),201,await grant.text());
  report=await ask(owner.context,{...reportQuery,question:'Có những tài khoản nào cấp cao?'});let ranked=report.body.ranks.entries.find(r=>r.userId===member.user.id);assert.equal(ranked.level,18);assert.equal(ranked.points,0);assert.equal(ranked.rankSource,'admin');
  const ownRank=await(await member.context.request.get(origin+'/api/tinh-canh/me')).json();assert.equal(ownRank.progress.rank.level,ranked.level);assert.equal(ownRank.progress.points,ranked.points);
  await member.context.request.patch(origin+'/api/tinh-canh/me/privacy',{data:{publicRank:false}});
  report=await ask(owner.context,{...reportQuery,question:'Có những tài khoản nào cấp cao?'});assert.equal(report.body.ranks.entries.length,0);
  await member.context.request.patch(origin+'/api/tinh-canh/me/privacy',{data:{publicRank:true}});
  for(const [kind,points] of [['learning-reviewed',8],['research-reviewed',22]]) await pg.query("INSERT INTO tinh_van_awards(user_id,actor_id,kind,direction,subject,source_id,points) VALUES($1,$2,$3,'hoc-gia','nghien-cuu',$4,$5)",[member.user.id,owner.user.id,kind,randomUUID(),points]);
  report=await ask(owner.context,{...reportQuery,question:'Có những tài khoản nào cấp cao?'});assert.equal(report.body.ranks.entries[0].points,30);assert.equal((await(await member.context.request.get(origin+'/api/tinh-canh/me')).json()).progress.points,30);

  record({case:'rank report reuses engine gates/manual grants without inventing points and respects private rank preference',verdict:'PASS'});
  // A deterministic query works even while the provider is unavailable.
  await page.goto(origin+'/admin/tro-ly',{waitUntil:'networkidle'});try{await page.getByLabel('Câu hỏi quản trị',{exact:true}).fill(reportQuery.question)}catch(error){console.error('Admin assistant UI diagnostic',await page.locator('main').allTextContents(),pageErrors);throw error;}await page.getByRole('button',{name:'Xem báo cáo',exact:true}).click();await page.getByRole('heading',{name:'Bài diễn đàn tạo mới (mọi trạng thái): 3',exact:true}).waitFor();
  record({case:'admin question UI reaches real SQL and renders explicit fact sources',verdict:'PASS'});
  process.env.GEMINI_API_KEY='local-controlled-provider-not-a-real-key';
  const conf=await(await owner.context.request.get(origin+'/api/huyen-giai/admin/config')).json();const configured=await owner.context.request.patch(origin+'/api/huyen-giai/admin/config',{data:{...conf.config,enabled:true,dailyUserCalls:30,dailyGlobalCalls:1000,dailyBudgetMicroUsd:100000000}});assert.equal(configured.status(),200);
  const before=captured.length;report=await ask(owner.context,{...reportQuery,explain:true});assert.equal(report.response.status(),200);assert.ok(report.body.interpretation);assert.equal(captured.length,before+1);
  const sentAdmin=JSON.stringify(captured.at(-1));for(const secret of [owner.email,member.email,member.user.id,'Nội dung thử riêng tư','Hôm nay có bao nhiêu'])assert.equal(sentAdmin.includes(secret),false);
  record({case:'optional admin Gemini consumes shared budget and receives only anonymous aggregate facts, never identities/private content/raw question',verdict:'PASS'});
  providerMode='bad-citation';report=await ask(owner.context,{...reportQuery,explain:true});assert.equal(report.body.interpretation,null);assert.ok(report.body.aiError);assert.equal(report.body.facts[0].value,3);providerMode='ok';
  record({case:'invalid AI citation is rejected while SQL report remains available',verdict:'PASS'});
  // Avoid exhausting the read limiter in unrelated UI/geometry checks; fixture clock only.
  await pg.query("UPDATE admin_audit SET created_at=clock_timestamp()-INTERVAL '2 minutes' WHERE action='insights.read'");
  const memberPage=await member.context.newPage();memberPage.setDefaultTimeout(12000);
  const chartResponse=await member.context.request.post(origin+'/api/charts',{data:{label:'AI QA thật qua ứng dụng',date:'2004-01-01',hour:8,minute:30,calendar:'solar',leap:false,gender:'Nam'}});assert.equal(chartResponse.status(),201);const chartId=(await chartResponse.json()).id;
  await memberPage.goto(origin+'/huyen-giai',{waitUntil:'networkidle'});await memberPage.getByText('Gợi ý câu hỏi để bắt đầu',{exact:true}).click();await memberPage.getByRole('button',{name:'Tổng quan có căn cứ',exact:true}).click();assert.ok((await memberPage.getByLabel('Câu hỏi hoặc nội dung cần giải thích',{exact:true}).inputValue()).includes('điểm thuận'));
  await memberPage.getByRole('checkbox').check();await memberPage.getByRole('button',{name:'Luận giải',exact:true}).click();await memberPage.getByText('Luận giải kiểm thử có kiểm soát.',{exact:true}).waitFor();
  assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM ai_messages WHERE user_id=$1',[member.user.id])).rows[0].n,1);
  assert.ok((await memberPage.locator('article').innerText()).includes('P1 ·'));
  record({case:'new user conversation accepts null ID; suggested question generates, stores SQL answer and resolves matching palace citation',verdict:'PASS'});
  const downloadPending=memberPage.waitForEvent('download');await memberPage.getByRole('button',{name:'Tải bản văn bản',exact:true}).click();const download=await downloadPending;const downloaded=await download.path();assert.ok(fs.readFileSync(downloaded,'utf8').includes('Luận giải kiểm thử'));assert.ok(download.suggestedFilename().endsWith('.md'));
  record({case:'user can export actual answer and evidence as Markdown',verdict:'PASS'});
  const conversation=(await pg.query('SELECT id FROM ai_conversations WHERE user_id=$1',[member.user.id])).rows[0].id;
  await memberPage.getByLabel('Câu hỏi hoặc nội dung cần giải thích',{exact:true}).fill('Hãy giải thích lại các căn cứ của câu trả lời trước.');await memberPage.getByRole('button',{name:'Hỏi tiếp',exact:true}).click();await memberPage.getByText('Luận giải kiểm thử có kiểm soát.',{exact:true}).nth(1).waitFor();
  assert.ok(JSON.stringify(captured.at(-1)).includes('điểm thuận'));assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM ai_messages WHERE conversation_id=$1',[conversation])).rows[0].n,2);
  const foreign=await owner.context.request.post(origin+'/api/huyen-giai/generate',{data:{chartId,conversationId:conversation,question:'Xem nội dung riêng tư của người khác',mode:'basic',topic:'follow-up',consent:true}});assert.equal(foreign.status(),404);
  record({case:'follow-up sends recent same-owner same-snapshot context; another account cannot use private chart/conversation',verdict:'PASS'});
  const usage=await(await member.context.request.get(origin+'/api/huyen-giai/status')).json();assert.equal(usage.limits.usedToday,2);assert.equal(usage.limits.remainingToday,3);
  record({case:'user usage/remaining count agrees with persisted daily reservations',verdict:'PASS'});
  // A long history must open its latest answers, then reach all earlier answers.
  const prior=(await pg.query('SELECT engine_revision,facts_sha256 FROM ai_messages WHERE conversation_id=$1 LIMIT 1',[conversation])).rows[0];
  const olderAnswer={summary:'Bản luận giải cũ trong dữ liệu QA.',findings:[{kind:'uncertain',text:'Chỉ dùng kiểm tra tải lịch sử trước.',evidenceIds:['P1']}],missingData:[]};
  for(let n=1;n<=165;n++){
   const usageId=require('node:crypto').randomUUID();
   await pg.query("INSERT INTO ai_usage(id,user_id,conversation_id,model,status,reserved_microusd,created_at) VALUES($1,$2,$3,'controlled','completed',0,clock_timestamp()-INTERVAL '1 day')",[usageId,member.user.id,conversation]);
   await pg.query("INSERT INTO ai_messages(id,conversation_id,user_id,usage_id,question,response,engine_revision,facts_sha256,created_at) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,'2026-01-01T00:00:00.123456Z')",[conversation,member.user.id,usageId,'Older fixture '+n,JSON.stringify(olderAnswer),prior.engine_revision,prior.facts_sha256]);
  }
  await memberPage.reload({waitUntil:'networkidle'});await memberPage.getByRole('button').filter({hasText:'167 lượt'}).click();
  const articles=memberPage.locator('article').filter({hasText:'Câu hỏi:'});await memberPage.waitForFunction(()=>document.querySelectorAll('article').length===80);
  assert.equal(await memberPage.getByText('Luận giải kiểm thử có kiểm soát.',{exact:true}).count(),2);
  let earlierRequests=0;memberPage.on('request',request=>{if(request.url().includes('/api/huyen-giai/conversations/')&&request.url().includes('?before='))earlierRequests++;});
  await memberPage.getByRole('button',{name:'Xem các lượt trước',exact:true}).evaluate(button=>{button.click();button.click()});
  await memberPage.waitForFunction(()=>document.querySelectorAll('article').length===160);assert.equal(earlierRequests,1);
  await memberPage.getByRole('button',{name:'Xem các lượt trước',exact:true}).click();await memberPage.waitForFunction(()=>document.querySelectorAll('article').length===167);assert.equal(await articles.count(),167);assert.equal(await memberPage.getByRole('button',{name:'Xem các lượt trước',exact:true}).count(),0);
  record({case:'167-message history opens latest 80, paired older clicks make one read, all 167 answers remain accessible with no duplicate rendering',verdict:'PASS'});
  // Gemini outage does not substitute fabricated output and still keeps the SQL facts.
  providerMode='fail';report=await ask(owner.context,{...reportQuery,explain:true});assert.equal(report.body.interpretation,null);assert.ok(report.body.aiError);assert.equal(report.body.facts[0].value,3);providerMode='ok';
  record({case:'provider outage preserves grounded admin facts and reports interpretation failure',verdict:'PASS'});
  await pg.query('UPDATE ai_runtime_config SET daily_budget_microusd=0 WHERE id=1');const capturedBefore=captured.length;
  report=await ask(owner.context,{...reportQuery,explain:true});assert.ok(report.body.aiError);assert.equal(captured.length,capturedBefore);assert.equal(report.body.facts[0].value,3);
  record({case:'budget exhaustion blocks external provider call without blocking SQL report',verdict:'PASS'});
  await pg.query("INSERT INTO admin_audit(actor_id,action,target,details) SELECT $1,'insights.read','qa-limiter','{}'::jsonb FROM generate_series(1,12)",[owner.user.id]);
  assert.equal((await ask(owner.context,reportQuery)).response.status(),429);await pg.query("UPDATE admin_audit SET created_at=clock_timestamp()-INTERVAL '2 minutes' WHERE action='insights.read'");
  record({case:'persistent admin report rate limit rejects excess read attempts',verdict:'PASS'});
  for(const width of [390,1440])for(const [p,route] of [[page,'/admin/tro-ly'],[memberPage,'/huyen-giai']]){await p.setViewportSize({width,height:1000});await p.goto(origin+route,{waitUntil:'networkidle'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);record({case:'AI workspace geometry',route,width,verdict:'PASS'})}
  // Browser private state must disappear after a session is revoked during generation.
  await pg.query('UPDATE ai_runtime_config SET daily_budget_microusd=100000000 WHERE id=1');
  await memberPage.goto(origin+'/huyen-giai',{waitUntil:'networkidle'});await memberPage.getByRole('button').filter({hasText:'167 lượt'}).click();
  await memberPage.getByLabel('Câu hỏi hoặc nội dung cần giải thích',{exact:true}).fill('Giải thích thêm khi phiên còn hợp lệ.');await memberPage.getByRole('checkbox').check();
  providerMode='delay';let userStarted;const userReady=new Promise(resolve=>userStarted=resolve);providerStarted=userStarted;
  await memberPage.getByRole('button',{name:'Hỏi tiếp',exact:true}).click();await userReady;
  const logout=await member.context.request.post(origin+'/api/auth/logout',{data:{}});assert.equal(logout.status(),200);providerRelease();
  await memberPage.waitForURL(origin+'/',{timeout:15000});assert.equal(await memberPage.getByText('Luận giải kiểm thử có kiểm soát.',{exact:true}).count(),0);
  assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM ai_messages WHERE conversation_id=$1',[conversation])).rows[0].n,167);
  record({case:'logout during Gemini wait rejects stale completion, writes no message and removes private browser UI before returning home',verdict:'PASS'});
  // A role revoked while waiting on Gemini must not receive a finished report.
  await pg.query('UPDATE ai_runtime_config SET daily_budget_microusd=100000000 WHERE id=1');providerMode='delay';let started;const providerReady=new Promise(resolve=>started=resolve);providerStarted=started;
  const pendingAsk=ask(owner.context,{...reportQuery,explain:true});await providerReady;await pg.query('DELETE FROM admin_memberships WHERE user_id=$1',[owner.user.id]);providerRelease();assert.equal((await pendingAsk).response.status(),403);
  record({case:'revoked admin cannot receive result after provider wait',verdict:'PASS'});
  assert.deepEqual(pageErrors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({verdict:'PASS',scope:'Real Next/Nest/PGlite, controlled Gemini fetch responses, captured email; NOT native PostgreSQL or actual provider acceptance',results,pageErrors},null,2));
 }finally{global.fetch=nativeFetch;await browser?.close();if(web)await new Promise(resolve=>web.close(resolve));await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
