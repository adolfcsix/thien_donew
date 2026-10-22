import type { AnnualOverview, AstrologyResult } from '@thiendo/shared-types';

/** Pure, presentational chart controls. Kept free of chart calculations and state. */
type ChartBoardHeaderProps = {
  result: AstrologyResult;
  annual: AnnualOverview;
  year: number;
  showAuxiliary: boolean;
  showStrength: boolean;
  showCycles: boolean;
  showAnnual: boolean;
  onShowAuxiliaryChange: (show: boolean) => void;
  onShowStrengthChange: (show: boolean) => void;
  onShowCyclesChange: (show: boolean) => void;
  onShowAnnualChange: (show: boolean) => void;
  onYearChange: (year: number) => void;
};

export function ChartBoardHeader({
  result, annual, year, showAuxiliary, showStrength, showCycles, showAnnual,
  onShowAuxiliaryChange, onShowStrengthChange, onShowCyclesChange,
  onShowAnnualChange, onYearChange,
}: ChartBoardHeaderProps) {
  return <>
    <div className="atlas-reading-intro"><span>QUYỂN I · ĐỊA BÀN TỬ VI</span><strong>Thập nhị cung · Tinh bàn nghiên cứu</strong><small>14 chính tinh · Phụ tinh · Tứ Hóa · Vòng sao · Đại hạn · Lưu niên</small></div>
    <div className="board-toolbar">
      <div><b>ĐỊA BÀN 12 CUNG</b><small>{result.yearCanChi} · {result.cuc.name} · Mệnh {result.menh}</small><small className="chart-basic-hint">Chế độ Cơ bản: chọn một cung để đọc thông tin; chuyển Chuyên sâu để xem thêm lớp sao.</small></div>
      <div className="board-options"><label><input type="checkbox" checked={showAuxiliary} onChange={e => onShowAuxiliaryChange(e.target.checked)}/> Phụ tinh</label>
        <label><input type="checkbox" checked={showStrength} onChange={e => onShowStrengthChange(e.target.checked)}/> Miếu/Vượng (tham khảo)</label>
        <label><input type="checkbox" checked={showCycles} onChange={e => onShowCyclesChange(e.target.checked)}/> Vòng sao</label>
        <label><input type="checkbox" checked={showAnnual} onChange={e => onShowAnnualChange(e.target.checked)}/> Lưu tinh &amp; Lưu Tứ Hóa</label></div>
    </div>
    <div className="annual-toolbar">
      <label htmlFor="annual-year">Năm âm lịch cần xem</label>
      <select id="annual-year" value={year} onChange={e => onYearChange(Number(e.target.value))}>
        {Array.from({length:2101-Math.max(1900,result.lunar.year)},(_,i) => Math.max(1900,result.lunar.year)+i).map(optionYear => <option key={optionYear} value={optionYear}>{optionYear}</option>)}
      </select>
      <div className="annual-summary"><strong>{annual.canChi}</strong><span>Tuổi mụ: {annual.ageMu}</span><span>Lưu chi năm: {annual.luuThaiTueBranch}</span><span>Đại hạn: {annual.activeDaiHan ? `${annual.activeDaiHan.palace} (${annual.activeDaiHan.fromAge}–${annual.activeDaiHan.toAge})` : 'Chưa vào đại hạn trong bảng 12 kỳ'}</span><span>Tiểu hạn: {annual.tieuHan.branch} · {annual.tieuHan.palace} ({annual.tieuHan.direction})</span></div>
    </div>
    {showAnnual && <div className="annual-layer-summary" aria-label="Tra cứu lưu tứ hóa theo năm">
      <b>Lưu Tứ Hóa {annual.canChi}</b><div>{annual.luuTuHoa.items.map(t => <span key={t.name}><strong>{t.name}</strong> {t.star} · {t.palace}</span>)}</div>
      <small>Tứ Hóa năm xem và Tứ Hóa năm sinh là hai lớp riêng biệt. Các cách an có thể khác nhau theo trường phái.</small>
    </div>}
  </>;
}
