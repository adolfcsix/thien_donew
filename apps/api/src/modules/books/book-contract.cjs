const {inflateRawSync,crc32}=require('node:zlib');
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUBJECTS=new Set(['tu-vi','bat-tu','kinh-dich','mai-hoa','luc-hao','ky-mon','lich-phap','phong-thuy','chiem-tinh','tarot','than-so-hoc','nghien-cuu','khac']);
function fail(message){throw Error(message);}
function required(value,max,name){if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\x00-\x1f\x7f]/.test(value))fail(name+' không hợp lệ');return value.trim();}
function optional(value,max,name){if(value==null||value==='')return '';if(typeof value!=='string'||value.length>max||/[\x00-\x1f\x7f]/.test(value))fail(name+' không hợp lệ');return value.trim();}
function bookInput(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Payload không hợp lệ');
 const slug=required(raw.slug,120,'Slug').toLowerCase();if(!SLUG.test(slug))fail('Slug chỉ gồm chữ thường, số và dấu gạch ngang');
 const title=required(raw.title,200,'Tiêu đề');const author=required(raw.author,160,'Tác giả');const subject=required(raw.subject,40,'Bộ môn');if(!SUBJECTS.has(subject))fail('Bộ môn không hợp lệ');
 const accessLevel=raw.accessLevel;if(!['free','member','pro'].includes(accessLevel))fail('Quyền đọc không hợp lệ');
 const status=raw.status;if(!['draft','published','hidden'].includes(status))fail('Trạng thái không hợp lệ');
 if(typeof raw.featured!=='boolean')fail('Featured không hợp lệ');
 const year=raw.publishedYear==null||raw.publishedYear===''?null:raw.publishedYear;
 if(year!==null&&(!Number.isInteger(year)||year<1450||year>2150))fail('Năm xuất bản không hợp lệ');
 const tags=raw.tags??[];if(!Array.isArray(tags)||tags.length>12||tags.some(x=>typeof x!=='string'||x.length>40||!x.trim()||/[\x00-\x1f\x7f]/.test(x)))fail('Tags không hợp lệ');
 if(new Set(tags.map(x=>x.toLowerCase())).size!==tags.length)fail('Tags bị trùng');
 const licenseName=optional(raw.licenseName,200,'Giấy phép'),licenseProof=optional(raw.licenseProof,1000,'Bằng chứng bản quyền');
 if(status==='published'&&(!licenseName||!licenseProof))fail('Cần ghi rõ giấy phép và bằng chứng quyền sử dụng trước khi xuất bản');
 return {slug,title,author,subject,accessLevel,status,featured:raw.featured,publishedYear:year,tags:tags.map(x=>x.trim()),publisher:optional(raw.publisher,160,'Nhà xuất bản'),synopsis:optional(raw.synopsis,4000,'Giới thiệu'),licenseName,licenseProof};
}
function canRead(access,{signedIn=false,pro=false}={}){if(!['free','member','pro'].includes(access))return false;return access==='free'||(signedIn&&(access==='member'||pro));}
function sniff(buffer,kind,declared){if(!Buffer.isBuffer(buffer))fail('File phải là buffer');if(kind==='cover'){
 if(declared==='jpeg'&&buffer.subarray(0,3).equals(Buffer.from([255,216,255])))return 'image/jpeg';
 if(declared==='png'&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(declared==='webp'&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'image/webp';
 fail('Định dạng ảnh bìa không khớp nội dung');}
 if(kind==='book'&&declared==='pdf'&&buffer.subarray(0,5).toString('ascii')==='%PDF-')return 'application/pdf';
 if(kind==='book'&&declared==='epub'&&buffer.subarray(0,4).toString('ascii')==='PK\x03\x04')return 'application/epub+zip';
 fail('Định dạng sách không được hỗ trợ hoặc sai nội dung');
}
/** Bounded reader; EPUB treated as text, never rendered as untrusted HTML or script.
 * Reject encrypted zip entries, ZIP64, overlapping/unsafe entries and oversized expansion. */
function epubEntries(zip){
 if(!Buffer.isBuffer(zip)||zip.length>24*1024*1024||zip.length<30||zip.readUInt32LE(0)!==0x04034b50)fail('EPUB ZIP không hợp lệ');
 const low=Math.max(0,zip.length-65557);let eocd=-1;
 for(let i=zip.length-22;i>=low;i--)if(zip.readUInt32LE(i)===0x06054b50&&i+22+zip.readUInt16LE(i+20)===zip.length){eocd=i;break;}
 if(eocd<0)fail('EPUB thiếu ZIP end-of-central-directory');
 if(zip.readUInt16LE(eocd+4)!==0||zip.readUInt16LE(eocd+6)!==0)fail('EPUB nhiều đĩa không hỗ trợ');
 const count=zip.readUInt16LE(eocd+10),start=zip.readUInt32LE(eocd+16),size=zip.readUInt32LE(eocd+12);
 if(!count||count>500||start+size>eocd||start+size>zip.length)fail('EPUB catalog ZIP không hợp lệ');
 let at=start,total=0;const results=new Map(),ranges=[];
 for(let i=0;i<count;i++){
  if(at+46>eocd||zip.readUInt32LE(at)!==0x02014b50)fail('EPUB central-directory không hợp lệ');
  const flags=zip.readUInt16LE(at+8),method=zip.readUInt16LE(at+10),checksum=zip.readUInt32LE(at+16),compressed=zip.readUInt32LE(at+20),plain=zip.readUInt32LE(at+24),fn=zip.readUInt16LE(at+28),extra=zip.readUInt16LE(at+30),comment=zip.readUInt16LE(at+32),offset=zip.readUInt32LE(at+42);
  if(flags&1||![0,8].includes(method)||compressed===0xffffffff||plain===0xffffffff||plain>3*1024*1024)fail('EPUB entry mã hóa hoặc quá lớn');
  total+=plain;if(total>60*1024*1024)fail('EPUB vượt giới hạn giải nén');
  if(at+46+fn+extra+comment>eocd)fail('EPUB central-directory bị cắt');
  const path=zip.toString('utf8',at+46,at+46+fn);at+=46+fn+extra+comment;
  if(!path||path.startsWith('/')||path.includes('\\')||path.split('/').includes('..')||path.includes('\0'))fail('Tên tệp EPUB không an toàn');
  if(results.has(path))fail('EPUB có tên tệp trùng');
  if(offset+30>start||zip.readUInt32LE(offset)!==0x04034b50)fail('EPUB entry offset không hợp lệ');
  const localLen=zip.readUInt16LE(offset+26),localExtra=zip.readUInt16LE(offset+28),dataStart=offset+30+localLen+localExtra;
  if(dataStart+compressed>start)fail('EPUB ZIP payload tràn');
  if(zip.toString('utf8',offset+30,offset+30+localLen)!==path)fail('EPUB tên entry không khớp');
  if(zip.readUInt16LE(offset+6)!==flags||zip.readUInt16LE(offset+8)!==method)fail('EPUB local metadata không khớp');
  let end=dataStart+compressed;
  if(flags&8){
   const descriptor=end+(end+4<=start&&zip.readUInt32LE(end)===0x08074b50?4:0);
   if(descriptor+12>start||zip.readUInt32LE(descriptor)!==checksum||zip.readUInt32LE(descriptor+4)!==compressed||zip.readUInt32LE(descriptor+8)!==plain)fail('EPUB data descriptor không khớp');
   end=descriptor+12;
  }else if(zip.readUInt32LE(offset+14)!==checksum||zip.readUInt32LE(offset+18)!==compressed||zip.readUInt32LE(offset+22)!==plain)fail('EPUB local CRC hoặc kích thước không khớp');
  if(ranges.some(([from,to])=>offset<to&&end>from))fail('EPUB entry chồng lấn (overlap)');
  ranges.push([offset,end]);
  const payload=zip.subarray(dataStart,dataStart+compressed);
  const data=method===0?payload:inflateRawSync(payload,{maxOutputLength:3*1024*1024});
  if(data.length!==plain)fail('EPUB giải nén sai kích thước');
  if(crc32(data)!==checksum)fail('EPUB CRC checksum không khớp');
  results.set(path,data);
 }
 if(at!==start+size)fail('EPUB directory length không khớp');
 if(results.get('mimetype')?.toString('ascii')!=='application/epub+zip')fail('EPUB sai mimetype');
 if(!results.has('META-INF/container.xml'))fail('EPUB thiếu container.xml');
 return results;
}
function decodeEntities(s){return s.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(full,entity)=>{const map={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};const e=entity.toLowerCase();if(map[e])return map[e];if(e.startsWith('#')){const n=Number.parseInt(e.slice(e[1]==='x'?2:1),e[1]==='x'?16:10);return Number.isSafeInteger(n)&&n<=0x10ffff&&n!==0?String.fromCodePoint(n):'';}return full;});}
function epubChapters(bytes){const files=epubEntries(bytes),root=files.get('META-INF/container.xml').toString('utf8');const match=root.match(/full-path=["']([^"']+\.opf)["']/i);if(!match)fail('EPUB chưa khai báo OPF');const opfPath=match[1];const opf=files.get(opfPath)?.toString('utf8');if(!opf)fail('EPUB OPF không tồn tại');const base=opfPath.includes('/')?opfPath.slice(0,opfPath.lastIndexOf('/')+1):'';const items=new Map();for(const entry of opf.matchAll(/<item\b[^>]*>/gi)){const tag=entry[0],id=tag.match(/\bid=["']([^"']+)["']/i)?.[1],href=tag.match(/\bhref=["']([^"']+)["']/i)?.[1],media=tag.match(/\bmedia-type=["']([^"']+)["']/i)?.[1];if(id&&href&&media==='application/xhtml+xml')items.set(id,href);}
 const chapters=[];for(const item of opf.matchAll(/<itemref\b[^>]*>/gi)){const id=item[0].match(/\bidref=["']([^"']+)["']/i)?.[1],href=id?items.get(id):null;if(!href)continue;let joined=base+decodeURIComponent(href.split('#')[0]);const parts=[];for(const piece of joined.split('/')){if(piece==='.'||!piece)continue;if(piece==='..'){if(!parts.length)fail('EPUB path traversal');parts.pop();}else parts.push(piece);}joined=parts.join('/');const data=files.get(joined);if(!data)continue;
 const doc=data.toString('utf8');if(/<script\b/i.test(doc)){} // scripts are never executed or returned as markup
 const safe=doc.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi,'').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'').replace(/<\/(?:p|h[1-6]|div|li|section|br|blockquote)>/gi,'\n').replace(/<br\b[^>]*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,'').replace(/[\t ]+/g,' ').replace(/\n\s*\n\s*\n/g,'\n\n').trim();
 const text=decodeEntities(safe);
 if(text)chapters.push({index:chapters.length,title:decodeEntities(doc.match(/<title[^>]*>([^<]{1,100})<\/title>/i)?.[1]||`Chương ${chapters.length+1}`),text:text.slice(0,120000),truncated:text.length>120000,originalCharacters:text.length});
 if(chapters.length>=100)break;}
 if(!chapters.length)fail('EPUB không có chương đọc được');return chapters;
}
module.exports={bookInput,canRead,sniff,epubEntries,epubChapters,SLUG,UUID,SUBJECTS};
