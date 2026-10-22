const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.join(__dirname,'..'),Rules=require('../packages/knowledge/src/tinh-canh-ranks.cjs');
const cache=new Map();
function load(file) {
 const full=path.join(root,file);if(cache.has(full))return cache.get(full);
 const module={exports:{}};
 const javascript=ts.transpileModule(fs.readFileSync(full,'utf8'),{fileName:full,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 function dependency(name) {
  if(name.endsWith('.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
  if(name.startsWith('@/'))name=path.join(root,'apps/web/src',name.slice(2));
  else if(name.startsWith('.'))name=path.resolve(path.dirname(full),name);
  else return require(name);
  const target=[name,name+'.ts',name+'.tsx',name+'.json'].find(p=>fs.existsSync(p));
  if(target.endsWith('.json'))return JSON.parse(fs.readFileSync(target,'utf8'));
  return load(path.relative(root,target));
 }
 new Function('module','exports','require',javascript)(module,module.exports,dependency);cache.set(full,module.exports);return module.exports;
}
const {medalDesign,emblemPaths}=load('apps/web/src/features/tinh-canh/medal-designs.ts');
test('eighteen artistic motifs retain canonical names, stages and thresholds',()=>{
 assert.equal(new Set(Rules.ranks.map(rank=>medalDesign(rank.level).motif)).size,18);
 for(const rank of Rules.ranks){const design=medalDesign(rank.level);for(const field of ['level','stage','stageName','name','points','badge'])assert.equal(design[field],rank[field]);assert.ok(design.description.length>=30);}
});
test('every center emblem is hand-distinct, bounded vector geometry independent of hue',()=>{
 assert.equal(emblemPaths.length,18);assert.equal(new Set(emblemPaths.map(paths=>paths.join('|'))).size,18);
 for(const paths of emblemPaths){assert.ok(paths.length>=2&&paths.length<=4);for(const d of paths){assert.ok(d.startsWith('M'));assert.doesNotMatch(d,/NaN|Infinity|url|script/);}}
});
test('art tier progression is explicit and the infinite tier is exclusive to eighteen',()=>{
 assert.deepEqual(Rules.ranks.map(rank=>medalDesign(rank.level).tier),[...Array(9).fill('base'),...Array(3).fill('illuminated'),...Array(3).fill('celestial'),'apex','apex','infinite']);
});
test('invalid display levels cannot index outside the eighteen designs',()=>{
 for(const value of [NaN,0,-5,-Infinity])assert.equal(medalDesign(value).level,1);
 assert.equal(medalDesign(Infinity).level,18);assert.equal(medalDesign(19).level,18);assert.equal(medalDesign(12.9).level,12);
});
test('public rank response rejects contradictory labels, points and fabricated levels',()=>{
 const {publicRankResponse}=load('apps/web/src/features/tinh-canh/public-rank-contract.ts');
 const raw={progress:{rank:Rules.ranks[17],points:0,rankSource:'admin'}};
 assert.equal(publicRankResponse(raw).points,0);assert.equal(publicRankResponse(raw).level,18);
 for(const value of [null,{}, {progress:null},{progress:{...raw.progress,rank:{...Rules.ranks[17],level:19}}},
 {progress:{...raw.progress,points:-1}},{progress:{...raw.progress,rank:{...Rules.ranks[17],name:'Fake'}}},
 {progress:{...raw.progress,rankSource:'purchased'}}])assert.throws(()=>publicRankResponse(value));
});
test('rendered medals have accessible canonical names and unique SVG reference IDs per instance',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const {TinhCanhMedal}=load('apps/web/src/components/tinh-canh-medal.tsx');
 const html=renderToStaticMarkup(React.createElement(React.Fragment,null,React.createElement(TinhCanhMedal,{level:18}),React.createElement(TinhCanhMedal,{level:18})));
 assert.match(html,/Vô Cực Tinh Đồ/);assert.equal((html.match(/data-detail="infinite-cosmos"/g)||[]).length,2);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);assert.equal(new Set(ids).size,ids.length);
 for(const match of html.matchAll(/url\(#([^\)]+)\)/g))assert.ok(ids.includes(match[1]));
});
