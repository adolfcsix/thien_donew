'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const {inspectAvatar}=require('../apps/api/src/modules/auth/avatar-image-validation.cjs');
// Compact 12x16 valid rasters generated offline, no external image library at test time.
const bytes=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/avatar-valid-hex.json'),'utf8'));
const formats={JPEG:'image/jpeg',PNG:'image/png',WEBP:'image/webp'};
for(const [format,mime] of Object.entries(formats)) {
 test(`avatar ${format}: preserves valid 12x16 image and rejects false MIME`,()=>{
   const value=Buffer.from(bytes[format],'hex');
   assert.deepEqual(inspectAvatar(value,mime),{mime,width:12,height:16});
   assert.equal(inspectAvatar(value,'image/gif'),null);
   for(const other of Object.values(formats).filter(x=>x!==mime)) assert.equal(inspectAvatar(value,other),null);
 });
 test(`avatar ${format}: rejects truncation and forged dimensions`,()=>{
   const value=Buffer.from(bytes[format],'hex');
   assert.equal(inspectAvatar(value.subarray(0,Math.min(20,value.length)),mime),null);
   assert.equal(inspectAvatar(value.subarray(0,value.length-12),mime),null);
   assert.equal(inspectAvatar(Buffer.concat([value,Buffer.alloc(307201)]),mime),null);
   const forged=Buffer.from(value);
   if(format==='PNG')forged.writeUInt32BE(9000,16);
   if(format==='WEBP')forged.writeUInt16LE(9000,26);
   if(format==='JPEG'){
     const marker=forged.indexOf(Buffer.from([0xff,0xc0]));
     assert.notEqual(marker,-1);
     forged.writeUInt16BE(9000,marker+7);
   }
   assert.equal(inspectAvatar(forged,mime),null);
 });
}
test('JPEG with a size header but no image scan is rejected',()=>{
 const genuine=Buffer.from(bytes.JPEG,'hex');
 const sos=genuine.indexOf(Buffer.from([0xff,0xda]));
 assert.ok(sos>0);
 const forged=Buffer.concat([genuine.subarray(0,sos),Buffer.from([0xff,0xd9])]);
 assert.equal(inspectAvatar(forged,'image/jpeg'),null);
});
test('PNG corruption cannot bypass validation with an intact IHDR and IEND',()=>{
 const valid=Buffer.from(bytes.PNG,'hex'), broken=Buffer.from(valid);
 const start=broken.indexOf(Buffer.from('IDAT'));
 assert.ok(start>0);
 broken[start+9]^=0xff; // corrupt payload while leaving the opening/closing signatures unchanged
 assert.equal(inspectAvatar(broken,'image/png'),null);
});
test('profile avatar uses 404 not a misleading 401; client can fall back to an initial',()=>{
 const api=fs.readFileSync(path.join(root,'apps/api/src/modules/auth/profile.service.ts'),'utf8');
 const client=fs.readFileSync(path.join(root,'apps/web/src/components/account-settings.tsx'),'utf8');
 assert.match(api,/inspectAvatar\(data,contentType\)/);
 assert.match(api,/new NotFoundException\('Chưa có ảnh đại diện'\)/);
 assert.match(client,/user\.hasAvatar && !avatarFailed/);
 assert.match(client,/onError=\{\(\) => setAvatarFailed\(true\)\}/);
});
