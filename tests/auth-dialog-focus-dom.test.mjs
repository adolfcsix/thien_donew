/** Real AuthProvider, native controls and pending-operation hook, controlled RAF.
 * DOM timing regression only; not a substitute for Chromium/WebKit acceptance.
 */
import {test,before,beforeEach,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),React=require('react'),ts=require('typescript'),{act}=React;
if(!process.env.THIENDO_DOM_TEST_MODULE)throw Error('Explicit isolated THIENDO_DOM_TEST_MODULE required');
const {JSDOM}=require(process.env.THIENDO_DOM_TEST_MODULE);
const saved=new Map();let dom,root,context,frames,nextFrame,AuthProvider,useAuth,createRoot,resetCalls,releaseReset;
function install(key,value){if(!saved.has(key))saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
function compile(file,imports={}){
 const m={exports:{}};const code=ts.transpileModule(readFileSync(resolve(file),'utf8'),{fileName:file,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('module','exports','require',code)(m,m.exports,id=>id in imports?imports[id]:require(id));return m.exports;
}
before(()=>{
 const pending=compile('apps/web/src/lib/use-pending-operation.ts');
 const controls=compile('apps/web/src/components/account-form-controls.tsx');
 ({AuthProvider,useAuth}=compile('apps/web/src/components/auth-provider.tsx',{
  '@/lib/api':{SESSION_EXPIRED_EVENT:'test.expired',accountApi:{me:async()=>({user:null}),
   requestPasswordReset:async()=>({challengeId:'test-reset'}),
   confirmPasswordReset:async()=>{resetCalls++;await new Promise(r=>{releaseReset=r;});}},api:async()=>({user:null})},
  '@/lib/dialog-viewport.cjs':require('../apps/web/src/lib/dialog-viewport.cjs'),
  '@/lib/session-exit':{LOGOUT_REVISION_KEY:'test.logout',logoutRevision:()=>null,publishLogout(){},concealSession(){},replaceWithOpening(){}},
  'next/navigation':{useRouter:()=>({replace(){}}),usePathname:()=>'/login'},
  '@/lib/login-destination':{loginDestination:async()=>'/chart'},
  '@/lib/use-pending-operation':pending,'@/lib/account-error':{accountError:()=> 'Controlled error'},
  'next/dynamic':()=>()=>null,'./google-auth-button':{GoogleAuthButton:()=>null},
  './account-form-controls':controls,'./account-settings.css':{},
 }));
});
function Probe(){context=useAuth();return React.createElement('button',{id:'opener'},'Open account');}
beforeEach(async()=>{
 dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/login',pretendToBeVisual:true});
 frames=new Map();nextFrame=0;resetCalls=0;releaseReset=null;
 const raf=fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancel=id=>frames.delete(id);
 dom.window.requestAnimationFrame=raf;dom.window.cancelAnimationFrame=cancel;
 for(const [key,value] of Object.entries({IS_REACT_ACT_ENVIRONMENT:true,window:dom.window,document:dom.window.document,
  navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,
  requestAnimationFrame:raf,cancelAnimationFrame:cancel,BroadcastChannel:class{postMessage(){}close(){}}}))install(key,value);
 ({createRoot}=require('react-dom/client'));root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(AuthProvider,null,React.createElement(Probe))));
});
afterEach(async()=>{await act(async()=>root.unmount());dom.window.close();});
after(()=>{for(const [key,value] of saved){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
async function flush(){await act(async()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(0));});}
async function open(screen='recover'){
 document.getElementById('opener').focus();await act(async()=>context.open(screen));
}
async function fill(input,value){await act(async()=>{
 Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,value);
 input.dispatchEvent(new window.Event('input',{bubbles:true}));
});}
async function recovery(){
 await open();const email=document.getElementById('recovery-email');
 await fill(email,'fixture@example.invalid');
 await act(async()=>email.form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
 const code=document.querySelector('input[autocomplete="one-time-code"]');
 const password=document.querySelector('input[autocomplete="new-password"]');
 assert.ok(code&&!code.disabled&&password);return {code,password};
}
test('delayed recovery autofocus never redirects new-password input back into OTP',async()=>{
 const {code,password}=await recovery();await fill(code,'654321');password.focus();
 await flush();assert.ok(document.activeElement===password,'queued autofocus stole the password field');
 await fill(document.activeElement,'R65Recovery!password');
 assert.equal(code.value,'654321');assert.equal(password.value,'R65Recovery!password');
 assert.equal(password.form.querySelector('button[type="submit"]').disabled,false);
});
test('opening autofocus preserves an input or close control already chosen by the user',async()=>{
 await open('login');const password=document.querySelector('input[type="password"]');password.focus();
 await flush();assert.ok(document.activeElement===password);
 await act(async()=>context.close());await open('login');
 const close=document.querySelector('button[aria-label="Đóng cửa sổ tài khoản"]');close.focus();
 await flush();assert.ok(document.activeElement===close);
});
test('without intervening input focus, opening and recovery still focus the first enabled field',async()=>{
 await open();await flush();assert.ok(document.activeElement===document.getElementById('recovery-email'));
 await act(async()=>context.close());const {code}=await recovery();await flush();assert.ok(document.activeElement===code);
});
test('closing cancels queued focus and restores the opening control',async()=>{
 await open();await act(async()=>context.close());await flush();
 assert.equal(document.querySelector('[role="dialog"]'),null);
 assert.ok(document.activeElement===document.getElementById('opener'));
});
test('valid recovery remains enabled, double submit sends once and pending disables controls',async()=>{
 const {code,password}=await recovery();await fill(code,'654321');await fill(password,'R65Recovery!password');
 await flush();await act(async()=>{
  password.form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  password.form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 });
 assert.equal(resetCalls,1);assert.equal(code.disabled,true);assert.equal(password.disabled,true);
 await act(async()=>releaseReset());
 assert.match(document.body.textContent,/Đã đặt lại mật khẩu/);
});
