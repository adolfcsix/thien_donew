'use client';
import {svgToPng} from '@/lib/svg-png';
import {usePendingOperation} from '@/lib/use-pending-operation';
import {downloadBlobFile} from '@/lib/download-blob';
import {useId,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import css from './celestial-frame.module.css';

export const skyPoint=(cx:number,cy:number,longitude:number,asc:number,radius:number)=>{
 const a=(180+longitude-asc)*Math.PI/180;return [cx+radius*Math.cos(a),cy-radius*Math.sin(a)];
};
const pathPoint=(p:number[])=>p.map(n=>n.toFixed(5)).join(' ');
function sector(cx:number,cy:number,asc:number,start:number,inner:number,outer:number){
 const a=skyPoint(cx,cy,start,asc,outer),b=skyPoint(cx,cy,start+30,asc,outer),c=skyPoint(cx,cy,start+30,asc,inner),d=skyPoint(cx,cy,start,asc,inner);
 return `M${pathPoint(a)} A${outer} ${outer} 0 0 0 ${pathPoint(b)} L${pathPoint(c)} A${inner} ${inner} 0 0 1 ${pathPoint(d)} Z`;
}
/** All graduations use the same ecliptic reference as the plotted positions. */
export function CelestialFrame({cx,cy,asc,outer,inner}:{cx:number;cy:number;asc:number;outer:number;inner:number}){
 const id=useId().replace(/:/g,'');
 return <g className={css.frame} aria-hidden="true" pointerEvents="none" data-celestial-frame="true">
  <defs><radialGradient id={id+'-field'}><stop offset="0" stopColor="var(--astro-paper-center)"/><stop offset="1" stopColor="var(--astro-paper-edge)"/></radialGradient><pattern id={id+'-grain'} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 1h1M3 4h1" stroke="currentColor" strokeWidth=".4" opacity=".22"/></pattern></defs>
  <circle cx={cx} cy={cy} r={outer+7} className={css.bezel}/>
  <circle cx={cx} cy={cy} r={outer} fill={'url(#'+id+'-field)'}/>
  <circle cx={cx} cy={cy} r={outer} fill={'url(#'+id+'-grain)'} opacity=".13"/>
  {Array.from({length:12},(_,i)=><path key={i} d={sector(cx,cy,asc,i*30,inner,outer-19)} className={css.sector} style={{fill:`var(--astro-element-${i%4})`}}/>)}
  {[outer+7,outer+3,outer,outer-19,inner,135].map(r=><circle key={r} cx={cx} cy={cy} r={r} className={css.ring}/>)}
  <circle cx={cx} cy={cy} r="131" className={css.aspectField}/>
  {Array.from({length:360},(_,i)=>{const major=i%30===0,medium=i%10===0,five=i%5===0,a=skyPoint(cx,cy,i,asc,outer-(major?17:medium?12:five?8:4)),b=skyPoint(cx,cy,i,asc,outer);return <path key={i} data-degree-tick={i} d={'M'+pathPoint(a)+' L'+pathPoint(b)} className={major?css.majorTick:css.tick}/>;})}
  {Array.from({length:36},(_,i)=>{const p=skyPoint(cx,cy,i*10,asc,outer-10);return <text key={i} x={p[0]} y={p[1]+2} textAnchor="middle" className={css.degree}>{i%3*10}°</text>;})}
 </g>;
}
export function ChartAxes({cx,cy,asc,mc,outer}:{cx:number;cy:number;asc:number;mc:number|null;outer:number}){
 const axes=[{name:'ASC',lon:asc},{name:'DSC',lon:asc+180},...(mc===null?[]:[{name:'MC',lon:mc},{name:'IC',lon:mc+180}])];
 return <g className={css.axes} aria-hidden="true" pointerEvents="none">{axes.map(a=>{const p=skyPoint(cx,cy,a.lon,asc,outer-17),q=skyPoint(cx,cy,a.lon,asc,outer+7),t=skyPoint(cx,cy,a.lon,asc,outer+18);return <g key={a.name}><path d={'M'+pathPoint(p)+' L'+pathPoint(q)}/><text x={t[0]} y={t[1]+3} textAnchor="middle">{a.name}</text></g>;})}</g>;
}
export function angleLabel(longitude:number){const minutes=Math.floor(((longitude%30+30)%30)*60+1e-8),deg=Math.floor(minutes/60);return `${String(deg).padStart(2,'0')}°${String(minutes%60).padStart(2,'0')}′`;}
export function ChartViewport({children,label}:{children:ReactNode;label:string}){
 const operation=usePendingOperation();
 const [zoom,setZoom]=useState(1),[error,setError]=useState(''),viewport=useRef<HTMLDivElement>(null);
 async function exportSvg(png=false){const request=operation.begin();if(!request)return;try{
  const source=viewport.current?.querySelector('svg');if(!source)return;setError('');const copy=source.cloneNode(true) as SVGSVGElement;
  const originals=[source,...source.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')];
  const properties=['fill','stroke','stroke-width','stroke-dasharray','opacity','fill-opacity','stroke-opacity','font-family','font-size','font-weight','letter-spacing','paint-order','stroke-linecap','stroke-linejoin','text-anchor','stop-color','stop-opacity','visibility','display'];
  originals.forEach((node,i)=>{const computed=getComputedStyle(node);for(const key of properties){const value=computed.getPropertyValue(key),hash=value.startsWith('url(')?value.indexOf('#'):-1;clones[i].setAttribute(key,hash<0?value:'url('+value.slice(hash).replace(/[\"\')]+$/,'')+')');}clones[i].removeAttribute('style');clones[i].removeAttribute('class');clones[i].removeAttribute('tabindex');clones[i].removeAttribute('role');});
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width','1000');copy.setAttribute('height','1000');copy.removeAttribute('style');
  const ns='http://www.w3.org/2000/svg',sheet=document.createElementNS(ns,'svg');
  sheet.setAttribute('xmlns',ns);sheet.setAttribute('width','1200');sheet.setAttribute('height','1360');sheet.setAttribute('viewBox','0 0 1200 1360');
  const palette=getComputedStyle(source),paper=palette.getPropertyValue('--panel').trim()||'#faf6ef',ink=palette.getPropertyValue('--text').trim()||'#282b3c',gold=palette.getPropertyValue('--gold').trim()||'#967645';
  function element(tag:string,attrs:Record<string,string>,text?:string){const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(text)node.textContent=text;sheet.append(node);return node;}
  element('rect',{width:'1200',height:'1360',fill:paper});
  for(const inset of [24,34])element('rect',{x:String(inset),y:String(inset),width:String(1200-inset*2),height:String(1360-inset*2),rx:'4',fill:'none',stroke:gold,'stroke-width':inset===24?'2':'0.7'});
  const title=source.dataset.precisionWheel==='natal'?'BẢN ĐỒ SAO NATAL':source.dataset.precisionWheel==='synastry'?'BẢN ĐỒ TƯƠNG QUAN':'BẢN ĐỒ SAO · '+(source.dataset.precisionWheel||'').toUpperCase();
  element('text',{x:'600',y:'87','text-anchor':'middle',fill:gold,'font-family':'Georgia,serif','font-size':'20','letter-spacing':'6'},'THIÊN ĐỒ');
  element('text',{x:'600',y:'136','text-anchor':'middle',fill:ink,'font-family':'Georgia,serif','font-size':'31'},title);
  element('path',{d:'M380 162H565M635 162H820M588 162l12-7 12 7-12 7Z',fill:gold,stroke:gold,'stroke-width':'1'});
  copy.setAttribute('x','100');copy.setAttribute('y','190');copy.setAttribute('width','1000');copy.setAttribute('height','1000');sheet.append(copy);
  element('text',{x:'600',y:'1235','text-anchor':'middle',fill:ink,'font-family':'Arial,sans-serif','font-size':'17'},'Tọa độ · Cung · Nhà · Góc hợp');
  element('text',{x:'600',y:'1271','text-anchor':'middle',fill:ink,'font-family':'Arial,sans-serif','font-size':'14'},'Giữ các lớp và bộ lọc đang hiển thị · Không tính lại dữ liệu khi xuất');
  element('text',{x:'600',y:'1300','text-anchor':'middle',fill:ink,'font-family':'Arial,sans-serif','font-size':'12'},'Dành cho học hỏi và nghiên cứu · Không phải dự đoán chắc chắn');
  const blob=new Blob([new XMLSerializer().serializeToString(sheet)],{type:'image/svg+xml;charset=utf-8'}),filename='thien-do-'+source.dataset.precisionWheel;
  if(!png){downloadBlobFile(blob,filename+'.svg');return;}
  const output=await svgToPng(blob,2400,2720,request.signal);if(!request.signal.aborted)downloadBlobFile(output,filename+'.png');
 }catch{if(!request.signal.aborted)setError('Chưa xuất được bản đồ. Hãy thử lại.');}finally{operation.finish(request);}}

 return <><div className={css.zoomTools} role="group" aria-label="Thu phóng bản đồ sao"><button type="button" aria-label="Thu nhỏ bản đồ" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.25))}>−</button><output aria-live="polite">{Math.round(zoom*100)}%</output><button type="button" aria-label="Phóng to bản đồ" disabled={zoom>=2.25} onClick={()=>setZoom(z=>Math.min(2.25,z+.25))}>+</button><button type="button" onClick={()=>{setZoom(1);viewport.current?.scrollTo({left:0,top:0});}}>Vừa khung</button><button type="button" disabled={operation.pending} onClick={()=>void exportSvg()}>Xuất SVG đang xem</button><button type="button" disabled={operation.pending} onClick={()=>void exportSvg(true)}>Xuất PNG bản đồ</button><span>100% trọn vòng · chỉ kéo khi phóng to</span></div><div ref={viewport} className={css.viewport} data-zoom={zoom} role="region" aria-label={label} tabIndex={0} style={{'--wheel-scale':zoom} as CSSProperties}>{children}</div>{error&&<p role="alert">{error}</p>}</>;
}

export function coordinateRotation(longitude:number,asc:number){let r=((90-(180+longitude-asc))%180+180)%180;return r>90?r-180:r;}
