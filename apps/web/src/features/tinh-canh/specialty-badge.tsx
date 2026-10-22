'use client';
import {useEffect,useRef,type CSSProperties} from 'react';
import {observeVisibleMotion} from '@/lib/visible-motion';
import catalog from '../../../../../packages/knowledge/src/specialty-badges.json';
import css from './specialty-badge.module.css';

export type SpecialtyGrant = {badgeId:string;grantedAt:string};
export const specialtyBadges = catalog;
export function specialtyBadgeRows(raw:unknown):SpecialtyGrant[] {
 if(!raw||typeof raw!=='object'||!('specialtyBadges' in raw))return [];
 const rows=(raw as {specialtyBadges:unknown}).specialtyBadges;
 if(!Array.isArray(rows)||rows.length>20)return [];
 return rows.filter((row):row is SpecialtyGrant=>!!row&&typeof row==='object'&&typeof row.badgeId==='string'&&typeof row.grantedAt==='string'&&catalog.some(entry=>entry.id===row.badgeId));
}
/** Honorary field badge, never a permission flag. Distinct optical language from rank medals. */
export function SpecialtyBadge({badgeId,size=42,showName=false}:{badgeId:string;size?:number;showName?:boolean}){
 const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>ref.current?observeVisibleMotion(ref.current):undefined,[badgeId]);
 const item=catalog.find(entry=>entry.id===badgeId);
 if(!item)return null;
 return <span ref={ref} data-paused="true" className={css.badge} data-tone={item.tone} data-badge-id={badgeId} style={{'--specialty-size':`${Math.max(28,Math.min(size,108))}px`} as CSSProperties}
  role="img" aria-label={'Huy hiệu chuyên môn: '+item.name} title={`${item.name} · ${item.subject} — ${item.description}`}>
  <span className={css.orbit} aria-hidden="true"/><span className={css.emblem} aria-hidden="true">{item.symbol}</span>
  {showName&&<span className={css.name}>{item.name}</span>}
 </span>;
}
