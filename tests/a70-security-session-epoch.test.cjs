'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const ts = require('./helpers-typeloader.cjs');
const root = resolve(__dirname,'..');
const security = readFileSync(resolve(root,'apps/web/src/components/account-security-extras.tsx'),'utf8');
const auth = readFileSync(resolve(root,'apps/web/src/components/auth-provider.tsx'),'utf8');

function extractedFunction(name,source=security){
  const ast=ts.createSourceFile('security.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let result;
  const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text===name)result=node.getText(ast);ts.forEachChild(node,visit);};
  visit(ast);
  assert.ok(result,`${name} must be present in TSX`);
  return ts.transpileModule(result,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText + `\nreturn ${name};`;
}
function extractedArrow(name,source=security){
  const ast=ts.createSourceFile('security.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let result;
  const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)result=node.initializer.getText(ast);ts.forEachChild(node,visit);};
  visit(ast);assert.ok(result,`${name} must be present in TSX`);
  return ts.transpileModule(`const ${name} = ${result};`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText + `\nreturn ${name};`;
}
function snapshotHarness(){
  const readGeneration={current:0},mounted={current:true};
  const pending=[];
  const state={};
  const api=path=>new Promise((resolve,reject)=>pending.push({path,resolve,reject}));
  const setSessions=value=>state.sessions=value;
  const setEmail=value=>state.email=value;
  const setEvents=value=>state.events=value;
  const reload=new Function('readGeneration','mounted','api','setSessions','setEmail','setEvents',extractedFunction('reload'))(
    readGeneration,mounted,api,setSessions,setEmail,setEvents);
  function settleBatch(batch,marker){
    for(const entry of pending.slice(batch*3,batch*3+3)){
      entry.resolve(entry.path.endsWith('/sessions')?{sessions:[marker]}:
        entry.path.endsWith('/status')?{verified:marker}: {events:[marker]});
    }
  }
  return {reload,readGeneration,mounted,pending,state,settleBatch};
}

test('A70: newer server snapshot wins when an earlier /sessions GET arrives late',async()=>{
  const h=snapshotHarness();
  const old=h.reload(),fresh=h.reload();
  h.settleBatch(1,'current'); await fresh;
  assert.deepEqual(h.state.sessions,['current']);
  h.settleBatch(0,'stale'); await old;
  assert.deepEqual(h.state.sessions,['current']);
  assert.equal(h.state.email.verified,'current');
  assert.deepEqual(h.state.events,['current']);
});

test('A70: retired snapshot cannot resurrect revoked sessions after successful mutation',async()=>{
  const h=snapshotHarness();
  const stale=h.reload();
  ++h.readGeneration.current; // action POST begins, invalidates old GET
  const afterMutation=h.reload();
  h.settleBatch(1,'after-revoke');await afterMutation;
  h.settleBatch(0,'before-revoke');await stale;
  assert.deepEqual(h.state.sessions,['after-revoke']);
});

test('A70: unmount prevents stale security data being written to detached profile',async()=>{
  const h=snapshotHarness();
  const pending=h.reload();
  h.mounted.current=false;++h.readGeneration.current;
  h.settleBatch(0,'past-account');await pending;
  assert.deepEqual(h.state,{});
});

test('A70: stale failed request does not surface as an error over latest successful data',async()=>{
  const h=snapshotHarness();
  const older=h.reload(),newer=h.reload();
  h.settleBatch(1,'fresh');await newer;
  h.pending[0].reject(new Error('old network failure'));
  h.pending[1].resolve({verified:false});h.pending[2].resolve({events:[]});
  await assert.doesNotReject(older);
  assert.deepEqual(h.state.sessions,['fresh']);
});

test('A70: self-session revocation publishes logout and navigates to opening without reloading protected route',async()=>{
  const invoked=[];
  const publishLogout=()=>invoked.push('signal');
  const replaceWithOpening=()=>invoked.push('opening');
  const api=async(path,options)=>{assert.equal(path,'/api/auth/sessions/revoke');assert.equal(options.body.sessionId,'self');return {revoked:true,currentSession:true};};
  const perform=async(action)=>{const result=await action();invoked.push(`receipt:${result}`);};
  const confirm=()=>true;
  const busyRef={current:false};
  const revoke=new Function('busyRef','confirm','perform','api','publishLogout','replaceWithOpening',extractedArrow('revoke'))(
    busyRef,confirm,perform,api,publishLogout,replaceWithOpening);
  revoke({id:'self',current:true});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(invoked,['signal','opening','receipt:null']);
  assert.doesNotMatch(security,/window\.location\.reload\(\)/);
});

test('A70: simultaneous profile/security mutation cannot begin delete-by-password or Google delete challenge',()=>{
  assert.match(auth,/if \(pending \|\| profileWorking\) return;\s*const operation=begin\(\);if\(!operation\)return;setError\(''\);\s*try \{\s*const next = await accountApi\.googleStart/);
  assert.match(auth,/disabled=\{pending \|\| profileWorking \|\| !deletePassword\}>Xác nhận xóa tài khoản/);
  assert.match(auth,/disabled=\{pending \|\| profileWorking\} onCredential=\{credential => onGoogleCredential\(credential, 'delete'\)\}/);
  assert.match(security,/\+\+readGeneration\.current; \/\/ Invalidate GETs begun before this mutation/);
  assert.match(security,/mounted\.current=false;\+\+readGeneration\.current;/);
  assert.match(security,/if\(busyRef\.current\)\{busyRef\.current=false;onBusyChange\?\.\(false\);\}/);
});
