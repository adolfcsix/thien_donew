'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{crc32}=require('node:zlib');
const {verifySourceArchive}=require('../infrastructure/scripts/verify-source-archive.cjs');
function zip(name='thien-do/package.json',data=Buffer.from('{}\n')){
 const n=Buffer.from(name),crc=crc32(data),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
 local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(n.length,26);
 central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(n.length,28);
 const start=local.length+n.length+data.length;end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+n.length,12);end.writeUInt32LE(start,16);
 return Buffer.concat([local,n,data,central,n,end]);
}
test('complete ZIP verifies required source; missing template is rejected',()=>{const b=zip();assert.equal(verifySourceArchive(b,{required:['thien-do/package.json']}).entries,1);assert.throws(()=>verifySourceArchive(b,{required:['thien-do/.env.e2e.example']}),/Missing required/);});
test('a file ending at a valid local-entry boundary is still rejected without its final directory',()=>{const b=zip(),entryEnd=30+Buffer.byteLength('thien-do/package.json')+3;assert.throws(()=>verifySourceArchive(b.subarray(0,entryEnd)),/Missing final/);assert.throws(()=>verifySourceArchive(b.subarray(0,b.length-1)),/Missing final/);});
test('corrupt payload and unsafe path fail despite plausible ZIP metadata',()=>{const b=zip();b[30+Buffer.byteLength('thien-do/package.json')]^=1;assert.throws(()=>verifySourceArchive(b),/checksum mismatch/);assert.throws(()=>verifySourceArchive(zip('../private.json')),/Unsafe/);});
