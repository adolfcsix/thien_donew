'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const src=p=>readFileSync(path.join(root,p),'utf8');
function getTS(){try{return require('typescript')}catch{};try{return require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'))}catch{return null}}
const ts=getTS();
if(ts){
 const source=src('apps/api/src/common/identifiers.ts');
 const out=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 class BadRequestException extends Error{constructor(message){super(message);this.status=400}}
 const fakeRequire=(p)=>p==='@nestjs/common'?{BadRequestException}:require(p);
 new Function('module','exports','require',out)(mod,mod.exports,fakeRequire);
 const valid=mod.exports.assertChartId;
 test('V8.4 validates UUIDs before querying postgres',()=>{
  assert.equal(valid('da1e5e7c-1d85-4b8e-a856-aabbccddeeff'),'da1e5e7c-1d85-4b8e-a856-aabbccddeeff');
  for(const candidate of ['not-an-id','',undefined,null,'6ab2517f-10c7-4444-4444-zzzzzzzzzzzz','abc";drop table charts;--'])
   assert.throws(()=>valid(candidate),error=>error.status===400);
 });
} else test('V8.4 UUID behavior tests require TypeScript',{skip:true},()=>{});
if (ts) test('V8.4 Next config rewrites to server-defined backend and rejects invalid URLs', async () => {
 const source=src('apps/web/next.config.ts');
 const code=ts.transpileModule(source,{fileName:'next.config.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 function load(override) {
  const mod={exports:{}};
  const proc={env:{API_INTERNAL_URL:override}};
  new Function('module','exports','process','require','__dirname',code)(mod,mod.exports,proc,(name)=>{assert.equal(name,'node:path');return require(name);},path.join(root,'apps/web'));
  return mod.exports.default;
 }
 const config=load('http://127.0.0.1:9010/');
 assert.deepEqual(await config.rewrites(),[{source:'/api/:path*',destination:'http://127.0.0.1:9010/api/:path*'}]);
 assert.throws(()=>load('ftp://other-server.invalid/'),/API_INTERNAL_URL/);
 assert.throws(()=>load('http://127.0.0.1:8080/evil'),/API_INTERNAL_URL/);
 assert.throws(()=>load('http://test:test@localhost:8080'),/API_INTERNAL_URL/);
});
test('V8.4 all chart get/remove routes validate UUIDs before executing SQL',()=>{
 const code=src('apps/api/src/modules/charts/charts.service.ts');
 assert.match(code,/assertChartId\(id\);\s*const result = await this\.db\.query\(/);
 assert.equal((code.match(/assertChartId\(id\);/g)||[]).length,2);
});
test('V8.4 API requests are first-party through Next rewrites',()=>{
 assert.match(src('apps/web/next.config.ts'),/source: '\/api\/:path\*'/);
 assert.match(src('apps/web/next.config.ts'),/API_INTERNAL_URL/);
 const client=src('apps/web/src/lib/api.ts');
 assert.match(client,/const ROOT = ''/);
 assert.match(client,/credentials: 'include'/);
 assert.doesNotMatch(client,/NEXT_PUBLIC_API_BASE_URL/);
 const env=src('.env.example'); assert.match(env,/API_INTERNAL_URL=http/);
 assert.doesNotMatch(env,/NEXT_PUBLIC_API_BASE_URL/);
});
test('V8.4 personal export is on demand, tenant-scoped and clearly marked sensitive',()=>{
 const view=src('apps/web/src/app/collection/page.tsx');
 assert.match(view,/await chartApi\.list\(controller\.signal\)/);
 assert.match(view,/exportRequest\.current\?\.abort\(\)/);
 assert.match(view,/if \(controller\.signal\.aborted\) return/);
 assert.match(view,/thien-do\.saved-charts/);
 assert.match(view,/Sao lưu JSON/);
 assert.match(view,/bảo quản tệp vì có thông tin ngày giờ sinh/);
});
test('V8.4 privacy and accessibility safeguards preserved',()=>{
 assert.match(src('apps/api/src/main.ts'),/Strict-Transport-Security/);
 assert.match(src('apps/web/src/features/chart/components/chart-board.tsx'),/aria-label="Địa bàn tử vi 12 cung/);
});
