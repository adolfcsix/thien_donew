/** Enforce the first protected boundary; does not claim that public UI/content cannot be copied. */
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),require=createRequire(import.meta.url),ts=require('typescript');
const privatePaths=['packages/astrology-engine/src/western-natal.cjs','packages/astrology-engine/src/western-relationship.cjs','packages/interpretation/src/western-depth.cjs','packages/interpretation/src/relationship-reading.cjs','packages/knowledge/src/western-depth-v11127.json','packages/knowledge/src/relationship-depth-v11128.json'];
const blocked=new Set(privatePaths.map(p=>resolve(root,p))),seen=new Set(),failures=[];let imports=0;
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
function target(from,name){let base;if(name.startsWith('@/'))base=resolve(root,'apps/web/src',name.slice(2));else if(name.startsWith('.'))base=resolve(dirname(from),name);else if(name.startsWith('@thiendo/')){const [scope,pkg,...rest]=name.split('/');base=resolve(root,'packages',pkg,...rest);if(!rest.length)base=resolve(base,JSON.parse(readFileSync(join(base,'package.json'),'utf8')).main);}else return null;
 return [base,...['.ts','.tsx','.cjs','.mjs','.js','.json','/index.ts','/index.tsx','/index.cjs'].map(s=>base+s)].find(p=>existsSync(p)&&extname(p));}
function visit(file,chain=[]){if(blocked.has(file)){failures.push([...chain,relative(root,file)].join(' -> '));return;}if(seen.has(file)||!/[.](?:tsx?|cjs|mjs|js)$/.test(file)||/[.]d[.](?:ts|cts)$/.test(file))return;seen.add(file);
 const parsed=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 function follow(name){const to=target(file,name);if(to){imports++;visit(to,[...chain,relative(root,file)]);}}
 function walk(n){if(ts.isImportDeclaration(n)&&ts.isStringLiteral(n.moduleSpecifier)){const c=n.importClause,b=c?.namedBindings;if(c?.isTypeOnly||(!c?.name&&b&&ts.isNamedImports(b)&&b.elements.every(e=>e.isTypeOnly)))return;follow(n.moduleSpecifier.text);return;}
 if(ts.isCallExpression(n)&&n.arguments.length===1&&ts.isStringLiteral(n.arguments[0])&&((ts.isIdentifier(n.expression)&&n.expression.text==='require')||n.expression.kind===ts.SyntaxKind.ImportKeyword))follow(n.arguments[0].text);
 if(ts.isExportDeclaration(n)&&!n.isTypeOnly&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier))follow(n.moduleSpecifier.text);ts.forEachChild(n,walk);}
 walk(parsed);
}
for(const p of files(resolve(root,'apps/web/src')))visit(p);
let artifacts=0;
if(process.argv.includes('--build')){
 const dir=resolve(root,'apps/web/.next/static');if(!existsSync(dir))failures.push('Missing production build');else for(const p of files(dir)){artifacts++;if(/\.(?:map|zip|sql|ts|tsx|cts|cjs)$/.test(p))failures.push('Unexpected public artifact: '+relative(root,p));if(p.endsWith('.js')){const text=readFileSync(p,'utf8');for(const marker of ['Thiếu chủ tinh truyền thống.','minor-arc-longitude-midpoints','localSiderealDegrees'])if(text.includes(marker))failures.push('Private calculation marker in '+relative(root,p)+': '+marker);}}
}
console.log(JSON.stringify({status:failures.length?'FAIL':'PASS',privatePaths,webReachableModules:seen.size,imports,publicArtifacts:artifacts,failures,...(process.argv.includes('--inventory')?{reachableModules:[...seen].map(p=>relative(root,p)).sort()}:{}),scope:'Natal + Natal reading + Synastry/Composite only. Other disciplines still contain public client logic; UI/assets/rendered content remain copyable.'},null,2));if(failures.length)process.exitCode=1;
