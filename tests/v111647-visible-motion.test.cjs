const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ts=require('./helpers-typeloader.cjs');
function harness(withObserver=true){
 const listeners=new Set(),instances=[];
 const document={visibilityState:'visible',addEventListener:(name,fn)=>{assert.equal(name,'visibilitychange');listeners.add(fn)},removeEventListener:(name,fn)=>listeners.delete(fn)};
 class Observer{constructor(callback){this.callback=callback;this.targets=new Set();this.disconnected=false;instances.push(this)}observe(node){this.targets.add(node)}unobserve(node){this.targets.delete(node)}disconnect(){this.disconnected=true;this.targets.clear()}}
 const module={exports:{}};const src=fs.readFileSync(path.join(__dirname,'../apps/web/src/lib/visible-motion.ts'),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{module,exports:module.exports,document,...(withObserver?{IntersectionObserver:Observer}:{})});
 return {observe:module.exports.observeVisibleMotion,document,instances,listeners,visibility:state=>{document.visibilityState=state;listeners.forEach(fn=>fn())}};
}
test('many animated medals share one viewport observer and release every target on unmount',()=>{
 const h=harness(),nodes=Array.from({length:30},()=>({dataset:{}})),stops=nodes.map(h.observe);
 assert.equal(h.instances.length,1);assert.equal(h.listeners.size,1);assert.equal(h.instances[0].targets.size,30);
 stops[0]();assert.equal(h.instances[0].targets.size,29);assert.equal(h.listeners.size,1);
 stops.slice(1).forEach(stop=>stop());assert.equal(h.instances[0].targets.size,0);assert.equal(h.instances[0].disconnected,true);assert.equal(h.listeners.size,0);
 const stop=h.observe({dataset:{}});assert.equal(h.instances.length,2);stop();assert.equal(h.listeners.size,0);
});
test('visibility and intersection combine correctly and queued removed targets are ignored',()=>{
 const h=harness(),a={dataset:{}},b={dataset:{}},stopA=h.observe(a),stopB=h.observe(b),io=h.instances[0];
 assert.equal(a.dataset.paused,'true');io.callback([{target:a,isIntersecting:true},{target:b,isIntersecting:false}]);assert.equal(a.dataset.paused,'false');assert.equal(b.dataset.paused,'true');
 h.visibility('hidden');assert.equal(a.dataset.paused,'true');h.visibility('visible');assert.equal(a.dataset.paused,'false');assert.equal(b.dataset.paused,'true');
 stopA();io.callback([{target:a,isIntersecting:false}]);assert.equal(a.dataset.paused,'false');stopB();
});
test('browsers without IntersectionObserver still pause motion in background tabs',()=>{
 const h=harness(false),node={dataset:{}},stop=h.observe(node);assert.equal(node.dataset.paused,'false');h.visibility('hidden');assert.equal(node.dataset.paused,'true');stop();assert.equal(h.listeners.size,0);
});
