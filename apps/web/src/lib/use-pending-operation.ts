'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

/** One private operation at a time, including the gap before React rerenders. */
export function usePendingOperation() {
  const active=useRef<AbortController|null>(null);
  const [pending,setPending]=useState(false);
  useEffect(()=>()=>{active.current?.abort();active.current=null;},[]);
  const begin=useCallback(()=>{
    if(active.current)return null;
    const controller=new AbortController();active.current=controller;setPending(true);return controller;
  },[]);
  const finish=useCallback((controller:AbortController)=>{
    if(active.current===controller){active.current=null;setPending(false);}
  },[]);
  const isPending=useCallback(()=>active.current!==null,[]);
  return {pending,begin,finish,isPending};
}
