'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const ts=require('./helpers-typeloader.cjs');
const root=resolve(__dirname,'..');
const source=file=>readFileSync(resolve(root,file),'utf8');

function layoutEffects(file){
 const input=source(file);
 const ast=ts.createSourceFile(file,input,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const effects=[];
 function visit(node){
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useLayoutEffect'){
   const callback=node.arguments[0];
   const deps=node.arguments[1];
   effects.push({body:callback?.getText(ast)||'',deps:deps?.getText(ast)||''});
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);
 assert.equal(ast.parseDiagnostics.length,0,'TSX remains parseable');
 return effects;
}

test('A67: Western route changes cannot recommit brightness or toggle a global motion fence',()=>{
 const effects=layoutEffects('apps/web/src/components/shell.tsx');
 const palette=effects.filter(effect=>effect.body.includes('localStorage.setItem(STORAGE_THEME'));
 const world=effects.filter(effect=>effect.body.includes('dataset.westernWorld'));
 assert.equal(palette.length,1);
 assert.equal(world.length,1);
 assert.equal(palette[0].deps,'[light, resolvedLight, preferencesReady]');
 assert.equal(world[0].deps,'[westernWorld?.id]');
 assert.ok(!world[0].body.includes('thiendoThemeChanging'));
 assert.ok(!world[0].body.includes('STORAGE_THEME'));
 assert.ok(!world[0].body.includes('dataset.thiendoTheme'));
});

test('A67: post-login route-check outage falls back only to the unprivileged chart',()=>{
 const provider=source('apps/web/src/components/auth-provider.tsx');
 const body=provider.split('const completeLogin = useCallback(async')[1]?.split('}, [router,pathname]')[0];
 assert.ok(body,'authenticated POST completion callback is present');
 assert.match(body,/let destination = '\/chart';/);
 assert.match(body,/try\s*\{ destination = await loginDestination\(pathname, window\.location\.search,undefined,result\.destination\); \}/);
 assert.match(body,/catch\s*\{[^}]*server protects \/admin/);
 assert.match(body,/if\(generation\.current!==id\)return;\s*router\.replace\(destination\)/);
 assert.doesNotMatch(body,/result\.user\.role\s*===\s*['"]admin/);
});

test('A67: unsafe login next and malformed admin receipts still fail closed', async()=>{
 const vm=require('node:vm');
 const load=(file,imports={})=>{
  const module={exports:{}};
  const transpiled=ts.transpileModule(source(file),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(transpiled,{module,exports:module.exports,URLSearchParams,require:name=>imports[name]});
  return module.exports;
 };
 const contract=load('apps/web/src/features/membership/admin-session-contract.ts');
 const safe=require('../apps/web/src/lib/tool-access.cjs');
 const run=(response)=>load('apps/web/src/lib/login-destination.ts',{
  './api':{api:async()=>response},'./tool-access.cjs':safe,
  '@/features/membership/admin-session-contract':contract,
 }).loginDestination;
 assert.equal(await run({destination:'/chart'})('/login','?next=https://evil.example'),'/chart');
 await assert.rejects(run({isAdmin:'true',isOwner:false})('/login',''));
 assert.equal(await run({destination:'/admin'})('/login','?next=/chart'),'/admin');
});


test('A67: nested mouseover events do not rerender shell for an identical tooltip',()=>{
 const shell=source('apps/web/src/components/shell.tsx');
 assert.match(shell,/setTooltip\(current => current\?\.label===next\.label && current\.left===next\.left && current\.top===next\.top \? current : next\)/);
 assert.match(shell,/onScroll=\{\(\)=>setTooltip\(null\)\}/);
});
