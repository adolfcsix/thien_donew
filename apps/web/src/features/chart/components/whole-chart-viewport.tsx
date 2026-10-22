'use client';
import {downloadBlobFile} from '@/lib/download-blob';
import {useEffect,useMemo,useRef,useState,type KeyboardEvent} from 'react';
import type {AstrologyResult,AnnualOverview} from '@thiendo/shared-types';
import {completeChartModel,renderCompleteChartSvg} from '@thiendo/chart-export';
import styles from './whole-chart-viewport.module.css';
type Props={chart:AstrologyResult;annual:AnnualOverview;label?:string;showAuxiliary:boolean;showCycles:boolean;showAnnual:boolean;showStrength:boolean;onOpenPalace:(branch:number)=>void};
export function WholeChartViewport({chart,annual,label='',showAuxiliary,showCycles,showAnnual,showStrength,onOpenPalace}:Props){
 const viewport=useRef<HTMLDivElement>(null),[size,setSize]=useState({width:320,height:600}),[zoom,setZoom]=useState(100),[fit,setFit]=useState<'frame'|'width'>('frame');
 const options=useMemo(()=>({showAuxiliary,showCycles,showAnnual,showStrength}),[showAuxiliary,showCycles,showAnnual,showStrength]);
 const model=useMemo(()=>completeChartModel(chart,annual,options),[chart,annual,options]),svg=useMemo(()=>renderCompleteChartSvg(chart,label,annual,options),[chart,label,annual,options]);
 useEffect(()=>{const node=viewport.current;if(!node)return;const sync=()=>setSize({width:node.clientWidth,height:Math.max(260,Math.min(720,window.innerHeight*.76))});const observer=new ResizeObserver(sync);observer.observe(node);window.addEventListener('resize',sync);sync();return()=>{observer.disconnect();window.removeEventListener('resize',sync);};},[]);
 const base=fit==='width'?size.width/model.width:Math.min(size.width/model.width,size.height/model.height),scale=base*zoom/100;
 const reset=(mode:'frame'|'width')=>{setFit(mode);setZoom(100);viewport.current?.scrollTo({left:0,top:0});};
 function activate(target:EventTarget|null){if(!(target instanceof Element))return;const group=target.closest('g[data-branch]');if(group){const branch=Number(group.getAttribute('data-branch'));if(Number.isInteger(branch)&&branch>=0&&branch<12)onOpenPalace(branch);}}
 function key(event:KeyboardEvent<HTMLDivElement>){if(event.key==='Enter'||event.key===' '){if((event.target as Element).closest('g[data-branch]')){event.preventDefault();activate(event.target);}}}
 function exportSvg(){downloadBlobFile(new Blob([renderCompleteChartSvg(chart,label,annual)],{type:'image/svg+xml;charset=utf-8'}),`thien-do-la-so-day-du-${annual.year}.svg`);}
 return <section className={styles.panel} aria-label="Lá số toàn cảnh có thể thu phóng"><header><div><span>THIÊN ĐỒ / TOÀN CẢNH</span><h3>12 cung trong một khung</h3></div><p>{model.natalCount} sao gốc / vòng sao; Tứ Hóa, án ngữ và lưu niên tách riêng.</p></header>
 <div className={styles.controls} role="group" aria-label="Thu phóng toàn lá số"><button type="button" aria-pressed={fit==='frame'&&zoom===100} onClick={()=>reset('frame')}>Trọn khung</button><button type="button" aria-pressed={fit==='width'&&zoom===100} onClick={()=>reset('width')}>Vừa chiều ngang</button><button type="button" aria-label="Thu nhỏ toàn lá số" disabled={zoom<=100} onClick={()=>setZoom(z=>Math.max(100,z-50))}>−</button><label>Độ phóng<input aria-label="Độ phóng toàn lá số" type="range" min="100" max="600" step="25" value={zoom} onChange={e=>setZoom(+e.target.value)}/><output>{zoom}%</output></label><button type="button" aria-label="Phóng to toàn lá số" disabled={zoom>=600} onClick={()=>setZoom(z=>Math.min(600,z+50))}>+</button><button type="button" onClick={exportSvg}>↓ SVG đầy đủ</button></div>
 <p className={styles.help}>Chạm hoặc nhấn Enter tại một cung để mở chi tiết. Phóng to rồi kéo/cuộn trong khung để đọc; chữ vector giữ nét khi thu/phóng. Các bộ lọc phía trên áp dụng cho khung xem; SVG xuất luôn giữ đủ các lớp.</p>
 <div ref={viewport} className={styles.viewport} style={{height:Math.min(size.height,Math.ceil(model.height*base))}} tabIndex={0} role="region" aria-label="Khung cuộn lá số tổng thể" data-zoom={zoom} onClick={e=>activate(e.target)} onKeyDown={key}>
 <div className={styles.space} style={{width:Math.max(size.width,model.width*scale),height:model.height*scale}}><div className={styles.vector} style={{width:model.width*scale,height:model.height*scale}} dangerouslySetInnerHTML={{__html:svg}}/></div></div>
 </section>;
}
