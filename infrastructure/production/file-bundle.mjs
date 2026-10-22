/** Streaming, checksummed backup format; no dependencies, links or overwrites. */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,mkdir,readdir,open,readFile,stat} from 'node:fs/promises';
import {isAbsolute,join,dirname,resolve} from 'node:path';
import {once} from 'node:events';
const FORMAT='thien-do-file-bundle-v1',MAX_HEADER=16*1024*1024,CHUNK=64*1024;
const validPath=p=>typeof p==='string'&&p.length<=1024&&p.split('/').every(s=>/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s)&&s!=='.'&&s!=='..');
const hashFile=async file=>{const hash=createHash('sha256');for await(const data of createReadStream(file))hash.update(data);return hash.digest('hex')};
async function output(data){if(!process.stdout.write(data))await once(process.stdout,'drain')}
async function pack(root){
 if(!isAbsolute(root)||(await lstat(root)).isSymbolicLink()||!(await lstat(root)).isDirectory())throw Error('Use an absolute, non-link directory');
 const files=[];
 async function walk(relative=''){
  for(const entry of (await readdir(join(root,relative))).sort()){
   const name=relative?relative+'/'+entry:entry,file=join(root,name),st=await lstat(file);
   if(!validPath(name)||st.isSymbolicLink())throw Error('Unsafe asset path or link');
   if(st.isDirectory())await walk(name);
   else if(st.isFile()){files.push({path:name,size:st.size,sha256:await hashFile(file)});if(files.length>100000)throw Error('Too many files');}
   else throw Error('Special files cannot be backed up');
  }
 }
 await walk();
 const header=Buffer.from(JSON.stringify({format:FORMAT,files})+'\n');
 if(header.length>MAX_HEADER)throw Error('Backup inventory exceeds header limit');
 await output(header);
 for(const file of files){
  const hash=createHash('sha256');let size=0;
  for await(const chunk of createReadStream(join(root,file.path))){size+=chunk.length;hash.update(chunk);await output(chunk)}
  if(size!==file.size||hash.digest('hex')!==file.sha256)throw Error('File changed during snapshot; backup is invalid');
 }
}
async function readHeader(input){
  const chunks=[];let offset=0,headerBytes=0,newline=-1;
  while(newline<0){
   const buf=Buffer.alloc(CHUNK),{bytesRead}=await input.read(buf,0,buf.length,offset);
   if(!bytesRead)throw Error('Truncated backup header');
   const part=buf.subarray(0,bytesRead);newline=part.indexOf(10);
   const used=newline<0?part.length:newline;
   headerBytes+=used;if(headerBytes>MAX_HEADER)throw Error('Backup header too large');
   chunks.push(part.subarray(0,used));offset+=newline<0?bytesRead:newline+1;
  }
  const header=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(header.format!==FORMAT||!Array.isArray(header.files)||header.files.length>100000)throw Error('Unsupported backup format');
  const names=new Set();
  for(const file of header.files){
   if(!validPath(file.path)||!Number.isSafeInteger(file.size)||file.size<0||!/^[a-f0-9]{64}$/.test(file.sha256)||names.has(file.path.toLowerCase()))throw Error('Unsafe or duplicate backup entry');
   names.add(file.path.toLowerCase());
  }
  return {header,offset};
}
async function unpack(archive,target){
 if(!isAbsolute(target))throw Error('Restore target must be absolute');
 const input=await open(archive,'r');
 try{
  const parsed=await readHeader(input),header=parsed.header;let offset=parsed.offset;
  // EEXIST is intentional: a restore must never overwrite a live/private directory.
  await mkdir(target,{mode:0o700});
  for(const file of header.files){
   const dest=join(target,file.path);await mkdir(dirname(dest),{recursive:true,mode:0o700});
   const handle=await open(dest,'wx',0o600),hash=createHash('sha256');let remaining=file.size;
   try{
    while(remaining){
     const buffer=Buffer.alloc(Math.min(CHUNK,remaining)),{bytesRead}=await input.read(buffer,0,buffer.length,offset);
     if(!bytesRead)throw Error('Truncated backup content');
     const data=buffer.subarray(0,bytesRead);hash.update(data);
     let written=0;while(written<bytesRead){const result=await handle.write(data,written,bytesRead-written);if(!result.bytesWritten)throw Error('Restore write failed');written+=result.bytesWritten}
     remaining-=bytesRead;offset+=bytesRead;
    }
   }finally{await handle.close()}
   if(hash.digest('hex')!==file.sha256)throw Error('Restored file checksum mismatch');
  }
  if(offset!==(await input.stat()).size)throw Error('Unexpected trailing backup data');
  console.log(JSON.stringify({event:'files_restored',files:header.files.length,checksumsVerified:true}));
 }finally{await input.close()}
}
async function verifyIndex(archive,indexPath){
 if((await stat(indexPath)).size>MAX_HEADER)throw Error('Database asset index too large');
 const required=JSON.parse(await readFile(indexPath,'utf8'));
 if(!Array.isArray(required)||required.length>100000)throw Error('Invalid database asset index');
 const input=await open(archive,'r');
 try{
  const {header}=await readHeader(input),actual=new Map(header.files.map(file=>[file.path,file])),seen=new Set();
  for(const reference of required){
   const size=Number(reference.size);
   if(!validPath(reference.path)||!Number.isSafeInteger(size)||size<0||!/^[a-f0-9]{64}$/.test(reference.sha256)||seen.has(reference.path))throw Error('Invalid database asset reference');
   seen.add(reference.path);const file=actual.get(reference.path);
   if(!file||file.size!==size||file.sha256!==reference.sha256)throw Error('Database asset reference does not match private-file snapshot');
  }
  console.log(JSON.stringify({referencesVerified:true,references:required.length,archivedFiles:header.files.length}));
 }finally{await input.close()}
}
const [mode,source,target]=process.argv.slice(2);
if(mode==='pack'&&source)await pack(resolve(source));
else if(mode==='unpack'&&source&&target)await unpack(source,target);
else if(mode==='verify-index'&&source&&target)await verifyIndex(source,target);
else throw Error('Usage: file-bundle.mjs pack ABSOLUTE_DIRECTORY | unpack ARCHIVE NEW_ABSOLUTE_DIRECTORY | verify-index ARCHIVE DATABASE_INDEX_JSON');
