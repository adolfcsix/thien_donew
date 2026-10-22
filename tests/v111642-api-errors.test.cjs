'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('./helpers-typeloader.cjs');
const mod={exports:{}};
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../apps/web/src/lib/account-error.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('module','exports',code)(mod,mod.exports);
const {accountError}=mod.exports;
test('account forms translate gateway status and retain original diagnostic errors',()=>{
 const reason=new Error('HTTP 502');assert.match(accountError(reason),/Máy chủ tạm thời chưa sẵn sàng/);assert.equal(reason.message,'HTTP 502');
});
test('account rate limits tell the user to wait',()=>{assert.match(accountError(new Error('HTTP 429')),/Vui lòng đợi/);});
test('server validation and unknown failures remain actionable',()=>{
 assert.equal(accountError(new Error('Email hoặc mật khẩu không đúng')),'Email hoặc mật khẩu không đúng');assert.match(accountError(null),/Vui lòng thử lại/);
});

test('HTTP 500 with requestId displays non-sensitive support reference',()=>{
 const reason=Object.assign(new Error('Lỗi máy chủ. Vui lòng thử lại sau'),{status:500,requestId:'reg-2c3a84a7-b07f-4d28-b2d3-9488ed40505f'});
 const message=accountError(reason);
 assert.match(message,/Mã hỗ trợ: reg-2c3a84a7/);
 assert.doesNotMatch(message,/password_hash|SELECT|postgresql:\/\//);
});
test('malformed requestId cannot be printed in user-facing account error',()=>{
 const reason=Object.assign(new Error('Lỗi máy chủ. Vui lòng thử lại sau'),{status:500,requestId:'bad\nkey'});
 assert.doesNotMatch(accountError(reason),/bad|key/);
});
