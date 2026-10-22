'use client';
import {useEffect,useRef} from 'react';
import {observeVisibleMotion} from '@/lib/visible-motion';

/** Original decorative engraving, independent of calculated celestial positions. */
export function EngravedBackdrop({variant,motion=true}:{variant:'landscape'|'celestial';motion?:boolean}) {
  const ref=useRef<SVGSVGElement>(null);
  useEffect(()=>ref.current?observeVisibleMotion(ref.current):undefined,[]);
  return <svg ref={ref} className="td-engraving" data-engraving={variant} data-motion={motion} data-paused="true" viewBox="0 0 1200 480" preserveAspectRatio={variant==='landscape'?'xMidYMax meet':'xMidYMid slice'} aria-hidden="true" focusable="false">
    {variant==='landscape'?<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <g strokeWidth="1.3"><path d="M-30 350 90 205 158 280 267 92 362 231 433 166 554 331M0 395 138 311 215 346 350 196 475 337 570 285 659 374M645 360 762 183 810 240 915 115 1010 257 1085 207 1240 385"/><path d="m190 196 29 24 48-128 22 101 24-18m-222 30 13 76 28-21m630-77 21 88 27-31m105-125-4 115 32-27M26 371l72-44 28 18m-5 28 38-22m188-76-39 62m28-28 27 28m507-81-19 41 37 23m107-16 51 37"/><path d="M-20 177c93-68 117 32 184-1s81-48 109-26m-180 13c-27-17-42 16-16 18m801-115c64-46 97 28 151 8s88-32 154 6m-105-13c-15-18-40 10-16 18"/></g>
      <g strokeWidth="1.1"><path d="M1240 404c-188-45-305-45-478-13s-260 30-324 10c-63-20 150-14 104-33-30-12-111-10-169-7M1200 438c-137-37-274-30-430 3s-323 16-382-1c-57-17 89-11 57-26M-20 445c147-31 235-30 314-11m-265 25c74-8 149-9 209-4M876 464c-65-6-152 16-220 15"/></g>
      <g transform="translate(620 202)" strokeWidth="1.5" opacity=".7"><circle r="73"/><circle r="65"/><path d="M0-31a31 31 0 0 1 0 62 15.5 15.5 0 0 1 0-31 15.5 15.5 0 0 0 0-31Z"/><circle cy="-15.5" r="3"/><circle cy="15.5" r="3"/>{[0,1,2,3,4,5,6,7].map(i=><g key={i} transform={`rotate(${i*45}) translate(0 -54)`}>{[0,1,2].map(j=><path key={j} d={i&(1<<j)?`M-12 ${j*5}H12`:`M-12 ${j*5}H-3M3 ${j*5}H12`}/>)}</g>)}</g>
      <g opacity=".55"><circle cx="1060" cy="100" r="27"/><circle cx="1060" cy="100" r="34" strokeDasharray="1 7"/><path d="M65 409h62m-31-8v17m-12-10 12-14 16 15M1100 388h45m-25-12v16m-10-8 10-14 13 14"/></g>
    </g>:<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <g opacity=".45" strokeWidth="1"><path d="M50 130 165 75 255 155 345 105M70 360l111-60 97 77 75-51M852 96l95 58 106-74 94 63M880 346l73 41 104-77 111 49"/>{[[50,130],[165,75],[255,155],[345,105],[70,360],[181,300],[278,377],[353,326],[852,96],[947,154],[1053,80],[1147,143],[880,346],[953,387],[1057,310],[1168,359]].map(([x,y],i)=><circle key={i} className={i%3===0?'td-engraving-star':undefined} cx={x} cy={y} r={i%3===0?4:2}/>)}</g>
      <g transform="translate(600 240)" strokeWidth="1.5"><circle r="128" strokeDasharray="2 9"/><circle r="112" opacity=".5"/><path d="M-99 0Q0-99 99 0Q0 99-99 0Z"/><circle r="33"/><circle r="12"/><path d="m0-151 0-25m-75 45-13-22m163 22 13-22m43 78 22-13m-284 13-22-13m0 163-22 13m284-13 22 13M0 151v25m-75-45-13 22m163-22 13 22M-23-22q23-12 39 5"/></g>
      {[false,true].map(mirror=><g key={String(mirror)} transform={mirror?'translate(1200 0) scale(-1 1)':undefined} strokeWidth="1.7"><path d="m342 442 9-70c-38-35-56-73-60-111-2-19 14-24 22-7l18 37-10-113c-2-20 17-22 20-1l16 81-1-130c0-22 20-22 21 1l8 120 9-145c2-22 21-20 20 3l-2 142 17-112c4-21 23-17 19 5l-13 152c-2 39-29 64-42 83l5 70"/><path d="M348 303q33-24 63 5m-53 22 37 12m-30-52 2 29m22-44-4 39m-29 61 38 6m-42 8 43 6"/><circle cx="379" cy="306" r="13"/><path d="m379 283 0-10m0 56v10m-23-33h-10m56 0h10"/></g>)}
      <g className="td-engraving-star" strokeWidth="1.5"><path d="m600 37 0 23m-11-12h22m-206 14v17m-8-9h16m374 9v20m-10-10h20"/></g>
    </g>}
  </svg>;
}
