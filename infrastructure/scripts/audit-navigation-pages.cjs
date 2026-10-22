/** Static route/menu evidence; does not infer that buttons or external services work. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),app=path.join(root,'apps/web/src/app');
const ts=require(require.resolve('typescript',{paths:[path.join(root,'apps/web'),root]}));
const navSource=fs.readFileSync(path.join(root,'apps/web/src/lib/navigation.ts'),'utf8'),result={exports:{}};
vm.runInNewContext(ts.transpileModule(navSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:result,exports:result.exports});
const routes=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.name==='page.tsx'){let route='/'+path.relative(app,path.dirname(file)).split(path.sep).filter(s=>s&&!/^\(.+\)$/.test(s)).join('/');routes.push({route,source:path.relative(root,file).split(path.sep).join('/')});}}}walk(app);
const exists=href=>{const pathname=href.split(/[?#]/)[0]||'/';return routes.some(r=>r.route===pathname||new RegExp('^'+r.route.split('/').map(s=>s.startsWith('[...')?'.+':s.startsWith('[')?'[^/]+':s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('/')+'/?$').test(pathname))};
const shell=fs.readFileSync(path.join(root,'apps/web/src/components/shell.tsx'),'utf8');
const menu=[...result.exports.navigationItems.map(item=>({...item,origin:'navigationItems'})),...[...shell.matchAll(/href="(\/[^"]*)"/g)].map(m=>({href:m[1],origin:'shell literal link'})),{href:'/admin',origin:'conditional AdminNavLink'}];
const links=routes.flatMap(route=>{const text=fs.readFileSync(path.join(root,route.source),'utf8');return [...text.matchAll(/href="(\/[^"]*)"/g)].map(m=>({from:route.route,href:m[1],exists:exists(m[1])}));});
const missing=[...menu.filter(m=>!exists(m.href)).map(m=>({from:m.origin,href:m.href})),...links.filter(l=>!l.exists)];
const dataset=require(path.join(root,'packages/knowledge/src/development-matrix.json'));
for(const row of dataset.records)if(row.route&&!exists(row.route))missing.push({from:'development-matrix:'+row.id,href:row.route});
const output={scope:'Static route existence and declared discipline scope only. No proof of button behavior, published records, expert validation or external providers.',status:missing.length?'FAIL':'PASS',pageModules:routes.length,menuDestinations:[...new Set(menu.map(m=>m.href))].length,menu:menu.map(m=>({...m,exists:exists(m.href)})),routes,literalPageLinks:links,missing,declaredCapabilities:dataset.records.map(row=>({id:row.id,name:row.name,route:row.route,library:row.library,calculator:row.calculator,analysis:row.analysis,gap:row.gap,next:row.next})),scopeDefinitions:dataset.definitions};
const target=process.argv[2];if(target){fs.mkdirSync(path.dirname(path.resolve(target)),{recursive:true});fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');}
console.log(JSON.stringify({status:output.status,pageModules:output.pageModules,menuDestinations:output.menuDestinations,literalPageLinks:links.length,missing},null,2));if(missing.length)process.exitCode=1;
