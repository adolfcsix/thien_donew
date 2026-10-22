import type { CSSProperties, KeyboardEvent } from 'react';
import type { AstrologyHouse, AnnualOverview } from '@thiendo/shared-types';
import { AstrologyGroup, MainStarGroup } from './star-groups';

type TileProps = {
  house: AstrologyHouse; selected: boolean; visualFocus: boolean; relation: 'tam-hop' | 'doi-cung' | null; searchMatch: boolean | null;
  showAuxiliary: boolean; showCycles: boolean; showAnnual: boolean; showStrength: boolean;
  annual: AnnualOverview; onSelect: () => void; onOpenReader: () => void; onPreviewStart: () => void; onPreviewEnd: () => void; onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

const houseAccentPalette = [
  ['#7ac7b0','rgba(122,199,176,.20)'], ['#86b7ea','rgba(134,183,234,.18)'], ['#d1b06a','rgba(209,176,106,.18)'],
  ['#78c9d8','rgba(120,201,216,.18)'], ['#96c47f','rgba(150,196,127,.18)'], ['#c28de2','rgba(194,141,226,.16)'],
  ['#e39a7c','rgba(227,154,124,.16)'], ['#6fd4b8','rgba(111,212,184,.19)'], ['#9bb7ff','rgba(155,183,255,.17)'],
  ['#d7bc73','rgba(215,188,115,.17)'], ['#7ec9f2','rgba(126,201,242,.17)'], ['#a4ce8d','rgba(164,206,141,.17)'],
] as const;

type HouseAccentStyle = CSSProperties & {'--house-accent': string; '--house-accent-soft': string};
function houseAccentStyle(cell: number, branchIndex: number): HouseAccentStyle {
  const [accent, accentSoft] = houseAccentPalette[branchIndex];
  return {
    gridColumn: (cell % 4) + 1,
    gridRow: Math.floor(cell / 4) + 1,
    '--house-accent': accent,
    '--house-accent-soft': accentSoft,
  };
}

export function PalaceTile({house,selected,visualFocus,relation,searchMatch,showAuxiliary,showCycles,showAnnual,showStrength,annual,onSelect,onOpenReader,onPreviewStart,onPreviewEnd,onKeyDown}:TileProps) {
  const isYearBranch = annual.luuThaiTueBranchIndex === house.branchIndex;
  const isMajor = annual.activeDaiHan?.branchIndex === house.branchIndex;
  const isTieuHan = annual.tieuHan.branchIndex === house.branchIndex;
  const annualHoa = showAnnual ? annual.luuTuHoa.items.filter(item => item.branch === house.branchIndex) : [];
  const annualStars = showAnnual ? annual.luuStars.items.filter(item => item.branch === house.branchIndex) : [];
  const className = ['house', 'atlas-house', selected ? 'selected' : '', visualFocus ? 'visual-focus' : '', relation ? `related-${relation}` : '', house.palace === 'Mệnh' ? 'menh-house' : '',
    showAnnual && isYearBranch ? 'year-branch-house' : '', showAnnual && isMajor ? 'major-period-house' : '',
    showAnnual && isTieuHan ? 'tieu-han-house' : '', searchMatch === true ? 'search-match-house' : '',
    searchMatch === false ? 'search-muted-house' : ''].filter(Boolean).join(' ');
  const annualLabels = [...annualHoa.map(t => `${t.name} · ${t.star}`), ...annualStars.map(t => t.name)];
  return <button type="button" id={`palace-${house.branchIndex}`} className={className} onClick={onSelect} onDoubleClick={onOpenReader} onMouseEnter={onPreviewStart} onMouseLeave={onPreviewEnd} onFocus={onPreviewStart} onBlur={onPreviewEnd} onKeyDown={onKeyDown} aria-pressed={selected} data-branch={house.branchIndex}
    title={`${house.palace} · ${house.branch} — ${house.stars.join(', ') || 'Vô chính diệu'}. Chọn để xem đầy đủ các sao.`}
    aria-label={`Cung ${house.palace}, ${house.branch}, ${house.stars.length} chính tinh, ${house.auxiliaryStars.length + house.yearStars.length + (house.additionalStars?.length ?? 0) + (house.traditionalStars?.length ?? 0) + (house.natalExtensionStars?.length ?? 0) + (house.beneficStars?.length ?? 0) + (house.positionalStars?.length ?? 0) + (house.derivedStars?.length ?? 0) + (house.missingStars?.length ?? 0) + (house.advancedStars?.length ?? 0)} phụ tinh. Chọn để xem toàn bộ.`}
    style={houseAccentStyle(house.cell, house.branchIndex)}>
    <span className="atlas-house-header"><span className="atlas-branch">{house.stem} {house.branch}</span><strong>{house.palace}</strong>{house.isThan && <em>Thân</em>}</span>
    <span className="atlas-house-content">
      <MainStarGroup house={house} showStrength={showStrength} />
      {showAuxiliary && <div className="atlas-house-assist">
        <AstrologyGroup label="PHỤ TINH" items={house.auxiliaryStars}/>
        <AstrologyGroup label="SAO CHI NĂM" items={house.yearStars} variant="year"/>
        {(house.additionalStars?.length ?? 0) > 0 && <AstrologyGroup label="SAO BỔ SUNG" items={house.additionalStars ?? []} variant="year"/>}
        {(house.natalExtensionStars?.length ?? 0) > 0 && <AstrologyGroup label="SAO MỞ RỘNG" items={house.natalExtensionStars ?? []} variant="year"/>}
        {(house.beneficStars?.length ?? 0) > 0 && <AstrologyGroup label="ĐỨC · GIẢI" items={house.beneficStars ?? []} variant="year"/>}
        {(house.positionalStars?.length ?? 0) > 0 && <AstrologyGroup label="SAO THEO CUNG · ĐỊA CHI" items={house.positionalStars ?? []} variant="year"/>}
        {(house.missingStars?.length ?? 0) > 0 && <AstrologyGroup label="SAO THEO CAN · CHI · THÁNG · GIỜ" items={house.missingStars ?? []} variant="year"/>}
        {(house.derivedStars?.length ?? 0) > 0 && <AstrologyGroup label="SAO MỆNH · THÂN · LỘC TỒN" items={house.derivedStars ?? []} variant="year"/>}
        {(house.traditionalStars?.length ?? 0) > 0 && <AstrologyGroup label="SAO TRUYỀN THỐNG" items={house.traditionalStars ?? []} variant="year"/>}
        {(house.advancedStars?.length ?? 0) > 0 && <AstrologyGroup label="KHÔNG · KIẾP · HỎA · LINH" items={house.advancedStars ?? []} variant="year"/>}
      </div>}
      {!!house.obstructionMarkers?.length && <div className="atlas-void-markers" aria-label="Tuần Triệt án ngữ">{house.obstructionMarkers.map(name => <span key={name} title={`${name} án cặp cung; không phải sao độc lập`}>{name}</span>)}</div>}
      {house.tuHoa.length > 0 && <AstrologyGroup label="TỨ HÓA SINH" items={house.tuHoa.map(t => `${t.name} · ${t.star}`)} variant="gold"/>}
      {showAnnual && annualLabels.length > 0 && <div className="atlas-annual-data"><AstrologyGroup label="LƯU NIÊN" items={annualLabels} variant="year"/></div>}
    </span>
    <span className="atlas-house-bottom">
      {showCycles && <span className="atlas-cycle-pills">{house.cycleStars.trangSinh.map(item=><i key={item}>{item}</i>)}{house.cycleStars.thaiTue.map(item=><i key={item}>{item}</i>)}{house.cycleStars.bacSi.map(item=><i key={item}>{item}</i>)}</span>}
      <span className="atlas-age">ĐẠI HẠN <b>{house.daiHan?.fromAge ?? '—'}–{house.daiHan?.toAge ?? '—'}</b></span>
      {(showAnnual && (isYearBranch || isMajor || isTieuHan)) && <span className="atlas-markers">{isYearBranch && <i>Năm xem</i>}{isMajor && <i>Đại hạn</i>}{isTieuHan && <i>Tiểu hạn</i>}</span>}
    </span>
  </button>;
}
