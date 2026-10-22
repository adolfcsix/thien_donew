'use strict';
const {rasterMime}=require('../../common/raster-image-validation.cjs');
const MAX_BYTES=1024*1024;
const SUPPORTED=Object.freeze({'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'});
/** Reject common personal metadata; browser re-encodes image pixels to WebP. */
function hasMetadata(data,format){
 if(format==='png'){
  for(let pos=8;pos+12<=data.length;){
   const n=data.readUInt32BE(pos),type=data.toString('ascii',pos+4,pos+8);
   if(['eXIf','tEXt','zTXt','iTXt'].includes(type))return true;
   if(n>data.length-pos-12)return true;
   pos+=12+n;
   if(type==='IEND')break;
  }
 } else if(format==='webp'){
  for(let pos=12;pos+8<=data.length;){
   const type=data.toString('ascii',pos,pos+4),n=data.readUInt32LE(pos+4);
   if(['EXIF','XMP ','ICCP'].includes(type))return true;
   if(n>data.length-pos-8)return true;
   pos+=8+n+(n%2);
  }
 } else if(format==='jpeg'){
  // Header APP1 includes EXIF/XMP, APP13 can expose IPTC author information.
  for(let pos=2;pos+3<data.length;){
   if(data[pos]!==0xff)break;
   while(data[pos]===0xff)pos++;
   const marker=data[pos++];
   if(marker===0xda||marker===0xd9)break;
   if(marker===0xe1||marker===0xed||marker===0xfe)return true;
   if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;
   if(pos+2>data.length)break;
   const n=data.readUInt16BE(pos);if(n<2||pos+n>data.length)break;
   pos+=n;
  }
 }
 return false;
}
function validatedImage(data,contentType){
 if(typeof contentType!=='string'||!Object.hasOwn(SUPPORTED,contentType))return null;
 if(!Buffer.isBuffer(data)||data.length>MAX_BYTES)return null;
 const format=SUPPORTED[contentType];
 return rasterMime(data,format,MAX_BYTES)&&!hasMetadata(data,format)?contentType:null;
}
module.exports={MAX_BYTES,validatedImage,hasMetadata};
