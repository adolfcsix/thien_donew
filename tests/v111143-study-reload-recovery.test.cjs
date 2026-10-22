'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto,randomUUID}=require('node:crypto');
const {fingerprintEntries, getPending, reservePending, finishPending}=require('../apps/web/src/features/study-room/import-retry.cjs');
const userA='4be2a9e0-66f0-4d12-a2d9-57a0e0ec30e9';
const userB='56e2ca12-6c13-4904-8a53-f061993f6044';
const entry=[{discipline:'general',title:'Cần bảo mật',summary:'Sổ tay',notes:'bí mật tài khoản',tags:[],snapshot:{},pinned:false}];
function storage(){const contents=new Map();return {contents,getItem:k=>contents.get(k)||null,setItem:(k,v)=>contents.set(k,v),removeItem:k=>contents.delete(k)};}

test('V11.114.3: same normalized backup reselected after page reload reuses pending importId',async()=>{
 const s=storage();const fingerprint=await fingerprintEntries(entry,webcrypto);
 const first=reservePending(s,userA,fingerprint,randomUUID);
 const afterPageReload=reservePending(s,userA,await fingerprintEntries(JSON.parse(JSON.stringify(entry)),webcrypto),randomUUID);
 assert.equal(first.resumed,false);assert.equal(afterPageReload.resumed,true);
 assert.equal(afterPageReload.importId,first.importId);
 assert.equal(getPending(s,userA,fingerprint),first.importId);
 assert.ok(!JSON.stringify([...s.contents]).includes('bí mật tài khoản'));
 assert.ok(!JSON.stringify([...s.contents]).includes('Cần bảo mật'));
});
test('V11.114.3: separate backup retains separate key and pending attempts are not erased',async()=>{
 const s=storage(), a=await fingerprintEntries(entry,webcrypto);
 const b=await fingerprintEntries([{...entry[0],title:'Lá số khác'}],webcrypto);
 const one=reservePending(s,userA,a,randomUUID).importId;
 const two=reservePending(s,userA,b,randomUUID).importId;
 assert.notEqual(one,two);assert.equal(getPending(s,userA,a),one);
 finishPending(s,userA,two);
 assert.equal(getPending(s,userA,b),null);assert.equal(getPending(s,userA,a),one);
 finishPending(s,userA,one);assert.equal(s.contents.size,0);
});
test('V11.114.3: recovery metadata is account-isolated',async()=>{
 const s=storage(),fp=await fingerprintEntries(entry,webcrypto);
 const a=reservePending(s,userA,fp,randomUUID).importId;
 assert.equal(getPending(s,userB,fp),null);
 const b=reservePending(s,userB,fp,randomUUID).importId;
 assert.notEqual(a,b);finishPending(s,userB,b);assert.equal(getPending(s,userA,fp),a);
});
test('V11.114.3: malformed session and fabricated IDs ignored',async()=>{
 const s=storage(),fp=await fingerprintEntries(entry,webcrypto);
 s.setItem(`thien-do.study-import-retry.v1.${userA}`,JSON.stringify([{fingerprint:fp,importId:'not-a-uuid'}]));
 assert.equal(getPending(s,userA,fp),null);
 assert.ok(reservePending(s,userA,fp,randomUUID).importId);
 assert.throws(()=>reservePending(s,'../other',fp,randomUUID),/owner/);
 assert.throws(()=>getPending(s,userA,'unsafe'),/fingerprint/);
});
test('V11.114.3: malformed records and data never persisted', async()=>{
 const s=storage(),fp=await fingerprintEntries(entry,webcrypto);
 assert.match(fp,/^[a-f0-9]{64}$/);
 assert.notEqual(fp,await fingerprintEntries([{...entry[0],notes:'khác'}],webcrypto));
 await assert.rejects(fingerprintEntries(entry,{}),/không hỗ trợ/);
 assert.throws(()=>reservePending(s,userA,fp,()=>'invalid'),/generated/);
 assert.equal(s.contents.size,0);
});
test('V11.114.3: UI hooks account/session-scoped pending receipts and avoids writing notes to storage',()=>{
 const {readFileSync}=require('node:fs');
 const page=readFileSync(require('node:path').join(__dirname,'../apps/web/src/app/study/page.tsx'),'utf8');
 assert.match(page,/reservePending\(window\.sessionStorage,userId,fingerprint/);
 assert.match(page,/finishPending\(window\.sessionStorage,userId,backupImportId\)/);
 assert.match(page,/const selected=\+\+selectionSeq\.current/);
 assert.doesNotMatch(page,/sessionStorage\.setItem\([^\n]*(?:notes|backupEntries|restoring)/);
});
