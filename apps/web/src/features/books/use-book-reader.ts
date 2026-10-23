'use client';
import {useCallback,useEffect,useState} from 'react';
import {api} from '@/lib/api';
import {usePendingOperation} from '@/lib/use-pending-operation';

type Progress={position:number;bookmarks:number[];favorite:boolean};
type Detail={book:{id:string;slug:string;title:string;format:'pdf'|'epub'|null;accessLevel:string};canRead:boolean;progress:Progress|null};
type ChapterLink={index:number;title:string};
type Chapter=ChapterLink&{text:string;truncated?:boolean;originalCharacters?:number};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,max=1000000):v is number=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
const invalid=()=>{throw Error('Dữ liệu trình đọc chưa hợp lệ. Hãy thử tải lại.');};
function detailResponse(v:unknown,slug:string):Detail{
 if(!object(v)||!object(v.book)||v.book.slug!==slug||typeof v.book.id!=='string'||typeof v.book.title!=='string'||!['pdf','epub',null].includes(v.book.format as 'pdf'|'epub'|null)||typeof v.canRead!=='boolean')invalid();
 const d=v as unknown as Detail,p=d.progress;
 if(p!==null&&(!object(p)||!integer(p.position)||!Array.isArray(p.bookmarks)||p.bookmarks.length>100||p.bookmarks.some(n=>!integer(n))||new Set(p.bookmarks).size!==p.bookmarks.length||typeof p.favorite!=='boolean'))invalid();
 return d;
}
function chapterLinks(v:unknown):ChapterLink[]{
 if(!object(v)||!Array.isArray(v.chapters)||!v.chapters.length||v.chapters.length>100)invalid();
 const items=(v as {chapters:ChapterLink[]}).chapters;
 if(items.some((c,i)=>!object(c)||c.index!==i||typeof c.title!=='string'||c.title.length>200))invalid();return items;
}
function chapterResponse(v:unknown,position:number,total:number):Chapter{
 if(!object(v)||v.total!==total||!object(v.chapter)||v.chapter.index!==position||typeof v.chapter.title!=='string'||typeof v.chapter.text!=='string'||v.chapter.text.length>120000)invalid();
 const c=(v as {chapter:Chapter}).chapter;
 if(c.truncated!==undefined&&typeof c.truncated!=='boolean'||c.originalCharacters!==undefined&&!integer(c.originalCharacters,3000000))invalid();return c;
}

/** Mounted once per slug/account by the reader route; requests are cancelled on identity change. */
export function useBookReader(slug:string,signedIn:boolean){
 const resource='/api/books/'+encodeURIComponent(slug),operation=usePendingOperation();
 const [book,setBook]=useState<Detail|null>(null),[chapters,setChapters]=useState<ChapterLink[]>([]),[chapter,setChapter]=useState<Chapter|null>(null);
 const [progress,setProgress]=useState<Progress>({position:0,bookmarks:[],favorite:false});
 const [busy,setBusy]=useState(true),[loadError,setLoadError]=useState(''),[chapterError,setChapterError]=useState(''),[saveError,setSaveError]=useState(''),[notice,setNotice]=useState('');
 const [chapterLoading,setChapterLoading]=useState(false),[loadRetry,setLoadRetry]=useState(0),[chapterRetry,setChapterRetry]=useState(0),[retryIntent,setRetryIntent]=useState<Progress|null>(null);
 useEffect(()=>{
  const controller=new AbortController(),signal=controller.signal;setBusy(true);setLoadError('');setBook(null);setChapter(null);setChapters([]);
  void(async()=>{try{
   const d=detailResponse(await api<unknown>(resource,{signal}),slug);if(!d.canRead)throw Error('Bạn chưa có quyền đọc đầu sách này. Kiểm tra đăng nhập hoặc quyền Pro ở trang chi tiết.');if(!d.book.format)throw Error('Tệp sách chưa sẵn sàng.');
   const opened=await api<unknown>(resource+'/open',{method:'POST',signal});if(!object(opened)||opened.allowed!==true||opened.format!==d.book.format)invalid();
   const links=d.book.format==='epub'?chapterLinks(await api<unknown>(resource+'/chapters',{signal})):[];
   if(signal.aborted)return;const maximum=d.book.format==='epub'?links.length-1:10000;
   const saved=d.progress??{position:0,bookmarks:[],favorite:false},position=Math.min(saved.position,maximum),marks=saved.bookmarks.filter(n=>n<=maximum);
   setProgress({...saved,position,bookmarks:marks});setChapters(links);setBook(d);
   if(position!==saved.position||marks.length!==saved.bookmarks.length)setNotice('Mục lục đã thay đổi; vị trí và đánh dấu ngoài phạm vi không được mở. Dữ liệu cũ chỉ thay khi bạn chủ động lưu lại.');
  }catch(e){if(!signal.aborted)setLoadError((e as Error).message);}finally{if(!signal.aborted)setBusy(false);}})();
  return()=>controller.abort();
 },[resource,slug,loadRetry]);
 useEffect(()=>{
  if(!book||book.book.format!=='epub')return;
  const controller=new AbortController(),signal=controller.signal;setChapter(null);setChapterError('');setChapterLoading(true);
  void api<unknown>(resource+'/chapters/'+progress.position,{signal}).then(v=>{if(!signal.aborted)setChapter(chapterResponse(v,progress.position,chapters.length));}).catch(e=>{if(!signal.aborted)setChapterError((e as Error).message);}).finally(()=>{if(!signal.aborted)setChapterLoading(false);});
  return()=>controller.abort();
 },[resource,book,chapters.length,progress.position,chapterRetry]);
 const {begin,finish}=operation;
 const persist=useCallback(async(next:Progress)=>{
  if(!book||busy)return;const maximum=book.book.format==='epub'?chapters.length-1:10000;
  if(!integer(next.position,maximum)||next.bookmarks.length>100||next.bookmarks.some(n=>!integer(n,maximum))){setSaveError('Vị trí không hợp lệ hoặc đã đủ 100 đánh dấu. Hãy bỏ một đánh dấu trước khi thêm.');return;}
  const controller=begin();if(!controller)return;setSaveError('');setNotice('');setRetryIntent(null);
  try{
   if(signedIn){const receipt=await api<unknown>(resource+'/progress',{method:'PATCH',body:next,signal:controller.signal,timeoutMs:15000});if(!object(receipt)||receipt.saved!==true)throw Error('Chưa nhận được xác nhận lưu tiến độ. Vị trí đang đọc được giữ nguyên.');}
   if(controller.signal.aborted)return;setProgress(next);setNotice(signedIn?'Đã lưu vị trí và đánh dấu vào tài khoản.':'Vị trí và đánh dấu chỉ giữ tạm trong trang này.');
  }catch(e){if(!controller.signal.aborted){setSaveError((e as Error).message);setRetryIntent(next);}}finally{finish(controller);}
 },[resource,book,busy,chapters.length,signedIn,begin,finish]);
 const go=(position:number)=>persist({...progress,position});
 const toggleBookmark=()=>persist({...progress,bookmarks:progress.bookmarks.includes(progress.position)?progress.bookmarks.filter(n=>n!==progress.position):[...progress.bookmarks,progress.position]});
 const toggleFavorite=()=>persist({...progress,favorite:!progress.favorite});
 return {resource,book,chapters,chapter,progress,busy,chapterLoading,saving:operation.pending,loadError,chapterError,saveError,notice,retryIntent,go,toggleBookmark,toggleFavorite,retrySave:()=>retryIntent&&persist(retryIntent),retryLoad:()=>setLoadRetry(v=>v+1),retryChapter:()=>setChapterRetry(v=>v+1)};
}
