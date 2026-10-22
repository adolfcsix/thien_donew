'use client';

import {memo,useEffect,useId,useRef} from 'react';
import {medalDesign} from '@/features/tinh-canh/medal-designs';
import {MedalEmblem} from '@/features/tinh-canh/medal-emblem';
import {MedalCelestialLayers} from '@/features/tinh-canh/medal-celestial-layers';
import {observeVisibleMotion} from '@/lib/visible-motion';
import medalColors from '@/customize/medal-colors.json';
import styles from './tinh-canh-medal.module.css';
/** SVG-native medal: 18 individually distinct deterministic silhouettes; zero network images. */
// Mỗi cặp màu áp dụng cho 3 cấp liên tiếp; hình dáng và hiệu ứng vẫn riêng từng cấp.
const metals = medalColors;
const points=(n:number,radius:number,inner:number)=>Array.from({length:n*2},(_,i)=>{
 const a=-Math.PI/2+i*Math.PI/n;const rr=i%2?inner:radius;
 return `${(50+rr*Math.cos(a)).toFixed(2)},${(50+rr*Math.sin(a)).toFixed(2)}`;
}).join(' ');
export const TinhCanhMedal = memo(function TinhCanhMedal({level,size=108}: {level:number;size?:number}){
 const uniqueId=useId().replace(/:/g,'');
 const l=Math.max(1,Math.min(18,Math.floor(level||1))),stage=Math.floor((l-1)/3),step=(l-1)%3;
 const design=medalDesign(l);
 const [dark,light]=metals[stage],count=4+Math.min(l,9),feature=l>=10;
 const medalRef=useRef<SVGSVGElement>(null);
 useEffect(()=>{
  const node=medalRef.current;
  if(!node||!feature)return;
  return observeVisibleMotion(node);
 },[feature]);
 const shimmerId=`shimmer-${uniqueId}`;
 const auraId=`aura-${uniqueId}`;
 // Per-level geometry, borders, linework, satellites and dynamic layers are all distinct.
 return <svg ref={medalRef} className={styles.medal} data-level={l} data-art-tier={design.tier} data-motif={design.motif} data-motion={feature?'enabled':'none'}
  style={{width:size,height:size,'--medal-dark':dark,'--medal-light':light,'--medal-tilt':l>=16?'8deg':l>=13?'6deg':'3deg','--medal-drift':`${l===18?11:l>=16?13:l>=13?15:17}s`} as React.CSSProperties}
  viewBox="0 0 100 100" role="img" aria-label={`Huy chương cảnh giới ${l} · ${design.name}`} aria-describedby={`medal-description-${uniqueId}`}>
  <title>{`${design.name} · Cảnh ${l}`}</title>
  <desc id={`medal-description-${uniqueId}`}>{design.description} {design.motion}. Tôn trọng chế độ giảm chuyển động.</desc>
  <defs>
   <radialGradient id={`core-${uniqueId}`} cx="35%" cy="28%"><stop offset="0" stopColor={light}/><stop offset="1" stopColor={dark}/></radialGradient>
   <linearGradient id={shimmerId} x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/>
    <stop offset="45%" stopColor="#ffffff" stopOpacity="0"/>
    <stop offset="50%" stopColor="#ffffff" stopOpacity=".72"/>
    <stop offset="55%" stopColor="#ffffff" stopOpacity="0"/>
    <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
   </linearGradient>
   <radialGradient id={auraId} cx="50%" cy="50%">
    <stop offset="0%" stopColor={light} stopOpacity=".26"/>
    <stop offset="100%" stopColor={light} stopOpacity="0"/>
   </radialGradient>
  </defs>
  {l>=10&&<circle cx="50" cy="50" r="48" fill={`url(#${auraId})`} className={styles.aura}/>}
  <g data-layer="body" className={feature?styles.floatLayer:undefined}>
   <polygon points={points(6+stage,47,36-step)} transform="translate(0 1.8)" fill="#091a22" opacity=".65"/>
   <polygon points={points(6+stage,47,36-step)} fill={dark} opacity=".96"/>
   <circle cx="50" cy="50" r="38" fill={`url(#core-${uniqueId})`} stroke={light} strokeWidth={1.4+step*.45}/>
   <path d="M16 43A35 35 0 0 1 78 27M22 74A35 35 0 0 0 84 57" fill="none" stroke={light} strokeWidth=".7" opacity=".6"/>
   <circle cx="50" cy="50" r={32-step} fill="none" stroke={light} strokeWidth=".9" strokeDasharray={`${1+step} ${3+step}`} opacity=".85"/>
   {Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count;return <circle key={i} cx={50+34*Math.cos(a)} cy={50+34*Math.sin(a)} r={1+step*.35} fill={light}/>;})}
   <g className={feature?styles.innerSpin:undefined} opacity=".5">
    {Array.from({length:Math.min(stage+1,6)},(_,j)=>{const a=j*Math.PI*2/(stage+1),rad=17+step*3;return <path key={j} d={`M50 50 L${50+rad*Math.cos(a)} ${50+rad*Math.sin(a)}`} stroke={light} strokeWidth="1.2" opacity=".65"/>;})}
    <polygon points={points(3+stage+step,18+step,9+stage)} fill="none" stroke={light} strokeWidth={1.4} transform={`rotate(${step*12} 50 50)`}/>
   </g>
   {l>=10&&<circle cx="50" cy="50" r="41" fill="none" stroke={light} opacity=".7" strokeWidth="1.2" className={styles.halo}/>}
   {l>=10&&<path d="M17 31 Q36 8 58 19 T84 70 Q59 93 31 83 T17 31" fill={`url(#${shimmerId})`} className={styles.shimmer}/>}
   {l>=11&&<circle cx="50" cy="50" r="3.5" fill={light} className={styles.pulse}/>}
   {l>=12&&<ellipse cx="50" cy="50" rx="28" ry="11" stroke={light} strokeWidth=".8" fill="none" transform="rotate(-32 50 50)" className={styles.orbit}/>}
   {l>=14&&<ellipse cx="50" cy="50" rx="11" ry="29" stroke={light} strokeWidth=".85" fill="none" transform="rotate(24 50 50)" className={styles.orbitReverse}/>}
   {l>=15&&<path d="M23 45 L37 25 L60 20 L78 47 L65 75 L37 76 Z" fill="none" stroke={light} strokeWidth=".7" opacity=".8"/>}
   {l>=16&&<circle cx="50" cy="50" r="24" stroke={light} strokeWidth="1.2" fill="none" strokeDasharray="2 4" className={styles.outerSpin}/>}
   {l>=17&&<circle cx="50" cy="50" r="13" stroke={light} strokeWidth=".9" fill="none" strokeDasharray="4 2" className={styles.orbitReverse}/>} 
   {l>=17&&<g className={styles.sparkles} fill={light}><circle cx="19" cy="25" r="1.4"/><circle cx="82" cy="24" r="1.1"/><circle cx="15" cy="73" r="1.2"/><circle cx="84" cy="77" r="1.5"/></g>}
   {l===18&&<g transform="translate(-22.5 -22.5) scale(1.45)"><g className={styles.crown} stroke={light} fill="none" strokeWidth="1.3"><path d="M36 49 C36 30 64 30 64 49 C64 68 36 68 36 49 Z"/><path d="M29 50 Q40 26 50 50 T71 50 Q60 74 50 50 T29 50"/></g></g>}
   <MedalCelestialLayers level={l} light={light} accent={l===18?'#f3d59c':light}/>
   <MedalEmblem level={l} light={l===18?'#f6dcaa':light} dark={dark}/>
   <text x="50" y="86" fill={light} stroke={dark} strokeWidth=".2" textAnchor="middle" fontSize="10" fontWeight="700">{String(l).padStart(2,'0')}</text>
  </g>
 </svg>;
});
