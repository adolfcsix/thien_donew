'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('./helpers-typeloader.cjs');
const root = resolve(__dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const auth = read('apps/web/src/components/auth-provider.tsx');
const settings = read('apps/web/src/components/account-settings.tsx');
const security = read('apps/web/src/components/account-security-extras.tsx');
const avatar = read('apps/web/src/components/avatar-editor.tsx');
const css = read('apps/web/src/components/account-settings.css');

function compileHookExpression(source, name, filename) {
  const ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let expression;
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name){
      const expr = node.initializer;
      expression = name === 'applyLocalProfile' ? expr.arguments[0].getText(ast) : expr.getText(ast);
    }
    ts.forEachChild(node,visit);
  };
  visit(ast);
  assert.ok(expression,`${name} must exist`);
  return ts.transpileModule(`const handler = ${expression};`,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText+'\nreturn handler;';
}
function profileHarness(initial){
  const generation={current:17},lastSessionCheck={current:0},knownUser={current:initial?.id||null};
  const avatars=[],broadcast=[],loading=[];
  let user=initial;
  const setUser=next=>{user=typeof next==='function'?next(user):next;};
  const setLoading=value=>loading.push(value);
  const setAvatarRevision=next=>avatars.push(next(avatars.at(-1)||0));
  const sessionChannel={current:{postMessage:msg=>broadcast.push(msg)}};
  const fn=new Function('generation','lastSessionCheck','setUser','setLoading','setAvatarRevision','sessionChannel','knownUser',
    compileHookExpression(auth,'applyLocalProfile','auth-provider.tsx'));
  const apply=fn(generation,lastSessionCheck,setUser,setLoading,setAvatarRevision,sessionChannel,knownUser);
  return {apply,generation,get user(){return user;},avatars,broadcast,loading};
}

test('A69: server-confirmed profile write invalidates an older /me response generation',()=>{
  const h=profileHarness({id:'member-1',displayName:'Before',hasAvatar:false});
  const pendingReadGeneration=h.generation.current;
  h.apply({displayName:'Canonical',hasAvatar:true},'member-1');
  assert.ok(h.generation.current>pendingReadGeneration);
  if(h.generation.current===pendingReadGeneration) throw Error('old /me callback should not be accepted');
  assert.deepEqual(h.user,{id:'member-1',displayName:'Canonical',hasAvatar:true});
  assert.deepEqual(h.loading,[false]);
  assert.equal(h.avatars.length,1);
  assert.deepEqual(h.broadcast,[{type:'signed-in'}]);
});

test('A69: late profile receipt for retired account must not patch a different logged-in account',()=>{
  const h=profileHarness({id:'member-2',displayName:'Actual',hasAvatar:false});
  h.apply({displayName:'From member 1',hasAvatar:true},'member-1');
  assert.equal(h.user.id,'member-2');
  assert.equal(h.user.displayName,'Actual');
  assert.equal(h.user.hasAvatar,false);
  assert.equal(h.generation.current,17,'old patch must not interrupt new account verification');
  assert.equal(h.broadcast.length,0,'old receipt must not request cross-tab reload');
});

test('A69: source binds profile receipt to account id and blocks stale GET revalidation',()=>{
  assert.match(settings,/onProfileApplied\(patch\(receipt\), user\.id\)/);
  assert.match(auth,/if \(knownUser\.current !== accountId\) return;/);
  assert.match(auth,/\+\+generation\.current;[\s\S]*?setUser\(current => current\?\.id === accountId/);
  assert.match(auth,/if \(generation\.current === id\)/);
});

test('A69: session management, modal overlay and Escape are disabled for profile or security mutations',()=>{
  assert.match(auth,/useDialogFocus\(close, pending \|\| profileWorking\)/);
  assert.match(auth,/!pending && !profileWorking && event\.target === event\.currentTarget/);
  assert.match(auth,/account-close" disabled=\{pending \|\| profileWorking\}/);
  assert.match(auth,/async function logout\(all = false\) \{\s*if \(pending \|\| profileWorking\) return;/);
  assert.match(auth,/onBusyChange=\{setProfileWorking\}/);
  assert.match(settings,/disabled=\{working \|\| securityWorking\} onClick=\{\(\) => \{ setSection\(id\)/);
  assert.match(settings,/onBusyChange\?\.\(true\)/);
  assert.match(settings,/onBusyChange\?\.\(false\)/);
  assert.match(settings,/AccountSecurityExtras onBusyChange=\{busy =>/);
  assert.match(security,/onBusyChange\?\.\(true\)/);
  assert.match(security,/onBusyChange\?\.\(false\)/);
});

test('A69: avatar dragging only accepts same primary pointer and resets after losing capture',()=>{
  const code=compileHookExpression(avatar,'move','avatar-editor.tsx');
  const drag={current:{pointerId:3,x:10,y:10,oldX:0,oldY:0}};
  let offset;
  const setOffset=value=>{offset=value;};
  const move=new Function('drag','setOffset',code)(drag,setOffset);
  const box={getBoundingClientRect:()=>({width:100,height:100})};
  move({pointerId:4,isPrimary:false,clientX:90,clientY:90,currentTarget:box});
  assert.equal(offset,undefined,'second pointer must not affect drag');
  move({pointerId:3,isPrimary:true,clientX:220,clientY:-130,currentTarget:box});
  assert.deepEqual(offset,{x:100,y:-100},'dragging clamps to UI bounds');
  assert.match(avatar,/onLostPointerCapture=\{event => \{ if \(drag\.current\?\.pointerId === event\.pointerId\) drag\.current = null;/);
});

test('A69: circular avatar preview constrains intrinsic image sizing within its grid track',()=>{
  assert.match(css,/\.account-profile-avatar \{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.account-profile-avatar img \{[^}]*max-width:100%;max-height:100%;object-fit:cover;border-radius:inherit/);
  assert.match(css,/\.avatar-editor-stage \{[^}]*touch-action:pan-y/);
});
