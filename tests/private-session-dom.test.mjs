/** Real AuthProvider + API transport in jsdom/React; navigation is recorded. Not browser rendering. */
import {test,before,beforeEach,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),React=require('react'),ts=require('typescript');
if(!process.env.THIENDO_DOM_TEST_MODULE)throw Error('Explicit isolated THIENDO_DOM_TEST_MODULE required');
const {JSDOM}=require(process.env.THIENDO_DOM_TEST_MODULE),{act}=React;
let dom,root,container,createRoot,context,nav,published,unmounted,readMe,api,AuthProvider,useAuth;
const saved=new Map(),user={id:'10000000-0000-4000-8000-000000000001',email:'fixture@example.invalid'};
function install(key,value){if(!saved.has(key))saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
function compile(file,imports={}){const m={exports:{}};const code=ts.transpileModule(readFileSync(resolve(file),'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('module','exports','require',code)(m,m.exports,id=>id in imports?imports[id]:require(id));return m.exports;}
before(()=>{
 install('IS_REACT_ACT_ENVIRONMENT',true);
 api=compile('apps/web/src/lib/api.ts');
 ({AuthProvider,useAuth}=compile('apps/web/src/components/auth-provider.tsx',{
  '@/lib/api':api,
  '@/lib/session-exit':{LOGOUT_REVISION_KEY:'test.logout',logoutRevision:()=>null,publishLogout:()=>published++,concealSession:()=>document.documentElement.setAttribute('data-session-suspended','true'),replaceWithOpening:()=>{nav++;document.documentElement.setAttribute('data-session-suspended','true');}},
  'next/navigation':{useRouter:()=>({replace:()=>{}}),usePathname:()=>'/chart'},
  '@/lib/login-destination':{loginDestination:async()=>'/chart'},
  '@/lib/use-pending-operation':{},'@/lib/account-error':{},
  'next/dynamic':()=>()=>null,'./google-auth-button':{},'./account-form-controls':{},'./account-settings.css':{},
 }));
});
function Private(){React.useEffect(()=>()=>{unmounted++;},[]);return React.createElement('p',{'data-private':true},'PRIVATE CHART CONTENT');}
function Probe(){context=useAuth();return context.user?React.createElement(Private):React.createElement('p',null,'Guest');}
beforeEach(async()=>{
 dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/chart',pretendToBeVisual:true});nav=0;published=0;unmounted=0;context=null;readMe=async()=>({user});
 install('window',dom.window);install('document',dom.window.document);install('navigator',dom.window.navigator);install('HTMLElement',dom.window.HTMLElement);install('Event',dom.window.Event);
 install('requestAnimationFrame',dom.window.requestAnimationFrame.bind(dom.window));install('cancelAnimationFrame',dom.window.cancelAnimationFrame.bind(dom.window));
 install('BroadcastChannel',class{postMessage(){}close(){}});
 install('fetch',async path=>new Response(JSON.stringify(path==='/api/auth/me'?await readMe():{message:'Controlled rejection'}),{status:path==='/api/auth/me'?200:401,headers:{'content-type':'application/json'}}));
 ({createRoot}=require('react-dom/client'));container=document.getElementById('root');root=createRoot(container);
 await act(async()=>{root.render(React.createElement(AuthProvider,null,React.createElement(Probe)));});
 assert.match(container.textContent,/PRIVATE CHART CONTENT/);
});
afterEach(async()=>{await act(async()=>root.unmount());dom.window.close();});
after(()=>{for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
test('server-confirmed private 401 unmounts sensitive UI and returns to opening once',async()=>{
 await act(async()=>{await assert.rejects(api.api('/api/huyen-giai/generate'),e=>e.status===401);});
 assert.equal(container.querySelector('[data-private]'),null);assert.match(container.textContent,/Đang trở về trang mở đầu/);assert.equal(nav,1);assert.equal(published,1);assert.equal(unmounted,1);assert.equal(document.documentElement.getAttribute('data-session-suspended'),'true');
 await act(async()=>window.dispatchEvent(new Event(api.SESSION_EXPIRED_EVENT)));assert.equal(nav,1);assert.equal(published,1);
});
test('late profile reload cannot restore private identity after the session was rejected',async()=>{
 let release;readMe=()=>new Promise(resolve=>{release=resolve;});let pending;
 await act(async()=>{pending=context.reload();});
 await act(async()=>{await assert.rejects(api.api('/api/charts'),e=>e.status===401);});
 await act(async()=>{release({user});await pending;});
 assert.equal(container.querySelector('[data-private]'),null);assert.equal(nav,1);assert.equal(published,1);
});
test('wrong credential 401 leaves a known valid session and its screen intact',async()=>{
 await act(async()=>{await assert.rejects(api.api('/api/auth/password',{method:'POST',body:{currentPassword:'wrong'}}),e=>e.status===401);});
 assert.match(container.textContent,/PRIVATE CHART CONTENT/);assert.equal(nav,0);assert.equal(published,0);assert.equal(unmounted,0);
});
test('missing domain permission does not masquerade as an expired session',async()=>{
 globalThis.fetch=async()=>new Response('{"message":"Permission denied"}',{status:403});
 await act(async()=>{await assert.rejects(api.api('/api/admin/insights/ask'),e=>e.status===403);});
 assert.match(container.textContent,/PRIVATE CHART CONTENT/);assert.equal(nav,0);assert.equal(published,0);
});
test('unmount removes the session-expiry listener',async()=>{
 await act(async()=>root.unmount());root={unmount(){}};await act(async()=>window.dispatchEvent(new Event(api.SESSION_EXPIRED_EVENT)));assert.equal(nav,0);assert.equal(published,0);
});
