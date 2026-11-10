'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');

test('UI-only fake member responses are limited to passive collection reads and billing access',async()=>{
 const {mockMemberAccessForUi}=await import('./helpers-ui-member-access.mjs');
 const routes=[];
 const context={route:async(pattern,callback)=>routes.push({pattern,callback})};
 await mockMemberAccessForUi(context);
 assert.deepEqual(routes.map(r=>r.pattern).sort(),[
  '**/api/billing/access','**/api/birth-profiles','**/api/charts','**/api/study'
 ].sort());
 const execute=async(path,method)=>{
  const handler=routes.find(r=>r.pattern===path)?.callback;
  assert.equal(typeof handler,'function');
  const observed={fulfill:[],continued:0};
  const request={
   request:()=>({method:()=>method}),
   fulfill:async(payload)=>{observed.fulfill.push(payload);return payload;},
   continue:async()=>{observed.continued++;return null;}
  };
  await handler(request);
  return observed;
 };
 for(const [path,key] of [
  ['**/api/study','entries'],['**/api/charts','charts'],['**/api/birth-profiles','profiles']
 ]){
  const result=await execute(path,'GET');
  assert.equal(result.continued,0);
  assert.equal(result.fulfill.length,1);
  assert.equal(result.fulfill[0].status,200);
  assert.deepEqual(result.fulfill[0].json,{[key]:[]});
  for(const method of ['POST','PATCH','DELETE']){
   const write=await execute(path,method);
   assert.equal(write.continued,1,'writes must pass through: '+path+' '+method);
   assert.equal(write.fulfill.length,0);
  }
 }
 const billing=await execute('**/api/billing/access','GET');
 assert.deepEqual(billing.fulfill[0].json,{isAdmin:false,isOwner:false});
 assert.equal((await execute('**/api/billing/access','POST')).continued,1);
});
