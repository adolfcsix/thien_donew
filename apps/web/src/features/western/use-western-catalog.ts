'use client';
import {useEffect,useRef,useState} from 'react';
import {westernCatalog,type WesternCatalog} from './secure-api';

/** Component-local, bounded by the 39 catalog entries; never caches personal calculations. */
export function useWesternCatalog(tab='planets',index=0) {
  const cache=useRef(new Map<string,WesternCatalog>());
  const [state,setState]=useState<{key:string;value?:WesternCatalog;error?:string;loading:boolean}>({key:'',loading:true});
  const [retry,setRetry]=useState(0);
  const key=tab+':'+index;
  useEffect(()=>{
    const controller=new AbortController();
    const hit=cache.current.get(key);
    if(hit){setState({key,value:hit,loading:false});return ()=>controller.abort();}
    setState({key,loading:true});
    void westernCatalog(tab,index,controller.signal).then(value=>{
      if(controller.signal.aborted)return;
      if(cache.current.size>=39)cache.current.delete(cache.current.keys().next().value!);
      cache.current.set(key,value);setState({key,value,loading:false});
    }).catch(reason=>{if(!controller.signal.aborted)setState({key,error:reason instanceof Error?reason.message:'Không thể tải tri thức. Hãy thử lại.',loading:false});});
    return ()=>controller.abort();
  },[tab,index,key,retry]);
  const current=cache.current.get(key)||(state.key===key?state.value:undefined);
  const navigation=current?.navigation||state.value?.navigation||[...cache.current.values()][0]?.navigation||null;
  return {navigation,item:current?.item||null,loading:!current&&(state.key!==key||state.loading),error:state.key===key?state.error||'':'',retry:()=>{cache.current.delete(key);setRetry(n=>n+1);}};
}
