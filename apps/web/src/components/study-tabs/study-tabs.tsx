'use client';
import {useId, type KeyboardEvent, type ReactNode} from 'react';
import css from './study-tabs.module.css';

type Item = {id:string; label:string};
/** Manual activation: arrows move focus; Enter/Space activates without speculative requests. */
export function StudyTabs({label,items,value,onChange,children}:{label:string;items:readonly Item[];value:string;onChange:(value:string)=>void;children:ReactNode}) {
  const id=useId();
  function navigate(event:KeyboardEvent<HTMLDivElement>) {
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'));
    const index=tabs.indexOf(event.target as HTMLButtonElement);
    if(index<0)return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next]?.focus();
    tabs[next]?.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});
  }
  return <div className={css.root}>
    <div className={css.tabs} role="tablist" aria-label={label} onKeyDown={navigate}>
      {items.map(item=><button key={item.id} id={id+'-tab-'+item.id} type="button" role="tab"
        aria-selected={value===item.id} aria-controls={id+'-panel-'+item.id} tabIndex={value===item.id?0:-1}
        onClick={()=>{if(value!==item.id)onChange(item.id);}}>{item.label}</button>)}
    </div>
    {items.map(item=><div key={item.id} id={id+'-panel-'+item.id} className={css.panel}
      role="tabpanel" aria-labelledby={id+'-tab-'+item.id} tabIndex={0} hidden={value!==item.id}>
      {value===item.id?children:null}
    </div>)}
  </div>;
}
