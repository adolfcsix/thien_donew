'use client';
import {useCallback,useLayoutEffect,useRef} from 'react';

type Anchor={id:string;offset:number};
/** Remember reader intent before DOM growth; preserve an actual visible row. */
export function useMessageScroll(conversation:string,revision:unknown){
 const ref=useRef<HTMLOListElement>(null);
 const following=useRef(true),anchor=useRef<Anchor|null>(null);
 const capture=useCallback(()=>{
  const list=ref.current;if(!list)return;
  const top=list.getBoundingClientRect().top;
  const row=Array.from(list.children).find(n=>n.getBoundingClientRect().bottom>top) as HTMLElement|undefined;
  anchor.current=row?.dataset.messageId?{id:row.dataset.messageId,offset:row.getBoundingClientRect().top-top}:null;
 },[]);
 const restore=useCallback(()=>{
  const list=ref.current;if(!list)return;
  if(following.current){list.scrollTop=list.scrollHeight;capture();return;}
  const saved=anchor.current;
  const row=saved&&Array.from(list.children).find(n=>(n as HTMLElement).dataset.messageId===saved.id);
  if(row&&saved)list.scrollTop+=row.getBoundingClientRect().top-list.getBoundingClientRect().top-saved.offset;
  capture();
 },[capture]);
 useLayoutEffect(()=>{following.current=true;anchor.current=null;},[conversation]);
 useLayoutEffect(()=>{restore();},[conversation,revision,restore]);
 useLayoutEffect(()=>{
  const list=ref.current;if(!list)return;
  const onScroll=()=>{following.current=list.scrollHeight-list.clientHeight-list.scrollTop<80;capture();};
  list.addEventListener('scroll',onScroll,{passive:true});
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(restore);
  observer?.observe(list);for(const row of Array.from(list.children))observer?.observe(row);
  return()=>{list.removeEventListener('scroll',onScroll);observer?.disconnect();};
 },[conversation,revision,capture,restore]);
 return {ref,follow:()=>{following.current=true;}};
}
