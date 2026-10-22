import { TianMonMark } from '@/components/thien-mon-mark';
import type { AstrologyResult, AnnualOverview } from '@thiendo/shared-types';

export function BoardSummary({result,annual,label=''}:{result:AstrologyResult;annual:AnnualOverview;label?:string}) {
  const details = result as AstrologyResult & {hour?:number;minute?:number;hourBranch?:string;gender?:string;thanPalace?:string};
  const hour = typeof details.hour === 'number' ? `${String(details.hour).padStart(2,'0')}:${String(details.minute ?? 0).padStart(2,'0')}` : '—';
  return <div className="board-center atlas-center" aria-label="Hồ sơ tổng quan lá số">
    <div className="atlas-center-upper"><span className="atlas-center-overline" title="紫微斗數">TỬ VI ĐẨU SỐ · HỒ SƠ LÁ SỐ</span><span className="atlas-center-seal" aria-hidden="true" title="Thiên Môn · 天"><TianMonMark size={66} compact /></span><h3>THIÊN ĐỒ</h3><p>BẢN ĐỒ THẬP NHỊ CUNG</p></div>
    <div className="atlas-center-data">
      {label.trim()&&<div className="atlas-center-person"><span>Họ tên · {result.gender}</span><strong>{label}</strong></div>}
      <div><span>Ngày dương</span><strong>{result.solar.day}/{result.solar.month}/{result.solar.year}</strong></div>
      <div><span>Ngày âm</span><strong>{result.lunar.day}/{result.lunar.month}/{result.lunar.year}{result.lunar.leap ? ' nhuận' : ''}</strong></div>
      <div><span>Giờ sinh</span><strong>{hour} {details.hourBranch ? `· ${details.hourBranch}` : ''}</strong></div>
      <div><span>Năm sinh</span><strong>{result.yearCanChi}</strong></div>
      <div><span>Mệnh</span><strong>{result.menh}</strong></div>
      <div><span>Thân</span><strong>{result.than}{details.thanPalace ? ` · ${details.thanPalace}` : ''}</strong></div>
      <div><span>Cục</span><strong>{result.cuc.name}</strong></div>
      <div><span>Năm xem</span><strong>{annual.year} · {annual.canChi}</strong></div>
    </div>
    <div className="atlas-center-foot"><span>Tuổi mụ <strong>{annual.ageMu}</strong></span><span>Vận hạn <strong>Năm {annual.year}</strong></span></div>
  </div>;
}
