import type {FileHandle} from 'node:fs/promises';

/** A filesystem write may consume fewer bytes than supplied. */
export async function writeFileChunk(handle:Pick<FileHandle,'write'>,buffer:Buffer){
 let offset=0;
 while(offset<buffer.length){
  const {bytesWritten}=await handle.write(buffer,offset,buffer.length-offset);
  if(!Number.isInteger(bytesWritten)||bytesWritten<=0||bytesWritten>buffer.length-offset)throw Error('Incomplete private-file write');
  offset+=bytesWritten;
 }
}
