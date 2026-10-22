'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {rasterMime}=require('../apps/api/src/common/raster-image-validation.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/avatar-valid-hex.json'),'utf8'));
test('Book cover validator handles valid JPEG PNG WebP, rejects payload with header only',()=>{
 for(const [kind,format] of [['JPEG','jpeg'],['PNG','png'],['WEBP','webp']]){
  const data=Buffer.from(fixture[kind],'hex');
  assert.equal(rasterMime(data,format),`image/${format}`);
  assert.equal(rasterMime(data.subarray(0,data.length-10),format),null);
  assert.equal(rasterMime(Buffer.concat([data,Buffer.alloc(5*1024*1024)]),format),null);
 }
});
test('Both admin upload services validate entire raster payload before writing database',()=>{
 const books=fs.readFileSync(path.join(root,'apps/api/src/modules/books/books.service.ts'),'utf8');
 const cms=fs.readFileSync(path.join(root,'apps/api/src/modules/van-kho/van-kho-media-contract.cjs'),'utf8');
 assert.match(books,/if\(kind==='cover'&&!rasterMime\(contents,format\)\)/);
 assert.match(cms,/rasterMime\(data,format,LIMIT\)/);
});
test('Avatar keeps original module API for backward compatibility',()=>{
 const {inspectAvatar}=require('../apps/api/src/modules/auth/avatar-image-validation.cjs');
 assert.deepEqual(inspectAvatar(Buffer.from(fixture.PNG,'hex'),'image/png'),{mime:'image/png',width:12,height:16});
});
