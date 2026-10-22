import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.API_BASE_URL||'http://127.0.0.1:8080';
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base))throw Error('Portal smoke may only run against localhost');
const enabled=process.env.E2E_LOCAL_DB_CONFIRM==='YES';
async function get(route){const response=await fetch(base+route,{redirect:'manual',signal:AbortSignal.timeout(12000)});const json=await response.json().catch(()=>null);return {response,json};}
test('Public catalog exposes 15 guide categories and 8 legal drafts after migration', {skip:!enabled},async()=>{
 for(const [kind,min] of [['guide',15],['policy',8]]){
  const {response,json}=await get('/api/portal/public/'+kind);
  assert.equal(response.status,200);assert.ok(Array.isArray(json.documents));assert.ok(json.documents.length>=min);
 }
});
test('Public detail does not leak unpublished revision or reviewer identity', {skip:!enabled},async()=>{
 const {response,json}=await get('/api/portal/public/guide/tu-vi');assert.equal(response.status,200);
 assert.ok(json.document.body.length>1600);assert.equal(json.document.slug,'tu-vi');
 assert.ok(!('last_editor' in json.document));assert.ok(!('created_by' in json.document));
});
test('Anonymous request cannot list admin drafts or change published guides', {skip:!enabled},async()=>{
 const {response}=await get('/api/portal/admin/documents');assert.ok([401,403].includes(response.status),'admin listing should be protected, saw '+response.status);
 const mutation=await fetch(base+'/api/portal/admin/guide/tu-vi',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Changed',body:'A'.repeat(60),summary:'',toolHref:'/',relatedHref:'/',expectedRevision:1})});
 assert.ok([401,403].includes(mutation.status),'anonymous writes must fail');
 const after=await get('/api/portal/public/guide/tu-vi');assert.equal(after.response.status,200);assert.notEqual(after.json.document.title,'Changed');
});
test('Policies remain visibly marked as not signed-off legally', {skip:!enabled},async()=>{
 const {response,json}=await get('/api/portal/public/policy/quyen-rieng-tu');assert.equal(response.status,200);
 assert.equal(json.document.legalDraft,true);
});
