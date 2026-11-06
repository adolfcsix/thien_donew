'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {createRequestId}=require('../apps/web/src/lib/request-id.cjs');
test('HTTP LAN without randomUUID still creates cryptographic v4 UUIDs',()=>{const ids=new Set();const source={getRandomValues:bytes=>webcrypto.getRandomValues(bytes)};for(let i=0;i<1000;i++){const id=createRequestId(source);assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);ids.add(id);}assert.equal(ids.size,1000);});
test('native randomUUID stays bound to its crypto instance',()=>{const source={randomUUID(){assert.equal(this,source);return 'native';}};assert.equal(createRequestId(source),'native');});
test('missing entropy fails explicitly; no weak random fallback',()=>assert.throws(()=>createRequestId({}),/an toàn/));
