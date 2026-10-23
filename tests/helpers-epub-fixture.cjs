'use strict';
const {crc32,deflateRawSync}=require('node:zlib');
function zip(entries){const locals=[],centrals=[],records=[];let offset=0;
 for(const e of entries){const name=Buffer.from(e.name),raw=Buffer.from(e.text),packed=e.deflate?deflateRawSync(raw):raw,crc=crc32(raw),flags=e.descriptor?8:0,local=Buffer.alloc(30),central=Buffer.alloc(46);
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(flags,6);local.writeUInt16LE(e.deflate?8:0,8);if(!e.descriptor){local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(raw.length,22);}local.writeUInt16LE(name.length,26);
  central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(flags,8);central.writeUInt16LE(e.deflate?8:0,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
  const descriptor=Buffer.alloc(e.descriptor?16:0);if(e.descriptor){descriptor.writeUInt32LE(0x08074b50);descriptor.writeUInt32LE(crc,4);descriptor.writeUInt32LE(packed.length,8);descriptor.writeUInt32LE(raw.length,12);}
  records.push({name:e.name,local:offset,data:offset+30+name.length,packed:packed.length});const record=Buffer.concat([local,name,packed,descriptor]);locals.push(record);offset+=record.length;centrals.push(Buffer.concat([central,name]));
 }
 let at=offset;for(let i=0;i<records.length;i++){records[i].central=at;at+=centrals[i].length;}
 const directory=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return {buffer:Buffer.concat([...locals,directory,end]),records};
}
function epub({text='Nội dung đối chiếu.',paired=false,descriptor=false,containerExtra=''}={}){
 const close=paired?'></item>':'/>',ref=paired?'></itemref>':'/>';
 return zip([{name:'mimetype',text:'application/epub+zip'},{name:'META-INF/container.xml',text:'<container><rootfile full-path="OPS/book.opf"/></container>'+containerExtra},{name:'OPS/book.opf',text:'<package><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"'+close+'</manifest><spine><itemref idref="chapter"'+ref+'</spine></package>'},{name:'OPS/chapter.xhtml',text:'<html><head><title>Chương thử</title></head><body><p>'+text+'</p></body></html>',descriptor,deflate:descriptor}]);
}
module.exports={zip,epub};
