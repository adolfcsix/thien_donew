/** Maps Thiên Đồ card IDs to historic RWS 1909 card scans. Independent of reading data. */
import type {SyntheticEvent} from 'react';
import state from './tarot-artwork-local.json';
import modernState from './tarot-modern-local.json';

const ORIGIN = 'https://raw.githubusercontent.com/sixseeds/tarot-api/master/cards/';
const SUITS: Record<string, string> = { major: 'ar', wands: 'wa', cups: 'cu', swords: 'sw', pentacles: 'pe' };
export type TarotDeckId = 'rws-1909' | 'gearberry-modern';
export const TAROT_DECKS: {id:TarotDeckId;label:string;credit:string}[] = [
 {id:'rws-1909',label:'Rider–Waite–Smith · 1909',credit:'Pamela Colman Smith · bản gốc'},
 {id:'gearberry-modern',label:'Gearberry · WebP hiện đại',credit:'Gearberry · CC BY 4.0'}
];
const MODERN_CDN = 'https://cdn.jsdelivr.net/gh/reginanka/tarot-cards@main/cards/';
const MODERN_RAW = 'https://raw.githubusercontent.com/reginanka/tarot-cards/main/cards/';

export function tarotArtworkFilename(id: string): string {
  const match = /^(major|wands|cups|swords|pentacles)-(\d{2})$/.exec(id);
  if (!match) throw new Error(`Không có mã hình Tarot hợp lệ: ${id}`);
  const number = Number(match[2]);
  if (number < (match[1] === 'major' ? 0 : 1) || number > (match[1] === 'major' ? 21 : 14)) {
    throw new Error(`Số lá Tarot ngoài phạm vi: ${id}`);
  }
  return `${SUITS[match[1]]}${match[2]}.jpg`;
}

/** The contemporary collection uses Justice VIII / Strength XI. Map by card NAME
 * rather than numeric index to preserve RWS meanings and saved readings. */
export function modernTarotFilename(id: string): string {
 const found = /^(major|wands|cups|swords|pentacles)-(\d{2})$/.exec(id);
 if(!found) throw Error(`Không có mã hình Tarot hợp lệ: ${id}`);
 tarotArtworkFilename(id); // also validates range
 const num=found[1]==='major' && found[2]==='08'?'11':found[1]==='major'&&found[2]==='11'?'08':found[2];
 const prefixes: Record<string,string>={major:'m',wands:'w',cups:'c',swords:'s',pentacles:'p'};
 return `${prefixes[found[1]]}${num}.webp`;
}

/** Local sets are activated only after a complete, verified 78-card download. */
export function tarotArtworkSrc(id: string, deck:TarotDeckId='rws-1909'): string {
 if(deck==='gearberry-modern') {
  const filename=modernTarotFilename(id);
  return modernState.ready ? `/tarot/gearberry-modern/${filename}` : `${MODERN_CDN}${filename}`;
 }
 const filename=tarotArtworkFilename(id);
 return state.ready ? `/tarot/rws-1909/${filename}` : `${ORIGIN}${filename}`;
}
/** Catalogue thumbnails are derived from the same originals; full readings retain original art. */
export function tarotArtworkThumbnailSrc(id:string,deck:TarotDeckId='rws-1909'):string {
 if(!tarotDeckIsLocal(deck))return tarotArtworkSrc(id,deck);
 const file=(deck==='gearberry-modern'?modernTarotFilename(id):tarotArtworkFilename(id)).replace(/\.jpg$/,'.webp');
 return `/tarot/thumbnails/${deck}/${file}`;
}
export function recoverTarotThumbnail(event:SyntheticEvent<HTMLImageElement>,id:string,deck:TarotDeckId='rws-1909'):void {
 if(!event.currentTarget.dataset.tarotThumbnailRetry){event.currentTarget.dataset.tarotThumbnailRetry='full';event.currentTarget.src=tarotArtworkSrc(id,deck);return;}
 recoverTarotArtwork(event,id,deck);
}
export const tarotArtIsLocal = state.ready;
export function tarotDeckIsLocal(deck:TarotDeckId):boolean {return deck==='rws-1909'?state.ready:modernState.ready;}

/** Non-recursive failover. Never mix the visual style of two different decks silently. */
export function recoverTarotArtwork(event:SyntheticEvent<HTMLImageElement>, id:string, deck:TarotDeckId='rws-1909'):void {
 const image=event.currentTarget;
 const step=image.dataset.tarotFallback||'';
 if(!step){
  image.dataset.tarotFallback='alternate';
  if(deck==='gearberry-modern'){
   const filename=modernTarotFilename(id);
   image.src=modernState.ready?`${MODERN_CDN}${filename}`:`${MODERN_RAW}${filename}`;
  } else {
   const filename=tarotArtworkFilename(id);
   image.src=state.ready?`${ORIGIN}${filename}`:`/tarot/rws-1909/${filename}`;
  }
  return;
 }
 if(step==='placeholder')return;
 image.dataset.tarotFallback='placeholder';
 const code=tarotArtworkFilename(id).slice(0,-4).toUpperCase();
 const markup=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1000"><rect width="600" height="1000" fill="#f4ecd9"/><rect x="32" y="32" width="536" height="936" rx="18" fill="none" stroke="#846f58" stroke-width="7"/><text x="300" y="465" text-anchor="middle" font-family="serif" font-size="90" fill="#7b6654">✦</text><text x="300" y="565" text-anchor="middle" font-family="sans-serif" font-size="38" fill="#51445d">${code}</text><text x="300" y="645" text-anchor="middle" font-family="sans-serif" font-size="25" fill="#51445d">Ảnh chưa khả dụng</text></svg>`;
 image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
