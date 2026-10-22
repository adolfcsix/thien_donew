'use client';
import {useMemo,useState} from 'react';
import type {AstrologyResult} from '@thiendo/shared-types';
import {getTemporalExplorer,listLunarMonths,getSubannualResearch} from '@thiendo/interpretation/src/chart-reading.cjs';

/** Pure calendrical drill-down; never implies a monthly/daily/hourly Tử Vi placement. */
export function TemporalDetail({chart,year}:{chart:AstrologyResult;year:number}){
  const [monthKey,setMonthKey]=useState('1-0');
  const [day,setDay]=useState(1);
  const [hour,setHour]=useState(12);
  const [showResearch,setShowResearch]=useState(false);
  const months=useMemo(()=>listLunarMonths(year),[year]);
  const safeMonth=months.find(m=>m.key===monthKey)??months[0];
  // Some 2100 lunar months extend beyond supported solar calendar range.
  if(!safeMonth) return <p className="temporal-note">Không có tháng âm nằm trong phạm vi lịch hỗ trợ.</p>;
  const safeDay=Math.min(day,safeMonth.days.length);
  const temporal=getTemporalExplorer(chart,year,safeMonth.month,safeMonth.leap,safeDay,hour);
  const research=showResearch?getSubannualResearch(chart,year,safeMonth.month,safeMonth.leap,safeDay,hour):null;
  return <section className="temporal-detail" aria-label="Tra cứu tháng ngày giờ âm lịch">
    <div className="temporal-header"><div><span className="eyebrow">LỊCH ÂM · ĐỌC THEO THỜI ĐIỂM</span><h4>Đi sâu từ năm đến tháng, ngày, giờ</h4></div><span className="temporal-status">Lớp lịch pháp</span></div>
    <p>Chọn thời điểm để xem lịch âm–dương và đối chiếu với vận năm đang chọn. Lưu nguyệt, Lưu nhật, Lưu thời chưa được an chính thức. Bạn có thể bật mô hình đối chiếu cung để nghiên cứu riêng.</p>
    <div className="temporal-controls">
      <label>Tháng âm<select value={safeMonth.key} onChange={e=>{setMonthKey(e.target.value);setDay(1);}}>{months.map(m=><option key={m.key} value={m.key}>{m.displayName}{m.partial?' (giới hạn lịch)':''}</option>)}</select></label>
      <label>Ngày âm<select value={safeDay} onChange={e=>setDay(Number(e.target.value))}>{safeMonth.days.map(d=><option key={d.lunarDay} value={d.lunarDay}>{d.lunarDay}</option>)}</select></label>
      <label>Giờ xem<select value={hour} onChange={e=>setHour(Number(e.target.value))}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,'0')}:00</option>)}</select></label>
    </div>
    <div className="temporal-results" aria-live="polite">
      <div><small>ÂM LỊCH</small><strong>{temporal.selected.lunarLabel}</strong><span>{temporal.selected.dayCanChi} · ngày Can Chi</span></div>
      <div><small>DƯƠNG LỊCH (UTC+7)</small><strong>{temporal.selected.solarDate.split('-').reverse().join('/')}</strong><span>Đối chiếu cùng năm âm lịch {year}</span></div>
      <div><small>GIỜ ĐỊA CHI</small><strong>Giờ {temporal.selected.time.branch}</strong><span>{temporal.selected.time.period}</span></div>
    </div>
    {temporal.selected.time.boundaryNotice&&<p className="temporal-boundary">{temporal.selected.time.boundaryNotice}</p>}
    <label className="temporal-research-toggle"><input type="checkbox" checked={showResearch} onChange={e=>setShowResearch(e.target.checked)}/><span>Xem thêm vị trí hạn tháng, ngày, giờ (nghiên cứu)</span></label>
    {research&&<div className="temporal-research" aria-label="Đối chiếu cung hạn thời gian" aria-live="polite">
      <p className="temporal-research-intro">Cách tính tham khảo theo Đẩu Quân. Các vị trí dưới đây chỉ giúp đối chiếu cung, không phải sao lưu đã được xác minh.</p>
      <div className="temporal-research-grid">
        <div><small>HẠN THÁNG</small><strong>{research.luuNguyet.palace}</strong><span>Địa chi {research.luuNguyet.branch}</span></div>
        <div><small>HẠN NGÀY</small><strong>{research.luuNhat.palace}</strong><span>Địa chi {research.luuNhat.branch}</span></div>
        <div><small>HẠN GIỜ</small><strong>{research.luuThoi.palace}</strong><span>Địa chi {research.luuThoi.branch}</span></div>
      </div>
      {safeMonth.leap&&<p className="temporal-leap-note">Tháng nhuận được giữ cùng vị trí với tháng thường tương ứng trong mô hình này.</p>}
      <p className="temporal-research-caution">Chưa tính các sao lưu riêng cho tháng, ngày hoặc giờ. Cần đối chiếu dị bản trường phái trước khi sử dụng để luận hạn.</p>
    </div>}
    <p className="temporal-note">{temporal.note}{safeMonth.partial?' Tháng cuối bị giới hạn bởi phạm vi dữ liệu lịch hỗ trợ.':''}</p>
  </section>;
}
