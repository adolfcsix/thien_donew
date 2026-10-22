/** Actual React components in a DOM harness, with mocked Next router/auth.
 * This verifies effects/mounting, not Chromium, OAuth or SQL delivery. */
import {test,before,beforeEach,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(resolve(root,'package.json'));
if(!process.env.THIENDO_DOM_TEST_MODULE)throw Error('Set THIENDO_DOM_TEST_MODULE to an isolated jsdom lib/api.js; no tests silently skipped');
const {JSDOM}=require(resolve(process.env.THIENDO_DOM_TEST_MODULE));
const React=require('react'),ts=require('typescript'),{act}=React;
let dom,createRoot,view,container,state,navigations,opened,closed,mounts;
const savedGlobals=new Map(),router={replace:path=>navigations.push(path)};
function component(file){
 const source=readFileSync(resolve(root,file),'utf8'),mod={exports:{}};
 const code=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const localRequire=id=>{
  if(id==='@/features/membership/use-visible-polling')return component('apps/web/src/features/membership/use-visible-polling.ts');
  if(id==='@/features/membership/admin-consultations')return component('apps/web/src/features/membership/admin-consultations.tsx');
  if(id==='@/lib/api')return {api:(...args)=>uiApi(...args),chartApi:{list:()=>Promise.resolve({charts:[{id:'test-chart',label:'Test chart'}]})}};
  if((id.endsWith('membership.module.css')||id.endsWith('reading.module.css')))return {__esModule:true,default:{page:'page',hero:'hero',card:'card',grid:'grid',tabs:'tabs',table:'table',form:'form',row:'row',actions:'actions',button:'button',primary:'primary'}};
  if(id==='next/navigation')return {usePathname:()=>window.location.pathname,useRouter:()=>router};
  if(id==='next/link')return ({href,children})=>React.createElement('a',{href},children);
  if(id==='./auth-provider'||id==='@/components/auth-provider')return {useAuth:()=>state};
  if(id==='@/lib/tool-access.cjs')return require(resolve(root,'apps/web/src/lib/tool-access.cjs'));
  return require(id);
 };
 new Function('module','exports','require',code)(mod,mod.exports,localRequire);return mod.exports;
}
const Gate=component('apps/web/src/components/tool-access-gate.tsx').ToolAccessGate;
const Login=component('apps/web/src/app/login/page.tsx').default;
function PrivateTool(){mounts++;return React.createElement('button',null,'Lập kết quả riêng');}
async function renderGate(){await act(async()=>view.render(React.createElement(Gate,null,React.createElement(PrivateTool))));}
async function renderLogin(){await act(async()=>view.render(React.createElement(Login)));}
before(()=>{
 dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://thiendo.invalid/'});
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true})){
  savedGlobals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 }
 ({createRoot}=require('react-dom/client'));
});
beforeEach(()=>{
 navigations=[];opened=0;closed=0;mounts=0;
 state={user:null,loading:false,open:()=>opened++,close:()=>closed++};
 container=document.createElement('div');document.body.appendChild(container);view=createRoot(container);
});
afterEach(async()=>{await act(async()=>view.unmount());container.remove();});
after(()=>{dom.window.close();for(const [key,descriptor] of savedGlobals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
test('Anonymous tool does not mount; redirects with original entry and hash',async()=>{
 window.history.replaceState(null,'','/bazi?entry=abc#result');await renderGate();
 assert.equal(mounts,0);assert.equal(container.querySelector('button'),null);
 assert.deepEqual(navigations,['/login?next='+encodeURIComponent('/bazi?entry=abc#result')]);
});
test('Loading session neither redirects nor mounts; validated user mounts without draft reset on reload',async()=>{
 window.history.replaceState(null,'','/chart');state.loading=true;await renderGate();assert.equal(mounts,0);assert.deepEqual(navigations,[]);
 state={...state,user:{id:'test-owner'},loading:false};await renderGate();assert.ok(container.textContent.includes('Lập kết quả riêng'));
 const button=container.querySelector('button');state={...state,loading:true};await renderGate();assert.equal(container.querySelector('button'),button);
});
test('Public learning remains visible to visitors, even while auth loads',async()=>{
 window.history.replaceState(null,'','/library');state.loading=true;await renderGate();assert.equal(mounts,1);assert.deepEqual(navigations,[]);
});
test('Revoked session removes tool and redirects before further tool interaction',async()=>{
 window.history.replaceState(null,'','/tarot');state.user={id:'owner'};await renderGate();assert.ok(container.querySelector('button'));
 state={...state,user:null};await renderGate();assert.equal(container.querySelector('button'),null);assert.deepEqual(navigations,['/login?next=%2Ftarot']);
});
test('Login opens once, supports reopening, then returns exactly once after authentication',async()=>{
 window.history.replaceState(null,'','/login?next='+encodeURIComponent('/bazi?entry=abc#result'));await renderLogin();assert.equal(opened,1);
 state={...state,open:()=>opened++};await renderLogin();assert.equal(opened,1);
 await act(async()=>container.querySelector('button').click());assert.equal(opened,2);
 state={...state,user:{id:'owner'}};await renderLogin();assert.equal(closed,1);assert.deepEqual(navigations,['/bazi?entry=abc#result']);
 state={...state};await renderLogin();assert.equal(closed,1);assert.equal(navigations.length,1);
});
test('Login waits for session and rejects external return URLs after sign-in',async()=>{
 window.history.replaceState(null,'','/login?next='+encodeURIComponent('//evil.invalid/'));state.loading=true;await renderLogin();assert.equal(opened,0);
 state={...state,user:{id:'owner'},loading:false};await renderLogin();assert.deepEqual(navigations,['/chart']);assert.equal(opened,0);
});
let uiApi=async()=>({});
const AdminPage=component('apps/web/src/app/admin/page.tsx').default;
const MemberPage=component('apps/web/src/app/membership/page.tsx').default;
const ResearchPage=component('apps/web/src/app/pro/research/page.tsx').default;
const plan={id:'pro30',name:'Pro',priceVnd:0,days:30,features:['premium-report','multi-chart-report'],enabled:false};
function adminFixture(owner){return async path=>{
 if(path==='/api/billing/access')return {isAdmin:true,isOwner:owner,features:[]};
 if(path==='/api/admin/overview')return {users:2,orders:[]};
 if(path.startsWith('/api/admin/users'))return {users:[]};
 if(path==='/api/billing/plans')return {plans:[plan],checkoutEnabled:false};
 if(path==='/api/admin/orders'||path==='/api/billing/orders')return {orders:[]};
 if(path==='/api/admin/entitlements')return {entitlements:[]};
 if(path==='/api/admin/audit')return {events:[]};
 if(path==='/api/admin/posts')return {posts:[]};throw Error('Unexpected fixture request '+path);
};}
test('Admin DOM denies member before issuing any privileged API read',async()=>{
 const calls=[];uiApi=async path=>{calls.push(path);return {isAdmin:false,isOwner:false};};
 await act(async()=>view.render(React.createElement(AdminPage)));
 assert.ok(container.textContent.includes('không có quyền quản trị'));assert.deepEqual(calls,['/api/billing/access']);
});
test('Admin DOM exposes owner-only price controls but disables them for staff',async()=>{
 uiApi=adminFixture(false);await act(async()=>view.render(React.createElement(AdminPage)));
 const tab=[...container.querySelectorAll('button')].find(b=>b.textContent==='Gói Pro');assert.ok(tab);await act(async()=>tab.click());
 const inputs=[...container.querySelectorAll('input')];assert.ok(inputs.length>=4);assert.ok(inputs.every(i=>i.disabled));
 assert.equal([...container.querySelectorAll('button')].find(b=>b.textContent==='Lưu gói').disabled,true);
});
test('Membership DOM disables checkout until merchant and plan are enabled; free entry remains',async()=>{
 uiApi=adminFixture(false);await act(async()=>view.render(React.createElement(MemberPage)));
 assert.ok(container.textContent.includes('Thành viên miễn phí'));
 const checkout=[...container.querySelectorAll('button')].find(b=>b.textContent==='Thanh toán qua payOS');assert.ok(checkout);assert.equal(checkout.disabled,true);
});
test('Research DOM keeps paid report action disabled without server entitlement',async()=>{
 uiApi=async()=>({features:[]});await act(async()=>view.render(React.createElement(ResearchPage)));
 assert.ok(container.textContent.includes('cần Pro'));
 const box=container.querySelector('input[type=checkbox]');assert.ok(box);await act(async()=>box.click());
 assert.equal([...container.querySelectorAll('button')].find(b=>b.textContent==='Tạo báo cáo nghiên cứu').disabled,true);
});
test('Changing account remounts protected view so prior account state is not retained',async()=>{
 window.history.replaceState(null,'','/membership');state.user={id:'owner-a'};await renderGate();const previous=container.querySelector('button');
 state={...state,user:{id:'owner-b'}};await renderGate();assert.notEqual(container.querySelector('button'),previous);
});

const ConsultationPage=component('apps/web/src/app/consultation/page.tsx').default;
const AdminConsultations=component('apps/web/src/features/membership/admin-consultations.tsx').default;
const consultationPlan={id:'consultation',name:'Tư vấn riêng',priceVnd:150000,enabled:false,advisor:'Người tư vấn',scope:'Ba câu hỏi',responseHours:48,questionLimit:3};
function consultationFixture({enabled=false,contactUrl=null}={}){return async path=>{
 if(path==='/api/billing/consultation-plans')return {plans:[{...consultationPlan,enabled}],checkoutEnabled:enabled};
 if(path==='/api/charts')return {charts:[{id:'chart-test',label:'Lá số thử'}]};
 if(path==='/api/billing/consultations')return {requests:[{id:'order-test',planName:'Tư vấn riêng',amountVnd:150000,status:contactUrl?'paid':'pending',question:'Câu hỏi thử',advisor:'Người tư vấn',scope:'Ba câu hỏi',questionLimit:3,responseHours:48,serviceStatus:'waiting',contactUrl,checkoutUrl:null,expiresAt:'2000-01-01'}]};
 throw Error('Unexpected '+path);
};}
test('Consultation DOM disables unconfigured purchase and hides contact for unpaid request',async()=>{
 uiApi=consultationFixture();await act(async()=>view.render(React.createElement(ConsultationPage)));
 assert.equal([...container.querySelectorAll('button')].find(b=>b.textContent==='Đặt phiên luận giải').disabled,true);
 assert.equal(container.querySelector('a[href^="https://zalo.me/"]'),null);
});
test('Consultation DOM exposes paid contact with exact order and consent before new checkout',async()=>{
 uiApi=consultationFixture({enabled:true,contactUrl:'https://zalo.me/0900000000'});await act(async()=>view.render(React.createElement(ConsultationPage)));
 assert.equal(container.querySelector('a[href^="https://zalo.me/"]').href,'https://zalo.me/0900000000');assert.ok(container.textContent.includes('order-test'));
 await act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='Đặt phiên luận giải').click());
 assert.ok(container.querySelector('input[type=checkbox]').required);
 assert.ok([...container.querySelectorAll('button')].find(b=>b.textContent.startsWith('Tiến hành thanh toán')).disabled);
});
test('Consultation admin DOM allows staff to see requests but disables settings',async()=>{
 uiApi=async path=>path==='/api/admin/consultation-config'?{config:{...consultationPlan,zaloPhone:'0900000000'}}:{requests:[]};
 await act(async()=>view.render(React.createElement(AdminConsultations,{owner:false})));
 assert.ok([...container.querySelectorAll('input,textarea')].every(e=>e.disabled));assert.equal([...container.querySelectorAll('button')].find(b=>b.textContent==='Lưu gói tư vấn').disabled,true);
});

test('Admin initial view reads only overview and catalog; tab reads are lazy',async()=>{
 const calls=[],fixture=adminFixture(true);uiApi=async(...args)=>{calls.push(args[0]);return fixture(...args);};
 await act(async()=>view.render(React.createElement(AdminPage)));
 assert.deepEqual(calls.sort(),['/api/admin/overview','/api/billing/access','/api/billing/plans'].sort());
 calls.length=0;await act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='Tài khoản').click());
 assert.deepEqual(calls,['/api/admin/users?q=']);assert.ok(!calls.includes('/api/admin/posts'));
});
const {useVisiblePolling}=component('apps/web/src/features/membership/use-visible-polling.ts');
test('Polling serializes slow requests, pauses hidden tabs and cancels on unmount',async()=>{
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,visibility=Object.getOwnPropertyDescriptor(document,'visibilityState');
 let visible=true,calls=0,signal,release;const jobs=new Map();let token=0;
 Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visible?'visible':'hidden'});
 globalThis.setTimeout=(fn,delay,...args)=>{if(delay===7000){const id=++token;jobs.set(id,fn);return id;}return originalSet(fn,delay,...args);};
 globalThis.clearTimeout=id=>{if(jobs.has(id))jobs.delete(id);else originalClear(id);};
 function Probe(){useVisiblePolling(true,s=>{calls++;signal=s;return new Promise(resolve=>{release=resolve;});});return null;}
 function fire(){const [id,fn]=jobs.entries().next().value;jobs.delete(id);fn();}
 try{
  await act(async()=>view.render(React.createElement(Probe)));assert.equal(jobs.size,1);
  await act(async()=>{fire();});assert.equal(calls,1);assert.equal(jobs.size,0);
  visible=false;await act(async()=>document.dispatchEvent(new window.Event('visibilitychange')));assert.equal(signal.aborted,true);assert.equal(jobs.size,0);
  visible=true;await act(async()=>document.dispatchEvent(new window.Event('visibilitychange')));assert.equal(calls,1);
  await act(async()=>release());assert.equal(jobs.size,1);
  await act(async()=>fire());assert.equal(calls,2);assert.equal(jobs.size,0);
  await act(async()=>view.render(null));assert.equal(signal.aborted,true);await act(async()=>release());assert.equal(jobs.size,0);
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;if(visibility)Object.defineProperty(document,'visibilityState',visibility);else delete document.visibilityState;}
});
