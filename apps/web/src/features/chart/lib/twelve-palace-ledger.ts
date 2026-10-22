import type { AstrologyResult, AnnualOverview, PalaceResearchLayerId } from '@thiendo/shared-types';

/** Read-only research ledger. Never repositions stars or changes astrology-engine output. */
export type LedgerLayer = PalaceResearchLayerId;
export type LedgerRecord = {
  layer: LedgerLayer; star: string; label: string; sourcePath: string; transformation?: string;
};
export type LedgerRow = {
  branchIndex: number; palace: string; branch: string; stem: string; isThan: boolean;
  period: string; records: LedgerRecord[]; markers: string[]; unmatchedTransformations: LedgerRecord[];
};
export type LedgerComparison = {
  shared: string[]; firstOnly: string[]; secondOnly: string[];
};

export const ledgerLayers: readonly {id: LedgerLayer; label: string; short: string; annual: boolean}[] = [
  {id:'main', label:'Chính tinh', short:'Chính', annual:false},
  {id:'auxiliary', label:'Phụ tinh', short:'Phụ', annual:false},
  {id:'year', label:'Sao theo chi năm sinh', short:'Chi sinh', annual:false},
  {id:'additional', label:'Sao bổ sung', short:'Bổ sung', annual:false},
  {id:'traditional', label:'Sao truyền thống', short:'Sao cổ', annual:false},
  {id:'benefic', label:'Sao Đức · Giải', short:'Đức Giải', annual:false},
  {id:'positional', label:'Sao theo cung và địa chi', short:'Cố định', annual:false},
  {id:'missing-stars', label:'Sao Can · Chi · Tháng · Giờ', short:'Sao an', annual:false},
  {id:'derived', label:'Sao theo Mệnh · Thân · Lộc Tồn', short:'Suy từ cung', annual:false},
  {id:'natal-extensions', label:'Sao mở rộng', short:'Sao mới', annual:false},
  {id:'advanced', label:'Không · Kiếp · Hỏa · Linh', short:'Sát tinh', annual:false},
  {id:'birth-transformation', label:'Tứ Hóa năm sinh', short:'Hóa sinh', annual:false},
  {id:'annual-transformation', label:'Tứ Hóa năm xem', short:'Lưu Hóa', annual:true},
  {id:'annual-star', label:'Lưu tinh năm xem', short:'Lưu tinh', annual:true},
];

const birthFields: readonly {layer:LedgerLayer; field:'stars'|'auxiliaryStars'|'yearStars'|'additionalStars'|'traditionalStars'|'natalExtensionStars'|'beneficStars'|'positionalStars'|'derivedStars'|'missingStars'|'advancedStars'}[] = [
  {layer:'main',field:'stars'}, {layer:'auxiliary',field:'auxiliaryStars'},
  {layer:'year',field:'yearStars'}, {layer:'additional',field:'additionalStars'},
  {layer:'traditional',field:'traditionalStars'},
  {layer:'natal-extensions',field:'natalExtensionStars'},
  {layer:'benefic',field:'beneficStars'},
  {layer:'positional',field:'positionalStars'},
  {layer:'derived',field:'derivedStars'},
  {layer:'missing-stars',field:'missingStars'},
  {layer:'advanced',field:'advancedStars'},
];

const textValue = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const validBranch = (value: number) => Number.isInteger(value) && value >= 0 && value < 12;

export function buildTwelvePalaceLedger(chart: AstrologyResult, annual: AnnualOverview): LedgerRow[] {
  if (!Array.isArray(chart.houses) || chart.houses.length !== 12 || new Set(chart.houses.map(h => h.branchIndex)).size !== 12 ||
    chart.houses.some(h => !validBranch(h.branchIndex))) {
    throw new RangeError('Cần đủ 12 địa chi duy nhất để đối chiếu nguồn.');
  }
  // The chart array index is deliberate: source paths must resolve against the original chart,
  // even if houses are reordered and branchIndex differs from array index or grid cell.
  const rows = chart.houses.map((house, houseIndex): LedgerRow => {
    const records: LedgerRecord[] = [];
    for (const {layer,field} of birthFields) {
      (house[field] ?? []).forEach((star,index) => {
        if (textValue(star)) records.push({layer,star,label:star,sourcePath:`houses[${houseIndex}].${field}[${index}]`});
      });
    }
    house.tuHoa.forEach((entry,index) => {
      if (textValue(entry.star) && textValue(entry.name)) records.push({layer:'birth-transformation',star:entry.star,
        transformation:entry.name,label:`${entry.name} · ${entry.star}`,sourcePath:`houses[${houseIndex}].tuHoa[${index}]`});
    });
    annual.luuTuHoa.items.forEach((entry,index) => {
      if (entry.branch === house.branchIndex && textValue(entry.star) && textValue(entry.name)) records.push({layer:'annual-transformation',
        star:entry.star, transformation:entry.name,label:`${entry.name} · ${entry.star}`,sourcePath:`annual.luuTuHoa.items[${index}]`});
    });
    annual.luuStars.items.forEach((entry,index) => {
      if (entry.branch === house.branchIndex && textValue(entry.name)) records.push({layer:'annual-star',star:entry.name,
        label:entry.name,sourcePath:`annual.luuStars.items[${index}]`});
    });
    const natalNames = new Set(records.filter(r => birthFields.some(b => b.layer === r.layer)).map(r => r.star));
    const unmatchedTransformations = records.filter(r => (r.layer === 'birth-transformation' || r.layer === 'annual-transformation') && !natalNames.has(r.star));
    const markers = [
      ...(house.obstructionMarkers ?? []),
      ...(annual.luuThaiTueBranchIndex === house.branchIndex ? ['Lưu Thái Tuế'] : []),
      ...(annual.activeDaiHan?.branchIndex === house.branchIndex ? ['Đại hạn'] : []),
      ...(annual.tieuHan.branchIndex === house.branchIndex ? ['Tiểu hạn'] : []),
    ];
    return {branchIndex:house.branchIndex,palace:house.palace,stem:house.stem,branch:house.branch,
      isThan:house.isThan,period:house.daiHan ? `${house.daiHan.fromAge}–${house.daiHan.toAge}` : '—',
      records,markers,unmatchedTransformations};
  });
  return rows.sort((a,b) => a.branchIndex - b.branchIndex);
}

/** Accent-insensitive and case-insensitive filtering, including source-path searches. */
export function ledgerSearchKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();
}
export function filterLedgerRows(rows: readonly LedgerRow[], query: string, layers: readonly LedgerLayer[]): LedgerRow[] {
  const q = ledgerSearchKey(query);
  return rows.filter(row => {
    const searchable = [row.palace,row.branch,row.stem,row.period,...row.markers,
      ...row.records.filter(r => layers.includes(r.layer)).flatMap(r => [r.star,r.label,r.sourcePath])];
    return !q || ledgerSearchKey(searchable.join(' ')).includes(q);
  });
}

/** Exact shared star names, positional inventory only, not compatibility or auspiciousness. */
export function compareLedgerRows(a: LedgerRow, b: LedgerRow, layers: readonly LedgerLayer[]): LedgerComparison {
  const names = (row: LedgerRow) => [...new Set(row.records.filter(r => layers.includes(r.layer)).map(r => r.star))].sort((x,y) => x.localeCompare(y,'vi'));
  const first = names(a), second = names(b), secondSet = new Set(second), firstSet = new Set(first);
  return {shared:first.filter(name => secondSet.has(name)),firstOnly:first.filter(name => !secondSet.has(name)),secondOnly:second.filter(name => !firstSet.has(name))};
}

/** BOM + CRLF for Windows Excel. Formula-shaped cells are neutralized to avoid CSV injection. */
export function exportLedgerCsv(rows: readonly LedgerRow[], layers: readonly LedgerLayer[], year: number, options: {includeTechnical?:boolean} = {}): string {
  const escape = (value: string | number) => {
    let s = String(value);
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(s)) s = "'" + s;
    return '"'+s.replace(/"/g,'""')+'"';
  };
  const includeTechnical = options.includeTechnical !== false;
  const header = ['Cung','Chi','Chi số','Đại hạn','Lớp','Dữ liệu',...(includeTechnical ? ['Nguồn chính xác'] : []),'Năm xem','Dấu mốc'];
  const content: (string | number)[][] = [header];
  for(const row of rows) {
    const picked = row.records.filter(r => layers.includes(r.layer));
    for(const record of picked) content.push([row.palace,`${row.stem} ${row.branch}`,row.branchIndex,row.period,
      ledgerLayers.find(layer => layer.id === record.layer)?.label ?? record.layer, record.label,...(includeTechnical ? [record.sourcePath] : []),
      year,row.markers.join('; ')]);
    if(!picked.length) content.push([row.palace,`${row.stem} ${row.branch}`,row.branchIndex,row.period,
      'Không có dữ liệu trong lớp đang chọn','', ...(includeTechnical ? [''] : []),year,row.markers.join('; ')]);
  }
  return '\uFEFF'+content.map(line => line.map(escape).join(',')).join('\r\n')+'\r\n';
}
