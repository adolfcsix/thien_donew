'use strict';
// A72: run actual extracted TSX event handlers without React/network dependencies.
// Verify that responses arriving after account-dialog retirement cannot mutate
// the next identity, reopen a challenge, or trigger a late redirect.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ts = require('./helpers-typeloader.cjs');
const root = resolve(__dirname, '..');
const auth = readFileSync(resolve(root,'apps/web/src/components/auth-provider.tsx'),'utf8');
const settings = readFileSync(resolve(root,'apps/web/src/components/account-settings.tsx'),'utf8');
const extras = readFileSync(resolve(root,'apps/web/src/components/account-security-extras.tsx'),'utf8');

function compileHandler(source, name, names) {
  const ast = ts.createSourceFile('component.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      // Nested declarations are intentional: these are the production handlers.
      found = node.getText(ast);
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
  assert.ok(found,`${name} must be declared`);
  const code = ts.transpileModule(found,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  return values => new Function(...names, `${code}\nreturn ${name};`)(...names.map(key=>values[key]));
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function authHarness(handler, option={}) {
  const gate=deferred(), controller=new AbortController(), effects=[];
  const v={
    pending:false,profileWorking:false, register:false, password:'abc',registerConfirm:'abc',email:'me@example.test',username:'abcde',remember:false,
    challenge:{challengeId:'challenge',email:'me@example.test'},code:'123456',remaining:200,
    recoverStep:'code',resetResendWait:0,resetId:'reset-1',resetRemaining:200,resetPasswordValue:'password1234',deletePassword:'password1234',
    begin:()=>controller,finish:()=>effects.push('finish'),setError:()=>effects.push('error-state'),
    setChallenge:()=>effects.push('challenge'),setCode:()=>effects.push('code'),setResetId:()=>effects.push('reset-id'),
    setResetIssuedAt:()=>effects.push('reset-issued'),setRecoverStep:()=>effects.push('reset-step'),setResetDone:()=>effects.push('reset-done'),
    setPassword:()=>effects.push('password-state'),setResetPasswordValue:()=>effects.push('reset-value'),setDeletePassword:()=>effects.push('delete-pass'),
    completeLogin:async()=>effects.push('complete-login'),close:()=>effects.push('close'),clearUser:()=>effects.push('clear-user'),
    showError:()=>effects.push('error'),
    accountApi:{login:()=>gate.promise,register:()=>gate.promise,googleStart:()=>gate.promise,googleVerify:()=>gate.promise,
      requestPasswordReset:()=>gate.promise,confirmPasswordReset:()=>gate.promise,remove:()=>gate.promise,
      logout:()=>gate.promise,logoutAll:()=>gate.promise},
    ...option,
  };
  const names=Object.keys(v);
  return {handler:compileHandler(auth,handler,names)(v),gate,controller,effects};
}

for (const [handler,args,reply] of [
  ['submit',[{preventDefault(){}}],{user:{id:'old'}}],
  ['onGoogleCredential',['credential','login'],{challengeId:'old'}],
  ['verify',[{preventDefault(){}}],{user:{id:'old'}}],
  ['requestReset',[{preventDefault(){}}],{challengeId:'old'}],
  ['resendReset',[],{challengeId:'old'}],
  ['resetPassword',[{preventDefault(){}}],{updated:true}],
  ['deleteUser',[{preventDefault(){}}],{deleted:true}],
]) {
  test(`A72: retired ${handler} cannot update another account after its request returns`,async()=>{
    const h=authHarness(handler);
    const pending=h.handler(...args);
    h.controller.abort();
    h.gate.resolve(reply);
    await pending;
    assert.deepEqual(h.effects,handler==='requestReset' ? ['error-state','reset-done','finish'] : ['error-state','finish']);
  });
}

test('A72: stale network rejection cannot display an error on a new account',async()=>{
  const h=authHarness('submit');
  const promise=h.handler({preventDefault(){}});
  h.controller.abort();
  h.gate.reject(Error('old request failed'));
  await promise;
  assert.deepEqual(h.effects,['error-state','finish']);
});

test('A72: active login still navigates and closes once',async()=>{
  const h=authHarness('submit');
  const promise=h.handler({preventDefault(){}});
  h.gate.resolve({user:{id:'current'}});
  await promise;
  assert.deepEqual(h.effects,['error-state','complete-login','close','finish']);
});

test('A72: expired profile editor does not show stale status after a follow-up /me request',async()=>{
  const initial=deferred();const follow=deferred();const controller=new AbortController();const effects=[];
  const workingRef={current:false},lifetime={current:controller};
  const v={lifetime,workingRef,setWorking:val=>effects.push(['working',val]),onBusyChange:val=>effects.push(['busy',val]),
    setError:val=>effects.push(['error',val]),setNotice:val=>effects.push(['notice',val]),
    onProfileApplied:()=>effects.push(['profile-applied']),user:{id:'account-1'},reload:()=>follow.promise};
  const perform=compileHandler(settings,'perform',Object.keys(v))(v);
  const pending=perform(()=>initial.promise,'Đã lưu.',()=>({displayName:'New'}));
  initial.resolve({displayName:'New'});
  await new Promise(resolve=>setImmediate(resolve));
  controller.abort(); // React unmounted during follow-up GET.
  follow.resolve();
  assert.equal(await pending,false);
  assert.deepEqual(effects,[['working',true],['busy',true],['error',''],['notice',''],['profile-applied']]);
});

test('A72: both profile and security dispose pending parent busy lock on unmount',()=>{
  assert.match(settings,/controller\.abort\(\);[\s\S]*?if \(workingRef\.current\) \{ workingRef\.current = false; onBusyChange\?\.\(false\); \}/);
  assert.match(extras,/mounted\.current=false;\+\+readGeneration\.current;[\s\S]*?if\(busyRef\.current\)\{busyRef\.current=false;onBusyChange\?\.\(false\);\}/);
});
