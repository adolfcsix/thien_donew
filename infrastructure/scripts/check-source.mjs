/** V10.8 offline-friendly source integrity and direct dependency checks.
 * Parses TypeScript when locally available and ensures all relative imports
 * resolve. This is NOT a substitute for a full build/typecheck with npm deps.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative, extname, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync, execFile } from 'node:child_process';
import { collectModuleSpecifiers, undeclaredImports } from './dependency-contract.mjs';
import {isNextGeneratedTypeImport,isDeferredBuildIdentityImport,deferredSqlTestSource} from './source-import-policy.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const issues = [];
const files=[];
const extension = /\.(?:ts|tsx|js|cjs|mjs|css)$/;
for(const top of ['apps','packages','infrastructure','tests']) {
  function walk(dir) {
    for(const d of readdirSync(dir,{withFileTypes:true})) {
      if(['node_modules','.next','dist','.git'].includes(d.name)) continue;
      const pathname=join(dir,d.name);
      if(d.isDirectory()) walk(pathname);
      else if(extension.test(d.name)) files.push(pathname);
    }
  }
  walk(join(root,top));
}
let ts;
try { ts=require('typescript'); }
catch {
  try { const p=execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim();ts=require(resolve(p,'typescript')); }
  catch {issues.push('TypeScript parser missing. Run npm install, or install typescript globally.');}
}
const appManifests = Object.fromEntries(['apps/web','apps/api'].map(path => [path, JSON.parse(readFileSync(resolve(root, path, 'package.json'), 'utf8'))]));
let parsed=0,syntaxJS=0,tsFiles=0,refs=0,checkedDirectImports=0,deferredGeneratedRefs=0,deferredBuildRefs=0;
const syntaxQueue=[];
const candidates=(base)=>[base,...['.ts','.tsx','.d.ts','.js','.cjs','.mjs','.json','.css','/index.ts','/index.tsx','/index.js','/index.cjs','/index.mjs'].map(x=>base+x)];
for(const file of files) {
  const source=readFileSync(file,'utf8'), ex=extname(file);
  if(['.ts','.tsx'].includes(ex)){
    tsFiles++;
    if(ts) {
      const parsedFile=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ex==='.tsx'?ts.ScriptKind.TSX:ts.ScriptKind.TS);
      for(const err of parsedFile.parseDiagnostics)issues.push(`${relative(root,file)}:${parsedFile.getLineAndCharacterOfPosition(err.start||0).line+1}: ${ts.flattenDiagnosticMessageText(err.messageText,' ')}`);
      parsed++;
    }
  }else if(['.js','.cjs','.mjs'].includes(ex)){
    syntaxQueue.push(file);
  }
  // Every directly imported third-party module must be declared by its own app.
  // This catches packages accidentally working only through npm hoisting.
  const appPath = relative(root, file).replaceAll('\\', '/');
  const appName = Object.keys(appManifests).find(path => appPath.startsWith(`${path}/`));
  if (ts && appName && !appPath.endsWith('.css')) {
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
      ex === '.tsx' ? ts.ScriptKind.TSX : ex === '.ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS);
    const imported = collectModuleSpecifiers(ts, sourceFile);
    checkedDirectImports += imported.length;
    for (const name of undeclaredImports(imported, appManifests[appName])) {
      issues.push(`${appPath}: undeclared direct dependency ${name} (add it to ${appName}/package.json)`);
    }
  }
  // Parse executable syntax; documentation strings and comments are not imports.
  const specifiers = ex === '.css'
    ? [...source.matchAll(/@import\s+['"](\.{1,2}\/[^'"\n]+)['"]/g)].map(match => match[1])
    : ts ? collectModuleSpecifiers(ts, ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
      ex === '.tsx' ? ts.ScriptKind.TSX : ex === '.ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS)) : [];
  for(const specifier of specifiers.filter(value => /^\.{1,2}\//.test(value))){
    refs++;
    const target=resolve(dirname(file),specifier);
    if(!candidates(target).some(existsSync)){
      if(isNextGeneratedTypeImport(appPath,specifier))deferredGeneratedRefs++;
      else if(isDeferredBuildIdentityImport(appPath,specifier) && existsSync(resolve(root,'apps/api/src/common/e2e-identity.ts')))deferredBuildRefs++;
      else {
        const testBuildSource = deferredSqlTestSource(appPath,specifier);
        if(testBuildSource && existsSync(resolve(root,testBuildSource)))deferredBuildRefs++;
        else issues.push(`${relative(root,file)}: missing relative import ${specifier}`);
      }
    }
  }
}
// Bound subprocess concurrency and each check; preserve node --check semantics.
// Hundreds of serial Node startups can exhaust the release gate's deadline.
let nextSyntax=0;
await Promise.all(Array.from({length:Math.min(4,syntaxQueue.length)},async()=>{
 while(nextSyntax<syntaxQueue.length){
  const file=syntaxQueue[nextSyntax++];
  await new Promise(resolveCheck=>execFile(process.execPath,['--check',file],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024},(error,_stdout,stderr)=>{
   syntaxJS++;
   if(error)issues.push(`${relative(root,file)}: ${String(stderr||error.message).trim().slice(0,320)}`);
   resolveCheck();
  }));
 }
}));
console.log(`Source checks: TS/TSX parsed ${parsed}/${tsFiles}, JS syntax ${syntaxJS}, relative imports ${refs}, direct dependency imports ${checkedDirectImports}, deferred Next generated types ${deferredGeneratedRefs}, deferred built API identity ${deferredBuildRefs}, inspected files ${files.length}`);
if(issues.length){ for(const e of issues)console.error('FAIL '+e);process.exitCode=1; }
else console.log('Source integrity PASS. Does not imply full Next.js/NestJS build or database E2E.');
