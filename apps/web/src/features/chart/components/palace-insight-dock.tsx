'use client';

import {supportingNames} from '@thiendo/chart-export/src/star-inventory.cjs';
import type { AstrologyHouse, AnnualOverview } from '@thiendo/shared-types';
import { annualMarkersAt, palaceFocusItems, type PalaceFocusScope } from '../lib/palace-focus';

type Props = {
  house: AstrologyHouse;
  houses: readonly AstrologyHouse[];
  annual: AnnualOverview;
  showAnnual: boolean;
  scope: PalaceFocusScope;
  year: number;
  firstYear: number;
  onScopeChange: (scope: PalaceFocusScope) => void;
  onSelect: (branchIndex: number) => void;
  onYearChange: (year: number) => void;
};

const options: { value: PalaceFocusScope; label: string; short: string }[] = [
  { value: 'single', label: 'Cung chọn', short: 'Một cung' },
  { value: 'tam-hop', label: 'Tam hợp', short: 'Ba cung' },
  { value: 'tu-chinh', label: 'Tam phương Tứ chính', short: 'Bốn cung' },
];

export function PalaceInsightDock({house,houses,annual,showAnnual,scope,year,firstYear,onScopeChange,onSelect,onYearChange}: Props) {
  // Always expose all four navigation targets. Scope only controls highlights on the board.
  const navigation = palaceFocusItems(houses,house.branchIndex,'tu-chinh');
  const highlighted = new Set(palaceFocusItems(houses,house.branchIndex,scope).map(item => item.house.branchIndex));
  const natalHoa = house.tuHoa.map(item => `${item.name} · ${item.star}`);
  const annualHoa = showAnnual ? annual.luuTuHoa.items.filter(item => item.branch === house.branchIndex) : [];
  const annualStars = showAnnual ? annual.luuStars.items.filter(item => item.branch === house.branchIndex) : [];
  const markers = showAnnual ? annualMarkersAt(annual, house.branchIndex) : [];
  return <aside className="chart-insight-dock" aria-label={`Bảng đối chiếu cung ${house.palace}`}>
    <div className="chart-insight-title">
      <span className="eyebrow">SỔ TAY NGHIÊN CỨU / 宮</span>
      <h3 className="serif">{house.palace} <small>{house.stem} {house.branch}</small></h3>
      <p>Chọn vùng để tô sáng trên địa bàn. Các nút cung bên dưới dùng để điều hướng.</p>
    </div>
    <div className="chart-insight-section">
      <strong className="chart-insight-label">01 · PHẠM VI ĐỐI CHIẾU</strong>
      <div className="chart-insight-scope" role="group" aria-label="Chọn phạm vi tô sáng các cung">
        {options.map(option => <button key={option.value} type="button" aria-pressed={scope === option.value} title={option.label} className={scope === option.value ? 'active' : ''} onClick={() => onScopeChange(option.value)}>{option.short}</button>)}
      </div>
      <div className="chart-insight-relations" aria-label="Các vị trí Tam phương Tứ chính">
        {navigation.map(({house:target,role}) => <button type="button" key={target.branchIndex} aria-current={house.branchIndex === target.branchIndex ? 'true' : undefined} aria-controls="thiendo-palace-details" onClick={() => onSelect(target.branchIndex)} className={`chart-insight-relation relation-${role}${highlighted.has(target.branchIndex) ? ' illuminated' : ''}`}>
          <span>{role === 'current' ? 'CUNG ĐANG CHỌN' : role === 'tam-hop' ? 'TAM HỢP' : 'ĐỐI CUNG'}</span>
          <strong>{target.palace}</strong><small>{target.stem} {target.branch} · {target.stars.join(', ') || 'Vô chính diệu'}</small>
        </button>)}
      </div>
      <p className="chart-insight-help">Tam hợp cách nhau 4 chi; Đối cung cách 6 chi. Đây là quan hệ vị trí, không phải kết luận cát/hung.</p>
    </div>
    <div className="chart-insight-section">
      <strong className="chart-insight-label">02 · CUNG ĐANG XÉT</strong>
      <div className="chart-insight-stat-grid"><span>Chính tinh<b>{house.stars.length}</b></span><span>Phụ tinh / vòng sao<b>{supportingNames(house).length}</b></span><span>Đại hạn<b>{house.daiHan?.fromAge ?? '—'}–{house.daiHan?.toAge ?? '—'}</b></span></div>
      <div className="chart-insight-chips" aria-label="Chính tinh tại cung">{(house.stars.length ? house.stars : ['Vô chính diệu']).map(star => <span key={star}>{star}</span>)}</div>
      {natalHoa.length > 0 && <div className="chart-insight-evidence"><b>Tứ Hóa năm sinh</b><p>{natalHoa.join(' · ')}</p></div>}
    </div>
    {showAnnual && <div className="chart-insight-section chart-insight-year">
      <div className="chart-insight-year-heading"><strong className="chart-insight-label">03 · NĂM ĐANG XEM</strong><span>{annual.canChi}</span></div>
      <div className="chart-insight-year-stepper" aria-label="Điều hướng năm xem"><button type="button" aria-label="Năm trước" disabled={year <= firstYear} onClick={() => onYearChange(year - 1)}>←</button><output aria-label="Năm đang xem">{year}</output><button type="button" aria-label="Năm sau" disabled={year >= 2100} onClick={() => onYearChange(year + 1)}>→</button></div>
      {markers.length > 0 ? <div className="chart-insight-tags">{markers.map(marker => <span key={marker}>{marker}</span>)}</div> : <p className="chart-insight-help">Không có dấu mốc Lưu Thái Tuế / Đại hạn / Tiểu hạn tại cung này trong năm đang xem.</p>}
      {annualHoa.length > 0 && <div className="chart-insight-evidence"><b>Lưu Tứ Hóa</b><p>{annualHoa.map(item => `${item.name} · ${item.star}`).join(' · ')}</p></div>}
      {annualStars.length > 0 && <div className="chart-insight-evidence"><b>Lưu tinh</b><p>{annualStars.map(item => item.name).join(' · ')}</p></div>}
      <small className="chart-insight-help">Các lớp năm xem không thay đổi sao năm sinh. Nhấn năm trước/sau để đối chiếu vị trí lưu niên.</small>
    </div>}
    <a className="chart-insight-reference" href="#thiendo-palace-details">Đọc hồ sơ chi tiết cung ↘</a>
  </aside>;
}
