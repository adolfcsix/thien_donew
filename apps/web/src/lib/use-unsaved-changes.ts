'use client';
import {useEffect} from 'react';
/** Full-page unload protection; client-side editor switches confirm separately. */
export function useUnsavedChanges(dirty:boolean){
 useEffect(()=>{
  if(!dirty)return;
  const protect=(event:BeforeUnloadEvent)=>{
   // AuthProvider conceals private DOM before its mandatory session-exit redirect.
   // A draft warning must never cancel that security transition.
   if(document.documentElement.dataset.sessionSuspended==='true')return;
   event.preventDefault();event.returnValue='';
  };
  window.addEventListener('beforeunload',protect);
  return()=>window.removeEventListener('beforeunload',protect);
 },[dirty]);
}
