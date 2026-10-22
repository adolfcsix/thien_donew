const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const file=path.join(__dirname,'../apps/web/src/lib/western-worlds.ts');
const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('module','exports',out)(mod,mod.exports);const{getWesternWorld,westernWorlds,westernThemeKey}=mod.exports;
test('exactly the five existing Western branches have independent identities',()=>{
 assert.equal(westernWorlds.length,5);assert.equal(new Set(westernWorlds.map(w=>w.id)).size,5);
 for(const w of westernWorlds){assert.equal(getWesternWorld(w.path).id,w.id);assert.equal(getWesternWorld(w.path+'/?entry=example#result').id,w.id)}
});
test('subroutes inherit their world without leaking to similarly named paths or Eastern/admin pages',()=>{
 assert.equal(getWesternWorld('/western-astrology/relationship').id,'astrology');
 for(const p of ['/','/chart','/bazi','/forum','/admin','/research','/research/schools','/research/developmental','/tarotish','/numerology-archive','/login'])assert.equal(getWesternWorld(p),undefined,p);
});
test('branch theme storage never overwrites the original site preference or another branch',()=>{
 const keys=westernWorlds.map(w=>westernThemeKey(w.id));assert.equal(new Set(keys).size,5);assert.ok(keys.every(k=>k!=='thiendo-theme'));
});
function luminance(hex){return hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const [hi,lo]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (hi+.05)/(lo+.05)}
test('all ten palette pairs meet text and control-edge contrast against both solid surfaces',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../apps/web/src/app/western-worlds.css'),'utf8');
 for(const world of westernWorlds)for(const mode of ['dark','light']){
  const selector='.site[data-western-world="'+world.id+'"]'+(mode==='light'?'.light':'')+'{';
  const rule=css.slice(css.indexOf(selector)+selector.length).split('}')[0];
  const value=key=>rule.match(new RegExp('--'+key+':(#[a-f0-9]{6})'))?.[1];
  for(const surface of ['panel','panel-alt']){
   for(const ink of ['text','muted','gold'])assert.ok(contrast(value(ink),value(surface))>=4.5,world.id+' '+mode+' '+ink+' / '+surface);
   assert.ok(contrast(value('line-strong'),value(surface))>=3,world.id+' '+mode+' control edge / '+surface);
  }
 }
});
