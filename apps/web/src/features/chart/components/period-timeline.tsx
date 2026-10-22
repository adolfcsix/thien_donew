'use client';
import {useMemo,useState} from 'react';
import type {AstrologyResult} from '@thiendo/shared-types';
import {comparePeriods} from '@thiendo/interpretation/src/chart-reading.cjs';
import {TemporalDetail} from './temporal-detail';

type Props={chart:AstrologyResult;year:number;onYearChange:(year:number)=>void;onSelectPalace:(branchIndex:number)=>void;};

export function PeriodTimeline({chart,year,onYearChange,onSelectPalace}:Props){
  const [expanded,setExpanded]=useState(false);
  const [activeOnly,setActiveOnly]=useState(true);
  const timeline=useMemo(()=>expanded?comparePeriods(chart,year):null,[chart,year,expanded]);
  const marked=timeline?.houses.filter(h=>h.labels.length||h.annualStars.length||h.annualTransformations.length)??[];
  const rows=activeOnly?marked:timeline?.houses??[];
  return <section className="period-timeline" aria-label="Đối chiếu vận hạn theo năm">
    <div className="period-timeline-heading">
      <div><span className="eyebrow">QUYỂN II · DÒNG THỜI GIAN</span><h3>Đối chiếu Đại hạn – Tiểu hạn – Lưu niên</h3><p>Xem các lớp vận hạn cạnh nhau trong 12 năm, không phải phán đoán cát hung.</p></div>
      <button type="button" className="period-toggle" aria-controls="period-timeline-content" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Thu gọn dòng vận':'Xem dòng vận 12 năm'} <span aria-hidden="true">{expanded?'−':'＋'}</span></button>
    </div>
    {expanded&&timeline&&<div id="period-timeline-content" className="period-timeline-content">
      <p className="period-timeline-intro">Chạm hoặc chọn một năm để đồng bộ năm xem trên toàn bộ địa bàn và phòng đọc. <strong>Tuổi mụ</strong> được tính từ năm âm lịch.</p>
      <div className="period-year-grid" role="group" aria-label="Chọn năm âm lịch để đối chiếu">
        {timeline.years.map(item=><button key={item.year} type="button" className={'period-year'+(item.year===year?' selected':'')} aria-pressed={item.year===year} onClick={()=>onYearChange(item.year)}>
          <strong>{item.year}</strong><span>{item.canChi}</span><small>Tuổi mụ {item.ageMu}</small>
          <small>Tiểu hạn: {item.tieuHan.palace}</small>
          {item.overlaps.length>0&&<em>{item.overlaps.length} liên hệ trùng cung</em>}
        </button>)}
      </div>
      <div className="period-current-header">
        <div><span className="eyebrow">NĂM ÂM LỊCH ĐANG XEM</span><h4>{timeline.selected.year} · {timeline.selected.canChi}</h4></div>
        <span>Tuổi mụ {timeline.selected.ageMu}</span>
      </div>
      <div className="period-overview-grid">
        <div><small>ĐẠI HẠN</small><strong>{timeline.selected.daiHan?`${chart.houses.find(h=>h.branchIndex===timeline.selected.daiHan?.branchIndex)?.branch??'—'} · ${timeline.selected.daiHan.palace}`:'Chưa tới đại hạn trong bảng'}</strong><span>{timeline.selected.daiHan?`Tuổi mụ ${timeline.selected.daiHan.fromAge}–${timeline.selected.daiHan.toAge}`:'Không tự gán cung Đại hạn'}</span></div>
        <div><small>TIỂU HẠN</small><strong>{timeline.selected.tieuHan.branch} · {timeline.selected.tieuHan.palace}</strong><span>Theo quy tắc Tiểu hạn hiện dùng</span></div>
        <div><small>LƯU THÁI TUẾ</small><strong>{timeline.selected.luuThaiTue.branch}</strong><span>Theo địa chi năm xem</span></div>
      </div>
      <details className="period-evidence-source">
        <summary>Bảng quy tắc đang áp dụng · {timeline.annualTrace.yearStem} {timeline.annualTrace.yearBranch}</summary>
        <p>Vị trí được tính theo năm <strong>âm lịch</strong> {timeline.annualTrace.selectedLunarYear}.
          Có {timeline.annualTrace.counts.annualStars} sao lưu và {timeline.annualTrace.counts.annualTransformations} Lưu Tứ Hóa.
          Mỗi Hóa gắn với sao nguyên bàn đang ở cung được chỉ ra, không phải sao mới.
          Còn {timeline.annualTrace.counts.unresolvedNames} tên sao và {timeline.annualTrace.counts.unresolvedAliases} dị danh nghiên cứu chưa tự động an.</p>
        <p>Nhấn một cung bên dưới để xem lá số gốc. Mã bảng và can/chi cụ thể hiện cạnh từng sao lưu; việc ghi mã bảng không đồng nghĩa đã được chuyên gia thẩm định.</p>
      </details>
      <TemporalDetail key={year} chart={chart} year={year}/>
      <div className="period-table-header"><h4>12 cung trong năm {year}</h4><label><input type="checkbox" checked={activeOnly} onChange={e=>setActiveOnly(e.target.checked)}/> Chỉ cung có thông tin vận năm</label></div>
      <p className="period-timeline-intro">Lá số gốc có {timeline.natalInventory.placedNameOccurrences} vị trí tên sao/vòng sao đang được engine an; 12 sao lưu năm và 4 Lưu Tứ Hóa được trình bày ở lớp riêng. Các câu hỏi đọc hạn là hướng dẫn biên tập, chưa được thẩm định chuyên môn độc lập.</p>
      <div className="period-house-list">
        {rows.map(h=><button type="button" key={h.branchIndex} className="period-house-item" onClick={()=>onSelectPalace(h.branchIndex)} title={`Mở cung ${h.palace}`}>
          <span className="period-house-name"><strong>{h.palace}</strong><small>{h.branch}</small></span>
          <span className="period-house-detail">
            {h.labels.length>0&&<span className="period-tags">{h.labels.map(t=><em key={t}>{t}</em>)}</span>}
            <span><b>Sao gốc/vòng sao:</b> {h.natalStarCount} vị trí · {h.natalGroups.map(g=>`${g.label}: ${g.names.join(', ')}`).join(' · ') || 'Chưa ghi nhận sao gốc'} </span>
            {h.natalCycles.length>0&&<span><b>Ba vòng sao:</b> {h.natalCycles.map(g=>`${g.label}: ${g.names.join(', ')}`).join(' · ')}</span>}
            {h.annualStars.length>0&&<span><b>Sao lưu:</b> {h.annualStars.join(' · ')}</span>}
            {h.annualStudy.length>0&&<span className="period-reading-note"><b>Chủ đề sao lưu:</b> {h.annualStudy.map(s=>`${s.name} — ${s.theme}`).join(' · ')}</span>}
            {h.periodQuestions.length>0&&<span className="period-reading-note"><b>Gợi ý đối chiếu:</b> {h.periodQuestions.map(s=>`${s.label}: ${s.text}`).join(' ')}</span>}
            {h.annualTransformations.length>0&&<span><b>Lưu Tứ Hóa:</b> {h.annualTransformations.map(t=>`${t.name} (${t.star})`).join(' · ')}</span>}
            {h.annualEvidence.length>0&&<span className="period-reading-note"><b>Dấu vết phép an theo năm:</b> {h.annualEvidence.map(e=>`${e.name}${e.kind==='annual-transformation'?` → ${e.hostStar} (sao gốc)`:''} · ${e.inputValue} · ${e.ruleSet}`).join(' | ')}</span>}
            {h.labels.length===0&&h.annualStars.length===0&&h.annualTransformations.length===0&&<span>Chưa có dấu vận năm trong nhóm đã triển khai</span>}
          </span><span aria-hidden="true">›</span>
        </button>)}
      </div>
      {timeline.selected.overlaps.length>0&&<p className="period-overlaps">{timeline.selected.overlaps.map(x=>x.label).join(' · ')} — đây chỉ là đối chiếu vị trí, không phải dấu hiệu tốt hoặc xấu.</p>}
      <p className="period-limitation">{timeline.limitation}</p>
    </div>}
  </section>;
}
