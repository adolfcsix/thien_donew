'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './api';
import {parsePublicCatalogPage} from './public-catalog-validation';

type CatalogState<T>={key:string;items:T[];nextOffset:number|null;busy:boolean;error:string};
/** One request scope per filter set; pagination cannot outlive its filters. */
export function usePagedCatalog<T>({endpoint,query,listKey,debounceMs=220,validateItem}:{endpoint:string;query:Record<string,string>;listKey:string;debounceMs?:number;validateItem?:(value:unknown)=>value is T}){
 const search=new URLSearchParams(query).toString(),key=endpoint+'?'+search;
 const request=useRef<{key:string;controller:AbortController;busy:boolean}|null>(null);
 const [retryToken,setRetryToken]=useState(0);
 const [state,setState]=useState<CatalogState<T>>({key,items:[],nextOffset:null,busy:true,error:''});
 const load=useCallback(async(scope:NonNullable<typeof request.current>,offset:number)=>{
  if(scope.controller.signal.aborted||request.current!==scope)return;
  scope.busy=true;setState(old=>({...old,busy:true,error:''}));
  try{
   const page=await api<Record<string,unknown>>(scope.key+'&offset='+offset,{signal:scope.controller.signal,timeoutMs:15000});
   const {items,nextOffset:next}=parsePublicCatalogPage<T>(page,listKey,offset,validateItem);
   if(scope.controller.signal.aborted||request.current!==scope)return;
   setState(old=>({key:scope.key,items:offset&&old.key===scope.key?[...old.items,...items]:items,nextOffset:next,busy:false,error:''}));
  }catch(error){
   if(!scope.controller.signal.aborted&&request.current===scope)setState(old=>({...old,busy:false,error:(error as Error).message}));
  }finally{scope.busy=false}
 },[listKey,validateItem]);
 useEffect(()=>{
  const scope={key,controller:new AbortController(),busy:true};request.current=scope;
  setState({key,items:[],nextOffset:null,busy:true,error:''});
  const timer=setTimeout(()=>void load(scope,0),debounceMs);
  return()=>{clearTimeout(timer);scope.controller.abort()};
 },[key,load,debounceMs,retryToken]);
 const visible=state.key===key?state:{key,items:[] as T[],nextOffset:null,busy:true,error:''};
 function more(){const scope=request.current;if(scope&&scope.key===key&&!scope.busy&&visible.nextOffset!==null)void load(scope,visible.nextOffset)}
 return {...visible,more,retry:()=>setRetryToken(value=>value+1)};
}
