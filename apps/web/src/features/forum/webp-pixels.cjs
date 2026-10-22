'use strict';
/** Drop ancillary metadata after canvas encoding, including Chromium's ICC profile.
 * Operates on encoded chunks without altering VP8/VP8L pixels or alpha data. */
function webpPixels(input){
 if(!(input instanceof Uint8Array)||input.byteLength<20)throw Error('Invalid WebP');
 const view=new DataView(input.buffer,input.byteOffset,input.byteLength);
 const tag=(at)=>String.fromCharCode(...input.subarray(at,at+4));
 if(tag(0)!=='RIFF'||tag(8)!=='WEBP'||view.getUint32(4,true)!==input.length-8)throw Error('Invalid WebP');
 const chunks=[];let size=12,at=12,pixels=false;
 while(at<input.length){
  if(at+8>input.length)throw Error('Truncated WebP');
  const name=tag(at),length=view.getUint32(at+4,true),end=at+8+length+(length%2);
  if(end>input.length)throw Error('Truncated WebP');
  if(!['ICCP','EXIF','XMP '].includes(name)){
   const chunk=Uint8Array.from(input.subarray(at,end));
   if(name==='VP8X'){if(length!==10)throw Error('Invalid WebP');chunk[8]&=~0x2c;}
   if(name==='VP8 '||name==='VP8L')pixels=true;
   chunks.push(chunk);size+=chunk.length;
  }
  at=end;
 }
 if(!pixels)throw Error('Missing WebP pixels');
 const output=new Uint8Array(size);output.set(input.subarray(0,12));new DataView(output.buffer).setUint32(4,size-8,true);
 at=12;for(const chunk of chunks){output.set(chunk,at);at+=chunk.length;}
 return output;
}
module.exports={webpPixels};
