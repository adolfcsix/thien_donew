'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {generateKeyPairSync,sign}=require('node:crypto');
const ts=require('../helpers-typeloader.cjs'),nest=require('@nestjs/common');
const root=path.resolve(__dirname,'../..');
function load(file,globals={}){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext('(function(require,module,exports){'+js+'})',{Buffer,console,AbortSignal,Date,fetch,process,...globals})(require,mod,mod.exports);
 return mod.exports;
}
const operations=load('apps/api/src/common/operations.ts',{console:{error(){},log(){}}});
function response(){return {locals:{requestId:'correlation-141'},status(n){this.code=n;return this},json(v){this.body=v;return this}};}
function filtered(error){const res=response();new operations.SafeExceptionFilter().catch(error,{switchToHttp:()=>({getResponse:()=>res})});return res;}
test('internal exceptions never expose SQL or credentials',()=>{const r=filtered(Error('SELECT password_hash FROM users password=secret'));assert.equal(r.code,500);assert.equal(r.body.requestId,'correlation-141');assert.doesNotMatch(JSON.stringify(r.body),/password_hash|SELECT|secret/);});
test('HTTP 5xx exceptions are sanitized even when their message is structured',()=>{for(const error of [new nest.ServiceUnavailableException('postgresql://owner:secret@db'),new nest.HttpException({message:['private error']},502)]){const r=filtered(error);assert.ok(r.code>=500);assert.doesNotMatch(JSON.stringify(r.body),/private|postgresql|secret/);}});
test('safe validation errors retain useful 4xx feedback',()=>{const r=filtered(new nest.BadRequestException('Ngày sinh không hợp lệ'));assert.equal(r.code,400);assert.equal(r.body.message,'Ngày sinh không hợp lệ');});
test('request IDs reject injected header content',()=>{const res={locals:{},setHeader(k,v){this.header=v},on(){}};let next=false;operations.operationsMiddleware({headers:{'x-request-id':'bad\r\nsecret'},method:'GET'},res,()=>next=true);assert.equal(next,true);assert.match(res.header,/^[a-f0-9-]{36}$/);});
test('Google key rotation refreshes once across concurrent requests and bounds unknown-key traffic',async()=>{
 let now=Date.now(),fetches=0;
 class Clock extends Date{static now(){return now}}
 const makeKey=kid=>{const pair=generateKeyPairSync('rsa',{modulusLength:2048});return {...pair,jwk:{...pair.publicKey.export({format:'jwk'}),kid,alg:'RS256',use:'sig'}};};
 const a=makeKey('key-a'),b=makeKey('key-b');let keys=[a.jwk];
 const {verifyGoogleCredential}=load('apps/api/src/modules/auth/google-token.ts',{Date:Clock,fetch:async()=>{fetches++;await new Promise(r=>setTimeout(r,5));return new Response(JSON.stringify({keys}),{headers:{'cache-control':'max-age=3600'}});}});
 const token=(key,kid=key.jwk.kid)=>{const h=Buffer.from(JSON.stringify({alg:'RS256',kid})).toString('base64url'),p=Buffer.from(JSON.stringify({iss:'https://accounts.google.com',aud:'client-141',iat:Math.floor(now/1000),exp:Math.floor(now/1000)+300,sub:'1234567890',email:'fixture@example.invalid',email_verified:true,nonce:'nonce-141'})).toString('base64url'),raw=h+'.'+p;return raw+'.'+sign('RSA-SHA256',Buffer.from(raw),key.privateKey).toString('base64url');};
 const verify=t=>verifyGoogleCredential(t,'nonce-141','client-141');
 await Promise.all(Array.from({length:16},()=>verify(token(a))));assert.equal(fetches,1);
 now+=61000;keys=[b.jwk];await Promise.all(Array.from({length:16},()=>verify(token(b))));assert.equal(fetches,2);
 now+=61000;for(let i=0;i<12;i++)await assert.rejects(()=>verify(token(b,'unknown-'+i)));assert.equal(fetches,3);
 await assert.rejects(()=>verifyGoogleCredential(token(b),'wrong-nonce','client-141'));
});
