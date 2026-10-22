'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),prod=path.join(root,'infrastructure/production');
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'thiendo-private-'));
function node(file,args=[],options={}){return spawnSync(process.execPath,[path.join(prod,file),...args],{encoding:'utf8',timeout:10000,...options});}
function fixture(){const dir=temp();for(const entry of fs.readdirSync(prod)){const p=path.join(prod,entry);if(fs.statSync(p).isFile())fs.copyFileSync(p,path.join(dir,entry));}assert.equal(node('init-secrets.mjs',[path.join(dir,'secrets')]).status,0);let env='THIEN_DO_DOMAIN=fixture.thiendo.vn\nACME_EMAIL=ops@thiendo.vn\n';for(const key of ['API_IMAGE','WEB_IMAGE','POSTGRES_IMAGE','CADDY_IMAGE','NGINX_IMAGE'])env+=key+'=registry.invalid/test@sha256:'+'a'.repeat(64)+'\n';fs.writeFileSync(path.join(dir,'.env.production'),env,{mode:0o600});fs.writeFileSync(path.join(dir,'current.release.env'),'API_IMAGE=registry.invalid/api@sha256:'+'b'.repeat(64)+'\nWEB_IMAGE=registry.invalid/web@sha256:'+'c'.repeat(64)+'\n',{mode:0o600});return dir;}
function using(fn){const dir=fixture();try{fn(dir)}finally{fs.rmSync(dir,{recursive:true,force:true})}}
const preflight=dir=>node('preflight.mjs',[path.join(dir,'.env.production'),path.join(dir,'current.release.env')]);

test('one-time generator creates four different secrets without printing them or rotating existing keys',()=>using(dir=>{
 const names=fs.readdirSync(path.join(dir,'secrets'));assert.equal(names.length,4);
 const values=names.map(n=>fs.readFileSync(path.join(dir,'secrets',n),'utf8').trim());assert.equal(new Set(values).size,4);
 const retry=node('init-secrets.mjs',[path.join(dir,'secrets')]);assert.notEqual(retry.status,0);for(const value of values)assert.ok(!retry.stdout.includes(value));
 assert.deepEqual(names.map(n=>fs.readFileSync(path.join(dir,'secrets',n),'utf8').trim()),values);
 assert.equal(preflight(dir).status,0);
}));
test('preflight rejects missing MFA key, invalid base64, weak OTP and incomplete payOS',()=>{
 for(const condition of ['missing','base64','otp','payos'])using(dir=>{
  const key=path.join(dir,'secrets/admin_mfa_encryption_key');
  if(condition==='missing')fs.unlinkSync(key);
  if(condition==='base64'){fs.chmodSync(key,0o600);fs.writeFileSync(key,'!'.repeat(44));fs.chmodSync(key,0o444);}
  if(condition==='otp'){const p=path.join(dir,'secrets/auth_otp_secret');fs.chmodSync(p,0o600);fs.writeFileSync(p,'weak');fs.chmodSync(p,0o444);}
  if(condition==='payos')fs.appendFileSync(path.join(dir,'.env.production'),'PAYOS_CLIENT_ID=fixture\n');
  assert.notEqual(preflight(dir).status,0,condition);
 });
});
test('container reads MFA and OTP file secrets into its child without exposing their values',()=>using(dir=>{
 const env={...process.env,NODE_ENV:'production',DB_USER:'thiendo_app',DB_PASSWORD_FILE:path.join(dir,'secrets/db_app_password'),ADMIN_MFA_ENCRYPTION_KEY:'',AUTH_OTP_SECRET:'',ADMIN_MFA_ENCRYPTION_KEY_FILE:path.join(dir,'secrets/admin_mfa_encryption_key'),AUTH_OTP_SECRET_FILE:path.join(dir,'secrets/auth_otp_secret'),GEMINI_API_KEY:'fixture-provider-key'};
 const child="const assert=require('node:assert/strict');assert.equal(Buffer.from(process.env.ADMIN_MFA_ENCRYPTION_KEY,'base64').length,32);assert.ok(process.env.AUTH_OTP_SECRET.length>=32);assert.equal(new URL(process.env.DATABASE_URL).username,'thiendo_app');assert.equal(process.env.GEMINI_API_KEY,'fixture-provider-key');console.log('CHILD_ENV_OK')";
 const result=node('container-entrypoint.mjs',[process.execPath,'-e',child],{env});assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'CHILD_ENV_OK');
 env.ADMIN_MFA_ENCRYPTION_KEY='conflicting-value';assert.notEqual(node('container-entrypoint.mjs',[process.execPath,'-e',child],{env}).status,0);
}));
test('private-file archive roundtrip preserves binary/empty files and refuses overwrites',()=>{
 const dir=temp();try{
  const input=path.join(dir,'input');fs.mkdirSync(path.join(input,'books'),{recursive:true});fs.mkdirSync(path.join(input,'van-kho-media'));
  const bytes=Buffer.alloc(2*1024*1024,37);bytes[112]=0;
  fs.writeFileSync(path.join(input,'books','fixture.pdf'),bytes);fs.writeFileSync(path.join(input,'van-kho-media','empty'),Buffer.alloc(0));
  const packed=node('file-bundle.mjs',['pack',input],{encoding:null,maxBuffer:5*1024*1024});assert.equal(packed.status,0,packed.stderr?.toString());
  const archive=path.join(dir,'backup.tda');fs.writeFileSync(archive,packed.stdout);const dest=path.join(dir,'restored');
  assert.equal(node('file-bundle.mjs',['unpack',archive,dest]).status,0);
  assert.deepEqual(fs.readFileSync(path.join(dest,'books','fixture.pdf')),bytes);assert.equal(fs.statSync(path.join(dest,'van-kho-media','empty')).size,0);
  assert.notEqual(node('file-bundle.mjs',['unpack',archive,dest]).status,0);
  const corrupt=Buffer.from(packed.stdout);corrupt[corrupt.length-1]^=1;fs.writeFileSync(archive,corrupt);
  assert.notEqual(node('file-bundle.mjs',['unpack',archive,path.join(dir,'corrupt')]).status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('restore rejects traversal/duplicate entries and pack rejects links',()=>{
 const dir=temp();try{
  const archive=path.join(dir,'unsafe.tda');
  for(const files of [[{path:'../escape',size:0,sha256:'a'.repeat(64)}],[{path:'a',size:0,sha256:'a'.repeat(64)},{path:'A',size:0,sha256:'a'.repeat(64)}]]){
   fs.writeFileSync(archive,JSON.stringify({format:'thien-do-file-bundle-v1',files})+'\n');assert.notEqual(node('file-bundle.mjs',['unpack',archive,path.join(dir,'restored')]).status,0);assert.equal(fs.existsSync(path.join(dir,'restored')),false);
  }
  const input=path.join(dir,'input');fs.mkdirSync(input);fs.symlinkSync(archive,path.join(input,'link'));assert.notEqual(node('file-bundle.mjs',['pack',input]).status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('backup defaults to a plan and does not need Docker or a remote provider',()=>using(dir=>{
 const result=spawnSync('bash',[path.join(dir,'backup.sh')],{encoding:'utf8',timeout:5000,env:{...process.env,THIENDO_CONFIG_DIR:dir}});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PLAN:/);assert.equal(fs.existsSync(path.join(dir,'backup-status.json')),false);
}));
test('simulated snapshot failure resumes API and cannot leave a success receipt (not a Docker/PostgreSQL acceptance test)',()=>using(dir=>{
 const bin=path.join(dir,'bin');fs.mkdirSync(bin);const log=path.join(dir,'cli.log');
 fs.writeFileSync(path.join(bin,'docker'),`#!/bin/bash\necho "$*" >> "$FIXTURE_LOG"\ncase "$*" in\n *"ps --status running --services api"*) echo api;;\n *"pg_dump"*) echo fixture-dump;;\n *"pg_restore --list"*) cat >/dev/null;;\n *"run --rm --no-deps -T assets"*) exit 42;;\n *) exit 0;;\nesac\n`,{mode:0o755});
 fs.writeFileSync(path.join(bin,'restic'),'#!/bin/bash\nexit 99\n',{mode:0o755});fs.writeFileSync(path.join(dir,'restic-key'),'fixture-only',{mode:0o600});
 const result=spawnSync('bash',[path.join(dir,'backup.sh'),'--quiesce'],{encoding:'utf8',timeout:10000,env:{...process.env,THIENDO_CONFIG_DIR:dir,FIXTURE_LOG:log,PATH:bin+path.delimiter+process.env.PATH,RESTIC_REPOSITORY:'s3:https://fixture.invalid/bucket',RESTIC_PASSWORD_FILE:path.join(dir,'restic-key')}});
 assert.equal(result.status,42,result.stderr);const calls=fs.readFileSync(log,'utf8');assert.match(calls,/stop -t 45 api/);assert.match(calls,/start api/);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'backup-status.json'))).ok,false);assert.equal(fs.existsSync(path.join(dir,'last-backup.json')),false);
}));
test('production mounts private files once for API and read-only for backup; credentials remain server-side',()=>{
 const compose=fs.readFileSync(path.join(prod,'compose.production.yaml'),'utf8');const api=compose.split('\n  api:\n')[1].split('\n  assets:\n')[0],assets=compose.split('\n  assets:\n')[1].split('\n  web:\n')[0],web=compose.split('\n  web:\n')[1].split('\n  gate:\n')[0];
 assert.match(api,/private_assets:\/var\/lib\/thiendo\/private/);assert.match(assets,/private_assets:\/var\/lib\/thiendo\/private:ro/);assert.match(assets,/network_mode: none/);
 for(const key of ['GEMINI_API_KEY','ADMIN_MFA_ENCRYPTION_KEY_FILE','AUTH_OTP_SECRET_FILE','BOOK_PRIVATE_STORAGE_DIR','VAN_KHO_PRIVATE_MEDIA_DIR']){assert.ok(api.includes(key));assert.ok(!web.includes(key));}
});

test('database asset index rejects missing files, wrong sizes and wrong hashes even when archive itself is readable',()=>{
 const dir=temp();try{
  const input=path.join(dir,'input');fs.mkdirSync(path.join(input,'books'),{recursive:true});const bytes=Buffer.from('known private book bytes');fs.writeFileSync(path.join(input,'books','book'),bytes);
  const packed=node('file-bundle.mjs',['pack',input],{encoding:null});assert.equal(packed.status,0);const archive=path.join(dir,'assets.tda'),index=path.join(dir,'index.json');fs.writeFileSync(archive,packed.stdout);
  const reference={path:'books/book',size:bytes.length,sha256:require('node:crypto').createHash('sha256').update(bytes).digest('hex')};
  fs.writeFileSync(index,JSON.stringify([reference]));const valid=node('file-bundle.mjs',['verify-index',archive,index]);assert.equal(valid.status,0,valid.stderr);assert.equal(JSON.parse(valid.stdout).referencesVerified,true);
  for(const invalid of [{...reference,path:'books/missing'},{...reference,size:bytes.length+1},{...reference,sha256:'0'.repeat(64)}]){fs.writeFileSync(index,JSON.stringify([invalid]));assert.notEqual(node('file-bundle.mjs',['verify-index',archive,index]).status,0);}
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
