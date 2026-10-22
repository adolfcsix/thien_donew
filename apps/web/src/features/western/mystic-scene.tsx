'use client';
import {useEffect,useRef} from 'react';
import {observeVisibleMotion} from '@/lib/visible-motion';
import css from './mystic-scene.module.css';

type Scene = 'astrology' | 'numerology' | 'tarot';

/** Decorative CSS 3D diorama. No ephemeris, numerology or Tarot state is derived here. */
export function MysticScene({variant}:{variant:Scene}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>ref.current?observeVisibleMotion(ref.current):undefined,[]);
 return <div ref={ref} className={css.scene} data-mystic-scene={variant} data-paused="true" aria-hidden="true">
  <div className={css.halo}/>
  <div className={css.orbitOuter}><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>
  <div className={css.orbitInner}/>
  <div className={css.ritualPlane}><span/><span/><span/></div>
  {variant==='astrology'&&<div className={css.planetaryTrack}><i/><i/><i/></div>}
  {variant==='tarot'&&<div className={css.arcaneSeal}><span>☿</span><span>♄</span><span>☽</span><span>✧</span></div>}
  <div className={css.constellation}><i/><i/><i/><i/><i/><i/></div>
  {variant==='numerology'?<div className={css.numberPolyhedron}>
   <div className={css.numberFace}>1</div><div className={css.numberFace}>3</div><div className={css.numberFace}>7</div><div className={css.numberFace}>4</div>
   <div className={css.numberFace}>6</div><div className={css.numberFace}>8</div>
   <div className={css.numberCore}>9</div>
  </div>:variant==='tarot'?<div className={css.tarotFan}><div>☽</div><div>✦</div><div>☼</div></div>:<div className={css.mysticEye}>
   <svg viewBox="0 0 200 110" focusable="false"><g className={css.blink}><path d="M8 55 Q100 -34 192 55 Q100 143 8 55Z" fill="none" stroke="currentColor" strokeWidth="4"/><circle cx="100" cy="55" r="30" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="100" cy="55" r="15" fill="currentColor"/><circle cx="94" cy="47" r="5" fill="var(--panel)"/></g><path d="M100 0V15M100 95V110M0 55H16M184 55H200" stroke="currentColor" opacity=".65"/></svg>
  </div>}
  {variant!=='numerology'&&<><svg className={`${css.hand} ${css.leftHand}`} viewBox="0 0 88 150" focusable="false"><path d="M29 146L17 112 7 82Q3 72 10 70Q16 68 23 80L20 29Q20 18 28 19Q35 19 35 29L37 14Q39 2 47 7Q52 11 51 18L54 21Q58 6 66 13Q70 16 68 26L65 42Q71 29 79 35Q85 40 78 58L70 100Q65 117 62 145Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/><path d="M26 91Q46 78 65 95M25 113L66 118" stroke="currentColor" opacity=".55" fill="none"/></svg><svg className={`${css.hand} ${css.rightHand}`} viewBox="0 0 88 150" focusable="false"><path d="M29 146L17 112 7 82Q3 72 10 70Q16 68 23 80L20 29Q20 18 28 19Q35 19 35 29L37 14Q39 2 47 7Q52 11 51 18L54 21Q58 6 66 13Q70 16 68 26L65 42Q71 29 79 35Q85 40 78 58L70 100Q65 117 62 145Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/><path d="M26 91Q46 78 65 95M25 113L66 118" stroke="currentColor" opacity=".55" fill="none"/></svg></>}
  <div className={css.coreGlow}/>
 </div>;
}
