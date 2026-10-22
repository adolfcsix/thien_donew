'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {execFileSync}=require('node:child_process');
const Module=require('node:module');
const root=join(__dirname,'..');
function typescript(){try{return require('typescript')}catch{}try{return require(join(execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'))}catch{return null}}
const ts=typescript();
if(!ts){test('V8.3 behavioral TypeScript tests need TS',{skip:true},()=>{});}
else {
  function loadTS(name){const src=readFileSync(join(root,name),'utf8');const mod={exports:{}};const code=ts.transpileModule(src,{fileName:name,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports',code)(mod,mod.exports);return mod.exports;}
  const {isTrustedMutation}=loadTS('apps/api/src/common/origin-policy.ts');
  const allowed='http://localhost:3000';
  test('V8.3 CSRF origin policy accepts only configured browser origin',()=>{
    assert.equal(isTrustedMutation(allowed,'same-site',allowed),true);
    assert.equal(isTrustedMutation(allowed,'same-origin',allowed),true);
    assert.equal(isTrustedMutation(undefined,undefined,allowed),true); // curl/server-to-server
    assert.equal(isTrustedMutation(undefined,'same-origin',allowed),true);
    assert.equal(isTrustedMutation('http://localhost:8080','same-site',allowed),false);
    assert.equal(isTrustedMutation('https://attacker.invalid','same-site',allowed),false);
    assert.equal(isTrustedMutation('https://attacker.invalid','cross-site',allowed),false);
    assert.equal(isTrustedMutation(allowed,'cross-site',allowed),false);
    assert.equal(isTrustedMutation(undefined,'same-site',allowed),false);
    assert.equal(isTrustedMutation('null','none',allowed),false);
    assert.equal(isTrustedMutation([allowed],'same-site',allowed),false);
    assert.equal(isTrustedMutation(allowed,['same-site'],allowed),false);
  });
}
const src=f=>readFileSync(join(root,f),'utf8');
test('V8.3 backend no longer trusts caller-controlled Host for CSRF',()=>{
  const main=src('apps/api/src/main.ts');
  assert.match(main,/isTrustedMutation\(req\.headers\.origin/);
  assert.doesNotMatch(main,/req\.headers\.host/);
});
test('V8.3 login respects legacy imported short passwords in frontend',()=>{
  assert.match(src('apps/web/src/components/auth-provider.tsx'),/minLength=\{register \? 10 : 1\}/);
});
test('V8.3 stale save notifications are suppressed across account/input changes',()=>{
  const chart=src('apps/web/src/app/chart/page.tsx');
  assert.match(chart,/requestedOwner/);
  assert.match(chart,/formVersion\.current === requestedVersion/);
});
test('V8.3 session cleanup defaults to dry run',()=>{
  const cli=src('infrastructure/scripts/cleanup-sessions.mjs');
  assert.match(cli,/process\.argv\.includes\('--apply'\)/);
  assert.match(cli,/if \(apply\)/);
  assert.match(cli,/!process\.env\.DATABASE_URL/);
});
