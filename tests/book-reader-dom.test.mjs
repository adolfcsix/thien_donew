/** Real reader route/components in React DOM; controlled API, not browser or SQL acceptance. */
import {test,before,beforeEach,afterEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),React=require('react'),{act}=React,ts=require('typescript');
if(!process.env.THIENDO_DOM_TEST_MODULE)throw Error('Explicit isolated jsdom required');
const {JSDOM}=require(process.env.THIENDO_DOM_TEST_MODULE),saved=new Map();
let dom,view,container,Reader,owner,slug,request,calls,cache;
function install(k,v){if(!saved.has(k))saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});}
function compile(file){file=resolve(file);if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);
 const js=ts.transpileModule(readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',js)(name=>{
  if(name==='next/navigation')return {useParams:()=>({slug})};
  if(name==='next/link')return {__esModule:true,default:({children,...p})=>React.createElement('a',p,children)};
  if(name==='@/components/auth-provider')return {useAuth:()=>({user:owner?{id:owner}:null,loading:false,open:()=>{}})};
  if(name==='@/lib/api')return {api:async(path,options)=>{calls.push({owner,path,options});return request(path,options);}};
  if(name.endsWith('.module.css'))return {__esModule:true,default:new Proxy({},{get:(_,k)=>String(k)})};
  if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?resolve('apps/web/src',name.slice(2)):resolve(dirname(file),name);for(const p of [base,base+'.ts',base+'.tsx',base+'.cjs'])if(existsSync(p))return p.endsWith('.cjs')?require(p):compile(p);}
  return require(name);
 },mod,mod.exports);return mod.exports;
}
function fixture(path){
 if(path.endsWith('/open'))return {allowed:true,format:'epub'};
 if(path.endsWith('/progress'))return {saved:true};
 if(path.endsWith('/chapters'))return {chapters:[0,1,2].map(index=>({index,title:['Khởi đầu','Đối chiếu','Ghi chú'][index]}))};
 if(/\/chapters\/\d+$/.test(path)){const index=Number(path.split('/').at(-1));return {chapter:{index,title:'Chương '+(index+1),text:`Text ${slug} ${index} ${owner??'guest'}`},total:3};}
 return {book:{id:'10000000-0000-4000-8000-000000000001',slug,title:'Shared reference',format:'epub',accessLevel:'free'},canRead:true,progress:owner?{position:owner==='alice'?1:0,bookmarks:owner==='alice'?[1]:[],favorite:false}:null};
}
before(()=>install('IS_REACT_ACT_ENVIRONMENT',true));
beforeEach(async()=>{dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/books/book-one/read'});for(const [k,v]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement}))install(k,v);owner='alice';slug='book-one';calls=[];request=fixture;cache=new Map();Reader=compile('apps/web/src/app/books/[slug]/read/page.tsx').default;const {createRoot}=require('react-dom/client');container=document.getElementById('root');view=createRoot(container);await render();});
async function render(){await act(async()=>view.render(React.createElement(Reader)));}
function button(text){const b=[...container.querySelectorAll('button')].find(b=>b.textContent.includes(text));assert.ok(b,'Missing button '+text);return b;}
afterEach(async()=>{await act(async()=>view.unmount());dom.window.close();});
after(()=>{for(const [k,d]of saved){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}});
test('switching account on a free book clears the previous account progress and chapter',async()=>{
 assert.ok(container.textContent.includes('Text book-one 1 alice'));owner='bob';await render();assert.ok(container.textContent.includes('Text book-one 0 bob'));assert.equal(container.textContent.includes('Text book-one 1 alice'),false);assert.equal(container.textContent.includes('★ 2'),false);
});
test('paired navigation clicks send only one progress write',async()=>{
 calls.length=0;await act(async()=>{button('Sau').click();button('Sau').click();});assert.equal(calls.filter(c=>c.path.endsWith('/progress')).length,1);assert.ok(container.textContent.includes('Text book-one 2 alice'));
});
test('an unconfirmed or failed save keeps the current chapter and can retry',async()=>{
 request=path=>path.endsWith('/progress')?{saved:false}:fixture(path);await act(async()=>button('Sau').click());assert.ok(container.textContent.includes('Text book-one 1 alice'));assert.ok(container.querySelector('[role="alert"]'));request=fixture;await act(async()=>button('Thử lưu lại').click());assert.ok(container.textContent.includes('Text book-one 2 alice'));
});
test('chapter failure removes stale chapter text and provides a working retry',async()=>{
 request=path=>{if(path.endsWith('/chapters/2'))throw Error('Controlled chapter outage');return fixture(path);};await act(async()=>button('Sau').click());assert.equal(container.textContent.includes('Text book-one 1 alice'),false);assert.ok(container.textContent.includes('Controlled chapter outage'));request=fixture;await act(async()=>button('Thử tải chương').click());assert.ok(container.textContent.includes('Text book-one 2 alice'));
});
test('a pending save cannot restore the previous account chapter after identity changes',async()=>{
 let release,signal;request=(path,options)=>path.endsWith('/progress')?new Promise(r=>{release=r;signal=options.signal;}):fixture(path);await act(async()=>button('Sau').click());owner='bob';await render();assert.equal(signal.aborted,true);await act(async()=>release({saved:true}));assert.ok(container.textContent.includes('Text book-one 0 bob'));assert.equal(container.textContent.includes('Text book-one 2 alice'),false);
});
test('a malformed chapter response cannot replace verified reading content',async()=>{
 request=path=>path.endsWith('/chapters/2')?{chapter:{index:0,title:'Wrong chapter',text:'WRONG PRIVATE CONTENT'},total:3}:fixture(path);await act(async()=>button('Sau').click());assert.equal(container.textContent.includes('WRONG PRIVATE CONTENT'),false);assert.ok(container.querySelector('[role="alert"]'));
});
test('guest progress stays temporary and never writes to an account',async()=>{
 owner=null;await render();calls.length=0;await act(async()=>button('Sau').click());assert.equal(calls.some(c=>c.path.endsWith('/progress')),false);assert.ok(container.textContent.includes('Text book-one 1 guest'));assert.ok(container.textContent.includes('tạm trong trang'));
});
test('chapter search, jump and text size controls work without resetting progress',async()=>{
 const search=container.querySelector('input[type="search"]');assert.ok(search);await act(async()=>{const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;setter.call(search,'đối chiếu');search.dispatchEvent(new window.Event('input',{bubbles:true}));});assert.equal(container.querySelector('nav[aria-label="Mục lục EPUB"]').querySelectorAll('button').length,1);
 const sizeBefore=container.querySelector('article').style.fontSize;await act(async()=>button('Chữ lớn').click());assert.notEqual(container.querySelector('article').style.fontSize,sizeBefore);assert.ok(container.textContent.includes('Text book-one 1 alice'));
 const jump=container.querySelector('input[type="number"]');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(jump,'3');jump.dispatchEvent(new window.Event('input',{bubbles:true}));});await act(async()=>jump.closest('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.ok(container.textContent.includes('Text book-one 2 alice'));
});

test('switching book aborts an old chapter load and never displays its late response',async()=>{
 let release,signal;request=(path,options)=>path.endsWith('/book-one/chapters/2')?new Promise(r=>{release=r;signal=options.signal;}):fixture(path);await act(async()=>button('Sau').click());slug='book-two';await render();assert.equal(signal.aborted,true);await act(async()=>release({chapter:{index:2,title:'Old book',text:'LATE OLD BOOK'},total:3}));assert.ok(container.textContent.includes('Text book-two 1 alice'));assert.equal(container.textContent.includes('LATE OLD BOOK'),false);
});
test('truncated chapters disclose display limits and link to the authorized original file',async()=>{
 request=path=>path.endsWith('/chapters/2')?{chapter:{index:2,title:'Long chapter',text:'Bounded content',truncated:true,originalCharacters:125000},total:3}:fixture(path);await act(async()=>button('Sau').click());assert.ok(container.textContent.includes('120.000'));const link=[...container.querySelectorAll('a')].find(a=>a.textContent.includes('Tải tệp EPUB gốc'));assert.ok(link);assert.equal(link.getAttribute('href'),'/api/books/book-one/file');assert.equal(link.getAttribute('download'),'book-one.epub');
});
