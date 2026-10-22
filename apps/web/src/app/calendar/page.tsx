'use client';
import {ModeIntroduction, useViewMode} from '@/components/view-mode';
import {useState, useMemo} from 'react';
import Engine from '@thiendo/astrology-engine';
import {CalendarAuditPanel} from '@/features/traditional-calendar/calendar-audit-panel';

const MONTHS = ['Giêng','Hai','Ba','Tư','Năm','Sáu','Bảy','Tám','Chín','Mười','Mười một','Chạp'];
const WEEKDAYS = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','CN'];
const ISO = (y:number,m:number,d:number) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
function vietnamDate() {
  const chunks = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());
  const get=(type:string)=>Number(chunks.find(x=>x.type===type)?.value);
  return {year:get('year'),month:get('month'),day:get('day')};
}
export default function CalendarPage() {
  const {mode: viewMode} = useViewMode();
  const [initial]=useState(vietnamDate);
  const [year,setYear]=useState(initial.year);
  const [month,setMonth]=useState(initial.month);
  const [selected,setSelected]=useState(ISO(initial.year,initial.month,initial.day));
  const [lunarDay,setLunarDay]=useState(1);
  const [lunarMonth,setLunarMonth]=useState(1);
  const [lunarYear,setLunarYear]=useState(initial.year);
  const [leap,setLeap]=useState(false);
  const [conversion,setConversion]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const grid=useMemo(()=>Engine.calendarMonth(year,month),[year,month]);
  const chosen=useMemo(()=>{
    const [y,m,d]=selected.split('-').map(Number);
    try{return Engine.calendarDay(y,m,d);}catch{return null;}
  },[selected]);
  const navigate=(delta:number)=>{
    const d=new Date(Date.UTC(year,month-1+delta,1));
    const y=d.getUTCFullYear();
    if(y<1900||y>2100)return;
    const newMonth=d.getUTCMonth()+1;
    const currentDay=Number(selected.split('-')[2]);
    const maxDay=new Date(Date.UTC(y,newMonth,0)).getUTCDate();
    setYear(y);setMonth(newMonth);setSelected(ISO(y,newMonth,Math.min(currentDay,maxDay)));setError(null);
  };
  const jumpToday=()=>{const d=vietnamDate();setYear(d.year);setMonth(d.month);setSelected(ISO(d.year,d.month,d.day));setConversion(null);setError(null);};
  const pickDay=(value:string)=>{setSelected(value);setError(null);};
  const onSolarChange=(date:string)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const [y,m,d]=date.split('-').map(Number);
    try{Engine.calendarDay(y,m,d);setSelected(date);setYear(y);setMonth(m);setError(null);}catch{setError('Ngày ngoài phạm vi hỗ trợ 1900–2100.');}
  };
  const doConvert=()=>{
    try{
      const result=Engine.calendarLunarToSolar(lunarYear,lunarMonth,lunarDay,leap);
      setSelected(result.solar.iso);setYear(result.solar.year);setMonth(result.solar.month);
      setConversion(`${lunarDay}/${lunarMonth}${leap?' nhuận':''}/${lunarYear} âm lịch = ${result.solar.day}/${result.solar.month}/${result.solar.year} dương lịch`);
      setError(null);
    }catch(e){setConversion(null);setError(e instanceof Error ? e.message:'Ngày âm không hợp lệ.');}
  };
  return <div className="calendar-page">
    <div className="page-heading">
      <div className="eyebrow">LỊCH VẠN NIÊN · TRA CỨU TRÊN MÚI GIỜ VIỆT NAM</div>
      <h1 className="serif">Dòng chảy âm dương</h1>
      <p>Tra âm–dương, Can Chi ngày/tháng, 24 tiết khí, 12 Trực, thần trực nhật và 28 Tú theo bảng lịch pháp truyền thống. Dữ liệu tính toán ngay trên thiết bị, không cần tài khoản.</p>
    </div>
    <ModeIntroduction discipline="lich-phap" summary={chosen ? `Ngày ${selected}: âm lịch ${chosen.lunar.day}/${chosen.lunar.month}; Can Chi ${chosen.dayCanChi}.` : "Chưa có ngày hợp lệ."}/>
    <div className="calendar-layout">
      <section className="calendar-pane">
        <header className="calendar-bar">
          <div><span className="eyebrow">THÁNG DƯƠNG LỊCH</span><h2 className="serif">Tháng {month.toString().padStart(2,'0')} <span>·</span> {year}</h2></div>
          <div className="calendar-controls"><button type="button" onClick={()=>navigate(-1)} disabled={year===1900&&month===1} aria-label="Tháng trước">←</button><button type="button" onClick={jumpToday}>Hôm nay</button><button type="button" onClick={()=>navigate(1)} disabled={year===2100&&month===12} aria-label="Tháng sau">→</button></div>
        </header>
        <div className="calendar-weekdays">{WEEKDAYS.map(d=><span key={d}>{d}</span>)}</div>
        <div className="calendar-matrix" role="grid" aria-label={`Lịch tháng ${month}/${year}`}>
          {Array.from({length:grid.startOffset},(_,i)=><div className="calendar-blank" key={`blank-${i}`} role="presentation"/>)}
          {grid.days.map(d=>{
            const active=selected===d.solar.iso;
            const isToday=ISO(initial.year,initial.month,initial.day)===d.solar.iso;
            return <button type="button" role="gridcell" aria-selected={active} key={d.solar.iso} className={'calendar-date'+(active?' chosen':'')+(isToday?' today':'')+(d.event?' holiday':'')} onClick={()=>pickDay(d.solar.iso)} aria-label={`${d.solar.day} tháng ${d.solar.month}, âm lịch ${d.lunar.day} tháng ${d.lunar.month}${d.lunar.leap?' nhuận':''}`}>
              <strong>{d.solar.day}</strong><span>{d.lunar.day===1?`${d.lunar.day}/${d.lunar.month}${d.lunar.leap?'N':''}`:`${d.lunar.day}${d.lunar.leap?'N':''}`}</span>
              {d.event&&<i title={d.event} aria-label={d.event}>✦</i>}
            </button>;
          })}
        </div>
        <div className="calendar-term-list" aria-label="Tiết khí trong tháng"><span className="eyebrow">TIẾT KHÍ TRONG THÁNG · NGÀY ƯỚC TÍNH</span><div>{grid.terms.map(t=><span key={`${t.day}-${t.name}`}>{String(t.day).padStart(2,'0')}/{String(month).padStart(2,'0')} · {t.name}</span>)}</div></div>
        <div className="calendar-key"><span><i className="key-ring"/> Ngày được chọn</span><span><i className="key-gold"/> Ngày lễ truyền thống</span><span>Ngày lớn: dương lịch · Ngày nhỏ: âm lịch</span></div>
      </section>
      <aside className="calendar-side">
        <section className="calendar-detail">
          <div className="eyebrow">THẺ NGÀY · THÔNG TIN CHI TIẾT</div>
          {chosen&&<>
            <p className="calendar-daynum">{String(chosen.solar.day).padStart(2,'0')}<small>/{String(chosen.solar.month).padStart(2,'0')}/{chosen.solar.year}</small></p>
            <div className="calendar-primary-lunar">{chosen.lunar.day} tháng {chosen.lunar.month===1?'Giêng':MONTHS[chosen.lunar.month-1]}{chosen.lunar.leap?' nhuận':''} · {chosen.lunar.year}</div>
            <dl className="calendar-facts"><div><dt>Can Chi ngày</dt><dd>{chosen.dayCanChi}</dd></div><div><dt>Can Chi năm âm</dt><dd>{chosen.yearCanChi}</dd></div><div><dt>Can Chi tháng (tiết khí)</dt><dd>{chosen.monthCanChi.name}</dd></div><div><dt>Tiết khí lúc 12h VN</dt><dd>{chosen.solarTerm.name}</dd></div><div><dt>Trực ngày (tháng tiết khí)</dt><dd>{chosen.truc.name}</dd></div><div><dt>Thần trực nhật</dt><dd><span className={chosen.dayStatus.status==='hoang-dao'?'calendar-status-good':'calendar-status-bad'}>{chosen.dayStatus.label}</span> · {chosen.dayStatus.name}</dd></div><div><dt>Nhị thập bát tú (chu kỳ 28 ngày)</dt><dd>{chosen.moonMansion.name} · {chosen.moonMansion.group}</dd></div><div><dt>Trạng thái</dt><dd>{chosen.isFirstDay?'Mùng một':chosen.isFullMoon?'Ngày rằm':'Ngày thường'}</dd></div></dl>
            {(chosen.solarTerm.nearBoundary||chosen.monthCanChi.nearBoundary)&&<p className="calendar-boundary-note">Gần thời điểm chuyển tiết: kết quả Can Chi tháng và tiết khí là ước tính theo 12h trưa. Cần đối chiếu mốc giờ chuyển tiết trước khi dùng chuyên môn.</p>}
            <p className="calendar-rule-note">Các lịch phái có thể cho ra kết quả khác nhau. Không nên dùng riêng một nhãn để khẳng định ngày tốt hoặc xấu.</p>
            {viewMode === 'expert' && <div className="calendar-hours"><div className="eyebrow">6 GIỜ HOÀNG ĐẠO · THEO CHI NGÀY</div><div className="calendar-hour-grid">{chosen.auspiciousHours.map(h=><div key={h.branch} className="calendar-hour"><strong>{h.branch}</strong><span>{h.time}</span></div>)}</div><p>Giờ theo 12 địa chi; đây là phân loại dân gian, không bảo đảm kết quả tốt/xấu.</p></div>}
            {chosen.event&&<div className="calendar-festival">✦ {chosen.event}</div>}
          </>}
        </section>
        <section className="calendar-converter">
          <div className="eyebrow">CÔNG CỤ CHUYỂN ĐỔI</div><h3 className="serif">Âm lịch ↔ Dương lịch</h3>
          <label htmlFor="solar-date">Ngày dương đang chọn</label><input id="solar-date" type="date" min="1900-01-01" max="2100-12-31" value={selected} onChange={e=>onSolarChange(e.target.value)}/>
          <p className="calendar-subheading">Tìm ngày dương từ ngày âm</p>
          <div className="calendar-inputs">
            <label>Ngày<input type="number" value={lunarDay} onChange={e=>setLunarDay(Number(e.target.value))} min={1} max={30}/></label>
            <label>Tháng<select value={lunarMonth} onChange={e=>setLunarMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
            <label>Năm<input type="number" value={lunarYear} onChange={e=>setLunarYear(Number(e.target.value))} min={1900} max={2100}/></label>
          </div>
          <label className="calendar-checkbox"><input type="checkbox" checked={leap} onChange={e=>setLeap(e.target.checked)}/> Tháng nhuận</label>
          <button type="button" className="btn gold calendar-convert" onClick={doConvert}>Chuyển sang dương lịch ↗</button>
          {error&&<p className="calendar-error" role="alert">{error}</p>}
          {conversion&&<p className="calendar-success" role="status">{conversion}</p>}
        </section>
      </aside>
    </div>
    <CalendarAuditPanel initialDate={selected}/>
    <p className="calendar-disclaimer">Dùng bộ thuật toán lịch âm dương Việt Nam UTC+7 (1900–2100). Tiết khí và Can Chi tháng chỉ tính gần đúng theo kinh độ Mặt Trời vào 12h trưa Việt Nam; giờ hoàng đạo dùng bảng theo Chi ngày. Chưa có thời điểm chuyển tiết chính xác hoặc bộ đánh giá ngày tốt/xấu theo công việc; nhãn Hoàng/Hắc đạo ở đây chỉ là một lớp tra cứu truyền thống. Kết quả mang tính tra cứu, cần đối chiếu nguồn thiên văn chính thức nếu sử dụng chuyên môn.</p>
  </div>;
}
