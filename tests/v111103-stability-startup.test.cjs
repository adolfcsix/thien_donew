'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,unlinkSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
const ROOT=resolve(__dirname,'..');
const load=()=>import(pathToFileURL(join(ROOT,'infrastructure/scripts/dependency-install-check.mjs')).href);
const source=path=>readFileSync(join(ROOT,path),'utf8');

test('V11.110.3 empty node_modules can never pass dependency and CLI readiness', async()=>{
 const {inspectDependencyInstallation}=await load();
 const root=mkdtempSync(join(tmpdir(),'thiendo-deps-empty-'));
 try {
  const errors=inspectDependencyInstallation(root);
  assert.ok(errors.length>=10);
  assert.ok(errors.some(e=>e.includes('@nestjs/core')));
  assert.ok(errors.some(e=>e.includes('next')));
  assert.ok(errors.some(e=>e.includes('concurrently executable')));
 } finally {rmSync(root,{recursive:true,force:true});}
});

test('V11.110.3 package resolution and binary shims are independently required',async()=>{
 const {inspectDependencyInstallation,REQUIRED_PACKAGES,REQUIRED_COMMANDS}=await load();
 const root=mkdtempSync(join(tmpdir(),'thiendo-deps-mock-'));
 try {
  for(const p of REQUIRED_PACKAGES){
   const dir=join(root,'node_modules',p.name);
   mkdirSync(dir,{recursive:true});
   writeFileSync(join(dir,'package.json'),JSON.stringify({name:p.name,version:'1.0.0'}));
  }
  for(const bin of REQUIRED_COMMANDS){
   const dir=join(root,'node_modules/.bin');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,bin.name),'mock');
  }
  assert.deepEqual(inspectDependencyInstallation(root),[]);
  unlinkSync(join(root,'node_modules/.bin/nest'));
  assert.match(inspectDependencyInstallation(root).join('\n'),/nest executable is missing/);
  writeFileSync(join(root,'node_modules/.bin/nest'),'mock');
  unlinkSync(join(root,'node_modules/@nestjs/core/package.json'));
  assert.match(inspectDependencyInstallation(root).join('\n'),/@nestjs\/core is missing/);
 } finally {rmSync(root,{recursive:true,force:true});}
});

test('V11.110.3 Windows command shims require .cmd and not Unix executables',async()=>{
 const {inspectDependencyInstallation}=await load();
 const root=mkdtempSync(join(tmpdir(),'thiendo-win-deps-'));
 try{
  const errors=inspectDependencyInstallation(root,{packages:[],commands:[{owner:'apps/web',name:'next'}],platform:'win32'});
  assert.match(errors.join('\n'),/next.cmd executable is missing/);
  const dir=join(root,'node_modules/.bin');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'next'),'unix');
  assert.match(inspectDependencyInstallation(root,{packages:[],commands:[{owner:'apps/web',name:'next'}],platform:'win32'}).join('\n'),/next.cmd executable is missing/);
  writeFileSync(join(dir,'next.cmd'),'windows');
  assert.deepEqual(inspectDependencyInstallation(root,{packages:[],commands:[{owner:'apps/web',name:'next'}],platform:'win32'}),[]);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('V11.110.3 startup blocks partial dependencies; checking does not reinstall or modify DB',()=>{
 const start=source('START_THIEN_DO_WINDOWS.bat');
 const checks=source('RUN_CHECKS_WINDOWS.bat');
 const doctor=source('infrastructure/scripts/local-runtime-doctor.mjs');
 assert.match(start,/local-runtime-doctor\.mjs/);
 assert.match(start,/if errorlevel 1 \(/);
 assert.match(doctor,/inspectDependencyInstallation/);
 assert.match(checks,/dependency-install-check\.mjs/);
 for(const text of [start,checks]){
  assert.doesNotMatch(text,/npm\.cmd (?:ci|install)/);
  assert.doesNotMatch(text,/db:migrate|test:e2e|docker compose|DROP DATABASE/i);
 }
});


test('V11.110.3 startup detects occupied Next/Nest ports without touching other services',async()=>{
 const {canBindLoopback}=await import(pathToFileURL(join(ROOT,'infrastructure/scripts/local-port-check.mjs')).href);
 const {createServer}=require('node:net');
 const server=createServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{
  const port=server.address().port;
  assert.equal(await canBindLoopback(port),false);
  assert.equal(await canBindLoopback(0),false);
  assert.equal(await canBindLoopback(65536),false);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
