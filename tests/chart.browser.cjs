/** Browser -> real Next -> Nest -> PGlite. No native PostgreSQL/provider acceptance.
 * Email delivery is captured in memory; only initial owner membership is seeded.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{randomBytes,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.THIENDO_BROWSER_REPORT_DIR||path.join(root,'reports/browser');
(async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.THIENDO_SQL_TEST_MODULE).href);
 const {chromium}=require(process.env.THIENDO_PLAYWRIGHT_MODULE||'playwright');
 process.env.GEMINI_API_KEY='';process.env.WEB_ANALYTICS_ENABLED='false';process.env.PAYOS_CLIENT_ID='';process.env.PAYOS_API_KEY='';process.env.PAYOS_CHECKSUM_KEY='';
 process.env.ADMIN_MFA_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.AUTH_OTP_SECRET=randomBytes(32).toString('hex');process.env.COOKIE_SECURE='false';
 const privateWork=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'thiendo-browser-files-')),assetRoot=path.join(privateWork,'private');fs.mkdirSync(path.join(assetRoot,'books'),{recursive:true});fs.mkdirSync(path.join(assetRoot,'van-kho-media'));process.env.BOOK_PRIVATE_STORAGE_DIR=path.join(assetRoot,'books');process.env.VAN_KHO_PRIVATE_MEDIA_DIR=path.join(assetRoot,'van-kho-media');
 const webWork=fs.mkdtempSync(path.join(root,'.qa-web-'));
 fs.cpSync(path.join(root,'apps/web'),webWork,{recursive:true,filter:source=>!source.split(path.sep).some(part=>['node_modules','standalone','cache','route-cache'].includes(part))});
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
  app=require('next')({dev:false,dir:webWork,hostname:'127.0.0.1',port:3614});await app.prepare();web=require('node:http').createServer(app.getRequestHandler());await new Promise(r=>web.listen(3614,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,...(process.env.THIENDO_CHROMIUM_PATH?{executablePath:process.env.THIENDO_CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  // Next prepares a production build in this process; keep the isolated HTTP API in test mode.
  process.env.NODE_ENV='test';
  const origin='http://127.0.0.1:3614',password='Browser!'+randomBytes(16).toString('hex');
  async function register(email){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.on('page',p=>p.on('pageerror',error=>pageErrors.push(error.message)));const r=await c.request.post(origin+'/api/auth/register',{data:{email,password}});assert.equal(r.status(),201);return {context:c,user:(await r.json()).user,email};}
  const owner=await register('owner-browser@example.invalid'),member=await register('member-browser@example.invalid');
  await pg.query("INSERT INTO admin_memberships(user_id,role) VALUES($1,'owner')",[owner.user.id]);
  async function post(context,url,data){const r=await context.request.post(origin+url,{data});assert.equal(r.status(),200,url+' '+await r.text());return r.json();}
  const sent=await post(owner.context,'/api/auth/email/send',{});await post(owner.context,'/api/auth/email/verify',{challengeId:sent.challengeId,code:delivered.get(owner.email)});
  const setup=await post(owner.context,'/api/auth/mfa/setup',{password});const {totpCode}=require(path.join(root,'apps/api/dist/modules/auth/totp.js'));await post(owner.context,'/api/auth/mfa/confirm',{code:totpCode(setup.manualKey,Math.floor(Date.now()/30000))});

 const page=await owner.context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(origin+'/chart',{waitUntil:'networkidle'});
 const nameInput=page.getByLabel('Tên lá số',{exact:true});assert.equal(await nameInput.inputValue(),'');assert.equal(await nameInput.getAttribute('placeholder'),'Nhập họ và tên');
 await page.getByRole('button',{name:/Tính lá số/}).click();assert.equal(await nameInput.evaluate(el=>el.validity.valueMissing),true);assert.equal(await page.locator('.astrology-grid').count(),0);
 await nameInput.fill('QA Chart');await page.getByRole('button',{name:/Tính lá số/}).click();
 const grid=page.locator('.astrology-grid');await grid.waitFor();assert.equal(await grid.locator('.house').count(),12);assert.equal(await grid.evaluate(el=>Boolean(el.closest('details'))),false);
 record({case:'twelve-palace interactive board visible directly after calculation',verdict:'PASS'});
 const profile=page.locator('.chart-profile-ledger');assert.ok((await profile.innerText()).includes('QA Chart'));assert.equal(await grid.locator('.atlas-center-person strong').innerText(),'QA Chart');for(const name of ['Tứ Hóa năm sinh trong hồ sơ','Lưu Tứ Hóa trong hồ sơ'])assert.equal(await profile.getByRole('region',{name,exact:true}).locator('li').count(),4);await profile.locator('summary').click();assert.equal(await grid.locator('.house').count(),12);await profile.locator('summary').click();record({case:'A53 named chart profile exposes separate birth/annual four-transformation layers without changing twelve palaces',verdict:'PASS'});
 const appearance=()=>grid.locator('.house').first().evaluate(el=>getComputedStyle(el).backgroundImage);
 const ivory=await appearance();await page.getByRole('button',{name:'Ngọc bích',exact:true}).click();assert.notEqual(await appearance(),ivory);
 await page.getByRole('button',{name:'Giấy ngà cổ điển',exact:true}).click();assert.equal(await appearance(),ivory);
 const font=()=>grid.locator('.atlas-main-star-entry strong').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 const normal=await font();await page.getByRole('button',{name:'A+ Chữ lớn',exact:true}).click();assert.ok(await font()>normal);
 const starSearch=page.getByRole('searchbox',{name:'Tìm sao trong cung',exact:true});await starSearch.fill('khong-co-sao-nay');await page.getByText('Không tìm thấy sao khớp tên trong cung này. Hãy đổi từ khóa hoặc chọn cung khác.',{exact:true}).waitFor();await starSearch.fill('');assert.ok(await page.locator('.star-context-chip').count()>0);record({case:'TuVi in-palace star search has an explicit no-match state and restores the actual placed-star catalogue',verdict:'PASS'});
 const stars=await grid.locator('.atlas-star').allTextContents();await page.getByRole('button',{name:'Hiện nhãn nhóm sao',exact:true}).click();assert.deepEqual(await grid.locator('.atlas-star').allTextContents(),stars);await page.getByRole('button',{name:'Ẩn nhãn nhóm sao',exact:true}).click();
 record({case:'visible style/font changes and compact/grouped layouts preserve every star name',verdict:'PASS'});
 await page.getByRole('button',{name:/Hiện sổ tay nghiên cứu/}).click();await page.locator('#thiendo-study-dock').waitFor();
 await page.locator('.chart-scene').screenshot({animations:'disabled',path:path.join(out,'desktop-notebook.png'),style:'.topbar{visibility:hidden!important}'});
 assert.equal(await grid.evaluate(n=>{const canvas=n.closest('.board-scroll').getBoundingClientRect();return [...n.querySelectorAll('.house')].every(h=>{const b=h.getBoundingClientRect();return b.left>=canvas.left-2&&b.right<=canvas.right+2})}),true,'all palaces remain inside the canvas with notebook open');
 const palace=grid.locator('.house').first();await palace.click();const name=await palace.locator('.atlas-house-header strong').innerText();assert.ok((await page.locator('.chart-insight-title h3').innerText()).includes(name));
 await page.getByRole('button',{name:/Ẩn sổ tay nghiên cứu/}).click();assert.equal(await page.locator('#thiendo-study-dock').isVisible(),false);
 await palace.hover();await page.waitForFunction(()=>document.querySelector('.chart-relation-lines')?.getAttribute('data-visible')==='true');const edges=await page.locator('.chart-relation-path').count();assert.ok(edges>0);
 await page.getByRole('group',{name:'Phạm vi đối chiếu khi rê chuột'}).getByRole('button',{name:'Tam hợp',exact:true}).click();await palace.hover();await page.waitForTimeout(350);assert.ok(await page.locator('.chart-relation-path').count()<edges);
 await page.getByRole('button',{name:/Tắt gợi liên hệ cung/}).click();assert.equal(await page.locator('.chart-relation-lines').count(),0);await page.getByRole('button',{name:/Bật gợi liên hệ cung/}).click();
 record({case:'notebook selection and relationship hover/scope/toggle operate on the visible board',verdict:'PASS'});
 await page.getByRole('button',{name:/Phóng to cung/}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await page.getByRole('button',{name:'☷ Danh sách',exact:true}).click();assert.equal(await grid.count(),0);await page.locator('.chart-palace-list').waitFor();await page.getByRole('button',{name:'▦ Địa bàn',exact:true}).click();await grid.waitFor();
 await palace.hover();await page.waitForTimeout(350);assert.notEqual(await palace.evaluate(el=>getComputedStyle(el).transform),'none');
 await page.getByRole('button',{name:/Hiệu ứng chiều sâu và ánh sáng của lá số: đang bật/}).click();
 assert.equal(await page.locator('.chart-scene').getAttribute('data-motion'),'paused');
 assert.equal(await page.locator('.chart-scene').getAttribute('data-depth'),'off');
 await page.getByRole('button',{name:/Hiệu ứng chiều sâu và ánh sáng của lá số: đang tắt/}).click();
 assert.equal(await page.locator('.chart-scene').getAttribute('data-depth'),'on');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.chart-scene')?.getAttribute('data-motion')==='paused');assert.equal(await grid.locator('.atlas-center-seal').evaluate(el=>getComputedStyle(el).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});
 record({case:'list/reader controls, 3D depth, effect toggle and reduced-motion work',verdict:'PASS'});
 const matrix=[],a11y=[],palette=[];
 const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>{const [low,high]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return(high+.05)/(low+.05)};
 const rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number);
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:1000});
  for(const theme of ['light','dark']){
   const light=await page.locator('.site').evaluate(el=>el.classList.contains('light'));if(light!==(theme==='light'))await page.locator('.theme-button').click();
   for(const skin of ['heritage','jade']){
    await page.getByRole('button',{name:skin==='jade'?'Ngọc bích':'Giấy ngà cổ điển',exact:true}).click();
    await page.getByRole('button',{name:'Dễ đọc',exact:true}).click();const small=await font();await page.getByRole('button',{name:'A+ Chữ lớn',exact:true}).click();const large=await font();assert.ok(large>small);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'document overflow '+width+' '+theme+' '+skin);
    assert.equal(await grid.evaluate(n=>{const canvas=n.closest('.board-scroll').getBoundingClientRect();return [...n.querySelectorAll('.house')].every(h=>{const b=h.getBoundingClientRect();return b.left>=canvas.left-2&&b.right<=canvas.right+2})}),true,'palace clipping '+width+' '+theme+' '+skin);
    assert.ok(await grid.locator('.atlas-house-assist').first().isVisible());assert.ok(await grid.locator('.atlas-center-seal svg').isVisible());
    if(width===1440){
     const colors=await grid.locator('.atlas-star').evaluateAll(nodes=>[...new Set(nodes.map(el=>getComputedStyle(el).color))]);
     for(const color of colors){const contrast=ratio(rgb(color),skin==='jade'?[24,62,53]:[245,239,223]);palette.push({theme,skin,color,contrast});assert.ok(contrast>=4.5,color+' '+contrast);}
     const badges=await grid.locator('.atlas-strength-badge').evaluateAll(nodes=>nodes.map(el=>{const c=getComputedStyle(el);return{label:el.textContent,color:c.color,background:c.backgroundColor}}));for(const b of badges)assert.ok(ratio(rgb(b.color),rgb(b.background))>=4.5,JSON.stringify(b));
     if(process.env.THIENDO_AXE_MODULE){const {default:AxeBuilder}=require(process.env.THIENDO_AXE_MODULE);const scan=await new AxeBuilder({page}).include('.chart-scene').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();a11y.push({theme,skin,violations:scan.violations,incomplete:scan.incomplete.map(x=>x.id)});fs.writeFileSync(path.join(out,'chart-a11y.json'),JSON.stringify(a11y,null,2));assert.equal(scan.violations.length,0,theme+' '+skin+' accessibility');}
    }
    const surfaces=await page.locator('.chart-reading-content :is(.palace-reading,.star-context-explorer,.twelve-palace-ledger,.palace-study-workbench,.palace-detail)').evaluateAll(ns=>ns.map(n=>({name:n.className,background:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color})));assert.equal(surfaces.length,5);assert.equal(new Set(surfaces.map(s=>s.background)).size,1);assert.equal(new Set(surfaces.map(s=>s.color)).size,1);assert.equal(await page.locator('.celestial-ornament').getAttribute('aria-hidden'),'true');
    matrix.push({width,theme,skin,normalFont:small,largeFont:large,documentOverflow:false,auxiliaryStarsVisible:true});
    await page.locator('.chart-scene').scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:path.join(out,`chart-${width}-${theme}-${skin}.png`)});
    if(width===1440&&theme==='light')await page.locator('.chart-scene').screenshot({animations:'disabled',path:path.join(out,`board-${skin}.png`),style:'.topbar{visibility:hidden!important}'});
   }
  }
 }
 fs.writeFileSync(path.join(out,'chart-matrix.json'),JSON.stringify(matrix,null,2));fs.writeFileSync(path.join(out,'star-palette-contrast.json'),JSON.stringify(palette,null,2));record({case:'16 populated viewport/theme/skin combinations preserve data/font controls with no document overflow; color and badge contrast checks pass',verdict:'PASS'});
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.addCookies(await owner.context.cookies());const touch=await mobile.newPage();await touch.goto(origin+'/chart',{waitUntil:'networkidle'});await touch.getByLabel('Tên lá số',{exact:true}).fill('QA Touch');await touch.getByRole('button',{name:/Tính lá số/}).click();await touch.locator('.astrology-grid').waitFor();await touch.locator('.astrology-grid .house').first().tap();await touch.waitForFunction(()=>document.querySelector('.chart-relation-lines')?.getAttribute('data-visible')==='true');
 await touch.getByRole('button',{name:/Hiện sổ tay nghiên cứu/}).click();await touch.locator('#thiendo-study-dock').waitFor();await touch.locator('.board-scroll').evaluate(el=>el.scrollLeft=el.scrollWidth);assert.equal(await touch.locator('.board-scroll').evaluate(el=>el.scrollLeft),0);assert.equal(await touch.locator('.board-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+2),true);assert.equal(await touch.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await touch.getByRole('button',{name:/Phóng to cung/}).click();await touch.getByRole('dialog').waitFor();await touch.waitForTimeout(350);const box=await touch.getByRole('dialog').boundingBox();assert.ok(box.x>=-1&&box.y>=-1&&box.width<=391&&box.height<=845);await touch.screenshot({animations:'disabled',path:path.join(out,'mobile-palace-reader.png')});await touch.keyboard.press('Escape');await touch.locator('#thiendo-study-dock').scrollIntoViewIfNeeded();await touch.screenshot({animations:'disabled',path:path.join(out,'mobile-touch-notebook.png')});await mobile.close();
 record({case:'touch selection, relations, complete board without sideways drag, notebook and mobile reader fit',verdict:'PASS'});
 await page.setViewportSize({width:1440,height:1000});await page.getByText('Bản vector đầy đủ · thu phóng và xuất SVG',{exact:true}).click();await page.locator('[aria-label="Lá số toàn cảnh có thể thu phóng"]').waitFor();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'↓ SVG đầy đủ',exact:true}).click();await(await download).saveAs(path.join(out,'chart.svg'));assert.ok(fs.readFileSync(path.join(out,'chart.svg'),'utf8').includes('<svg'));
 const png=page.waitForEvent('download');await page.getByRole('button',{name:'↓ PNG',exact:true}).click();await(await png).saveAs(path.join(out,'chart-export.png'));assert.equal(fs.readFileSync(path.join(out,'chart-export.png')).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'▤ In / PDF',exact:true}).click();const print=await popup;await print.locator('.star-appendix').waitFor();const pdf=await print.pdf({preferCSSPageSize:true,printBackground:true,path:path.join(out,'chart-print.pdf')});assert.equal(pdf.subarray(0,4).toString(),'%PDF');await print.close();record({case:'full SVG, PNG and printable PDF with star appendix preserved',verdict:'PASS'});
 page.once('dialog',d=>d.accept());const saved=page.waitForResponse(r=>r.url().endsWith('/api/charts')&&r.request().method()==='POST');await page.getByRole('button',{name:'♡ Lưu lá số',exact:true}).click();assert.equal((await saved).status(),201);await page.goto(origin+'/collection',{waitUntil:'networkidle'});await page.locator('.saved-item').filter({hasText:'QA Chart'}).getByRole('button',{name:'Mở',exact:true}).first().click();await page.locator('.astrology-grid').waitFor();assert.equal(await page.locator('.astrology-grid .house').count(),12);record({case:'save chart to SQL and reopen interactive board from collection',verdict:'PASS'});assert.deepEqual(pageErrors,[]);

 }catch(error){console.error('BROWSER FAILED',error);for(const c of browser?.contexts()||[])for(const p of c.pages())fs.writeFileSync(path.join(out,'overflow-debug.json'),JSON.stringify(await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('body *')].filter(n=>!n.closest('.astrology-grid')).map(n=>({tag:n.tagName,cls:n.className?.baseVal??n.className,left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,width:n.getBoundingClientRect().width,scroll:n.scrollWidth,overflow:getComputedStyle(n).overflowX,parent:n.parentElement?.className})).filter(r=>r.right>innerWidth+1||r.left<0).map(r=>({...r})).slice(-100)})),null,2));for(const context of browser?.contexts()||[])for(const p of context.pages())await p.screenshot({animations:'disabled',path:path.join(out,'failure-'+Date.now()+'.png')}).catch(()=>{});throw error;}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sqlEngine:'PGlite WASM, not native PostgreSQL',provider:'No live email/Gemini/payOS calls',results,pageErrors},null,2));await browser?.close();if(web){web.closeAllConnections();await new Promise(r=>web.close(r));}await app?.close();await api?.close();await pg.close();fs.rmSync(privateWork,{recursive:true,force:true,maxRetries:6,retryDelay:100});fs.rmSync(webWork,{recursive:true,force:true,maxRetries:6,retryDelay:100});}
})().catch(e=>{console.error(e);process.exitCode=1;});
