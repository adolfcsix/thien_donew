const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const mod={exports:{}};
new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../apps/api/src/modules/auth/account-deletion-error.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports,require);
test('retained account references become a safe conflict without disclosing SQL or deleting data',()=>{
  const privateError={code:'23503',message:'private SQL and account detail',constraint:'private_constraint'};
  assert.throws(()=>mod.exports.accountDeletionError(privateError),error=>error.getStatus()===409&&error.message.includes('lịch sử biên tập')&&!error.message.includes('private'));
});
test('unrelated database and runtime failures are preserved, never mislabeled as retention conflict',()=>{
  for(const error of [new Error('network failure'),{code:'23505'},null,'unexpected'])assert.throws(()=>mod.exports.accountDeletionError(error),candidate=>candidate===error);
});
