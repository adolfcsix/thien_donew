const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),ts=require('./helpers-typeloader.cjs');
function harness({initial=false,reduced=false,unsupported=false,throwAnimate=false}={}){
 const listeners=new Map(),media=[],ios=[],mutations=[],animations=[];
 function listen(target){target.addEventListener=(name,fn)=>{listeners.set(target+name,fn)};target.removeEventListener=(name,fn)=>{if(listeners.get(target+name)===fn)listeners.delete(target+name)};return target;}
 const document=listen({toString:()=> 'document',visibilityState:'visible',activeElement:null,documentElement:{dataset:{}}});
 const nodes=Array.from({length:12},(_,i)=>({i,getBoundingClientRect:()=>({width:100,height:100,top:i===0?20:1100,bottom:i===0?120:1200}),contains:n=>n===nodes?.[i],animate(frames,options){if(throwAnimate)throw Error('No animation');const a={frames,options,cancelled:false,cancel(){this.cancelled=true;this.oncancel?.()}};animations.push({node:this,a});return a;}}));
 const root=listen({toString:()=> 'root',querySelectorAll:()=>nodes,contains:n=>nodes.includes(n)});
 class Observer{constructor(callback){this.callback=callback;this.targets=new Set();ios.push(this)}observe(n){this.targets.add(n)}unobserve(n){this.targets.delete(n)}disconnect(){this.targets.clear()}}
 class Mutation{constructor(fn){this.callback=fn;mutations.push(this)}observe(){}disconnect(){this.disconnected=true}}
 class Element{};Element.prototype.animate=function(){};
 const module={exports:{}};const source=fs.readFileSync(require('node:path').join(__dirname,'../apps/web/src/lib/scroll-reveal.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,document,Element,innerHeight:900,IntersectionObserver:unsupported?undefined:Observer,MutationObserver:Mutation,matchMedia:q=>{const m=listen({toString:()=>q,matches:q.includes('reduced-motion')&&reduced});media.push(m);return m;}});
 const stop=module.exports.installScrollReveal(root,initial);
 return {nodes,root,document,stop,ios,media,listeners,mutations,animations,enter(...targets){ios[0].callback(targets.map(target=>({target,isIntersecting:true})))},change(){for(const [key,fn]of listeners)if(key.includes('change'))fn()},focus(n){document.activeElement=n;n.closest=()=>n;listeners.get('rootfocusin')({target:n})}};
}
test('visible SSR card is not faded on hydration; lower cards animate once and leave no styles',()=>{
 const h=harness();assert.equal(h.animations.length,0);assert.equal(h.ios[0].targets.has(h.nodes[0]),false);h.enter(h.nodes[1]);assert.equal(h.animations.length,1);assert.equal(h.animations[0].a.options.id,'thiendo-reveal');h.animations[0].a.onfinish();assert.equal(h.animations[0].a.cancelled,true);h.enter(h.nodes[1]);assert.equal(h.animations.length,1);h.stop();
});
test('keyboard focus cancels an active reveal and removes a pending reveal immediately',()=>{
 const h=harness();h.enter(h.nodes[1]);h.focus(h.nodes[1]);assert.equal(h.animations[0].a.cancelled,true);h.focus(h.nodes[2]);h.enter(h.nodes[2]);assert.equal(h.animations.length,1);h.stop();
});
test('reduced motion starts entirely visible and preference change cancels active motion',()=>{
 const reduced=harness({reduced:true});assert.equal(reduced.ios[0].targets.size,0);assert.equal(reduced.animations.length,0);reduced.stop();
 const h=harness();h.enter(h.nodes[1]);h.media[0].matches=true;h.change();assert.equal(h.animations[0].a.cancelled,true);assert.equal(h.ios[0].targets.size,0);h.stop();
});
test('hidden tab and lightweight effects cancel animations; cleanup disconnects and removes listeners',()=>{
 const h=harness();h.enter(h.nodes[1]);h.document.visibilityState='hidden';h.change();assert.equal(h.animations[0].a.cancelled,true);h.document.visibilityState='visible';h.document.documentElement.dataset.thiendoEffects='reduced';h.mutations[0].callback();assert.equal(h.ios[0].targets.size,0);h.stop();assert.equal(h.listeners.size,0);assert.equal(h.mutations[0].disconnected,true);h.enter(h.nodes[3]);assert.equal(h.animations.length,1);
});
test('simultaneous reveals and stagger are bounded; decoration does not create an unbounded animation queue',()=>{
 const h=harness();h.enter(...h.nodes.slice(1));assert.equal(h.animations.length,3);assert.equal(Math.max(...h.animations.map(x=>x.a.options.delay)),70);assert.equal(h.ios[0].targets.size,0);h.stop();assert.equal(h.animations.every(x=>x.a.cancelled),true);
});
test('missing observer or unsupported animation degrades to visible content without listeners',()=>{
 const h=harness({unsupported:true});assert.equal(h.listeners.size,0);assert.equal(h.animations.length,0);h.stop();
 const throwing=harness({throwAnimate:true});assert.doesNotThrow(()=>throwing.enter(throwing.nodes[1]));throwing.stop();
});
test('admin can request an entrance for new real-data cards without hiding headings or changing values',()=>{
 const h=harness({initial:true});assert.equal(h.animations.length,1);assert.equal(h.animations[0].node,h.nodes[0]);h.stop();
});
