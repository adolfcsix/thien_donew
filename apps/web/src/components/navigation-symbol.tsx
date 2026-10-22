/** Decorative vector symbols do not depend on an installed CJK font. */
import {WesternIcon} from '@/features/western/discipline-navigation';
import { TianMonMark } from './thien-mon-mark';

export function TianMark({size=32}:{size?:number}){
 return <TianMonMark size={size} compact />;
}
export function NavigationSymbol({symbol,href}:{symbol:string;href?:string}){
 const western:Record<string,string>={'/western-astrology':'orbit','/tarot':'cards','/numerology':'number','/western-symbols':'tree','/research/development':'library'};
 if(href&&western[href])return <WesternIcon kind={western[href]} size={18}/>;
 if(!/[\u3400-\u9fff]/.test(symbol))return <>{symbol}</>;
 const book=['文','冊','册','書'].includes(symbol),grid=symbol==='九',flower=symbol==='梅',lines=symbol==='爻',star=symbol==='命';
 return <svg aria-hidden="true" data-vector-symbol={symbol} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'-.12em'}}>
  {book?<><path d="M12 6C9 4 5 4 2 5v14c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 1ZM12 6v14"/><path d="M5 8h4M5 11h4M15 8h4M15 11h4"/></>:grid?<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></>:flower?<><circle cx="12" cy="12" r="2"/>{[0,1,2,3,4].map(i=><ellipse key={i} cx="12" cy="6.5" rx="3" ry="4" transform={`rotate(${i*72} 12 12)`}/>)}</>:lines?<>{[2,6,10,14,18,22].map((y,i)=><path key={y} d={i%2?`M3 ${y}h7m4 0h7`:`M3 ${y}h18`}/>)}</>:star?<><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><circle cx="12" cy="12" r="2"/></>:<><circle cx="12" cy="12" r="9"/><path d="m15 8-2 6-5 2 2-6Z"/><path d="M12 3v2M21 12h-2M12 21v-2M3 12h2"/></>}
 </svg>;
}
