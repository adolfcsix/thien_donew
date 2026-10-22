import type { AnnualOverview, AstrologyHouse } from '@thiendo/shared-types';
import {starTone, type StarLayer} from '../lib/star-visuals';

/** Read-only list: a genuinely legible alternative to the 4×4 atlas on phones. */
type ChartPalaceListProps = {
  matching: AstrologyHouse[];
  selectedBranch: number;
  detailId: string;
  showAuxiliary: boolean;
  showCycles: boolean;
  showAnnual: boolean;
  annual: AnnualOverview;
  onSelect: (branchIndex: number) => void;
};

function ListStars({items,kind,label}:{items:string[];kind:StarLayer;label:string}) {
  if (!items.length) return null;
  return <span className="chart-list-star-row"><small>{label}</small><span className="chart-list-star-tokens">
    {items.map((star,index) => <span key={`${star}-${index}`} className={`chart-list-star-chip atlas-star-kind-${starTone(star,kind)}`}>{star}</span>)}
  </span></span>;
}

export function ChartPalaceList({
  matching, selectedBranch, detailId, showAuxiliary, showCycles, showAnnual, annual, onSelect,
}: ChartPalaceListProps) {
  return <div className="chart-palace-list" aria-label="Danh sách cung theo thứ tự địa bàn">
    {matching.length ? matching.map(house => {
      const auxiliary = [...house.auxiliaryStars, ...house.yearStars,
        ...(house.additionalStars ?? []), ...(house.traditionalStars ?? []),
        ...(house.natalExtensionStars ?? []), ...(house.beneficStars ?? []),
        ...(house.positionalStars ?? []), ...(house.missingStars ?? []),
        ...(house.derivedStars ?? []), ...(house.advancedStars ?? []),
      ];
      const cycles = [...house.cycleStars.trangSinh, ...house.cycleStars.thaiTue, ...house.cycleStars.bacSi];
      const annualHoa = showAnnual ? annual.luuTuHoa.items.filter(item => item.branch === house.branchIndex).map(item => `${item.name} · ${item.star}`) : [];
      const annualStars = showAnnual ? annual.luuStars.items.filter(item => item.branch === house.branchIndex).map(item => item.name) : [];
      return <button type="button" key={house.branchIndex}
        className={'chart-palace-list-item' + (selectedBranch === house.branchIndex ? ' selected' : '')}
        aria-pressed={selectedBranch === house.branchIndex} aria-controls={detailId}
        onClick={() => onSelect(house.branchIndex)}>
        <span className="chart-list-branch">{house.stem} {house.branch}<small>ĐH {house.daiHan?.fromAge}–{house.daiHan?.toAge}</small></span>
        <span className="chart-list-content">
          <strong>{house.palace}{house.isThan ? ' · Thân' : ''}</strong>
          {house.stars.length ? <ListStars items={house.stars} kind="natal" label="Chính tinh"/> : <small>Vô chính diệu</small>}
          {showAuxiliary && <ListStars items={auxiliary} kind="natal" label="Phụ tinh · sao bổ sung"/>}
          {showAuxiliary && !!house.obstructionMarkers?.length && <small className="chart-list-obstruction">Án ngữ: {house.obstructionMarkers.join(' · ')}</small>}
          {house.tuHoa.length > 0 && <ListStars items={house.tuHoa.map(item => `${item.name} · ${item.star}`)} kind="natal" label="Tứ Hóa năm sinh"/>}
          {showCycles && <ListStars items={cycles} kind="cycle" label="Vòng sao"/>}
          {showAnnual && <ListStars items={[...annualHoa,...annualStars]} kind="annual" label={`Lưu niên ${annual.year}`}/>}
        </span>
        <span className="chart-list-tags">
          {showAnnual && annual.activeDaiHan?.branchIndex === house.branchIndex ? 'Đại hạn' : ''}
          {showAnnual && annual.tieuHan.branchIndex === house.branchIndex ? ' Tiểu hạn' : ''}
        </span><span aria-hidden="true">›</span>
      </button>;
    }) : <p className="chart-no-matches">Không tìm thấy cung phù hợp. Thử tên sao khác hoặc xóa tìm kiếm.</p>}
  </div>;
}
