'use client';
import {useId,type ReactNode} from 'react';
import css from './tarot-cloth.module.css';
/** Decorative embroidery only: no card position, meaning, or reading data. */
export function TarotCloth({children}:{children:ReactNode}){
 const id=useId().replace(/:/g,'');
 return <div className={css.cloth} data-tarot-cloth="true"><svg className={css.embroidery} viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" pointerEvents="none">
  <defs><pattern id={id+'-weave'} width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0l12 12M-3 9l6 6M9-3l6 6" stroke="currentColor" strokeWidth=".4" opacity=".18"/></pattern><g id={id+'-hand'} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M-41 115c-3-28-13-42-22-61l-28-54c-6-13 9-19 18-5l25 34-9-102c-1-14 16-16 18-1l11 74-1-114c0-15 17-15 18 0l5 110 10-122c1-15 18-14 17 1L9-4l20-103c3-14 20-11 17 5L33 7l21-44c7-14 23-6 16 9L47 29c-8 21-4 48-26 75l-5 23" strokeWidth="2"/><path d="M-41 115l57 12 5 34-69-13ZM-34 130l49 11M-28 25c12 17 27 23 45 14M-25 59c18-11 33-4 40 8M-25 89c-3-22-11-30-20-40M-3 4c-2 13-1 19 3 28M-44-10l10-3m6-28 11-1m14-15 11 1m10-20 10 2m11 54 9 4" strokeWidth="1"/><path d="M-21 49Q-3 29 16 49Q-2 69-21 49Z"/><circle cx="-2" cy="49" r="7"/><path d="M-3 77v12m-6-6h12"/></g></defs>
  <rect width="1000" height="800" fill={'url(#'+id+'-weave)'}/>
  <g className={css.seal} fill="none" stroke="currentColor"><circle cx="500" cy="375" r="254"/><circle cx="500" cy="375" r="243" strokeDasharray="1 9"/><circle cx="500" cy="375" r="220"/><path d="M500 122 720 502H280ZM500 628 280 248H720Z" opacity=".5"/>{Array.from({length:12},(_,i)=><path key={i} d="M500 122v18m-4-11h8" transform={`rotate(${i*30} 500 375)`}/>)}<path d="M415 158Q500 90 585 158Q500 225 415 158Z" strokeWidth="2"/><circle cx="500" cy="158" r="26"/><circle cx="500" cy="158" r="9"/><path d="M500 110V88m-37 31-13-19m87 19 13-19m-100 58h-26m152 0h-26M500 206v21"/>
   <use href={'#'+id+'-hand'} transform="translate(197 470) rotate(-18) scale(1.45)"/><use href={'#'+id+'-hand'} transform="translate(803 470) rotate(18) scale(-1.45 1.45)"/>
   <path d="M58 135V58h77M865 58h77v77M58 665v77h77M865 742h77v-77" strokeWidth="2"/><path d="M70 125V70h55M875 70h55v55M70 675v55h55M875 730h55v-55"/>
   <path d="M500 678v30m-15-15h30m-283-448v20m-10-10h20m536 0v20m-10-10h20"/>
  </g>
 </svg><div className={css.content}>{children}</div></div>;
}
