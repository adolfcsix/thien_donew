'use client';
import {useState} from 'react';
import type {RelationshipResult} from '@thiendo/astrology-engine/src/western-relationship.cjs';
import {relationshipPointName} from '@thiendo/interpretation/src/western-presentation.cjs';
import {layoutCircularLabels} from '../western/chart-label-layout.cjs';
import {CelestialFrame,ChartAxes,ChartViewport,angleLabel} from '../western/celestial-frame';
import instrument from '../western/celestial-frame.module.css';
import styles from './relationship.module.css';

const glyphs:Record<string,string>={Sun:'☉',Moon:'☽',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Uranus:'♅',Neptune:'♆',Pluto:'♇',ASC:'ASC',MC:'MC'};
const zodiac=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const pt=(lon:number,asc:number,r:number)=>{const a=(180+lon-asc)*Math.PI/180;return [280+r*Math.cos(a),280-r*Math.sin(a)];};

export function RelationshipWheel({report,mode,reference,selectedA,selectedB,selectedAngle,onSelect}:{report:RelationshipResult;mode:'synastry'|'composite';reference:'A'|'B';selectedA:string;selectedB:string;selectedAngle:string;onSelect:(side:'A'|'B',body:string)=>void}){
 const [hovered,setHovered]=useState<string|null>(null),[coordinates,setCoordinates]=useState(false);
 const composite=mode==='composite',base=reference==='A'?report.a:report.b,asc=composite?(report.composite.ascendant.longitude??0):base.ascendant;
 const cusps=composite?report.composite.houses.map(h=>h.longitude):base.houses.map(h=>h.cuspLongitude);
 const rows=composite?report.composite.planets.filter(p=>p.longitude!==null).map(p=>({id:p.body,longitude:p.longitude!,side:'A' as const})):[...report.pointsA.map(p=>({...p,side:'A' as const})),...report.pointsB.map(p=>({...p,side:'B' as const}))];
 const aLabels=new Map(layoutCircularLabels(rows.filter(p=>p.side==='A').map(p=>({id:p.id,angle:p.longitude})),16).map(p=>[p.id,p.labelAngle]));
 const bLabels=composite?new Map<string,number>():new Map(layoutCircularLabels(rows.filter(p=>p.side==='B').map(p=>({id:p.id,angle:p.longitude})),14).map(p=>[p.id,p.labelAngle]));
 const aspectLines=composite?report.composite.aspects.filter(a=>a.first!==a.second&&(selectedA==='all'||a.first===selectedA||a.second===selectedA)).flatMap(a=>{
   const p=report.composite.planets.find(p=>p.body===a.first),q=report.composite.planets.find(p=>p.body===a.second);
   if(p?.longitude===null||q?.longitude===null||!p||!q)return [];
   return [{key:a.first+'-'+a.second,p:p.longitude,q:q.longitude,angle:a.targetAngle,orb:a.orb,tense:a.targetAngle===90||a.targetAngle===180}];
 }):report.aspects.filter(a=>(selectedA==='all'||a.a===selectedA)&&(selectedB==='all'||a.b===selectedB)&&(selectedAngle==='all'||a.angle===+selectedAngle)).flatMap(a=>{
   const p=report.pointsA.find(p=>p.id===a.a),q=report.pointsB.find(p=>p.id===a.b);
   return p&&q?[{key:a.a+'-'+a.b,p:p.longitude,q:q.longitude,angle:a.angle,orb:a.orb,tense:a.angle===90||a.angle===180}]:[];
 });
 return <div className={styles.wheel}>
  <header className={instrument.instrumentHeader}><div><small>THIÊN BÀN · {composite?'TRUNG ĐIỂM':'ĐỐI CHIẾU HAI VÒNG'}</small><strong>{composite?'Composite':'Synastry'}</strong></div><span>{rows.length} điểm<br/>{aspectLines.length} liên hệ hiển thị</span></header>
  <div className={instrument.controls}><label><input type="checkbox" checked={coordinates} onChange={e=>setCoordinates(e.target.checked)}/>Hiện độ trên vòng quan hệ</label><span>Nhà tham chiếu: {composite?'Composite':reference}</span></div>
  <ChartViewport label="Vùng bản đồ sao có thể phóng to"><svg data-precision-wheel="relationship" viewBox="-20 -20 600 600" role="group" aria-label={composite?'Biểu đồ Composite trung điểm':'Hai vòng Synastry A và B'}>
   <CelestialFrame cx={280} cy={280} asc={asc} outer={263} inner={217}/>
   {[182,217].map(r=><circle key={r} cx="280" cy="280" r={r} fill="none" className={styles.wheelRing}/>)}
   {zodiac.map((glyph,i)=>{const a=pt(i*30,asc,217),b=pt(i*30,asc,244),t=pt(i*30+15,asc,229);return <g key={i}><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={styles.zodiacDivision}/><text x={t[0]} y={t[1]+6} textAnchor="middle" className={styles.zodiacGlyph}>{glyph}</text></g>;})}
   {cusps.map((c,i)=>{if(c===null)return null;const a=pt(c,asc,137),b=pt(c,asc,216),next=cusps[(i+1)%cusps.length],t=pt(c+(next===null?0:((next-c+360)%360)/2),asc,143);return <g key={i} aria-hidden="true"><path d={`M${a.join(' ')}L${b.join(' ')}`} className={instrument.houseGuide}/><text x={t[0]} y={t[1]+3} textAnchor="middle" className={instrument.houseIndex}>{i+1}</text></g>;})}
   {aspectLines.map(a=>{const p=pt(a.p,asc,132),q=pt(a.q,asc,132),focus=hovered?.split(':'),pair=a.key.split('-'),emphasis=!!focus&&(composite?pair.includes(focus[1]):pair[focus[0]==='A'?0:1]===focus[1]);return <line key={a.key} data-aspect={a.angle} data-pair={a.key} data-emphasis={emphasis} data-muted={!!focus&&!emphasis} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className={`${a.tense?styles.tenseAspect:styles.softAspect} ${instrument.aspectLine}`} vectorEffect="non-scaling-stroke" style={{strokeWidth:1.1+1.1*(1-Math.min(a.orb/Math.max(report.input.orb,.01),1))}}><title>{`${relationshipPointName(pair[0])} — ${relationshipPointName(pair[1])} · ${a.angle}° · Orb ${a.orb.toFixed(3)}°`}</title></line>;})}
   {rows.map(p=>{
     const outer=!composite&&p.side==='B',radius=composite?157:outer?199:157,originRadius=composite?139:outer?183:139;
     const labels=outer?bLabels:aLabels,angle=labels.get(p.id)??p.longitude;
     const tick=pt(p.longitude,asc,originRadius),label=pt(angle,asc,radius);
     const active=(p.side==='A'?selectedA:selectedB)===p.id;
     return <g key={p.side+p.id} role="button" tabIndex={0} aria-pressed={active} className={styles.planetTarget} aria-label={`${composite?'Composite':p.side} ${relationshipPointName(p.id)}; ${p.longitude.toFixed(3)} độ`} onMouseEnter={()=>setHovered(p.side+':'+p.id)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(p.side+':'+p.id)} onBlur={()=>setHovered(null)} onClick={()=>onSelect(p.side,p.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(p.side,p.id);}}}>
      <title>{`${relationshipPointName(p.id)} · ${p.longitude.toFixed(3)}°`}</title>
      <circle cx={tick[0]} cy={tick[1]} r={2} className={instrument.bodyPoint}/><path d={`M${tick.join(' ')}L${label.join(' ')}`} className={instrument.leader}/>
      <circle cx={label[0]} cy={label[1]} r={p.id==='ASC'||p.id==='MC'?12:14} className={active?styles.activeDisc:outer?styles.discB:styles.discA}/>
      <text x={label[0]} y={label[1]+5} textAnchor="middle" className={p.id==='ASC'||p.id==='MC'?styles.angleGlyph:styles.planetGlyph}>{glyphs[p.id]}</text>
      {(coordinates||active)&&<text x={label[0]} y={label[1]+23} textAnchor="middle" className={instrument.coordinate} data-planet-coordinate={p.side+':'+p.id}>{angleLabel(p.longitude)}</text>}
     </g>;
   })}
   <circle cx="280" cy="280" r="2" fill="var(--gold)"/>
   {(!composite||report.composite.ascendant.longitude!==null)&&<ChartAxes cx={280} cy={280} asc={asc} mc={composite?report.composite.midheaven.longitude:base.midheaven} outer={263}/>}
  </svg></ChartViewport>
  <div className={styles.wheelLegend}><span>{composite?'● Composite':'● Vòng A · vàng'}</span>{!composite&&<span>● Vòng B · tím</span>}<span>― Góc thuận · xanh</span><span>┄ Góc căng · hồng, nét đứt</span><span>◇ Điểm đánh dấu là tọa độ thật; nét mảnh nối nhãn đã giãn.</span></div>
  <p>{composite?'Điểm chưa xác định không được vẽ; khi ASC không xác định, 0° chỉ là hướng tham chiếu đồ họa.':'Đổi nhà tham chiếu không thay đổi tọa độ A/B hay góc hợp.'} Nhãn được dàn đều để dễ đọc; đối chiếu số liệu chính xác ở bảng bên dưới.</p>
 </div>;
}
