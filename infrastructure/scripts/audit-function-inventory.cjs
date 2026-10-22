/** Static AST inventory. Candidates are NOT proof of interaction or authorization. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'apps/web/src');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const relative=p=>path.relative(root,p).split(path.sep).join('/');
const sources=walk(base).filter(p=>/\.(tsx?|cjs)$/.test(p));const modules=new Map();
for(const file of sources){
 const text=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),imports=[],controls=[],state=[];let jsx=false;
 const resolveImport=raw=>{const target=raw.startsWith('@/')?path.join(base,raw.slice(2)):raw.startsWith('.')?path.resolve(path.dirname(file),raw):null;
  if(!target)return null;return [target,...['.ts','.tsx','.cjs','/index.ts','/index.tsx'].map(x=>target+x)].find(x=>fs.existsSync(x)&&fs.statSync(x).isFile());};
 function visit(n){
  if(ts.isImportDeclaration(n)&&ts.isStringLiteral(n.moduleSpecifier)){const target=resolveImport(n.moduleSpecifier.text);if(target)imports.push(target);}
  if(ts.isCallExpression(n)&&/^(useState|useReducer|useRef)$/.test(n.expression.getText(ast))){state.push({hook:n.expression.getText(ast),line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1});}
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
   jsx=true;const tag=n.tagName.getText(ast),attrs=n.attributes.properties.filter(ts.isJsxAttribute);const names=attrs.map(a=>a.name.getText(ast));
   if(/^(button|a|input|select|textarea|summary|form|option|Link|Button|Dialog|Modal|Tabs|Slider)$/.test(tag)||names.some(x=>/^on(Click|Submit|KeyDown|Change|PointerDown)$/.test(x))||names.includes('tabIndex')){
    const props=Object.fromEntries(attrs.filter(a=>a.initializer).map(a=>[a.name.getText(ast),a.initializer.getText(ast).slice(0,240)]));
    controls.push({id:relative(file)+':'+(ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1)+':'+controls.length,tag,line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,props,status:'NOT TESTED',evidence:'Static JSX candidate only; repeated runtime instances and rendered labels require browser verification'});
   }
  }
  ts.forEachChild(n,visit);
 }
 visit(ast);modules.set(file,{file:relative(file),imports:imports.map(relative),controls,state,jsx,apiCandidates:[...new Set([...text.matchAll(/["'`]((?:\/api\/)[^"'`\s]*)/g)].map(m=>m[1]))]});
}
const pages=sources.filter(p=>/\/app\/.*\/page\.tsx$/.test(p)||p===path.join(base,'app/page.tsx'));
function closure(file,seen=new Set()){if(seen.has(file)||!modules.has(file))return seen;seen.add(file);for(const child of modules.get(file).imports)closure(path.join(root,child),seen);return seen;}
const routes=pages.map(file=>{
 const route='/'+path.relative(path.join(base,'app'),path.dirname(file)).split(path.sep).filter(p=>p&&!/^\(.*\)$/.test(p)).join('/');const deps=[...closure(file)].map(p=>modules.get(p));
 // Layout dependencies are listed explicitly; their controls remain in the global inventory.
 const layouts=[];let dir=path.dirname(file);while(dir.startsWith(path.join(base,'app'))){if(fs.existsSync(path.join(dir,'layout.tsx')))layouts.push(relative(path.join(dir,'layout.tsx')));dir=path.dirname(dir);}
 return {route,component:relative(file),components:deps.filter(d=>d.jsx).map(d=>d.file),layouts,audience:'NOT VERIFIED: inspect service authorization; route names are not a policy',actions:deps.flatMap(d=>d.controls.map(c=>c.id)),apiCandidates:[...new Set(deps.flatMap(d=>d.apiCandidates))],database:'NOT VERIFIED; module-level SQL hints in endpoint-matrix.json',state:deps.filter(d=>d.state.length).map(d=>({file:d.file,hooks:d.state})),dependencies:deps.map(d=>d.file),status:'NOT TESTED',evidence:'AST import/reference trace; no runtime PASS inferred'};
}).sort((a,b)=>a.route.localeCompare(b.route));
const out=path.join(root,'docs/current');fs.mkdirSync(out,{recursive:true});
const summary={routes:routes.length,sourceModules:modules.size,jsxModules:[...modules.values()].filter(m=>m.jsx).length,interactionCandidates:[...modules.values()].reduce((n,m)=>n+m.controls.length,0),runtimeInteractionsVerified:0};
fs.writeFileSync(path.join(out,'function-inventory.json'),JSON.stringify({kind:'STATIC_AST_INVENTORY',limitations:'Literal JSX candidates only. Dynamic arrays, spreads, custom controls, portals and rendered instances require runtime review. Import closures exclude external packages, dynamic imports and inherited layout descendants. No per-route role/database assertion is inferred.',summary,routes,modules:[...modules.values()]},null,2)+'\n');
const escape=s=>String(s).replaceAll('|','\\|');
fs.writeFileSync(path.join(root,'FUNCTION_INVENTORY.md'),'# Function inventory — A83 audit round 1\n\nStatic AST inventory, not runtime acceptance.\n\n'+Object.entries(summary).map(([k,v])=>'- '+k+': '+v).join('\n')+'\n\nFull interaction IDs, handler expressions, state hooks, local dependency graph, API candidates and layout references: `docs/current/function-inventory.json`. Backend controller/service/module table hints: `docs/current/endpoint-matrix.json`. Roles and table links remain NOT VERIFIED until service-level and database tests are traced.\n\n| Route | Component | Reachable JSX modules | Control candidates | Status |\n|---|---|---:|---:|---|\n'+routes.map(r=>`| ${escape(r.route)} | ${r.component} | ${r.components.length} | ${r.actions.length} | NOT TESTED |`).join('\n')+'\n');
console.log(JSON.stringify(summary));
