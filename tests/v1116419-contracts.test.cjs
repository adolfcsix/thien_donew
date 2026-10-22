const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path');
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>deps[n]||require(n),m,m.exports);return m.exports;}
const auth=load('apps/api/src/modules/auth/auth.service.ts',{'../../common/database.service':{DatabaseService:class{}},'./account-deletion-error':{accountDeletionError(){}}});
test('username normalization follows existing DB constraint and rejects ambiguous identities',()=>{
 assert.equal(auth.readUsername('  XIII_2026 '),'xiii_2026');assert.equal(auth.readUsername(undefined),null);
 for(const value of ['abc','1abcd','ábcde','abc@x.io','a'.repeat(33),null,{},['xiii']])assert.throws(()=>auth.readUsername(value));
});
const {insightInput}=load('apps/api/src/modules/admin-insights/insight-contract.ts');
test('Vietnamese Admin questions resolve finance, system and explicit level without generating SQL',()=>{
 assert.deepEqual(insightInput({question:'Doanh thu 7 ngày gần đây thế nào?'}).topics,['finance']);
 assert.equal(insightInput({question:'Có bao nhiêu người dùng cấp 15 trở lên?'}).minLevel,15);
 assert.deepEqual(insightInput({question:'Đăng ký mới hôm nay?'}).topics,['members']);
 assert.ok(insightInput({question:'Tình trạng hệ thống hiện tại và báo cáo chờ duyệt?'}).topics.includes('system'));
 assert.throws(()=>insightInput({question:'Có bao nhiêu người dùng cấp 19?'}));
});
const primitive=load('apps/web/src/features/admin/response-contract.ts');const {dashboardReport}=load('apps/web/src/features/admin-dashboard/contract.ts',{'@/features/admin/response-contract':primitive});
const valid={timeZone:'Asia/Ho_Chi_Minh',days:7,metrics:[{id:'traffic.views',label:'Lượt xem',value:null,previous:null,unit:'',source:'Chưa đo',scope:'period'}],daily:[],orders:[],warnings:[],start:'2026-10-10',end:'2026-10-17',generatedAt:'2026-10-17'};
test('dashboard retains missing data as null and rejects forged counters, duplicates and invalid periods',()=>{
 assert.equal(dashboardReport(valid).metrics[0].value,null);
 for(const broken of [{...valid,days:8},{...valid,metrics:[{...valid.metrics[0],value:'4'}]},{...valid,metrics:[valid.metrics[0],valid.metrics[0]]},{...valid,orders:[{status:'invented',count:4}]},{...valid,daily:[{date:'not-date',registrations:1,posts:1,views:0}]}])assert.throws(()=>dashboardReport(broken));
});
