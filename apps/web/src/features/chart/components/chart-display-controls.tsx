import type { PalaceFocusScope } from '../lib/palace-focus';

/** UI only. The parent owns every state transition and astronomical calculation. */
type ChartDisplayControlsProps = {
  boardSkin: 'heritage' | 'jade';
  chartTextSize: 'comfortable' | 'large';
  showInsightDock: boolean;
  showRelationLines: boolean;
  focusScope: PalaceFocusScope;
  selectedPalace: string;
  onBoardSkinChange: (skin: 'heritage' | 'jade') => void;
  onChartTextSizeChange: (size: 'comfortable' | 'large') => void;
  onOpenReader: () => void;
  onToggleInsightDock: () => void;
  onToggleRelationLines: () => void;
  onFocusScopeChange: (scope: PalaceFocusScope) => void;
};

export function ChartDisplayControls({
  boardSkin, chartTextSize, showInsightDock, showRelationLines,
  focusScope, selectedPalace, onBoardSkinChange, onChartTextSizeChange,
  onOpenReader, onToggleInsightDock, onToggleRelationLines,
  onFocusScopeChange,
}: ChartDisplayControlsProps) {
  return <>
    <div className="chart-room-controls" role="group" aria-label="Tùy chọn không gian địa bàn">
      <div className="chart-skin-switch" role="group" aria-label="Phong cách mệnh bàn">
        <span>PHONG CÁCH LÁ SỐ</span>
        <button type="button" aria-pressed={boardSkin === 'heritage'} onClick={() => onBoardSkinChange('heritage')}>Giấy ngà cổ điển</button>
        <button type="button" aria-pressed={boardSkin === 'jade'} onClick={() => onBoardSkinChange('jade')}>Ngọc bích</button>
      </div>
      <div className="chart-text-size-switch" role="group" aria-label="Kích thước chữ trên địa bàn">
        <span>CHỮ TRÊN LÁ SỐ</span>
        <button type="button" aria-pressed={chartTextSize === 'comfortable'} onClick={() => onChartTextSizeChange('comfortable')}>Dễ đọc</button>
        <button type="button" aria-pressed={chartTextSize === 'large'} onClick={() => onChartTextSizeChange('large')}>A+ Chữ lớn</button>
      </div>
      <button type="button" className="chart-room-control chart-reader-trigger" aria-haspopup="dialog" onClick={onOpenReader}>⌕ Phóng to cung {selectedPalace}</button>
      <button type="button" className={`chart-room-control${showInsightDock ? ' active' : ''}`} aria-expanded={showInsightDock} aria-controls="thiendo-study-dock" onClick={onToggleInsightDock}>
        <span aria-hidden="true">{showInsightDock ? '◧' : '▤'}</span> {showInsightDock ? 'Ẩn sổ tay nghiên cứu' : 'Hiện sổ tay nghiên cứu'}
      </button>
      <button type="button" className={`chart-room-control${showRelationLines ? ' active' : ''}`} aria-pressed={showRelationLines} onClick={onToggleRelationLines}>
        <span aria-hidden="true">⌁</span> {showRelationLines ? 'Tắt gợi liên hệ cung' : 'Bật gợi liên hệ cung'}
      </button>
      {showRelationLines && <div className="chart-line-scope" role="group" aria-label="Phạm vi đối chiếu khi rê chuột">
        <button type="button" aria-pressed={focusScope === 'tam-hop'} onClick={() => onFocusScopeChange('tam-hop')}>Tam hợp</button>
        <button type="button" aria-pressed={focusScope === 'tu-chinh'} onClick={() => onFocusScopeChange('tu-chinh')}>Tam phương Tứ chính</button>
        <span className="chart-line-legend"><i className="chart-line-solid"/> Tam hợp <i className="chart-line-dashed"/> Đối cung</span>
      </div>}
    </div>
  </>;
}
