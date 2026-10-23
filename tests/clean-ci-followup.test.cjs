'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('calendar evidence writers succeed twice without any preexisting report directory',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-clean-audit-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const filter=p=>!p.split(path.sep).some(x=>['node_modules','dist'].includes(x));
 fs.cpSync(path.join(root,'packages'),path.join(dir,'packages'),{recursive:true,filter});
 fs.cpSync(path.join(root,'infrastructure/scripts'),path.join(dir,'infrastructure/scripts'),{recursive:true,filter});
 for(const [script,report] of [['audit-naoj-jie-v111499.cjs','V11_149_9_NAOJ_STAR_AUDIT.json'],['audit-hko-primary-jie-v111497.cjs','V11_149_7_HKO_PRIMARY_JIE_AUDIT.json'],['audit-hko-jie-days-v111498.cjs','V11_149_8_HKO_DAY_SOURCE_AUDIT.json']]){
  fs.rmSync(path.join(dir,'docs/reports'),{recursive:true,force:true});
  for(let run=0;run<2;run++){
   const result=spawnSync(process.execPath,[path.join(dir,'infrastructure/scripts',script),'--write'],{cwd:dir,encoding:'utf8',timeout:15000});
   assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'docs/reports',report),'utf8')).errors,[]);
  }
 }
});
test('CI runs new SQL, DOM, HTTP and both account/AI browser harnesses',()=>{
 const ci=fs.readFileSync(path.join(root,'.github/workflows/production-acceptance.yml'),'utf8');
 for(const command of ['npm run test:account:sql','npm run test:sql:isolated','npm run test:session:dom','npm run test:stack:isolated','node tests/account.browser.cjs','node tests/v1116413-ai-insights.browser.cjs'])assert.ok(ci.includes(command),command);
 assert.ok(ci.indexOf('npm run build')<ci.indexOf('npm run test:stack:isolated'));assert.doesNotMatch(ci,/continue-on-error:\s*true|--single-process|--disable-web-security/);
 const sql=fs.readFileSync(path.join(root,'infrastructure/scripts/test-isolated-sql.mjs'),'utf8');assert.match(sql,/'expert-library-session-sql'/);assert.match(sql,/'deep-ai-session-sql'/);
});
test('Bazi guest smoke and authenticated calculator have separate expectations',async()=>{
 const {getReadOnlyRouteManifest}=await import('../infrastructure/scripts/read-only-route-manifest.mjs');const route=getReadOnlyRouteManifest().find(r=>r.path==='/bazi');
 assert.equal(route.marker,'Đang kiểm tra tài khoản…');assert.equal(route.authenticatedMarker,'Tứ trụ, bốn dấu mốc thời gian');
 const browser=fs.readFileSync(path.join(root,'tests/account.browser.cjs'),'utf8');assert.ok(browser.includes("bazi.goto(origin+'/bazi'"));assert.ok(browser.includes("name:'Lập Bát Tự'"));
});
