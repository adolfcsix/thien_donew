/** Actual React hook and response contracts in DOM, controlled API. No browser/SQL claims. */
import {test,before,beforeEach,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),React=require('react'),{act}=React,ts=require('typescript');
if(!process.env.THIENDO_DOM_TEST_MODULE)throw Error('Explicit isolated THIENDO_DOM_TEST_MODULE required');
const {JSDOM}=require(process.env.THIENDO_DOM_TEST_MODULE),saved=new Map(),id=n=>'10000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
let dom,view,container,state,request,olderCalls,useHuyenGiai;
const answer={summary:'Verified fixture answer',findings:[],missingData:[]};
const message=n=>({id:id(n),question:'Question '+n,response:answer,engineRevision:'fixture',createdAt:'2026-10-01T00:00:00Z'});
const page=(conversation,items,cursor=null)=>({conversation:{id:conversation,chartId:null,mode:'basic',topic:'overview'},messages:items.map(message),nextBefore:cursor});
function install(key,value){if(!saved.has(key))saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
function compile(file){const m={exports:{}};const code=ts.transpileModule(readFileSync(resolve(file),'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('module','exports','require',code)(m,m.exports,name=>{
 if(name==='@/lib/api')return {api:(...args)=>request(...args),chartApi:{list:async()=>({charts:[]})}};
 if(name==='./request-scope'||name==='./response-contract')return compile('apps/web/src/features/huyen-giai/'+name.slice(2)+'.ts');return require(name);
});return m.exports;}
before(()=>{install('IS_REACT_ACT_ENVIRONMENT',true);({useHuyenGiai}=compile('apps/web/src/features/huyen-giai/use-huyen-giai.ts'));});
function Probe(){state=useHuyenGiai();return React.createElement('main',null,state.nextBefore&&React.createElement('button',{disabled:state.historyLoading,onClick:()=>void state.loadEarlier()},'Earlier'),React.createElement('p',{'data-error':true},state.error),React.createElement('ol',null,...state.messages.map(m=>React.createElement('li',{key:m.id},m.question))));}
beforeEach(async()=>{
 dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/huyen-giai'});install('window',dom.window);install('document',dom.window.document);install('navigator',dom.window.navigator);install('HTMLElement',dom.window.HTMLElement);olderCalls=0;
 request=async path=>{
  if(path.endsWith('/status'))return {ai:{enabled:true,model:'controlled',disclaimer:'Fixture'},limits:{dailyUserCalls:5}};
  if(path==='/api/huyen-giai/conversations')return {conversations:[]};
  if(path.includes('?before=')){olderCalls++;return page(id(100),[1,2]);}
  if(path.endsWith(id(101)))return page(id(101),[9]);
  if(path.endsWith(id(100)))return page(id(100),[3,4],id(3));
  throw Error('Unexpected API '+path);
 };
 const {createRoot}=require('react-dom/client');container=document.getElementById('root');view=createRoot(container);await act(async()=>view.render(React.createElement(Probe)));await act(async()=>state.openConversation(id(100)));assert.equal(state.messages.length,2);
});
afterEach(async()=>{await act(async()=>view.unmount());dom.window.close();});
after(()=>{for(const [key,d]of saved){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}});
test('earlier button prepends history, preserves current answers and synchronously prevents duplicate loads',async()=>{
 await act(async()=>{const button=container.querySelector('button');button.click();button.click();});
 assert.equal(olderCalls,1);assert.deepEqual(state.messages.map(m=>m.question),['Question 1','Question 2','Question 3','Question 4']);assert.equal(state.nextBefore,null);assert.equal(container.querySelector('button'),null);assert.equal(state.historyLoading,false);
});
test('failed older read preserves messages/cursor and permits retry',async()=>{
 const original=request;request=async path=>{if(path.includes('?before='))throw Error('Offline fixture');return original(path);};
 await act(async()=>state.loadEarlier());assert.equal(state.messages.length,2);assert.equal(state.nextBefore,id(3));assert.match(state.error,/Offline/);assert.equal(state.historyLoading,false);
 request=original;await act(async()=>state.loadEarlier());assert.equal(state.messages.length,4);
});
test('late older response cannot overwrite a different selected conversation',async()=>{
 const original=request;let release,pending;request=async path=>path.includes('?before=')?new Promise(r=>{release=r;}):original(path);
 await act(async()=>{pending=state.loadEarlier();});await act(async()=>state.openConversation(id(101)));
 await act(async()=>{release(page(id(100),[1,2]));await pending;});assert.equal(state.conversationId,id(101));assert.deepEqual(state.messages.map(m=>m.question),['Question 9']);assert.equal(state.nextBefore,null);assert.equal(state.historyLoading,false);
});
test('reset cancels pending pagination and clears its cursor before creating a new conversation',async()=>{
 const original=request;let release,pending;request=async path=>path.includes('?before=')?new Promise(r=>{release=r;}):original(path);
 await act(async()=>{pending=state.loadEarlier();});await act(async()=>state.reset());await act(async()=>{release(page(id(100),[1,2]));await pending;});assert.equal(state.conversationId,null);assert.equal(state.messages.length,0);assert.equal(state.nextBefore,null);
});
test('non-advancing or malformed page cannot erase the already displayed messages',async()=>{
 const original=request;request=async path=>path.includes('?before=')?page(id(100),[3,4],id(3)):original(path);
 await act(async()=>state.loadEarlier());assert.equal(state.messages.length,2);assert.equal(state.nextBefore,id(3));assert.match(state.error,/Mốc lịch sử/);assert.equal(state.historyLoading,false);
 request=async path=>path.includes('?before=')?page(id(100),[1,1]):original(path);await act(async()=>state.loadEarlier());assert.equal(state.messages.length,2);assert.match(state.error,/không hợp lệ/);
});
