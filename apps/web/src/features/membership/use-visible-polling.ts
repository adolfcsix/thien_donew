'use client';
import {useEffect,useRef} from 'react';
/** One request at a time. Hidden tabs and unmounted views cancel their poll. */
export function useVisiblePolling(enabled:boolean,refresh:(signal:AbortSignal)=>Promise<unknown>,delayMs=7000){
 const latest=useRef(refresh);latest.current=refresh;
 useEffect(()=>{
  if(!enabled)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>|null=null,active:AbortController|null=null;
  const visible=()=>document.visibilityState!=='hidden';
  function schedule(){if(!stopped&&visible()&&!active)timer=setTimeout(run,delayMs);}
  async function run(){timer=null;if(stopped||!visible()||active)return;const controller=new AbortController();active=controller;try{await latest.current(controller.signal);}catch{/* Keep last confirmed state; manual refresh remains available. */}finally{if(active===controller)active=null;schedule();}}
  function visibility(){if(timer){clearTimeout(timer);timer=null;}if(!visible())active?.abort();else if(!active)void run();}
  schedule();document.addEventListener('visibilitychange',visibility);
  return()=>{stopped=true;if(timer)clearTimeout(timer);active?.abort();document.removeEventListener('visibilitychange',visibility);};
 },[enabled,delayMs]);
}
