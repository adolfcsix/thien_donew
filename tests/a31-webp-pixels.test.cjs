const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webpPixels}=require('../apps/web/src/features/forum/webp-pixels.cjs');
const {validatedImage}=require('../apps/api/src/modules/forum/forum-image-contract.cjs');
const original=fs.readFileSync(path.join(__dirname,'fixtures/a30-forum-webp'));
function chunk(tag,body){const b=Buffer.alloc(8+body.length+body.length%2);b.write(tag);b.writeUInt32LE(body.length,4);body.copy(b,8);return b}
function withMetadata(){const h=Buffer.alloc(10);h[0]=0x2c;h.writeUIntLE(1,4,3);h.writeUIntLE(1,7,3);const b=Buffer.concat([original.subarray(0,12),chunk('VP8X',h),chunk('ICCP',Buffer.from('color profile')),chunk('EXIF',Buffer.from('private GPS')),chunk('XMP ',Buffer.from('private author')),original.subarray(12)]);b.writeUInt32LE(b.length-8,4);return b}
test('canvas-like ICCP and personal metadata are stripped; image bytes and input are preserved',()=>{
 const tagged=withMetadata(),before=Buffer.from(tagged);assert.equal(validatedImage(tagged,'image/webp'),null);
 const clean=Buffer.from(webpPixels(tagged));assert.equal(validatedImage(clean,'image/webp'),'image/webp');assert.equal(clean[20]&0x2c,0);
 assert.ok(clean.subarray(30).equals(original.subarray(12)));assert.deepEqual(tagged,before);
 for(const word of ['private GPS','private author','color profile'])assert.equal(clean.includes(Buffer.from(word)),false);
});
test('already plain pixels round-trip without mutation',()=>assert.deepEqual(Buffer.from(webpPixels(original)),original));
test('truncation, wrong RIFF lengths, malformed VP8X and missing pixels fail closed',()=>{
 assert.throws(()=>webpPixels(original.subarray(0,22)));const bad=Buffer.from(original);bad.writeUInt32LE(0xffffffff,16);assert.throws(()=>webpPixels(bad));
 const tagged=withMetadata();tagged.writeUInt32LE(9,16);assert.throws(()=>webpPixels(tagged));
 const empty=Buffer.concat([original.subarray(0,12),chunk('EXIF',Buffer.alloc(4))]);empty.writeUInt32LE(empty.length-8,4);assert.throws(()=>webpPixels(empty));
});

test('Western label spacing includes the circular closing gap across deterministic clustered inputs',()=>{
 const {layoutCircularLabels}=require('../apps/web/src/features/western/chart-label-layout.cjs');let seed=117;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let t=0;t<3000;t++){const input=Array.from({length:12},(_,i)=>({id:String(i),angle:random()*360})),before=JSON.stringify(input),result=layoutCircularLabels(input),angles=result.map(x=>x.labelAngle).sort((a,b)=>a-b);
  assert.equal(JSON.stringify(input),before);for(const x of result)assert.equal(x.angle,input.find(i=>i.id===x.id).angle);
  for(let i=0;i<angles.length;i++)assert.ok(angles[(i+1)%angles.length]+(i===angles.length-1?360:0)-angles[i]>=14-1e-8);
 }
});

test('closing gap regression: separate clusters may not wrap onto the first label',()=>{
 const {layoutCircularLabels}=require('../apps/web/src/features/western/chart-label-layout.cjs');const angles=[99.19071156531572, 144.1527273785323, 143.5242216847837, 140.08433480747044, 162.37987495958805, 326.3515785243362, 246.2276909686625, 152.29408317245543, 153.77710159868002, 155.02301308326423, 45.83689061924815, 135.3424742538482];
 const result=layoutCircularLabels(angles.map((angle,i)=>({id:String(i),angle}))).map(x=>x.labelAngle).sort((a,b)=>a-b);
 for(let i=0;i<result.length;i++)assert.ok(result[(i+1)%result.length]+(i===result.length-1?360:0)-result[i]>=14-1e-8);
});
