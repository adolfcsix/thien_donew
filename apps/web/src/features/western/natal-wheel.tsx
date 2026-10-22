'use client';
import {useState} from 'react';
import {EngravedBackdrop} from '@/components/engraved-backdrop';
import {NatalDataAtlas,AspectGlyph,natalGlyphs as glyphs,natalNames as names} from './natal-data-atlas';
import type {NatalResult} from '@thiendo/astrology-engine/src/western-natal.cjs';
import {layoutCircularLabels} from './chart-label-layout.cjs';
import {CelestialFrame,ChartAxes,ChartViewport,angleLabel,coordinateRotation} from './celestial-frame';
import instrument from './celestial-frame.module.css';
import styles from '../../app/western-astrology/western.module.css';

const zodiac=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const pt=(lon:number,asc:number,r:number)=>{const a=(180+lon-asc)*Math.PI/180;return [260+r*Math.cos(a),260-r*Math.sin(a)];};

export function NatalWheel({result,selected,onSelect}:{result:NatalResult;selected:string;onSelect:(body:string)=>void}) {
  const [ornamentMotion,setOrnamentMotion]=useState(true);
  const [aspectView,setAspectView]=useState<'all'|'selected'|'tense'|'soft'>('all');
  const [focusedAspect,setFocusedAspect]=useState<string|null>(null);
  const [hovered,setHovered]=useState<string|null>(null),[coordinates,setCoordinates]=useState(true);
  const labels=layoutCircularLabels(result.planets.map(p=>({id:p.body,angle:p.longitude})),14.5);
  const byId=new Map(labels.map(l=>[l.id,l.labelAngle]));
  const current=result.planets.find(p=>p.body===selected);
  const aspects=result.aspects.filter(a=>aspectView==='all'||aspectView==='selected'&&(a.first===selected||a.second===selected)||aspectView==='tense'&&[90,180].includes(a.targetAngle)||aspectView==='soft'&&[60,120].includes(a.targetAngle));
  return <div className={styles.natalWheel}>
    <div className="natal-engraved-sky"><EngravedBackdrop variant="celestial" motion={ornamentMotion}/><span>THIÊN ĐỒ · TINH TÚ ĐỒ</span></div>
    <header className={instrument.instrumentHeader}><div><small>THIÊN BÀN · TROPICAL / WHOLE SIGN</small><strong>Bản đồ bầu trời</strong></div><span>{result.planets.length} thiên thể<br/>{result.aspects.length} góc hợp</span></header>
    <div className={styles.chartLegend} role="group" aria-label="Lọc đường góc hợp">{([['all','Tất cả góc hợp'],['selected','Thiên thể đang chọn'],['tense','Vuông / Đối đỉnh'],['soft','Lục hợp / Tam hợp']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={aspectView===value} onClick={()=>{setAspectView(value);setFocusedAspect(null);}}>{label}</button>)}</div>
    <div className={instrument.controls}><label><input type="checkbox" checked={coordinates} onChange={e=>setCoordinates(e.target.checked)}/>Hiện độ và chuyển động</label><span>℞ Nghịch hành · ≈ Dừng biểu kiến</span><button type="button" aria-pressed={ornamentMotion} onClick={()=>setOrnamentMotion(v=>!v)}>Chuyển động hoa văn · {ornamentMotion?'Bật':'Tắt'}</button></div>
    <ChartViewport label="Vùng bản đồ sao có thể phóng to"><svg data-precision-wheel="natal" viewBox="-20 -20 560 560" role="group" aria-label="Natal Chart gồm 12 cung Hoàng đạo, 12 nhà, mười thiên thể và góc hợp; nhãn được giãn để không chồng lên nhau">
      <CelestialFrame cx={260} cy={260} asc={result.ascendant} outer={246} inner={195}/>
      {Array.from({length:12},(_,i)=>{
        const a=pt(i*30,result.ascendant,195),b=pt(i*30,result.ascendant,227),z=pt(i*30+15,result.ascendant,211);
        return <g key={`z${i}`}><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={styles.zodiacDivision}/><text x={z[0]} y={z[1]+6} textAnchor="middle" className={styles.zodiacGlyph}>{zodiac[i]}</text></g>;
      })}
      {result.houses.map(h=>{
        const a=pt(h.cuspLongitude,result.ascendant,137),b=pt(h.cuspLongitude,result.ascendant,194),t=pt(h.cuspLongitude+15,result.ascendant,145);
        return <g key={h.number} aria-hidden="true"><path d={`M${a.join(' ')}L${b.join(' ')}`} className={instrument.houseGuide}/><text x={t[0]} y={t[1]+3} textAnchor="middle" className={instrument.houseIndex}>{h.number}</text></g>;
      })}
      {aspects.map(a=>{
        const first=result.planets.find(p=>p.body===a.first)!,second=result.planets.find(p=>p.body===a.second)!;
        const p=pt(first.longitude,result.ascendant,132),q=pt(second.longitude,result.ascendant,132);
        const key=a.first+'-'+a.second;const focused=aspects.some(item=>item.first+'-'+item.second===focusedAspect);
        const emphasis=focused?focusedAspect===key:hovered!==null&&(a.first===hovered||a.second===hovered);
        return <line key={`${a.first}-${a.second}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} className={`${a.targetAngle===90||a.targetAngle===180?styles.tenseAspect:styles.softAspect} ${instrument.aspectLine}`} vectorEffect="non-scaling-stroke" data-aspect={a.targetAngle} data-emphasis={emphasis} data-muted={(focused||hovered!==null)&&!emphasis} style={{strokeWidth:1.1+1.1*(1-Math.min(a.orb/Math.max(result.input.orb,.01),1))}}><title>{`${names[a.first]} — ${names[a.second]} · ${a.name} ${a.targetAngle}° · Orb ${a.orb.toFixed(3)}°`}</title></line>;
      })}
      {result.planets.map(p=>{
        const position=byId.get(p.body)??p.longitude;
        const origin=pt(p.longitude,result.ascendant,132),tick=pt(p.longitude,result.ascendant,147),label=pt(position,result.ascendant,168),degree=pt(position,result.ascendant,188),join=pt(position,result.ascendant,153);
        const active=selected===p.body;
        return <g key={p.body} className={styles.planetTarget} role="button" tabIndex={0} aria-pressed={active} aria-label={`${names[p.body]}, ${p.sign}, ${p.degreeInSign.toFixed(2)} độ, nhà ${p.house}`} onMouseEnter={()=>setHovered(p.body)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(p.body)} onBlur={()=>setHovered(null)} onClick={()=>{setFocusedAspect(null);onSelect(p.body);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setFocusedAspect(null);onSelect(p.body);}}}>
          <title>{`${names[p.body]} · ${p.longitude.toFixed(3)}° · Nhà ${p.house}`}</title>
          <circle cx={origin[0]} cy={origin[1]} r="2.3" className={instrument.bodyPoint}/>
          <path d={`M${origin.join(' ')}L${tick.join(' ')}L${join.join(' ')}`} className={instrument.leader}/>
          <circle cx={label[0]} cy={label[1]} r={active?14:12} className={active?styles.planetActive:styles.planetDisc}/>
          <text x={label[0]} y={label[1]+7} textAnchor="middle" className={styles.planetGlyph}>{glyphs[p.body]}</text>
          {coordinates&&<text x={degree[0]} y={degree[1]+3} textAnchor="middle" transform={`rotate(${coordinateRotation(position,result.ascendant)} ${degree[0]} ${degree[1]})`} className={instrument.coordinate} data-planet-coordinate={p.body}>{angleLabel(p.longitude)}{p.motion==='retrograde'?' ℞':p.motion==='near-stationary'?' ≈':''}</text>}
        </g>;
      })}
      <circle cx="260" cy="260" r="2" fill="var(--gold)"/>
      <ChartAxes cx={260} cy={260} asc={result.ascendant} mc={result.midheaven} outer={246}/>
    </svg></ChartViewport>
    {current&&<div className={instrument.readout} aria-live="polite"><strong>{glyphs[current.body]} {names[current.body]}</strong> · {current.sign} {angleLabel(current.longitude)} · Nhà {current.house} · {current.motion==='retrograde'?'Nghịch hành':current.motion==='near-stationary'?'Gần dừng biểu kiến':'Thuận hành'}<br/>ASC {result.ascendant.toFixed(3)}° · MC {result.midheaven.toFixed(3)}° · {result.aspects.filter(a=>a.first===selected||a.second===selected).length} liên hệ trong orb {result.input.orb}°</div>}
    <NatalDataAtlas result={result} selected={selected} onSelect={body=>{setFocusedAspect(null);onSelect(body);}} aspects={aspects} focused={focusedAspect} onFocus={key=>setFocusedAspect(old=>old===key?null:key)}/>
    <details className={instrument.aspectLedger}><summary>Bảng đối chiếu {aspects.length} góc hợp đang hiển thị</summary><p>Chọn một cặp để làm rõ đường nối đúng kinh độ trên bản đồ. Bảng xếp từ orb nhỏ đến lớn; không thay đổi phép tính.</p><div className={instrument.aspectRows}>{[...aspects].sort((a,b)=>a.orb-b.orb).map(a=><button type="button" key={a.first+'-'+a.second} aria-pressed={focusedAspect===a.first+'-'+a.second} onClick={()=>setFocusedAspect(current=>current===a.first+'-'+a.second?null:a.first+'-'+a.second)}><span className={instrument.aspectSymbol} data-angle={a.targetAngle}><AspectGlyph angle={a.targetAngle}/></span><span><strong>{names[a.first]} · {names[a.second]}</strong><small>{a.name} {a.targetAngle}° · Khoảng cách {a.separation.toFixed(3)}°</small></span><b>Orb {a.orb.toFixed(3)}°</b></button>)}</div>{!aspects.length&&<p>Không có góc hợp thuộc bộ lọc này trong orb đã chọn.</p>}</details>
    <div className={styles.chartLegend}><span>✦ Tropical · 12 cung · Whole Sign</span><span>◯ Xanh: 60° / 120° · Đỏ: 90° / 180° · Vàng: trùng tụ 0°</span><span>◆ Chọn thiên thể: nhãn → kinh độ thật</span></div>
    <div className={styles.signs} role="group" aria-label="Chọn thiên thể để nghiên cứu">{result.planets.map(p=><button type="button" key={p.body} aria-pressed={p.body===selected} onClick={()=>{setFocusedAspect(null);onSelect(p.body);}}>{glyphs[p.body]} {names[p.body]}</button>)}</div>
    <p className={styles.wheelFootnote}>Nhãn trên vòng được giãn để tránh chồng lấp; các đường nối chỉ về vị trí thiên văn thực. Độ đậm của nét thể hiện orb hẹp hơn; tọa độ chi tiết nằm trong bảng bên dưới.</p>
  </div>;
}
