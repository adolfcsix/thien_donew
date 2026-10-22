'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const helper=import('../infrastructure/scripts/lib/initial-mfa-env.mjs');
const key=Buffer.alloc(32,47).toString('base64');
test('actual shipped .env.example can initialize first-owner MFA without changing other settings',async()=>{
 const {initialMfaEnv}=await helper,s=fs.readFileSync(path.join(__dirname,'../.env.example'),'utf8'),result=initialMfaEnv(s,key);
 assert.equal(result,s.replace(/^ADMIN_MFA_ENCRYPTION_KEY=$/m,'ADMIN_MFA_ENCRYPTION_KEY='+key));
 assert.throws(()=>initialMfaEnv(result,Buffer.alloc(32,12).toString('base64')),/Khong ghi de/);
});
test('absent and quoted empty/exported placeholders work with Windows CRLF',async()=>{
 const {initialMfaEnv}=await helper;const prefix='DATABASE_URL=postgres://local/db\r\n';
 for(const line of ['ADMIN_MFA_ENCRYPTION_KEY=','ADMIN_MFA_ENCRYPTION_KEY="" # blank',"export ADMIN_MFA_ENCRYPTION_KEY='' # blank"]){const out=initialMfaEnv(prefix+line+'\r\nCOOKIE_SECURE=false\r\n',key);assert.equal(out,prefix+'ADMIN_MFA_ENCRYPTION_KEY='+key+'\r\nCOOKIE_SECURE=false\r\n')}
 assert.ok(initialMfaEnv(prefix,key).endsWith('ADMIN_MFA_ENCRYPTION_KEY='+key+'\r\n'));
});
test('existing keys, malformed values and duplicate assignments fail without modification',async()=>{
 const {initialMfaEnv}=await helper;for(const value of [key,'broken','"multiline\nsecret"']){const text='ADMIN_MFA_ENCRYPTION_KEY='+value+'\n';assert.throws(()=>initialMfaEnv(text,key));}
 assert.throws(()=>initialMfaEnv('ADMIN_MFA_ENCRYPTION_KEY=\nexport ADMIN_MFA_ENCRYPTION_KEY=\n',key));
 for(const bad of ['',undefined,'notbase64'])assert.throws(()=>initialMfaEnv('',bad));
});
test('local Owner provisioning rejects URL options that could override the checked host before prompting or connecting',()=>{
 const {spawnSync}=require('node:child_process');
 for(const suffix of ['?host=outside.invalid','#fragment']){
  const r=spawnSync(process.execPath,['infrastructure/scripts/create-local-owner.mjs','--email','owner@example.invalid'],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:5000,env:{...process.env,NODE_ENV:'test',CI:'false',DATABASE_URL:'postgres://fixture:secret@127.0.0.1/disposable_test'+suffix}});
  assert.equal(r.status,1);assert.match(r.stderr,/Tu choi tham so/);assert.doesNotMatch(r.stdout+r.stderr,/fixture:secret|outside\.invalid|Go TAO OWNER/);
 }
});
