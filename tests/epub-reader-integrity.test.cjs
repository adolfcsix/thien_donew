'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epubEntries,epubChapters}=require('../apps/api/src/modules/books/book-contract.cjs'),{epub,zip}=require('./helpers-epub-fixture.cjs');
test('EPUB rejects a stored payload changed without updating its CRC',()=>{const {buffer,records}=epub(),entry=records.find(x=>x.name==='OPS/chapter.xhtml');buffer[entry.data+10]^=1;assert.throws(()=>epubEntries(buffer),/CRC|checksum/i);});
test('EPUB rejects forged central checksum and mismatched local compression metadata',()=>{const a=epub(),entry=a.records.at(-1);a.buffer.writeUInt32LE(0,entry.central+16);assert.throws(()=>epubEntries(a.buffer));const b=epub();b.buffer.writeUInt16LE(8,b.records.at(-1).local+8);assert.throws(()=>epubEntries(b.buffer));});
test('EPUB rejects a chapter local record embedded inside another entry payload',()=>{
 const contents='<html><body>Nested payload</body></html>',inner=zip([{name:'OPS/chapter.xhtml',text:contents}]),nested=inner.buffer.subarray(0,30+Buffer.byteLength('OPS/chapter.xhtml')+Buffer.byteLength(contents));
 const outer=zip([{name:'mimetype',text:'application/epub+zip'},{name:'META-INF/container.xml',text:Buffer.concat([Buffer.from('<container>'),nested,Buffer.from('</container>')])},{name:'OPS/chapter.xhtml',text:contents}]);
 outer.buffer.writeUInt32LE(outer.records[1].data+Buffer.byteLength('<container>'),outer.records[2].central+42);assert.throws(()=>epubEntries(outer.buffer),/chồng|overlap/i);
});
test('bounded deflate entries with valid data descriptors remain readable',()=>{assert.equal(epubChapters(epub({descriptor:true}).buffer)[0].text,'Nội dung đối chiếu.');});
test('paired manifest and spine tags produce a readable chapter',()=>{assert.equal(epubChapters(epub({paired:true}).buffer)[0].title,'Chương thử');});
test('long chapter reports truncation and full decoded character count',()=>{const chapter=epubChapters(epub({text:'a'.repeat(125000)}).buffer)[0];assert.equal(chapter.text.length,120000);assert.equal(chapter.truncated,true);assert.equal(chapter.originalCharacters,125000);const short=epubChapters(epub().buffer)[0];assert.equal(short.truncated,false);});
