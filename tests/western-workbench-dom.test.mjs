import {test,beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),React=require('react'),{act}=React,ts=require('typescript'),{JSDOM}=require(process.env.THIENDO_DOM_TEST_MODULE);let dom,view,container,cache,downloads,selected,saved,catalogProvider;
function compile(path){path=resolve(path);if(cache.has(path))return cache.get(path).exports;const m={exports:{}};cache.set(path,m);const code=ts.transpileModule(readFileSync(path,'utf8'),{fileName:path,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('module','exports','require',code)(m,m.exports,id=>{if(id==='./secure-api'&&catalogProvider)return {westernCatalog:(...args)=>catalogProvider(...args)};if(id==='@/lib/download-blob')return {downloadBlobFile:(blob,name)=>downloads.push({blob,name})};if(id==='next/link')return {__esModule:true,default:({children,...p})=>React.createElement('a',p,children)};if(id.endsWith('.module.css'))return {__esModule:true,default:new Proxy({},{get:(_,k)=>String(k)})};if(id.startsWith('@/')||id.startsWith('.')){const base=id.startsWith('@/')?resolve('apps/web/src',id.slice(2)):resolve(dirname(path),id);for(const p of [base,base+'.ts',base+'.tsx',base+'.cjs'])if(existsSync(p))return p.endsWith('.cjs')?require(p):compile(p);}return require(id);});return m.exports;}
const numeric={method:'pythagorean-segmented-v1',name:'Nguyễn Văn An',date:'2004-03-12',year:2026,yMode:'consonant',masters:true};
const natal={method:'western-tropical-geocentric-whole-sign-v1',date:'2000-01-01',hour:19,minute:0,utcOffsetMinutes:420,offsetConfirmed:true,latitude:21.03,longitude:105.85,houseSystem:'whole-sign',orb:6};
const {studyWesternInput}=require('../packages/interpretation/src/western-depth.cjs'),{newAdvancedSpread}=require('../packages/astrology-engine/src/tarot-spreads.cjs');
beforeEach(()=>{catalogProvider=null;saved=new Map();dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});for(const [k,v]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true})){saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});}cache=new Map();downloads=[];selected=[];container=document.getElementById('root');view=require('react-dom/client').createRoot(container);});
afterEach(async()=>{await act(async()=>view.unmount());dom.window.close();for(const [k,v]of saved){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}});
async function render(C,props={}){await act(async()=>view.render(React.createElement(C,props)));}
function button(label){const node=[...container.querySelectorAll('button')].find(n=>n.textContent.includes(label));assert.ok(node,label);return node;}
async function choose(node,value){await act(async()=>{const proto=node.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(node,value);node.dispatchEvent(new window.Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
test('Natal topic, layers and wheel callbacks follow selected chart',async()=>{const C=compile('apps/web/src/features/western/natal-study-workbench.tsx').NatalStudyWorkbench;await render(C,{report:studyWesternInput(natal),onSelect:b=>selected.push(b)});await choose(container.querySelector('select'),'work');await act(async()=>button('Chọn Sao Thủy').click());assert.deepEqual(selected,['Mercury']);await act(async()=>button('Lĩnh vực nhà').click());assert.ok(container.textContent.includes('Nhà 10'));await act(async()=>button('Xem chủ tinh nhà 10').click());assert.equal(selected.length,2);await act(async()=>button('Góc hợp liên quan').click());assert.ok(container.querySelector('[role=status]'));});
test('Natal JSON exports measured positions without birth inputs',async()=>{const C=compile('apps/web/src/features/western/natal-study-workbench.tsx').NatalStudyWorkbench;await render(C,{report:studyWesternInput(natal),onSelect:()=>{}});await act(async()=>button('Xuất bàn đọc').click());const r=JSON.parse(await downloads[0].blob.text());assert.equal(r.planets.length,3);assert.equal(r.input,undefined);assert.equal(JSON.stringify(r).includes(natal.date),false);});
test('numeric date, metric and export update together',async()=>{const C=compile('apps/web/src/features/western/numerology-study.tsx').NumerologyStudy;await render(C,{input:numeric});await choose(container.querySelector('input'),'2026-10-23');assert.ok(container.textContent.includes('31 → 4'));await choose(container.querySelector('select'),'maturity');assert.ok(container.querySelector('[aria-label="Diễn giải chỉ số đã chọn"]').textContent.includes('Trưởng thành'));await act(async()=>button('Xuất hồ sơ').click());const r=JSON.parse(await downloads[0].blob.text());assert.equal(r.personalDate.personalDay.value,4);assert.equal(r.metrics.length,6);assert.equal(JSON.stringify(r).includes(numeric.name),false);});
test('invalid selected date has recovery and a changed report year resets its date',async()=>{const C=compile('apps/web/src/features/western/numerology-study.tsx').NumerologyStudy;await render(C,{input:numeric});await choose(container.querySelector('input'),'');assert.ok(container.querySelector('[role=alert]'));await choose(container.querySelector('input'),'2027-01-01');assert.ok(container.textContent.includes('Chọn ngày trong năm 2026'));await render(C,{input:{...numeric,year:2028}});assert.equal(container.querySelector('input').value,'2028-01-01');assert.equal(container.querySelector('[role=alert]'),null);});
test('no vowels means no invented soul-urge zero or profile',async()=>{const C=compile('apps/web/src/features/western/numerology-study.tsx').NumerologyStudy;await render(C,{input:{...numeric,name:'Y'}});await choose(container.querySelector('select'),'soulUrge');assert.ok(container.querySelector('[role=status]').textContent.includes('Không có chữ'));assert.equal(container.querySelector('[aria-label="Diễn giải chỉ số đã chọn"]'),null);});
test('Celtic Cross summary and full list share one filter',async()=>{const C=compile('apps/web/src/features/tarot/tarot-depth.tsx').TarotDepthReadingPanel;await render(C,{snapshot:newAdvancedSpread({spread:'celtic-cross',context:'work'},n=>new Uint8Array(n)),onContextChange:()=>{}});assert.ok(container.textContent.includes('bao phủ 10 / 10'));await choose(container.querySelector('select[aria-label="Vị trí để lọc tổ hợp Tarot"]'),'9');assert.ok(container.textContent.includes('9 / 45'));assert.equal(container.querySelectorAll('.tarot-combination-study').length,6);});
test('Jewish atlas removes Hermetic edges, Tarot search and columns; Hermetic filter works',async()=>{const C=compile('apps/web/src/app/western-symbols/page.tsx').default;await render(C);const system=container.querySelector('select');await choose(system,'jewish-source-only');const table=container.querySelector('[aria-label="Bảng 22 chữ Hebrew"] table');assert.equal(table.querySelectorAll('thead th').length,2);assert.equal(table.querySelectorAll('tbody tr').length,22);assert.equal(table.textContent.includes('↔'),false);await choose(container.querySelector('input[type=search]'),'The Fool');assert.equal(table.querySelectorAll('tbody tr').length,0);await choose(container.querySelector('input[type=search]'),'');await choose(system,'crowley-thoth');assert.ok(container.textContent.includes('không phải sơ đồ Thoth đã chuyển đổi'));const filter=[...container.querySelectorAll('select')].find(s=>s.textContent.includes('Toàn bộ 22 tuyến'));await choose(filter,'1');assert.equal(container.querySelectorAll('[aria-label="Bảng đối chiếu 22 tuyến Hermetic"] tbody tr').length,3);});

for (const discipline of ['astrology','tarot','numerology']) test('3D observatory '+discipline+' selects lessons, separates layers and resets without changing calculation state',async()=>{
 const {SymbolObservatory}=compile('apps/web/src/features/western/symbol-observatory.tsx');
 const {observatoryLessons}=compile('apps/web/src/features/western/observatory-lessons.ts');
 await render(SymbolObservatory,{discipline});
 const scene=container.querySelector('[data-step]');
 assert.equal(scene.getAttribute('aria-hidden'),'true');
 assert.equal(scene.dataset.running,'false');
 const group=container.querySelector('[aria-label="Chọn lớp học biểu tượng"]');
 assert.equal(group.querySelectorAll('button').length,4);
 for(const [i,b] of [...group.querySelectorAll('button')].entries()){
  await act(async()=>b.click());
  assert.equal(scene.dataset.step,String(i));
  assert.equal(group.querySelectorAll('[aria-pressed=true]').length,1);
  const lesson=observatoryLessons[discipline].steps[i];
  for(const text of [lesson.read,lesson.check,lesson.pitfall,lesson.practice]) assert.ok(container.querySelector('article').textContent.includes(text));
 }
 await act(async()=>button('Tách các lớp').click());assert.equal(scene.dataset.separated,'false');
 await act(async()=>button('Tự xoay mô hình').click());assert.equal(scene.dataset.running,'true');
 await act(async()=>button('Đặt lại góc nhìn').click());
 assert.equal(scene.dataset.running,'false');assert.equal(scene.dataset.separated,'true');assert.equal(scene.dataset.step,'0');
 assert.equal(container.querySelector('input[type=range]').value,'0');
 assert.equal(saved.size>0,true);
});

const catalogNavigation={planets:Array.from({length:10},(_,i)=>({body:'Body'+i,name:'Thiên thể '+i})),signs:Array.from({length:12},(_,i)=>({name:'Cung '+i})),houses:Array.from({length:12},(_,i)=>({number:i+1,area:'Nhà '+(i+1)})),aspects:Array.from({length:5},(_,i)=>({name:'Góc '+i,angle:i*30})),contexts:{}};
function catalogPacket(tab,index){return {navigation:catalogNavigation,item:{name:tab+':'+index,theme:'Nội dung '+tab+':'+index}};}
async function tapTab(label){const t=[...container.querySelectorAll('[role=tab]')].find(n=>n.textContent===label);assert.ok(t,label);await act(async()=>t.click());return t;}
test('manual tabs move keyboard focus without requests; each group remembers its item and cached visits do not refetch',async()=>{
 const calls=[];catalogProvider=async(tab,index)=>{calls.push(tab+':'+index);return catalogPacket(tab,index);};
 await render(compile('apps/web/src/features/western/western-knowledge.tsx').WesternKnowledge);
 await choose(container.querySelector('select'),'2');
 const first=container.querySelector('[role=tab]');first.focus();
 await act(async()=>first.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
 assert.equal(document.activeElement.textContent,'12 cung Hoàng đạo');assert.deepEqual(calls,['planets:0','planets:2']);
 await tapTab('12 cung Hoàng đạo');await choose(container.querySelector('select'),'5');await tapTab('10 thiên thể');
 assert.equal(container.querySelector('select').value,'2');assert.ok(container.textContent.includes('Nội dung planets:2'));
 await tapTab('12 cung Hoàng đạo');assert.equal(container.querySelector('select').value,'5');assert.ok(container.textContent.includes('Nội dung signs:5'));
 assert.deepEqual(calls,['planets:0','planets:2','signs:0','signs:5']);
 const active=container.querySelector('[role=tab][aria-selected=true]'),panel=document.getElementById(active.getAttribute('aria-controls'));
 assert.equal(panel.hidden,false);assert.equal(panel.getAttribute('aria-labelledby'),active.id);assert.equal(container.querySelectorAll('[role=tabpanel]:not([hidden])').length,1);
});
test('late catalog response cannot overwrite a different tab; failed current item can retry',async()=>{
 const pending=[];catalogProvider=(tab,index,signal)=>new Promise((resolve,reject)=>pending.push({tab,index,signal,resolve,reject}));
 await render(compile('apps/web/src/features/western/western-knowledge.tsx').WesternKnowledge);
 assert.ok(container.querySelector('[role=status]'));
 await tapTab('12 nhà');assert.equal(pending[0].signal.aborted,true);
 await act(async()=>pending[1].resolve(catalogPacket('houses',0)));assert.ok(container.textContent.includes('Nội dung houses:0'));
 await act(async()=>pending[0].resolve(catalogPacket('planets',0)));assert.ok(!container.textContent.includes('Nội dung planets:0'));
 await choose(container.querySelector('select'),'4');await act(async()=>pending[2].reject(Error('Mạng tạm gián đoạn')));
 assert.ok(container.querySelector('[role=alert]').textContent.includes('Mạng tạm gián đoạn'));assert.equal(container.querySelector('select').value,'4');
 await act(async()=>button('Thử lại mục tri thức').click());await act(async()=>pending[3].resolve(catalogPacket('houses',4)));
 assert.equal(container.querySelector('[role=alert]'),null);assert.ok(container.textContent.includes('Nội dung houses:4'));
});
test('catalog unmount aborts in-flight work; independent tab sets have unique accessible panel IDs',async()=>{
 let signal;catalogProvider=(_t,_i,s)=>{signal=s;return new Promise(()=>{});};
 await render(compile('apps/web/src/features/western/western-knowledge.tsx').WesternKnowledge);
 await act(async()=>view.render(React.createElement('div')));assert.equal(signal.aborted,true);
 const C=compile('apps/web/src/app/western-symbols/page.tsx').default;await render(C);
 const tabs=[...container.querySelectorAll('[role=tab]')];assert.equal(new Set(tabs.map(t=>t.id)).size,tabs.length);
 for(const t of tabs)assert.ok(document.getElementById(t.getAttribute('aria-controls')));
});

test('deferred expert panels start on demand and retain controls across mode changes',async()=>{
 const {ViewModeProvider,ExpertOnly,useViewMode}=compile('apps/web/src/components/view-mode.tsx');let mounts=0;
 function Child(){const [value,setValue]=React.useState(0);React.useEffect(()=>{mounts++},[]);return React.createElement('button',{onClick:()=>setValue(v=>v+1)},'Count '+value);}
 function Shell(){const {mode,setMode}=useViewMode();return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>setMode(mode==='basic'?'expert':'basic')},'Toggle mode'),React.createElement(ExpertOnly,{title:'Deep fixture',defer:true},React.createElement(Child)));}
 await render(ViewModeProvider,{children:React.createElement(Shell)});assert.equal(mounts,0);assert.equal(container.textContent.includes('Count'),false);
 await act(async()=>button('Xem chi tiết').click());assert.equal(mounts,1);await act(async()=>button('Count 0').click());
 await act(async()=>button('Toggle mode').click());assert.equal(container.querySelector('[hidden]').textContent,'Count 1');
 await act(async()=>button('Toggle mode').click());assert.equal(mounts,1);assert.ok(button('Count 1'));assert.equal(window.localStorage.getItem('thiendo-view-mode'),'expert');
});
