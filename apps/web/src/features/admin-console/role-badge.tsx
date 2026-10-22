'use client';
import {useId,useRef,useEffect} from 'react';
import {observeVisibleMotion} from '@/lib/visible-motion';
import type {AdminIdentity} from './model';
import css from './console.module.css';
export function AdminRoleBadge({identity,size=92}:{identity:AdminIdentity;size?:number}){
 const id=useId().replace(/:/g,'');
 const ref=useRef<SVGSVGElement>(null);useEffect(()=>{if(ref.current)return observeVisibleMotion(ref.current);},[]);
 return <svg ref={ref} className={css.roleBadge} style={{width:size,height:size}} data-style={identity.badgeStyle} data-tone={identity.badgeTone} data-role={identity.role} viewBox="0 0 120 120" role="img" aria-label={identity.role==='owner'?'Huy hiệu Chủ hệ thống':'Huy hiệu Quản trị viên'}>
  <defs><radialGradient id={id}><stop stopColor="var(--badge-glow)"/><stop offset="1" stopColor="var(--badge-core)"/></radialGradient></defs>
  <g className={css.badgeHalo}><circle cx="60" cy="60" r="55" fill="none" stroke="var(--badge-light)" strokeDasharray="1 8" strokeWidth="2"/><path d="M60 3L63 10L60 17L57 10ZM60 103L63 110L60 117L57 110Z" fill="var(--badge-light)"/></g>
  <g className={css.badgeBody}><path d="M60 14L97 36L97 79L60 105L23 79L23 36Z" fill={`url(#${id})`} stroke="var(--badge-light)" strokeWidth="2"/><circle cx="60" cy="60" r="32" fill="none" stroke="var(--badge-light)" opacity=".5"/>
   {identity.badgeStyle==='gate'?<path d="M37 82V38L48 32V82M72 82V32L83 38V82M32 84H88M48 43Q60 30 72 43" fill="none" stroke="var(--badge-light)" strokeWidth="3"/>:identity.badgeStyle==='orbit'?<g className={css.badgeOrbit}><ellipse cx="60" cy="60" rx="39" ry="18" fill="none" stroke="var(--badge-light)" transform="rotate(-35 60 60)"/><ellipse cx="60" cy="60" rx="39" ry="18" fill="none" stroke="var(--badge-light)" transform="rotate(35 60 60)"/></g>:<path d="M60 27L68 40L84 37L81 53L94 61L80 69L84 85L68 82L60 96L52 82L36 85L40 69L26 61L40 53L36 37L52 40Z" fill="none" stroke="var(--badge-light)" strokeWidth="2"/>}
   <path d="M50 48H70M46 57H74M60 48C60 63 54 72 45 78M59 59C63 68 70 75 77 79" fill="none" stroke="var(--badge-light)" strokeWidth="2.6" strokeLinecap="round"/>
   {identity.role==='owner'&&<path className={css.badgeCrown} d="M43 24L42 14L53 19L60 9L67 19L78 14L77 24Z" fill="var(--badge-light)"/>}
  </g>
 </svg>;
}
