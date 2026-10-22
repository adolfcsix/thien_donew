'use client';
import {useEffect,useRef} from 'react';
import {subscribeVisibleRefresh} from './visible-refresh.cjs';

/** Shared event lifecycle; reads the latest callback without reattaching listeners. */
export function useVisibleRefresh(refresh:()=>void,enabled=true){
 const latest=useRef(refresh);latest.current=refresh;
 useEffect(()=>{
  if(enabled)return subscribeVisibleRefresh(window,document,()=>latest.current());
 },[enabled]);
}
