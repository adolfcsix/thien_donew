'use client';
import {useEffect,useRef} from 'react';
import {observeVisibleMotion} from '@/lib/visible-motion';
import css from './eastern-scene.module.css';
type School='tu-vi'|'bat-tu'|'mai-hoa'|'luc-hao'|'ky-mon'|'phong-thuy'|'ha-lac'|'thiet-ban'|'dich-hoc'|'thai-at'|'dai-luc-nham';
const symbols:Record<School,{glyph:string;caption:string;side:string}>= {
 'tu-vi':{glyph:'紫',caption:'Tinh đẩu',side:'✦'},
 'bat-tu':{glyph:'干',caption:'Tứ trụ',side:'木'},
 'mai-hoa':{glyph:'☯',caption:'Mai Hoa',side:'☷'},
 'luc-hao':{glyph:'☰',caption:'Lục Hào',side:'☵'},
 'ky-mon':{glyph:'門',caption:'Cửu cung',side:'九'},
 'phong-thuy':{glyph:'☷',caption:'La kinh',side:'☰'},
 'ha-lac':{glyph:'河',caption:'Hà Lạc',side:'洛'},
 'thiet-ban':{glyph:'鐵',caption:'Khảo khắc',side:'板'},
 'dich-hoc':{glyph:'易',caption:'Dịch lý',side:'☰'},
 'thai-at':{glyph:'太',caption:'Thái Ất',side:'乙'},
 'dai-luc-nham':{glyph:'壬',caption:'Thiên địa bàn',side:'課'},
};
/** Illustration-only 3D ceremonial instrument. Never rotates a calculated chart. */
export function EasternScene({variant}:{variant:School}){
 const ref=useRef<HTMLDivElement>(null);const item=symbols[variant];
 useEffect(()=>ref.current?observeVisibleMotion(ref.current):undefined,[]);
 return <div ref={ref} className={css.scene} data-school={variant} data-paused="true" aria-hidden="true">
  <div className={css.sky}/><div className={css.outer}><i/><i/><i/><i/></div>
  <div className={css.disk}><div className={css.trigram}>☰　☷　☲　☵</div><div className={css.core}>{item.glyph}</div><div className={css.small}>{item.side}</div></div>
  <div className={css.rim}/><span className={css.caption}>{item.caption}</span>
 </div>;
}
