'use client';
import {ModeIntroduction, ExpertOnly, useViewMode} from '@/components/view-mode';

import {useMemo, useRef, useState} from 'react';
import Engine from '@thiendo/astrology-engine';
import Exporter from '@thiendo/good-days-export';
import {downloadBlobFile} from '@/lib/download-blob';

const PURPOSES = [
  {value:'cuoi-hoi', label:'Cưới hỏi'},
  {value:'khai-truong', label:'Khai trương'},
  {value:'xuat-hanh', label:'Xuất hành'},
  {value:'dong-tho', label:'Động thổ'},
] as const;
const FILTERS = [
  {value:'all', label:'Tất cả các ngày'},
  {value:'favorable', label:'Thuận theo Trực'},
  {value:'neutral', label:'Trung tính'},
  {value:'caution', label:'Nên cân nhắc'},
  {value:'mixed', label:'Tín hiệu trái chiều'},
  {value:'boundary', label:'Gần chuyển tiết'},
] as const;
const maximumStart = 2100*12+12-1;
const monthOrdinal=(year:number,month:number)=>year*12+month-1;
const toMonth=(ordinal:number)=>({year:Math.floor(ordinal/12),month:ordinal%12+1});
const vietnamToday=()=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());
  const get=(part:string)=>Number(parts.find(p=>p.type===part)?.value);
  return {year:get('year'), month:get('month'), day:get('day')};
};

export default function GoodDaysPage(){
  const {mode: viewMode} = useViewMode();
  const [today]=useState(vietnamToday);
  const [year,setYear]=useState(today.year);
  const [month,setMonth]=useState(today.month);
  const [months,setMonths]=useState(1);
  const [purpose,setPurpose]=useState('khai-truong');
  const [filter,setFilter]=useState('all');
  const [selected,setSelected]=useState(`${today.year}-${String(today.month).padStart(2,'0')}-${String(today.day).padStart(2,'0')}`);
  const [compare,setCompare]=useState<string[]>([]);
  const [ageBranch,setAgeBranch]=useState<number|null>(null);
  const [chosenHour,setChosenHour]=useState<number|null>(null);
  const detailRef=useRef<HTMLElement>(null);
  const range=useMemo(()=>Engine.goodDaysSearchRange(year,month,months,purpose,filter),[year,month,months,purpose,filter]);
  const chosen=range.days.find(day=>day.date===selected)??range.days[0];
  const compareRows=compare.length?Engine.goodDaysCompare(range,compare):[];
  const special=chosen?Engine.trachNhatEvaluate({date:chosen.date,purpose,ageBranchIndex:ageBranch,hour:chosenHour}):null;

  function updatePeriod(nextOrdinal:number,nextMonths=months){
    const safe=Math.max(1900*12,Math.min(maximumStart-nextMonths+1,nextOrdinal));
    const next=toMonth(safe);
    setYear(next.year);setMonth(next.month);setMonths(nextMonths);
    setSelected(`${next.year}-${String(next.month).padStart(2,'0')}-01`);
    setCompare([]);
  }
  function updatePurpose(next:string){setPurpose(next);setCompare([]);}
  function toggleCompare(iso:string){
    setCompare(old=>old.includes(iso)?old.filter(x=>x!==iso):old.length<3?[...old,iso]:old);
  }
  function downloadCsv(){
    const csv=Exporter.toCsv(range.days);
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    downloadBlobFile(blob,`thien-do-ngay-theo-truc-${year}-${String(month).padStart(2,'0')}.csv`);
  }

  return <div className="gd-page">
    <div className="page-heading"><div className="eyebrow">THIÊN ĐỒ · TRẠCH NHẬT CHUYÊN BIỆT</div>
      <h1 className="serif">Chọn ngày theo việc</h1>
      <p>Tra cứu 1–6 tháng, lọc dữ liệu, đối chiếu tối đa 3 ngày. Từng căn cứ được trình bày riêng, không có điểm may mắn hay lời hứa thành công.</p>
    </div>
    <ModeIntroduction discipline="chon-ngay" summary={`Đã lọc ${range.days.length} ngày cho mục đích đang chọn; không có điểm may mắn tổng hợp.`}/>
    <div className="gd-controls gd-controls-v94">
      <div className="gd-control"><label htmlFor="gd-purpose">Mục đích</label><select id="gd-purpose" value={purpose} onChange={e=>updatePurpose(e.target.value)}>
        {PURPOSES.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
      </select></div>
      <div className="gd-control"><label htmlFor="gd-months">Khoảng tra cứu</label><select id="gd-months" value={months} onChange={e=>updatePeriod(monthOrdinal(year,month),Number(e.target.value))}>
        <option value={1}>1 tháng</option><option value={3}>3 tháng</option><option value={6}>6 tháng</option>
      </select></div>
      <div className="gd-control"><label htmlFor="gd-filter">Lọc kết quả</label><select id="gd-filter" value={filter} onChange={e=>setFilter(e.target.value)}>
        {FILTERS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
      </select></div>
      <div className="gd-month"><span className="eyebrow">THÁNG BẮT ĐẦU</span><div>
        <button type="button" onClick={()=>updatePeriod(monthOrdinal(year,month)-1)} disabled={year===1900&&month===1} aria-label="Tháng trước">←</button>
        <strong>{String(month).padStart(2,'0')} / {year}</strong>
        <button type="button" onClick={()=>updatePeriod(monthOrdinal(year,month)+1)} disabled={monthOrdinal(year,month)>=maximumStart-months+1} aria-label="Tháng sau">→</button>
      </div></div>
    </div>
    <div className="gd-stats" aria-label="Số lượng ngày phân loại theo Trực">
      <div><b>{range.summary.favorable}</b><span>Thuận theo Trực</span></div><div><b>{range.summary.neutral}</b><span>Trung tính</span></div>
      <div><b>{range.summary.caution}</b><span>Nên cân nhắc</span></div>
    </div>
    <div className="gd-utility"><p role="status">Hiển thị <strong>{range.matches}</strong> / {range.total} ngày · {months} tháng. <span>{range.summary.mixed} ngày có tín hiệu trái chiều.</span></p>
      {viewMode === 'expert' && <button type="button" className="gd-download" onClick={downloadCsv} disabled={!range.matches}>↓ Xuất CSV kết quả lọc</button>}
    </div>
    <div className="gd-layout"><section className="gd-list" aria-label="Danh sách ngày">
      {!range.days.length&&<p className="gd-empty">Không có ngày nào khớp bộ lọc này. Hãy chọn nhóm khác.</p>}
      {range.days.map(day=><button key={day.date} type="button" className={'gd-date '+(day.grade==='thuận-theo-trực'?'positive':day.grade==='cân-nhắc-theo-trực'?'caution':'neutral')+(chosen?.date===day.date?' active':'')} aria-pressed={chosen?.date===day.date} onClick={()=>{
        setSelected(day.date);if(window.matchMedia('(max-width: 1100px)').matches)detailRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
      }}><span className="gd-num">{day.date.slice(-2)}</span><span className="gd-desc"><strong>{day.date.slice(5,7)}/{day.date.slice(0,4)} · {day.gradeLabel}</strong>
      <small>Trực {day.sourceTruc} · {day.daySpiritLabel}{day.mixed?' · Trái chiều':''}</small></span><span className="gd-arrow">↗</span></button>)}
    </section>
    <aside className="gd-detail" ref={detailRef} aria-live="polite">{chosen? <>
      <div className="eyebrow">GIẢI THÍCH · {range.purposeLabel.toUpperCase()}</div><h2 className="serif">{chosen.date.slice(8,10)} / {chosen.date.slice(5,7)} / {chosen.date.slice(0,4)}</h2>
      <span className={'gd-pill '+chosen.grade}>{chosen.gradeLabel}</span>
      <p className="gd-lunar">Âm lịch: ngày {chosen.lunar.day} tháng {chosen.lunar.month}{chosen.lunar.leap?' nhuận':''}, năm {chosen.lunar.year}</p>
      {viewMode === 'expert' && <button type="button" className="gd-compare-add" disabled={!compare.includes(chosen.date)&&compare.length>=3} onClick={()=>toggleCompare(chosen.date)}>
        {compare.includes(chosen.date)?'− Bỏ khỏi đối chiếu':'+ Thêm vào đối chiếu'} ({compare.length}/3)
      </button>}
      <h3>Các căn cứ tra cứu</h3><ol>{chosen.reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ol>
      {chosen.mixed&&<p className="gd-warning">Các hệ lịch cho tín hiệu trái chiều; không có kết luận ngày tốt tuyệt đối.</p>}
      {chosen.nearBoundary&&<p className="gd-warning">Gần thời điểm chuyển tiết. Hãy kiểm tra thời gian chuyển tiết chính xác.</p>}
      <p className="gd-note">{chosen.disclaimer}</p> 
      <section className="gd-special" aria-label="Trạch Nhật chuyên biệt">
       <h3>Đối chiếu Trạch Nhật theo từng phép</h3>
       <div className="gd-special-controls"><label>Địa Chi tuổi <select value={ageBranch===null?'':ageBranch} onChange={e=>setAgeBranch(e.target.value===''?null:Number(e.target.value))}><option value="">Không cung cấp</option>{['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'].map((b,i)=><option key={b} value={i}>{b}</option>)}</select></label>
       <label>Giờ định làm <select value={chosenHour===null?'':chosenHour} onChange={e=>setChosenHour(e.target.value===''?null:Number(e.target.value))}><option value="">Chưa chọn</option>{Array.from({length:24},(_,i)=><option value={i} key={i}>{String(i).padStart(2,'0')}:00</option>)}</select></label></div>
       {special?.lenses.map(lens=><div className="gd-special-lens" key={lens.policy}><strong>{lens.policy==='thap-nhi-truc'?'Thập Nhị Trực':lens.policy==='hoang-hac-dao'?'Hoàng/Hắc đạo':lens.policy==='luc-xung-tuoi'?'Lục Xung Chi tuổi':'Giờ hoàng đạo'}</strong><span>{lens.observation}</span><small>{lens.basis.join(' · ')}</small><small>{lens.limitation}</small></div>)}
       {special&&<p className="gd-note">28 Tú: {special.visualReference.moonMansion} — chỉ đối chiếu, chưa xét cát/hung. {special.nearBoundary?'Gần chuyển tiết; cần kiểm tra giờ nhập tiết.':''}</p>}
      </section>
    </>:<p className="gd-empty">Chưa có ngày phù hợp. Đổi bộ lọc để xem giải thích.</p>}</aside></div>
    <ExpertOnly title="So sánh tối đa ba ngày và xuất CSV">
    {compareRows.length>0&&<section className="gd-comparison" aria-label="Bảng đối chiếu ngày"><div className="gd-comp-top"><h2 className="serif">Đối chiếu ngày đã chọn</h2>
      <button type="button" onClick={()=>setCompare([])}>Xóa lựa chọn</button></div>
      <div className="gd-compare-scroll"><table><thead><tr><th scope="col">Tiêu chí</th>{compareRows.map(d=><th key={d.date} scope="col">{d.date}<button type="button" aria-label={`Bỏ ${d.date}`} onClick={()=>toggleCompare(d.date)}> × </button></th>)}</tr></thead><tbody>
        <tr><th scope="row">Nhóm theo Trực</th>{compareRows.map(d=><td key={d.date}>{d.gradeLabel}</td>)}</tr>
        <tr><th scope="row">Thập Nhị Trực</th>{compareRows.map(d=><td key={d.date}>{d.truc}</td>)}</tr>
        <tr><th scope="row">Hoàng/Hắc đạo</th>{compareRows.map(d=><td key={d.date}>{d.daySpiritLabel}</td>)}</tr>
        <tr><th scope="row">28 Tú</th>{compareRows.map(d=><td key={d.date}>{d.moonMansion}</td>)}</tr>
        <tr><th scope="row">Tín hiệu trái chiều</th>{compareRows.map(d=><td key={d.date}>{d.mixed?'Có':'Không'}</td>)}</tr>
        <tr><th scope="row">Gần chuyển tiết</th>{compareRows.map(d=><td key={d.date}>{d.nearBoundary?'Có':'Không'}</td>)}</tr>
      </tbody></table></div></section>}
    {!compareRows.length&&<p className="gd-note">Chọn tối đa ba ngày bằng nút “Thêm vào đối chiếu”, sau đó xem bảng đối chiếu.</p>}
    </ExpertOnly>
    <p className="gd-disclaimer">Lưu ý: Các nhóm chỉ phản ánh một cách diễn giải Thập Nhị Trực. Dữ liệu Hoàng/Hắc đạo và 28 Tú là lớp tham khảo độc lập. Quyết định cưới hỏi, khai trương, xuất hành và xây dựng phải ưu tiên yếu tố thực tế, pháp lý, thời tiết và an toàn.</p>
  </div>;
}
