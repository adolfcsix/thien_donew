'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseBlocks,inline,safeHref}=require('../apps/web/src/app/van-kho/van-kho-markdown.cjs');
const {mediaType,mediaReferenced, LIMIT}=require('../apps/api/src/modules/van-kho/van-kho-media-contract.cjs');
const uuid='123e4567-e89b-42d3-a456-426614174000';
test('Safe Markdown rejects javascript: and protocol-relative links',()=>{
 assert.equal(safeHref('javascript:alert(1)'),null);assert.equal(safeHref('//evil.example/data'),null);
 assert.equal(safeHref('https://user:pass@domain.test'),null);assert.equal(safeHref('https://safe.example/docs'),'https://safe.example/docs');
 assert.ok(inline('[evil](javascript:alert)').every(p=>p.type!=='link'));
});
test('Markdown does not treat HTML tags as executable markup',()=>{
 const result=parseBlocks('<script>alert(1)</script>');assert.equal(result.blocks[0].text,'<script>alert(1)</script>');
});
test('Markdown TOC anchors remain stable and ordered',()=>{
 const result=parseBlocks('# Nghiên cứu\n## Phần một\n### Phần hai');assert.deepEqual(result.headings.map(x=>x.id),['section-0','section-1','section-2']);
});
test('Markdown renders tables with columns and ignores raw HTML injection',()=>{
 const r=parseBlocks('| Can | Chi |\n| --- | --- |\n| Giáp | Tý |');assert.equal(r.blocks[0].type,'table');assert.deepEqual(r.blocks[0].rows[0],['Giáp','Tý']);
});
test('Markdown renders code fences as literal data',()=>{
 const r=parseBlocks('```js\nconst s="<iframe />";\n```');assert.equal(r.blocks[0].type,'codeblock');assert.match(r.blocks[0].text,/<iframe/);
});
test('Only UUID-bound internal images are interpreted as media',()=>{
 const valid=inline(`![Thiên Đồ](vk-image:${uuid})`);assert.equal(valid.length,1);assert.equal(valid[0].type,'image');
 assert.ok(inline('![Bad](https://untrusted.example/x.svg)').every(p=>p.type!=='image'));
 assert.equal(mediaReferenced(`![Thiên Đồ](vk-image:${uuid})`,uuid),true);
 assert.equal(mediaReferenced('![Other](vk-image:123e4567-e89b-42d3-a456-426614174001)',uuid),false);
});
const rasters=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'fixtures/avatar-valid-hex.json'),'utf8'));
for(const [format,mime] of [['PNG','image/png'],['JPEG','image/jpeg'],['WEBP','image/webp']]){
 test(`Full ${format} upload accepted, fake/truncated/corrupt files refused`,()=>{
  const original=Buffer.from(rasters[format],'hex');
  const extension=format.toLowerCase()==='webp'?'webp':format.toLowerCase();
  assert.equal(mediaType(original,extension),mime);
  assert.throws(()=>mediaType(original.subarray(0,original.length-10),extension));
  assert.throws(()=>mediaType(original,extension==='jpeg'?'png':'jpeg'));
  const bogus=Buffer.alloc(80);
  if(format==='PNG'){original.subarray(0,24).copy(bogus);bogus.write('IHDR',12,'ascii');}
  if(format==='JPEG'){bogus[0]=255;bogus[1]=216;bogus[2]=255;bogus[78]=255;bogus[79]=217;}
  if(format==='WEBP'){bogus.write('RIFF',0);bogus.writeUInt32LE(72,4);bogus.write('WEBP',8);}
  assert.throws(()=>mediaType(bogus,extension));
 });
}
test('Invalid PNG IDAT checksum cannot be stored as CMS media',()=>{
 const corrupted=Buffer.from(rasters.PNG,'hex');const pos=corrupted.indexOf(Buffer.from('IDAT'));
 assert.ok(pos>0);corrupted[pos+9]^=0xff;
 assert.throws(()=>mediaType(corrupted,'png'));
});
test('Media exceeds maximum fails closed',()=>assert.throws(()=>mediaType(Buffer.alloc(LIMIT+1),'png')));
